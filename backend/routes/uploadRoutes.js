const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const { uploadMedicalFile, uploadMiddleware } = require("../controller/uploadController");

router.post("/upload/medical", auth, uploadMiddleware, uploadMedicalFile);

module.exports = router;
