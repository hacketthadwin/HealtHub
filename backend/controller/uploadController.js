const cloudinary = require("../config/cloudinaryConfig");
const multer = require("multer");

// Multer: keep file in memory (no disk storage needed)
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

exports.uploadMiddleware = upload;

exports.uploadMedicalFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Convert buffer to base64 for Cloudinary
    const base64Data = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `healthhub/medical-reports/${req.user.id}`,
      resource_type: "auto",
      format: req.file.mimetype === "application/pdf" ? "pdf" : undefined,
      public_id: `report_${Date.now()}`,
      use_filename: true,
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
