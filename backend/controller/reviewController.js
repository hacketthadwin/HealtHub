const mongoose       = require("mongoose");
const Joi            = require("joi");
const Review         = require("../models/review");
const BookingRequest = require("../models/bookingRequestModel");

const createSchema = Joi.object({
  bookingRequestId: Joi.string().hex().length(24).required(),
  rating:  Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(500).allow("", null),
}).options({ stripUnknown: true });      // doctorId / patientId from the client are ignored

// A patient can review only their own COMPLETED consultation, once.
exports.createReview = async (req, res) => {
  try {
    const { error, value } = createSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const booking = await BookingRequest.findOne({
      _id:       value.bookingRequestId,
      patientId: req.user.id,
      status:    "COMPLETED",
    }).select("_id doctorId");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "You can review a consultation only after the doctor has marked it completed.",
      });
    }

    const review = await Review.create({
      bookingRequestId: booking._id,
      patientId:        req.user.id,
      doctorId:         booking.doctorId,
      rating:           value.rating,
      comment:          value.comment || undefined,
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: "You have already reviewed this consultation." });
    }
    console.error("createReview error:", error);
    return res.status(500).json({ success: false, message: "Error creating review" });
  }
};

exports.getDoctorReviews = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ success: false, message: "Invalid doctor id." });
    }

    const reviews = await Review.find({ doctorId })
      .populate("patientId", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Public view: first name only.
    const data = reviews.map((r) => ({
      _id:       r._id,
      rating:    r.rating,
      comment:   r.comment || "",
      createdAt: r.createdAt,
      patientName: (r.patientId?.name || "Patient").split(" ")[0],
    }));

    const count = data.length;
    const avg   = count ? Math.round((data.reduce((a, r) => a + r.rating, 0) / count) * 10) / 10 : null;

    return res.status(200).json({ success: true, data, meta: { count, average: avg } });
  } catch (error) {
    console.error("getDoctorReviews error:", error);
    return res.status(500).json({ success: false, message: "Error fetching reviews" });
  }
};