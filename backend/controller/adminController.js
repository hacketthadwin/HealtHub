const mongoose           = require("mongoose");
const Joi                = require("joi");
const User               = require("../models/userModel");
const BookingRequest     = require("../models/bookingRequestModel");
const DoctorSchedule     = require("../models/doctorScheduleModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const WebhookEvent       = require("../models/webhookEventModel");
const {
  refundStoredPayment, voidUnpaidPayment, inspectRazorpayPayment, ensureCapturedAtRazorpay, describeVerdict, RefundError,
} = require("../services/refundService");
const { settleOnCompletion, attemptRoutePayout } = require("../services/payoutService");
const { sendEmail, emailBase } = require("../utils/email");
const { esc } = require("../utils/html");

const badId = (res, what = "id") => res.status(400).json({ success: false, message: `Invalid ${what}.` });

exports.getOverview = async (req, res) => {
  try {
    const [pendingDoctors, paid, refunded, payoutPending, payoutFailed, disputes, webhookProblems] = await Promise.all([
      User.countDocuments({ role: "Doctor", verificationStatus: "pending" }),
      AppointmentPayment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amountPaise" }, n: { $sum: 1 } } }]),
      AppointmentPayment.aggregate([{ $match: { status: { $in: ["refunded", "refund_initiated"] } } }, { $group: { _id: null, total: { $sum: "$amountPaise" }, n: { $sum: 1 } } }]),
      AppointmentPayment.countDocuments({ status: "paid", payoutStatus: "PENDING" }),
      AppointmentPayment.countDocuments({ status: "paid", payoutStatus: "FAILED" }),
      BookingRequest.countDocuments({ status: "ABORTED_BY_DOCTOR" }),
      WebhookEvent.countDocuments({ $or: [{ status: "error" }, { outcome: { $in: ["refunded_orphan", "refund_failed"] } }] }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        pendingDoctors,
        paidRupees:     (paid[0]?.total || 0) / 100,     paidCount:     paid[0]?.n || 0,
        refundedRupees: (refunded[0]?.total || 0) / 100, refundedCount: refunded[0]?.n || 0,
        payoutPending, payoutFailed, disputes, webhookProblems,
      },
    });
  } catch (err) {
    console.error("getOverview error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Doctor verification ──────────────────────────────────────────────────────
exports.listDoctors = async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const filter = { role: "Doctor" };
    if (status !== "all") {
      if (!["pending", "approved", "rejected"].includes(status)) return badId(res, "status");
      // Doctors created before verification existed have no status stored — treat them as pending.
      filter.$or = status === "pending"
        ? [{ verificationStatus: "pending" }, { verificationStatus: { $exists: false } }, { verificationStatus: "not_applicable" }]
        : [{ verificationStatus: status }];
    }
    const doctors = await User.find(filter)
      .select("name email phone specialization experience registrationNumber registrationCouncil verificationStatus verificationNote verifiedAt razorpayLinkedAccountId createdAt")
      .sort({ createdAt: -1 }).limit(200).lean();
    return res.status(200).json({ success: true, data: doctors });
  } catch (err) {
    console.error("listDoctors error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const reviewSchema = Joi.object({
  decision: Joi.string().valid("approve", "reject").required(),
  note:     Joi.string().trim().max(300).allow("", null),
}).options({ stripUnknown: true });

exports.reviewDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const { error, value } = reviewSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    if (value.decision === "reject" && !value.note) {
      return res.status(400).json({ success: false, message: "Add a short note explaining the rejection." });
    }

    const approved = value.decision === "approve";
    const doctor = await User.findOneAndUpdate(
      { _id: id, role: "Doctor" },
      { $set: {
          verificationStatus: approved ? "approved" : "rejected",
          verificationNote:   value.note || null,
          verifiedAt:         approved ? new Date() : null,
          verifiedBy:         req.user.id,
      } },
      { new: true }
    ).select("name email verificationStatus verificationNote");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

    await sendEmail({
      to: doctor.email,
      subject: approved ? "Your HealthHub doctor profile is verified ✅" : "Your HealthHub doctor verification — action needed",
      html: emailBase(approved
        ? `<h2 style="color:#1F3A4B;">Hi Dr. ${esc(doctor.name)},</h2><p>Your registration has been verified. Patients can now find you and send consultation requests.</p>`
        : `<h2 style="color:#1F3A4B;">Hi Dr. ${esc(doctor.name)},</h2><p>We could not verify your registration.</p><div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;"><strong>Note:</strong> ${esc(doctor.verificationNote)}</div><p>Please contact support with the correct details.</p>`),
    });

    return res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    console.error("reviewDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.setLinkedAccount = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const accountId = String(req.body?.accountId || "").trim();
    if (accountId && !/^acc_[A-Za-z0-9]{6,40}$/.test(accountId)) {
      return res.status(400).json({ success: false, message: "Linked account id looks like acc_XXXXXXXXXXXXXX." });
    }
    const doctor = await User.findOneAndUpdate(
      { _id: id, role: "Doctor" }, { $set: { razorpayLinkedAccountId: accountId || null } }, { new: true }
    ).select("name razorpayLinkedAccountId");
    if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
    return res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    console.error("setLinkedAccount error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Payments, refunds, payouts ───────────────────────────────────────────────
async function withParties(payments) {
  const bookingIds = payments.map((p) => p.bookingRequestId);
  const bookings = await BookingRequest.find({ _id: { $in: bookingIds } })
    .select("status proposedByDoctor reason").lean();
  const users = await User.find({ _id: { $in: payments.flatMap((p) => [p.patientId, p.doctorId]) } })
    .select("name").lean();
  const bk = new Map(bookings.map((b) => [String(b._id), b]));
  const us = new Map(users.map((u) => [String(u._id), u.name]));
  return payments.map((p) => ({
    ...p,
    // Payments saved before the payout fields existed have no value for them: report the defaults.
    status:       p.status || "paid",
    payoutStatus: p.payoutStatus || "NOT_DUE",
    bookingStatus: bk.get(String(p.bookingRequestId))?.status || null,
    scheduledDate: bk.get(String(p.bookingRequestId))?.proposedByDoctor?.scheduledDate || null,
    patientName:   us.get(String(p.patientId)) || "—",
    doctorName:    us.get(String(p.doctorId)) || "—",
  }));
}

exports.listPayments = async (req, res) => {
  try {
    const { status, payoutStatus } = req.query;
    const filter = {};
    if (status)       filter.status = status;
    if (payoutStatus) filter.payoutStatus = payoutStatus;
    const payments = await AppointmentPayment.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json({ success: true, data: await withParties(payments) });
  } catch (err) {
    console.error("listPayments error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Consultations the doctor marked expired after the window: the patient paid but no consultation was completed.
exports.listDisputes = async (req, res) => {
  try {
    const aborted = await BookingRequest.find({ status: "ABORTED_BY_DOCTOR" }).select("_id").lean();
    const payments = await AppointmentPayment.find({
      bookingRequestId: { $in: aborted.map((b) => b._id) },
      status: "paid",
    }).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json({ success: true, data: await withParties(payments) });
  } catch (err) {
    console.error("listDisputes error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.refundPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (!reason) return res.status(400).json({ success: false, message: "A reason is required." });

    const payment = await refundStoredPayment(id, { reason, by: "admin" });

    // Refunding a still-active booking also cancels it and frees the doctor's slot.
    const moved = await BookingRequest.findOneAndUpdate(
      { _id: payment.bookingRequestId, status: "PAID_CONFIRMED" },
      { $set: { status: "PAID_CANCELLED", cancelledAt: new Date(), cancelledBy: req.user.id, cancellationReason: `Refunded by admin: ${reason}` } }
    );
    if (moved) await DoctorSchedule.findOneAndUpdate({ bookingRequestId: payment.bookingRequestId }, { status: "RELEASED" });

    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    if (err instanceof RefundError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    console.error("refundPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Release (or retry) the doctor's payout. Works for completed consultations and for disputes settled in the doctor's favour.
exports.releasePayout = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    let payment = await AppointmentPayment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found." });
    if (payment.status !== "paid") return res.status(409).json({ success: false, message: `Payment is ${payment.status}.` });
    const currentPayout = payment.payoutStatus || "NOT_DUE";
    if (currentPayout === "PAID") return res.status(409).json({ success: false, message: "Payout already released." });

    await ensureCapturedAtRazorpay(payment);          // never pay a doctor out of money that was not collected

    if (currentPayout === "NOT_DUE") {
      payment = await settleOnCompletion(payment._id);
    } else if (process.env.ENABLE_ROUTE_PAYOUTS === "true") {
      payment = await attemptRoutePayout(payment);
    }
    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    if (err instanceof RefundError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    console.error("releasePayout error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Ask Razorpay what really happened to a payment, and bring our record in line if it was refunded there.
exports.checkPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const payment = await AppointmentPayment.findById(id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found." });

    const remote = await inspectRazorpayPayment(payment.razorpay_payment_id);

    let synced = false;
    if (remote.verdict === "refunded" && (payment.status || "paid") === "paid") {
      payment.status       = "refunded";
      payment.refundStatus = "processed";
      payment.refundedAt   = payment.refundedAt || new Date();
      payment.refundReason = payment.refundReason || "Refunded at Razorpay";
      payment.refundedBy   = payment.refundedBy || "razorpay";
      payment.payoutStatus = "NOT_DUE";
      await payment.save();
      synced = true;
    }

    const localStatus  = payment.status || "paid";
    const localPayout  = payment.payoutStatus || "NOT_DUE";
    const booking      = await BookingRequest.findById(payment.bookingRequestId).select("status");

    return res.status(200).json({
      success: true,
      data: {
        payment: {
          id: payment._id,
          razorpayPaymentId: payment.razorpay_payment_id,
          status: localStatus,
          payoutStatus: localPayout,
          amountRupees: (payment.amountPaise || 0) / 100,
          bookingStatus: booking?.status || null,
        },
        razorpay: {
          found: remote.found,
          status: remote.status,
          amountRupees: remote.amountPaise != null ? remote.amountPaise / 100 : null,
          refundedRupees: remote.amountRefundedPaise != null ? remote.amountRefundedPaise / 100 : null,
        },
        verdict: remote.verdict,
        advice: describeVerdict(remote, payment.razorpay_payment_id),
        synced,
        canRefund: remote.verdict === "captured" && localStatus === "paid" && localPayout !== "PAID",
        canVoid: ["not_charged", "missing"].includes(remote.verdict) && localStatus === "paid",
      },
    });
  } catch (err) {
    if (err instanceof RefundError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    console.error("checkPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Remove a payment record that Razorpay never collected (it then stops counting as money received).
exports.voidPayment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    const out = await voidUnpaidPayment(id, { by: "admin", reason });
    return res.status(200).json({ success: true, data: out.payment, bookingChanged: out.bookingChanged });
  } catch (err) {
    if (err instanceof RefundError) return res.status(err.status).json({ success: false, code: err.code, message: err.message });
    console.error("voidPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.markPayoutPaid = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return badId(res);
    const reference = String(req.body?.reference || "").trim().slice(0, 100);
    if (!reference) return res.status(400).json({ success: false, message: "Enter the bank / UPI transfer reference." });

    const payment = await AppointmentPayment.findOneAndUpdate(
      { _id: id, status: "paid", payoutStatus: { $in: ["PENDING", "FAILED"] } },
      { $set: { payoutStatus: "PAID", payoutMethod: "manual", payoutReference: reference, payoutAt: new Date(), payoutError: null } },
      { new: true }
    );
    if (!payment) return res.status(409).json({ success: false, message: "Only a pending or failed payout can be marked paid." });
    return res.status(200).json({ success: true, data: payment });
  } catch (err) {
    console.error("markPayoutPaid error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.listWebhookEvents = async (req, res) => {
  try {
    const filter = req.query.problems === "false"
      ? {}
      : { $or: [{ status: "error" }, { outcome: { $in: ["refunded_orphan", "refund_failed"] } }] };
    const events = await WebhookEvent.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    return res.status(200).json({ success: true, data: events });
  } catch (err) {
    console.error("listWebhookEvents error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};