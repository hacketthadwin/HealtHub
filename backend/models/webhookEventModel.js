const mongoose = require("mongoose");

// One row per Razorpay webhook delivery. The unique eventId makes processing idempotent
// (Razorpay retries deliveries), and the outcome trail lets an admin see orphan payments.
const webhookEventSchema = new mongoose.Schema(
  {
    eventId:   { type: String, required: true, unique: true },
    event:     { type: String, required: true },
    status:    { type: String, enum: ["processing", "done", "error"], default: "processing" },
    outcome:   { type: String, default: null },   // confirmed | already_confirmed | refunded_orphan | refund_failed | ignored | error
    razorpayPaymentId: { type: String, default: null },
    razorpayOrderId:   { type: String, default: null },
    bookingRequestId:  { type: String, default: null },
    refundId:          { type: String, default: null },
    detail:            { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WebhookEvent", webhookEventSchema);