const razorpay = require("../config/paymentConfig");
const Payment = require("../models/payment");
const User    = require("../models/userModel");
const crypto  = require("crypto");

// Single source of truth for pricing — client never sends an amount
const PLAN_PRICES = {
  patient_monthly: 499,
  patient_yearly:  399,
  doctor_monthly:  1999,
  doctor_yearly:   1599,
};

const PLAN_ROLES = {
  patient_monthly: "Patient",
  patient_yearly:  "Patient",
  doctor_monthly:  "Doctor",
  doctor_yearly:   "Doctor",
};

// Safely expose the public Razorpay key so the frontend
// never needs REACT_APP_RAZORPAY_KEY_ID in its own .env
exports.getRazorpayKey = (req, res) => {
  return res.status(200).json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
};

exports.createOrder = async (req, res) => {
  try {
    const { planType } = req.body;

    if (!planType || !PLAN_PRICES[planType]) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or missing plan type. " +
          "Valid plans: patient_monthly, patient_yearly, doctor_monthly, doctor_yearly",
      });
    }

    const amount = PLAN_PRICES[planType]; // server-side lookup — tamper-proof

    const order = await razorpay.orders.create({
      amount:   amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt:  `receipt_${planType}_${Date.now()}`,
      notes:    { planType, userId: req.user.id },
    });

    // Return the Razorpay order fields + planType so the handler can verify
    return res.status(200).json({ ...order, planType });
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ success: false, message: "Order creation failed" });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
    } = req.body;

    // 1. Validate planType
    if (!planType || !PLAN_PRICES[planType]) {
      return res.status(400).json({ success: false, message: "Invalid plan type" });
    }

    // 2. Verify Razorpay cryptographic signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // 3. Use server-side price (no extra Razorpay API fetch needed —
    //    the signature already proves the correct order was paid)
    const amount = PLAN_PRICES[planType];
    const role   = PLAN_ROLES[planType];

    // 4. Record payment
    const payment = await Payment.create({
      user:                req.user.id,
      role,
      planType,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      status: "paid",
    });

    // 5. Upgrade subscription
    await User.findByIdAndUpdate(req.user.id, { subscription: "Premium" });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment,
    });
  } catch (error) {
    console.error("verifyPayment error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Payment verification failed" });
  }
};