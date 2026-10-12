const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
    },
    // Legacy field from the old Appointment model. Its old unique index is dropped by scripts/migrateV2.js.
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

// One review per completed consultation.
reviewSchema.index(
  { bookingRequestId: 1 },
  { unique: true, partialFilterExpression: { bookingRequestId: { $exists: true } } }
);

module.exports = mongoose.model("Review", reviewSchema);