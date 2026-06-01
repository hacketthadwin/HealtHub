const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  role: {
    type: String,
    enum: ["Doctor", "Patient"],
    required: true
  },

  planType: {
    type: String,
    enum: ["patient_monthly", "patient_yearly", "doctor_monthly", "doctor_yearly"],
    required: true
  },

  razorpay_order_id: {
    type: String,
    required: true
  },

  razorpay_payment_id: {
    type: String,
    required: true
  },

  razorpay_signature: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  status: {
    type: String,
    enum: ["paid", "failed"],
    default: "paid"
  }

}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
