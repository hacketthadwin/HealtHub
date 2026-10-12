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
    currency: { type: String, default: "INR" },
    razorpay_order_id:   { type: String, required: true },
    razorpay_payment_id: { type: String, required: true, unique: true },
    // Empty when the payment was confirmed by the webhook / reconciliation instead of the browser.
    razorpay_signature:  { type: String, default: null },
    capturedVia: {
      type: String,
      enum: ["checkout", "webhook", "reconcile"],
      default: "checkout",
    },

    status: {
      type: String,
      enum: ["paid", "refund_initiated", "refunded", "failed"],
      default: "paid",
    },
    refundId:     { type: String, default: null },
    refundedAt:   { type: Date,   default: null },
    refundReason: { type: String, default: null },
    refundStatus: { type: String, default: null },      // pending | processed | failed (from Razorpay)
    refundedBy:   { type: String, default: null },      // patient | doctor | admin | system

    // ── Doctor payout (released when the consultation is completed) ──
    commissionPaise:    { type: Number, default: null },
    doctorPayoutPaise:  { type: Number, default: null },
    payoutStatus: {
      type: String,
      enum: ["NOT_DUE", "PENDING", "PAID", "FAILED"],
      default: "NOT_DUE",
      index: true,
    },
    payoutMethod:    { type: String, default: null },   // route | manual
    payoutReference: { type: String, default: null },
    payoutAt:        { type: Date,   default: null },
    payoutError:     { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppointmentPayment", appointmentPaymentSchema);