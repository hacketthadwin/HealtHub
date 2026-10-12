const razorpay           = require("../config/paymentConfig");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const BookingRequest     = require("../models/bookingRequestModel");
const DoctorSchedule     = require("../models/doctorScheduleModel");

class RefundError extends Error {
  constructor(message, status = 400, code = null) { super(message); this.status = status; this.code = code; }
}

// ── Ask Razorpay what really happened to a payment ───────────────────────────
// verdict: "captured"    the patient was charged (a refund will work)
//          "refunded"    already refunded at Razorpay
//          "not_charged" created / authorized / failed — the patient was never charged
//          "missing"     Razorpay has no such payment for the keys this server uses
async function inspectRazorpayPayment(paymentId) {
  try {
    const p = await razorpay.payments.fetch(paymentId);
    let verdict = "not_charged";
    if (p.status === "refunded") verdict = "refunded";
    else if (p.status === "captured" || p.captured === true) verdict = "captured";
    return {
      found: true,
      verdict,
      status: p.status,
      amountPaise: p.amount,
      amountRefundedPaise: p.amount_refunded || 0,
    };
  } catch (err) {
    const code = err?.statusCode;
    if (code === 400 || code === 404) {
      return { found: false, verdict: "missing", status: null, description: err?.error?.description || null };
    }
    if (code === 401) {
      throw new RefundError(
        "Razorpay rejected this server's API keys. Check RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (test vs live) in the server settings.",
        502, "RAZORPAY_AUTH"
      );
    }
    throw new RefundError("Could not reach Razorpay to check this payment. Please try again in a moment.", 502, "RAZORPAY_UNREACHABLE");
  }
}

function describeVerdict(remote, paymentId) {
  switch (remote.verdict) {
    case "captured":
      return "Razorpay confirms the patient was charged for this payment.";
    case "refunded":
      return "Razorpay has already refunded this payment.";
    case "not_charged":
      return `Razorpay shows this payment as "${remote.status}", which means the patient was never charged. There is nothing to refund.`;
    default:
      return `Razorpay has no record of payment ${paymentId} for the account this server is connected to. Either it never happened, or it was made with a different set of Razorpay keys (test vs live).`;
  }
}

function notChargedError(payment, remote) {
  const advice = describeVerdict(remote, payment.razorpay_payment_id);
  return new RefundError(
    `${advice} Nothing was refunded. If this record should not exist, use "Void record".`,
    409,
    remote.verdict === "missing" ? "NOT_AT_RAZORPAY" : "NOT_CAPTURED"
  );
}

// Used before paying a doctor: never pay out money that was not actually collected.
async function ensureCapturedAtRazorpay(payment) {
  const remote = await inspectRazorpayPayment(payment.razorpay_payment_id);
  if (remote.verdict === "captured") return remote;
  if (remote.verdict === "refunded") {
    throw new RefundError("Razorpay already refunded this payment, so no payout is due.", 409, "ALREADY_REFUNDED");
  }
  throw notChargedError(payment, remote);
}

/**
 * Full refund for a stored payment. Razorpay is asked first, so a refund is only attempted for money that was
 * really collected. Atomic: only one caller can move paid -> refund_initiated, so a double click or a
 * webhook/admin race can never refund twice.
 */
async function refundStoredPayment(paymentId, { reason, by = "system" } = {}) {
  const payment = await AppointmentPayment.findById(paymentId);
  if (!payment) throw new RefundError("Payment not found.", 404);
  if (payment.status === "refunded" || payment.status === "refund_initiated") {
    throw new RefundError("This payment has already been refunded.", 409);
  }
  if (payment.status !== "paid") throw new RefundError(`Payment is ${payment.status} and cannot be refunded.`, 409);
  if (payment.payoutStatus === "PAID") {
    throw new RefundError("The doctor payout was already released for this payment. Reverse the transfer in Razorpay first.", 409);
  }

  const remote = await inspectRazorpayPayment(payment.razorpay_payment_id);
  if (remote.verdict === "refunded") {
    // Already refunded at Razorpay (e.g. from their dashboard): bring our record in line instead of failing.
    payment.status       = "refunded";
    payment.refundStatus = "processed";
    payment.refundedAt   = payment.refundedAt || new Date();
    payment.refundReason = payment.refundReason || reason || "Refunded at Razorpay";
    payment.refundedBy   = payment.refundedBy || by;
    payment.payoutStatus = "NOT_DUE";
    await payment.save();
    return payment;
  }
  if (remote.verdict !== "captured") throw notChargedError(payment, remote);

  const claimed = await AppointmentPayment.findOneAndUpdate(
    { _id: payment._id, status: "paid" },
    { $set: { status: "refund_initiated", refundReason: reason || null, refundedBy: by } },
    { new: true }
  );
  if (!claimed) throw new RefundError("This payment is already being refunded.", 409);

  try {
    const refund = await razorpay.payments.refund(claimed.razorpay_payment_id, {
      amount: claimed.amountPaise,
      speed:  "normal",
      notes:  { bookingRequestId: String(claimed.bookingRequestId), reason: String(reason || "").slice(0, 200), by },
    });

    claimed.status       = "refunded";
    claimed.refundId     = refund.id;
    claimed.refundStatus = refund.status || "pending";
    claimed.refundedAt   = new Date();
    claimed.payoutStatus = "NOT_DUE";
    await claimed.save();
    return claimed;
  } catch (err) {
    await AppointmentPayment.updateOne(
      { _id: claimed._id, status: "refund_initiated" },
      { $set: { status: "paid", refundReason: null, refundedBy: null } }
    );
    throw new RefundError(err?.error?.description || err.message || "Razorpay refund failed.", 502, "REFUND_FAILED");
  }
}

/**
 * Remove a payment record that was never really paid (Razorpay never charged the patient, or has no such
 * payment). Refuses if the money was actually collected — that must be refunded instead. If the booking was
 * still marked confirmed on the strength of this record, it is cancelled and the doctor's slot is freed.
 */
async function voidUnpaidPayment(paymentId, { by = "admin", reason } = {}) {
  const payment = await AppointmentPayment.findById(paymentId);
  if (!payment) throw new RefundError("Payment not found.", 404);
  if (payment.status === "failed") throw new RefundError("This record has already been voided.", 409);
  if (payment.status !== "paid") throw new RefundError(`Payment is ${payment.status}; only an unpaid "paid" record can be voided.`, 409);

  const remote = await inspectRazorpayPayment(payment.razorpay_payment_id);
  if (remote.verdict === "captured" || remote.verdict === "refunded") {
    throw new RefundError(
      "Razorpay shows this payment as real money (charged or refunded), so it cannot be voided. Refund it instead.",
      409, "PAYMENT_IS_REAL"
    );
  }

  const note = String(reason || "").trim().slice(0, 300) || `Never charged at Razorpay (${remote.status || "not found"})`;
  const updated = await AppointmentPayment.findOneAndUpdate(
    { _id: payment._id, status: "paid" },
    { $set: { status: "failed", refundReason: note, refundedBy: by, payoutStatus: "NOT_DUE" } },
    { new: true }
  );
  if (!updated) throw new RefundError("This record was just changed. Please refresh.", 409);

  const moved = await BookingRequest.findOneAndUpdate(
    { _id: payment.bookingRequestId, status: "PAID_CONFIRMED" },
    { $set: { status: "PAYMENT_EXPIRED", cancellationReason: "Payment was never collected by Razorpay", cancelledAt: new Date() } }
  );
  if (moved) await DoctorSchedule.findOneAndUpdate({ bookingRequestId: payment.bookingRequestId }, { status: "RELEASED" });

  return { payment: updated, bookingChanged: !!moved, remote };
}

/**
 * Refund a captured payment that has no booking to attach to (booking was deleted/expired before the
 * money arrived). Used by the webhook. Returns the Razorpay refund entity.
 */
async function refundOrphanPayment(razorpayPaymentId, amountPaise, reason) {
  return razorpay.payments.refund(razorpayPaymentId, {
    amount: amountPaise,
    speed:  "normal",
    notes:  { reason: String(reason || "").slice(0, 200), by: "system" },
  });
}

module.exports = {
  refundStoredPayment, refundOrphanPayment, voidUnpaidPayment,
  inspectRazorpayPayment, ensureCapturedAtRazorpay, describeVerdict, RefundError,
};