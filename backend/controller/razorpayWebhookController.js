const crypto           = require("crypto");
const BookingRequest   = require("../models/bookingRequestModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const WebhookEvent     = require("../models/webhookEventModel");
const User             = require("../models/userModel");
const { confirmPaidBooking } = require("../services/bookingService");
const { refundOrphanPayment } = require("../services/refundService");
const { sendEmail, emailBase } = require("../utils/email");
const { esc } = require("../utils/html");

function signatureValid(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function emailPatientRefund(patientId, amountPaise, why) {
  try {
    if (!patientId) return;
    const patient = await User.findById(patientId).select("name email");
    if (!patient?.email) return;
    await sendEmail({
      to: patient.email,
      subject: "Your payment has been refunded — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi ${esc(patient.name)},</h2>
        <p>We received your payment of <strong>₹${(amountPaise / 100).toFixed(2)}</strong>, but ${esc(why)}.</p>
        <p>The full amount has been refunded to your original payment method. It usually appears within 5–7 working days.</p>
        <p>You are welcome to send a new consultation request.</p>
      `),
    });
  } catch (e) {
    console.error("Refund email error:", e.message);
  }
}

// payment.captured / order.paid
async function handleCaptured(payment) {
  const meta = {
    razorpayPaymentId: payment.id,
    razorpayOrderId:   payment.order_id,
    bookingRequestId:  payment.notes?.bookingRequestId || null,
  };

  // Server-set note first (survives a re-issued order), then the order id.
  let bookingId = payment.notes?.bookingRequestId;
  if (!bookingId || !/^[a-f\d]{24}$/i.test(bookingId)) {
    const byOrder = await BookingRequest.findOne({ razorpayOrderId: payment.order_id }).select("_id");
    bookingId = byOrder?._id?.toString() || null;
  }

  let result = { outcome: "not_payable", reason: "booking_missing" };
  if (bookingId) {
    result = await confirmPaidBooking({
      bookingRequestId: bookingId,
      orderId:     payment.order_id,
      paymentId:   payment.id,
      amountPaise: payment.amount,
      via:         "webhook",
    });
  }

  if (result.outcome === "confirmed" || result.outcome === "already_confirmed") {
    return { ...meta, outcome: result.outcome };
  }

  if (result.outcome === "in_progress") {
    // Another request is still recording this booking's payment. Do NOT refund; a non-2xx makes Razorpay retry.
    const e = new Error("confirmation_in_progress");
    e.meta = { ...meta, outcome: "retry_later" };
    throw e;
  }

  // Money was captured for something we cannot fulfil: booking deleted, expired, cancelled or amount
  // mismatch. Never keep it — refund in full.
  const why = result.outcome === "amount_mismatch"
    ? "the amount did not match the booking"
    : result.outcome === "duplicate_payment"
      ? "this booking had already been paid for"
      : "the booking was no longer available (it was cancelled or the payment window had closed)";
  try {
    const refund = await refundOrphanPayment(payment.id, payment.amount, `Auto-refund: ${result.outcome} ${result.reason || ""}`);
    await emailPatientRefund(payment.notes?.patientId, payment.amount, why);
    return { ...meta, outcome: "refunded_orphan", refundId: refund?.id || null, detail: `${result.outcome} ${result.reason || ""}`.trim() };
  } catch (err) {
    // Throw so Razorpay retries the delivery and an admin can see the failed event.
    const e = new Error(`refund_failed: ${err?.error?.description || err.message}`);
    e.meta = { ...meta, outcome: "refund_failed" };
    throw e;
  }
}

async function handleRefundEvent(refund, failed) {
  const payment = await AppointmentPayment.findOne({ razorpay_payment_id: refund.payment_id });
  if (!payment) return { razorpayPaymentId: refund.payment_id, outcome: "ignored", detail: "no stored payment (orphan refund)" };
  payment.refundId     = refund.id;
  payment.refundStatus = failed ? "failed" : "processed";
  if (!failed) { payment.status = "refunded"; payment.refundedAt = payment.refundedAt || new Date(); }
  await payment.save();
  return { razorpayPaymentId: refund.payment_id, outcome: failed ? "refund_failed" : "refund_processed", refundId: refund.id };
}

exports.signatureValid = signatureValid;

exports.razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook.");
    return res.status(500).json({ success: false, message: "Webhook not configured." });
  }

  const raw = req.body;                       // Buffer (express.raw)
  if (!Buffer.isBuffer(raw) || !signatureValid(raw, req.get("x-razorpay-signature"), secret)) {
    return res.status(400).json({ success: false, message: "Invalid signature." });
  }

  let event;
  try { event = JSON.parse(raw.toString("utf8")); }
  catch { return res.status(400).json({ success: false, message: "Invalid JSON." }); }

  const eventId = req.get("x-razorpay-event-id") || crypto.createHash("sha256").update(raw).digest("hex");

  // Idempotency: a delivery that already finished is acknowledged and skipped.
  let record;
  try {
    record = await WebhookEvent.create({ eventId, event: event.event });
  } catch (err) {
    if (err?.code !== 11000) { console.error("Webhook log error:", err); return res.status(500).end(); }
    record = await WebhookEvent.findOne({ eventId });
    if (record?.status === "done") return res.status(200).json({ success: true, duplicate: true });
    if (record?.status === "processing" && Date.now() - new Date(record.updatedAt).getTime() < 2 * 60 * 1000) {
      return res.status(200).json({ success: true, inProgress: true });
    }
    record.status = "processing";
    await record.save();
  }

  try {
    let meta = { outcome: "ignored" };
    const p = event.payload || {};

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = p.payment?.entity;
      if (payment && (payment.status === "captured" || event.event === "order.paid")) meta = await handleCaptured(payment);
    } else if (event.event === "refund.processed") {
      meta = await handleRefundEvent(p.refund?.entity, false);
    } else if (event.event === "refund.failed") {
      meta = await handleRefundEvent(p.refund?.entity, true);
    }

    Object.assign(record, meta, { status: "done" });
    await record.save();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    if (err.meta) Object.assign(record, err.meta);
    record.status = "error";
    record.detail = String(err.message || err).slice(0, 300);
    await record.save().catch(() => {});
    return res.status(500).json({ success: false });      // non-2xx => Razorpay retries
  }
};