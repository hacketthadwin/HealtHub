const crypto           = require("crypto");
const razorpay         = require("../config/paymentConfig");
const BookingRequest   = require("../models/bookingRequestModel");
const DoctorSchedule   = require("../models/doctorScheduleModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const { sendEmail, emailBase } = require("../utils/email");
const { esc } = require("../utils/html");

const AWAITING = "DOCTOR_ACCEPTED_AWAITING_PAYMENT";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RACE_WAIT_MS = () => Number(process.env.CONFIRM_RACE_WAIT_MS ?? 250);

/**
 * Turns an awaiting-payment booking into a confirmed one. This is the ONE place that does it, used by
 * the browser verify endpoint, the Razorpay webhook and the reconciliation job — so whichever arrives
 * first wins and the others are harmless no-ops.
 *
 * outcome: "confirmed" | "already_confirmed" | "duplicate_payment" | "in_progress" | "not_payable" | "amount_mismatch"
 */
async function confirmPaidBooking({
  bookingRequestId, orderId, paymentId, signature = null, amountPaise = null, via = "checkout",
}) {
  const existing = await AppointmentPayment.findOne({ razorpay_payment_id: paymentId });
  if (existing) return { outcome: "already_confirmed", payment: existing };

  const booking = await BookingRequest.findById(bookingRequestId);
  if (!booking) return { outcome: "not_payable", reason: "booking_missing" };

  if (amountPaise != null && Number(amountPaise) !== Number(booking.consultingFeePaise)) {
    return { outcome: "amount_mismatch", booking };
  }

  const meetRoomId = `HealthHub-${crypto.randomBytes(8).toString("hex")}`;
  const meetLink   = `https://meet.jit.si/${meetRoomId}`;

  // Atomic claim: only one caller can move AWAITING -> PAID_CONFIRMED.
  const claimed = await BookingRequest.findOneAndUpdate(
    { _id: booking._id, status: AWAITING },
    { $set: { status: "PAID_CONFIRMED", meetLink, meetRoomId } },
    { new: true }
  );

  if (!claimed) {
    // Lost the race, or the booking is expired / cancelled. If a payment is already stored for this
    // booking the caller treats it as done; otherwise the money must be refunded by the caller.
    let other = await AppointmentPayment.findOne({ bookingRequestId: booking._id });

    // The other caller (browser verify vs webhook) may have claimed the booking a moment ago and still be writing
    // its payment record. Give it a short while rather than concluding this payment is surplus and refunding it.
    if (!other) {
      const fresh = await BookingRequest.findById(booking._id).select("status");
      if (fresh?.status === "PAID_CONFIRMED") {
        for (let i = 0; i < 8 && !other; i++) {
          await sleep(RACE_WAIT_MS());
          other = await AppointmentPayment.findOne({ bookingRequestId: booking._id });
        }
        if (!other) return { outcome: "in_progress", booking };     // caller retries later; nothing is refunded
      }
    }

    if (other && other.razorpay_payment_id === paymentId) return { outcome: "already_confirmed", payment: other };
    // A DIFFERENT payment already confirmed this booking: this one is a double charge and gets refunded.
    if (other) return { outcome: "duplicate_payment", booking, payment: other };
    return { outcome: "not_payable", booking, reason: `status_${booking.status}` };
  }

  let payment;
  try {
    payment = await AppointmentPayment.create({
      bookingRequestId:    claimed._id,
      patientId:           claimed.patientId,
      doctorId:            claimed.doctorId,
      amountPaise:         claimed.consultingFeePaise,
      razorpay_order_id:   orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature:  signature,
      capturedVia:         via,
      status:              "paid",
    });
  } catch (err) {
    if (err?.code === 11000) {
      const dup = await AppointmentPayment.findOne({ razorpay_payment_id: paymentId });
      if (dup) return { outcome: "already_confirmed", payment: dup };
    }
    // Put the booking back so the next webhook retry / reconcile pass can finish the job.
    await BookingRequest.updateOne(
      { _id: claimed._id, status: "PAID_CONFIRMED", paymentId: null },
      { $set: { status: AWAITING, meetLink: null, meetRoomId: null } }
    );
    throw err;
  }

  claimed.paymentId = payment._id;
  await claimed.save();

  await DoctorSchedule.findOneAndUpdate(
    { bookingRequestId: claimed._id, status: "RESERVED" },
    { status: "ACTIVE" }
  );

  await sendConfirmationEmails(claimed).catch((e) => console.error("Confirmation email error:", e.message));

  return { outcome: "confirmed", booking: claimed, payment };
}

async function sendConfirmationEmails(booking) {
  const populated = await booking.populate([
    { path: "patientId", select: "name email" },
    { path: "doctorId",  select: "name email" },
  ]);

  const scheduledDate = booking.proposedByDoctor?.scheduledDate
    ? new Date(booking.proposedByDoctor.scheduledDate).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
    : "TBD";
  const scheduledTime = booking.proposedByDoctor?.scheduledTime || "TBD";
  const feeRupees     = (booking.consultingFeePaise / 100).toFixed(2);
  const meetLink      = booking.meetLink;

  await Promise.all([
    sendEmail({
      to:      populated.patientId.email,
      subject: "✅ Appointment Confirmed & Paid — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi ${esc(populated.patientId.name)},</h2>
        <p>Your payment has been received and your appointment with <strong>Dr. ${esc(populated.doctorId.name)}</strong> is confirmed!</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Date:</strong> ${esc(scheduledDate)}<br>
          <strong>Time:</strong> ${esc(scheduledTime)}<br>
          <strong>Amount Paid:</strong> ₹${feeRupees}<br><br>
          <a href="${meetLink}" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">
            Join Video Call →
          </a>
        </div>
        <p style="font-size:12px;color:#888;">You'll receive reminders before your appointment.</p>
      `),
    }),
    sendEmail({
      to:      populated.doctorId.email,
      subject: "💳 Payment Received — Appointment Confirmed — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi Dr. ${esc(populated.doctorId.name)},</h2>
        <p>Payment from <strong>${esc(populated.patientId.name)}</strong> has been received. The appointment is confirmed!</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Patient:</strong> ${esc(populated.patientId.name)}<br>
          <strong>Date:</strong> ${esc(scheduledDate)}<br>
          <strong>Time:</strong> ${esc(scheduledTime)}<br>
          <strong>Fee Received:</strong> ₹${feeRupees}<br><br>
          <a href="${meetLink}" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">
            Start Video Call →
          </a>
        </div>
      `),
    }),
  ]);
}

/**
 * Asks Razorpay whether an awaiting-payment booking's order was actually paid and confirms it if so.
 * Used by the background job so a missed webhook never turns a paid booking into an expired one.
 * Returns "confirmed" | "none" (nothing captured) | "error" (could not ask Razorpay — do NOT expire yet).
 */
async function reconcileBooking(booking) {
  if (!booking.razorpayOrderId) return "none";

  let result;
  try {
    result = await razorpay.orders.fetchPayments(booking.razorpayOrderId);
  } catch (err) {
    console.error(`[reconcile] fetchPayments failed for ${booking.razorpayOrderId}:`, err?.error?.description || err.message);
    return "error";
  }

  const captured = (result?.items || []).find((p) => p.status === "captured");
  if (!captured) return "none";

  const out = await confirmPaidBooking({
    bookingRequestId: booking._id,
    orderId:     booking.razorpayOrderId,
    paymentId:   captured.id,
    amountPaise: captured.amount,
    via:         "reconcile",
  });
  return out.outcome === "confirmed" || out.outcome === "already_confirmed" ? "confirmed" : "none";
}

module.exports = { confirmPaidBooking, reconcileBooking, AWAITING };