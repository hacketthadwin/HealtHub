const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");
const streamifier = require("streamifier");

// Multer: keep file in memory
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, JPG, and PNG files are allowed"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter,
}).single("file");

// Wrap multer so its errors are forwarded as proper HTTP responses
// instead of crashing or hanging the request
exports.uploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File too large. Max size is 10MB." });
    }
    return res.status(400).json({ success: false, message: err.message || "File upload error." });
  });
};

// Upload buffer directly to Cloudinary via upload_stream (no base64 conversion).
// This is the correct approach for multer memoryStorage — avoids the ~33% size
// overhead of base64 strings and works reliably for both images and PDFs.
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

exports.uploadMedicalFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const isPdf = req.file.mimetype === "application/pdf";

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `healthhub/medical-reports/${req.user.id}`,
      public_id: `report_${Date.now()}`,
      resource_type: isPdf ? "raw" : "image",
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ success: false, message: "File upload failed" });
  }
};