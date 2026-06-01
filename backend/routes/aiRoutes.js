const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const { chatWithAI } = require("../controller/aiController");

// Both doctors and patients can use AI chat
router.post("/chat", auth, chatWithAI);

module.exports = router;
