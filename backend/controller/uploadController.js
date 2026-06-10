const cloudinary   = require("../config/cloudinaryConfig");
const multer       = require("multer");
const { Readable } = require("stream"); // built-in — no extra dependency needed

// ─── Multer: keep file in memory (no disk writes) ────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // attach a code so uploadMiddleware can send a clean 400 response
    cb(
      Object.assign(new Error("Only PDF, JPG, and PNG files are allowed"), {
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
// FIX 1: replaced streamifier (2014, unmaintained) with Node built-in Readable.from()
// FIX 2: resource_type "auto" lets Cloudinary detect PDF vs image correctly.
//         Using "raw" was causing PDFs to be stored as opaque blobs with no
//         delivery pipeline and no transformation support.

const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    // Readable.from() is built-in since Node v12.3 — handles end-of-stream
    // correctly on Node v18+ unlike streamifier's legacy streams1 API
    Readable.from(buffer).pipe(uploadStream);
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
      resource_type: "auto", // Cloudinary auto-detects PDF vs image
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