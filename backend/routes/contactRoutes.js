const express = require("express");
const router = express.Router();
const { sendContactEmail } = require("../controller/contactController");

// No auth required — public endpoint
router.post("/contact", sendContactEmail);

module.exports = router;
