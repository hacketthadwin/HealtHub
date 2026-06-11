const cloudinary = require("../config/cloudinaryConfig");
const multer     = require("multer");

// ─── Multer: keep file in memory (no disk writes) ────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // attach a code so uploadMiddleware can send a clean 400 response
    cb(
      Object.assign(new Error("Only JPG and PNG images are allowed"), {
        code: "INVALID_FILE_TYPE",
      }),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
  fileFilter,
}).single("file");

// ─── Middleware wrapper ───────────────────────────────────────────────────────

exports.uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();

    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ success: false, message: "File too large. Max size is 10 MB." });
    }
    if (err.code === "INVALID_FILE_TYPE") {
      return res
        .status(400)
        .json({ success: false, message: err.message });
    }
    return res
      .status(400)
      .json({ success: false, message: err.message || "File upload error." });
  });
};

// ─── Cloudinary upload helper ─────────────────────────────────────────────────
// upload_stream returns a writable stream; calling .end(buffer) writes all
// bytes and signals EOF in one shot — simpler and more reliable than piping
// a Readable through it.

const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

// ─── Controller ───────────────────────────────────────────────────────────────

exports.uploadMedicalFile = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file.buffer, {
      folder:        `healthhub/medical-reports/${req.user.id}`,
      public_id:     `report_${Date.now()}`,
      resource_type: "auto", // auto-detects jpeg vs png
    });

    return res.status(200).json({
      success:  true,
      url:      result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res
      .status(500)
      .json({ success: false, message: "File upload failed" });
  }
};