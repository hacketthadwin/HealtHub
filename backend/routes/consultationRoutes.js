const express = require("express");
const router  = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const { listConsultations } = require("../controller/consultationController");

router.get("/consultations", auth, listConsultations);

module.exports = router;