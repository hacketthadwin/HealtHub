const express = require("express");
const router = express.Router();
const { auth, isPatient } = require("../middlewares/authMiddleware");
const { createReview, getDoctorReviews } = require("../controller/reviewController");

router.post("/reviews", auth, isPatient, createReview);
router.get("/reviews/doctor/:doctorId", auth, getDoctorReviews);

module.exports = router;
