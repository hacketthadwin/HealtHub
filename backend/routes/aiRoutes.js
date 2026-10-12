const express = require("express");
const router = express.Router();
const { auth, isDoctor, requireApprovedDoctor } = require("../middlewares/authMiddleware");
const { chatWithAI, generateIntakeSummary } = require("../controller/aiController");

// Both doctors and patients can use AI chat
router.post("/chat", auth, chatWithAI);

// Doctor-only: AI summary of a patient's request before / during the consultation
router.post("/intake-summary", auth, isDoctor, requireApprovedDoctor, generateIntakeSummary);

module.exports = router;