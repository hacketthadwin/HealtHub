const express = require("express");
const router  = express.Router();

const { auth } = require("../middlewares/authMiddleware");
const {
  getRazorpayKey,
  createOrder,
  verifyPayment,
} = require("../controller/paymentController");

router.get("/razorpay-key", auth, getRazorpayKey);
router.post("/create-order",    auth, createOrder);
router.post("/verify-payment",  auth, verifyPayment);

module.exports = router;