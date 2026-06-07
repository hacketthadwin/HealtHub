const mongoose = require("mongoose");

const appointmentPaymentSchema = new mongoose.Schema(
  {

    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
      unique: true, 
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amountPaise: {
      type: Number,
      required: true,
    },
    razorpay_order_id:   { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    razorpay_signature:  { type: String, required: true },
    status: {
      type: String,
      enum: ["paid", "refunded", "failed"],
      default: "paid",
    },
    refundId:     { type: String, default: null },
    refundedAt:   { type: Date,   default: null },
    refundReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppointmentPayment", appointmentPaymentSchema);