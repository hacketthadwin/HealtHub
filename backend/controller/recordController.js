const mongoose     = require("mongoose");
const multer       = require("multer");
const axios        = require("axios");
const Joi          = require("joi");
const cloudinary   = require("../config/cloudinaryConfig");
const HealthRecord = require("../models/healthRecordModel");
const BookingRequest = require("../models/bookingRequestModel");

const MAX_BYTES = 10 * 1024 * 1024;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1 } });
exports.uploadMiddleware = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large (max 10 MB)." : "Upload failed.";
    return res.status(400).json({ success: false, message: msg });
  });

// Trust the file's own bytes, not the client-supplied mime type.
function sniff(buf) {
  if (buf.length > 4 && buf.slice(0, 4).toString("latin1") === "%PDF") return { mime: "application/pdf", ext: "pdf" };
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: "image/png", ext: "png" };
  return null;
}

const metaSchema = Joi.object({
  title:      Joi.string().trim().min(1).max(150).required(),
  category:   Joi.string().valid("lab_report", "imaging", "prescription", "discharge_summary", "other").default("other"),
  recordDate: Joi.date().iso().max("now").allow("", null),
}).options({ stripUnknown: true });

const toPublic = (r) => ({
  _id: r._id, title: r.title, category: r.category, recordDate: r.recordDate,
  fileName: r.fileName, mimeType: r.mimeType, bytes: r.bytes, createdAt: r.createdAt,
  sharedWith: (r.sharedWith || []).map((s) => String(s.bookingRequestId)),
});

const SHAREABLE = ["PAID_CONFIRMED", "COMPLETED"];

exports.createRecord = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Choose a PDF, JPG or PNG file." });
    const kind = sniff(req.file.buffer);
    if (!kind) return res.status(400).json({ success: false, message: "Only PDF, JPG and PNG files are allowed." });

    const { error, value } = metaSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    // Stored as type "authenticated": there is no public URL. Files are served only through
    // GET /records/:id/file after an ownership / consent check.
    const uploaded = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `healthhub/records/${req.user.id}`, resource_type: "auto", type: "authenticated" },
        (err, result) => (err ? reject(err) : resolve(result))
      ).end(req.file.buffer);
    });

    const safeName = String(req.file.originalname || `record.${kind.ext}`).replace(/[^\w.\- ]/g, "_").slice(0, 120);
    const record = await HealthRecord.create({
      patientId:  req.user.id,
      title:      value.title,
      category:   value.category,
      recordDate: value.recordDate || null,
      fileName:   safeName,
      mimeType:   kind.mime,
      bytes:      req.file.size,
      storage: {
        publicId:     uploaded.public_id,
        resourceType: uploaded.resource_type,
        format:       uploaded.format || kind.ext,
        version:      uploaded.version,
      },
    });
    return res.status(201).json({ success: true, data: toPublic(record) });
  } catch (err) {
    console.error("createRecord error:", err);
    return res.status(500).json({ success: false, message: "Could not upload the file." });
  }
};

exports.listMyRecords = async (req, res) => {
  try {
    const records = await HealthRecord.find({ patientId: req.user.id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: records.map(toPublic) });
  } catch (err) {
    console.error("listMyRecords error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Doctor: records the patient shared with this consultation.
exports.listSharedForBooking = async (req, res) => {
  try {
    const { bookingRequestId } = req.params;
    if (!mongoose.isValidObjectId(bookingRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid booking id." });
    }
    const booking = await BookingRequest.findOne({
      _id: bookingRequestId, doctorId: req.user.id, status: { $in: SHAREABLE },
    }).select("_id");
    if (!booking) return res.status(404).json({ success: false, message: "Consultation not found." });

    const records = await HealthRecord.find({ "sharedWith.bookingRequestId": booking._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: records.map(toPublic) });
  } catch (err) {
    console.error("listSharedForBooking error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const shareSchema = Joi.object({ bookingRequestId: Joi.string().hex().length(24).required() }).options({ stripUnknown: true });

exports.shareRecord = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid record id." });
    const { error, value } = shareSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: "bookingRequestId is required." });

    const booking = await BookingRequest.findOne({
      _id: value.bookingRequestId, patientId: req.user.id, status: { $in: SHAREABLE },
    }).select("_id doctorId");
    if (!booking) return res.status(404).json({ success: false, message: "You can share records only with a paid consultation of yours." });

    const record = await HealthRecord.findOneAndUpdate(
      { _id: id, patientId: req.user.id, "sharedWith.bookingRequestId": { $ne: booking._id } },
      { $push: { sharedWith: { bookingRequestId: booking._id, doctorId: booking.doctorId } } },
      { new: true }
    );
    if (record) return res.status(200).json({ success: true, data: toPublic(record) });

    const exists = await HealthRecord.findOne({ _id: id, patientId: req.user.id });
    if (!exists) return res.status(404).json({ success: false, message: "Record not found." });
    return res.status(200).json({ success: true, data: toPublic(exists) });          // already shared
  } catch (err) {
    console.error("shareRecord error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.unshareRecord = async (req, res) => {
  try {
    const { id, bookingRequestId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(bookingRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    const record = await HealthRecord.findOneAndUpdate(
      { _id: id, patientId: req.user.id },
      { $pull: { sharedWith: { bookingRequestId } } },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    return res.status(200).json({ success: true, data: toPublic(record) });
  } catch (err) {
    console.error("unshareRecord error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Owner, or a doctor while the record is shared with one of their paid / completed consultations.
async function canView(user, record) {
  if (String(record.patientId) === String(user.id)) return true;
  if (user.role !== "Doctor") return false;
  const ids = (record.sharedWith || []).filter((s) => String(s.doctorId) === String(user.id)).map((s) => s.bookingRequestId);
  if (!ids.length) return false;
  return !!(await BookingRequest.exists({ _id: { $in: ids }, doctorId: user.id, status: { $in: SHAREABLE } }));
}
exports._canView = canView;

exports.streamRecordFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid record id." });

    const record = await HealthRecord.findById(id);
    if (!record || !(await canView(req.user, record))) {
      return res.status(404).json({ success: false, message: "Record not found." });
    }

    const { publicId, resourceType, format, version } = record.storage;
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType, type: "authenticated", sign_url: true, secure: true,
      version, format: format || undefined,
    });

    const upstream = await axios.get(signedUrl, { responseType: "stream", timeout: 20000, validateStatus: () => true });
    if (upstream.status !== 200) {
      console.error(`Record fetch failed: Cloudinary returned ${upstream.status} for record ${record._id}`);
      return res.status(502).json({ success: false, message: "Could not retrieve the file from storage." });
    }

    res.setHeader("Content-Type", record.mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${record.fileName.replace(/"/g, "")}"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    upstream.data.pipe(res);
  } catch (err) {
    console.error("streamRecordFile error:", err.message);
    if (!res.headersSent) return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid record id." });
    const record = await HealthRecord.findOne({ _id: id, patientId: req.user.id });
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });

    try {
      await cloudinary.uploader.destroy(record.storage.publicId, {
        resource_type: record.storage.resourceType, type: "authenticated", invalidate: true,
      });
    } catch (e) {
      console.error("Cloudinary destroy failed:", e.message);
      return res.status(502).json({ success: false, message: "Could not delete the stored file. Nothing was removed." });
    }
    await record.deleteOne();
    return res.status(200).json({ success: true, message: "Record deleted." });
  } catch (err) {
    console.error("deleteRecord error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};