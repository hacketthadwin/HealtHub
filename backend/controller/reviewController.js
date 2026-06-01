const Review = require("../models/review");

exports.createReview = async (req, res) => {
  try {
    const { appointmentId, doctorId, rating, comment } = req.body;

    if (!appointmentId || !doctorId || !rating) {
      return res.status(400).json({ success: false, message: "appointmentId, doctorId, and rating are required" });
    }

    const existing = await Review.findOne({ appointmentId });
    if (existing) {
      return res.status(409).json({ success: false, message: "Review already submitted for this appointment" });
    }

    const review = await Review.create({
      appointmentId,
      patientId: req.user.id,
      doctorId,
      rating,
      comment: comment || "",
    });

    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    console.error("createReview error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const reviews = await Review.find({ doctorId })
      .populate("patientId", "name")
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return res.status(200).json({ success: true, reviews, avgRating });
  } catch (err) {
    console.error("getDoctorReviews error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
