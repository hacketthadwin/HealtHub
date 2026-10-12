const razorpay           = require("../config/paymentConfig");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const User               = require("../models/userModel");

const commissionPercent = () => {
  const n = Number(process.env.PLATFORM_COMMISSION_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 15;
};

function splitAmount(amountPaise) {
  const commissionPaise   = Math.round((amountPaise * commissionPercent()) / 100);
  const doctorPayoutPaise = amountPaise - commissionPaise;
  return { commissionPaise, doctorPayoutPaise };
}

/**
 * Called when a consultation is marked COMPLETED. Records the commission split and releases the
 * doctor's share: automatically through Razorpay Route when enabled and the doctor has a linked
 * account, otherwise it stays PENDING for an admin to pay out manually.
 */
async function settleOnCompletion(paymentId) {
  const payment = await AppointmentPayment.findById(paymentId);
  if (!payment || payment.status !== "paid") return payment;
  if (payment.payoutStatus === "PAID" || payment.payoutStatus === "PENDING") return payment;

  const { commissionPaise, doctorPayoutPaise } = splitAmount(payment.amountPaise);
  payment.commissionPaise   = commissionPaise;
  payment.doctorPayoutPaise = doctorPayoutPaise;
  payment.payoutStatus      = "PENDING";
  payment.payoutError       = null;
  await payment.save();

  if (process.env.ENABLE_ROUTE_PAYOUTS === "true") {
    await attemptRoutePayout(payment);
  }
  return payment;
}

async function attemptRoutePayout(payment) {
  const doctor = await User.findById(payment.doctorId).select("razorpayLinkedAccountId");
  if (!doctor?.razorpayLinkedAccountId) return payment;   // no linked account yet: stays PENDING for manual payout

  try {
    const res = await razorpay.payments.transfer(payment.razorpay_payment_id, {
      transfers: [{
        account:  doctor.razorpayLinkedAccountId,
        amount:   payment.doctorPayoutPaise,
        currency: "INR",
        notes:    { bookingRequestId: String(payment.bookingRequestId) },
      }],
    });
    const transferId = res?.items?.[0]?.id || res?.id || null;
    payment.payoutStatus    = "PAID";
    payment.payoutMethod    = "route";
    payment.payoutReference = transferId;
    payment.payoutAt        = new Date();
    payment.payoutError     = null;
  } catch (err) {
    payment.payoutStatus = "FAILED";
    payment.payoutError  = String(err?.error?.description || err.message || "Transfer failed").slice(0, 300);
  }
  await payment.save();
  return payment;
}

module.exports = { settleOnCompletion, attemptRoutePayout, splitAmount, commissionPercent };