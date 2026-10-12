const BookingRequest  = require("../models/bookingRequestModel");
const DoctorSchedule  = require("../models/doctorScheduleModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const User            = require("../models/userModel");

const { ACTIVE_STATUSES } = require("../models/bookingRequestModel");

const MAX_ACTIVE_REQUESTS  = parseInt(process.env.MAX_ACTIVE_REQUESTS  || "5");
const PAYMENT_WINDOW_HOURS = parseInt(process.env.PAYMENT_WINDOW_HOURS || "48");

const BLOCKING_STATUSES = [
  "PENDING_DOCTOR_APPROVAL",
  "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
  "PAID_CONFIRMED",
];

const { sendEmail, emailBase } = require("../utils/email");
const { esc }                  = require("../utils/html");
const { parseISTDateTime }     = require("../utils/time");
const { refundStoredPayment, RefundError } = require("../services/refundService");
const { settleOnCompletion }   = require("../services/payoutService");

const DOCTOR_RESPONSE_HOURS = parseInt(process.env.DOCTOR_RESPONSE_HOURS || "48");
const FREE_CANCEL_HOURS     = Number(process.env.FREE_CANCEL_HOURS || 24);

const slotStartOf = (b) =>
  b.proposedByDoctor?.scheduledDate ? new Date(b.proposedByDoctor.scheduledDate) : null;
const slotEndOf = (b) => {
  const start = slotStartOf(b);
  if (!start) return null;
  return new Date(start.getTime() + (b.proposedByDoctor?.slotDurationMinutes || 30) * 60 * 1000);
};
const emitTo = (userId, event, payload) => {
  const io = require("../socketManager").getIO();
  if (io) io.to(`user:${String(userId)}`).emit(event, payload);
};

exports.createBookingRequest = async (req, res) => {
  try {
    const { doctorId, reason } = req.body;
    const patientId = req.user.id;

    if (!doctorId || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "doctorId and reason are required.",
      });
    }

    const doctor = await User.findOne({
      _id:  doctorId,
      role: "Doctor",
      verificationStatus: "approved",
    }).select("_id name consultingFee availability");

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    if (doctor.availability === "On Leave") {
      return res.status(400).json({
        success: false,
        message: "This doctor is currently on leave. Please choose another doctor or try again later.",
      });
    }

    if (!doctor.consultingFee || doctor.consultingFee === 0) {
      return res.status(400).json({
        success: false,
        message: "This doctor has not set their consulting fee yet. Please ask them to update their profile, or choose another doctor.",
      });
    }

    const activeCount = await BookingRequest.countDocuments({
      patientId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (activeCount >= MAX_ACTIVE_REQUESTS) {
      return res.status(429).json({
        success: false,
        message:
          `You already have ${activeCount} active booking requests (max ${MAX_ACTIVE_REQUESTS}). ` +
          `Pay for one, wait for a rejection, or cancel an existing request before sending a new one.`,
        activeCount,
        maxAllowed: MAX_ACTIVE_REQUESTS,
      });
    }

    const existingRequests = await BookingRequest.find({
      patientId,
      doctorId,
      status: { $in: BLOCKING_STATUSES },
    });

    for (const existing of existingRequests) {
      if (
        existing.status === "PENDING_DOCTOR_APPROVAL" ||
        existing.status === "DOCTOR_ACCEPTED_AWAITING_PAYMENT"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "You already have an active request with this doctor. " +
            "Please wait for the doctor to respond or cancel your existing request.",
          existingRequestId: existing._id,
          existingStatus: existing.status,
        });
      }

      if (existing.status === "PAID_CONFIRMED") {
        const scheduledDate = existing.proposedByDoctor?.scheduledDate;
        const durationMins  = existing.proposedByDoctor?.slotDurationMinutes || 30;

        if (scheduledDate) {
          const slotEnd = new Date(
            new Date(scheduledDate).getTime() + durationMins * 60 * 1000
          );
          if (new Date() < slotEnd) {
            return res.status(409).json({
              success: false,
              message:
                "You already have a confirmed appointment with this doctor that has not ended yet. " +
                "Please wait until your current consultation is complete before booking again.",
              existingRequestId: existing._id,
              existingStatus: existing.status,
              slotEndsAt: slotEnd.toISOString(),
            });
          }
        } else {
          return res.status(409).json({
            success: false,
            message:
              "You have a paid confirmed appointment with this doctor. " +
              "Please complete your current consultation before booking again.",
            existingRequestId: existing._id,
            existingStatus: existing.status,
          });
        }
      }
    }

    const newRequest = await BookingRequest.create({
      patientId,
      doctorId,
      reason: reason.trim(),
      status: "PENDING_DOCTOR_APPROVAL",
      consultingFeePaise: doctor.consultingFee,
      responseDeadline: new Date(Date.now() + DOCTOR_RESPONSE_HOURS * 60 * 60 * 1000),
    });

    const [patient, doctorDoc] = await Promise.all([
      User.findById(patientId).select("name"),
      User.findById(doctorId).select("name email"),
    ]);

    await sendEmail({
      to:      doctorDoc.email,
      subject: "🩺 New Consultation Request — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi Dr. ${esc(doctorDoc.name)},</h2>
        <p><strong>${esc(patient.name)}</strong> has sent you a new consultation request.</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Reason:</strong> ${esc(reason.trim())}<br>
          <strong>Your Listed Fee:</strong> ₹${(doctor.consultingFee / 100).toFixed(2)}
        </div>
        <p>Log in to your HealthHub dashboard to <strong>Accept</strong> (and propose a time) or <strong>Reject</strong> this request.</p>
      `),
    });

    return res.status(201).json({
      success: true,
      message: `Booking request sent to Dr. ${doctor.name}.`,
      data: {
        requestId:           newRequest._id,
        status:              newRequest.status,
        consultingFeeRupees: newRequest.consultingFeePaise / 100,
        remainingSlots:      MAX_ACTIVE_REQUESTS - (activeCount + 1),
      },
    });
  } catch (err) {
    console.error("createBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.acceptBookingRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const doctorId = req.user.id;
    const { scheduledDate, scheduledTime, slotDurationMinutes = 30 } = req.body;

    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: "Doctor must provide scheduledDate (YYYY-MM-DD) and scheduledTime (e.g. '10:30 AM') when accepting.",
      });
    }

    let proposedStart;
    try {
      // Doctors enter IST; parse with an explicit +05:30 offset (the server runs in UTC).
      proposedStart = parseISTDateTime(scheduledDate, scheduledTime);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid date or time. Use YYYY-MM-DD and 'HH:MM AM/PM'." });
    }

    if (isNaN(proposedStart.getTime()) || proposedStart <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Proposed slot must be a valid future datetime.",
      });
    }

    const duration    = Math.max(15, Math.min(120, Number(slotDurationMinutes)));
    const proposedEnd = new Date(proposedStart.getTime() + duration * 60 * 1000);

    const bookingRequest = await BookingRequest.findOne({
      _id:      requestId,
      doctorId,
      status:   "PENDING_DOCTOR_APPROVAL",
    });

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found or not in an acceptable state.",
      });
    }

    const conflict = await DoctorSchedule.findOne({
      doctorId,
      status:        { $in: ["RESERVED", "ACTIVE"] },
      scheduledDate: { $lt: proposedEnd },
      slotEnd:       { $gt: proposedStart },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Slot conflict: you already have an appointment at ${conflict.scheduledTime} (${conflict.slotDurationMinutes} min). Please choose a different time.`,
        conflictingSlot: {
          scheduledTime:       conflict.scheduledTime,
          slotDurationMinutes: conflict.slotDurationMinutes,
        },
      });
    }

    const paymentDeadline = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);

    bookingRequest.status           = "DOCTOR_ACCEPTED_AWAITING_PAYMENT";
    bookingRequest.proposedByDoctor = {
      scheduledDate:       proposedStart,
      scheduledTime,
      slotDurationMinutes: duration,
    };
    bookingRequest.paymentDeadline = paymentDeadline;
    await bookingRequest.save();

    await DoctorSchedule.create({
      doctorId,
      bookingRequestId:    bookingRequest._id,
      scheduledDate:       proposedStart,
      scheduledTime,
      slotDurationMinutes: duration,
      slotEnd:             proposedEnd,
      status:              "RESERVED",
    });

    const populated = await bookingRequest.populate([
      { path: "patientId", select: "name email" },
      { path: "doctorId",  select: "name" },
    ]);

    await sendEmail({
      to:      populated.patientId.email,
      subject: "✅ Your Consultation Request Has Been Accepted — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi ${esc(populated.patientId.name)},</h2>
        <p>Dr. <strong>${esc(populated.doctorId.name)}</strong> has accepted your consultation request and proposed a time!</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Proposed Date:</strong> ${esc(scheduledDate)}<br>
          <strong>Proposed Time:</strong> ${esc(scheduledTime)}<br>
          <strong>Duration:</strong> ${duration} minutes<br>
          <strong>Consultation Fee:</strong> ₹${(bookingRequest.consultingFeePaise / 100).toFixed(2)}<br>
          <strong>Pay Before:</strong> ${paymentDeadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </div>
        <p>
          Log in to HealthHub and click <strong>"Pay Now"</strong> on your booking to confirm.
          You have <strong>${PAYMENT_WINDOW_HOURS} hours</strong> — after that the slot is released.
        </p>
      `),
    });

    return res.status(200).json({
      success: true,
      message: `Request accepted. Patient notified and has ${PAYMENT_WINDOW_HOURS}h to complete payment.`,
      data: {
        requestId:           bookingRequest._id,
        status:              bookingRequest.status,
        proposedByDoctor:    bookingRequest.proposedByDoctor,
        paymentDeadline,
        consultingFeeRupees: bookingRequest.consultingFeePaise / 100,
      },
    });
  } catch (err) {
    console.error("acceptBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.rejectBookingRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { rejectionReason } = req.body;

    const bookingRequest = await BookingRequest.findOneAndUpdate(
      {
        _id:      requestId,
        doctorId: req.user.id,
        status:   "PENDING_DOCTOR_APPROVAL",
      },
      {
        status:          "DOCTOR_REJECTED",
        rejectionReason: rejectionReason?.trim() || "No reason provided.",
      },
      { new: true }
    ).populate("patientId", "name email");

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found or already actioned.",
      });
    }

    await sendEmail({
      to:      bookingRequest.patientId.email,
      subject: "Appointment Request Update — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi ${esc(bookingRequest.patientId.name)},</h2>
        <p>Unfortunately, your consultation request has been <strong style="color:#dc2626;">declined</strong>.</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Reason:</strong> ${esc(bookingRequest.rejectionReason)}
        </div>
        <p>You can browse and request other available doctors on HealthHub.</p>
      `),
    });

    return res.status(200).json({
      success: true,
      message: "Request rejected.",
      data: { requestId: bookingRequest._id, status: bookingRequest.status },
    });
  } catch (err) {
    console.error("rejectBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.cancelBookingRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const patientId = req.user.id;

    // Only cancellable if not yet paid
    const bookingRequest = await BookingRequest.findOne({
      _id:      requestId,
      patientId,
      status:   { $in: ["PENDING_DOCTOR_APPROVAL", "DOCTOR_ACCEPTED_AWAITING_PAYMENT"] },
    });

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "No cancellable request found. If payment was already made, please contact support.",
      });
    }

    const wasAccepted = bookingRequest.status === "DOCTOR_ACCEPTED_AWAITING_PAYMENT";

    if (wasAccepted) {
      await DoctorSchedule.deleteOne({ bookingRequestId: bookingRequest._id });
    }

    if (wasAccepted) {
      const populated = await bookingRequest.populate("doctorId", "name email");
      await sendEmail({
        to:      populated.doctorId.email,
        subject: "Patient Cancelled Appointment — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi Dr. ${esc(populated.doctorId.name)},</h2>
          <p>A patient has cancelled their appointment after you accepted it.</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Was Scheduled:</strong> ${esc(bookingRequest.proposedByDoctor?.scheduledTime)} on ${esc(bookingRequest.proposedByDoctor?.scheduledDate?.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" }))}<br>
            <strong>Reason:</strong> Patient chose to cancel.
          </div>
          <p>Your time slot has been freed and is available for other patients.</p>
        `),
      });
    }

    await BookingRequest.deleteOne({ _id: requestId });

    return res.status(200).json({
      success: true,
      message: "Booking request cancelled and removed successfully.",
      data: {
        requestId,
        deleted:      true,
        slotReleased: wasAccepted,
      },
    });
  } catch (err) {
    console.error("cancelBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.abortBookingRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const doctorId          = req.user.id;
    const { abortReason }   = req.body;

    const bookingRequest = await BookingRequest.findOne({
      _id:      requestId,
      doctorId,
      status:   "PAID_CONFIRMED",
    })
      .populate("patientId", "name email _id")
      .populate("doctorId",  "name");

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message:
          "Appointment not found. It may not belong to you, may already be aborted, " +
          "or may not be in an active (PAID_CONFIRMED) state.",
      });
    }

    const scheduledDate = bookingRequest.proposedByDoctor?.scheduledDate;
    const durationMins  = bookingRequest.proposedByDoctor?.slotDurationMinutes || 30;

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: "This appointment has no scheduled time. Cannot determine if the window has passed.",
      });
    }

    const slotEnd = new Date(
      new Date(scheduledDate).getTime() + durationMins * 60 * 1000
    );

    if (new Date() < slotEnd) {
      return res.status(400).json({
        success: false,
        message:
          "The consultation window has not yet ended. " +
          "You can only mark an appointment as expired after the scheduled end time.",
        slotEndsAt:    slotEnd.toISOString(),
        currentTime:   new Date().toISOString(),
        minutesRemaining: Math.ceil((slotEnd - new Date()) / 60000),
      });
    }

    bookingRequest.status      = "ABORTED_BY_DOCTOR";
    bookingRequest.abortedBy   = doctorId;
    bookingRequest.abortedAt   = new Date();
    bookingRequest.abortReason =
      abortReason?.trim() ||
      "Consultation window passed without completing the appointment.";
    await bookingRequest.save();

    await DoctorSchedule.findOneAndUpdate(
      { bookingRequestId: bookingRequest._id },
      { status: "COMPLETED" }
    );

    if (bookingRequest.patientId?.email) {
      const scheduledDateStr = new Date(scheduledDate).toLocaleDateString("en-IN", {
        weekday: "short",
        month:   "long",
        day:     "numeric",
        year:    "numeric",
        timeZone: "Asia/Kolkata",
      });

      await sendEmail({
        to:      bookingRequest.patientId.email,
        subject: "Appointment Expired — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${esc(bookingRequest.patientId.name)},</h2>
          <p>
            Your scheduled appointment with
            <strong>Dr. ${esc(bookingRequest.doctorId?.name || "your doctor")}</strong>
            has been marked as <strong style="color:#dc2626;">expired</strong>
            because the consultation window has already passed.
          </p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Original Scheduled Date:</strong> ${esc(scheduledDateStr)}<br>
            <strong>Time:</strong> ${esc(bookingRequest.proposedByDoctor?.scheduledTime || "N/A")}<br>
            <strong>Reason for visit:</strong> ${esc(bookingRequest.reason)}
          </div>
          <p>
            If you still need a consultation, please
            <strong>book a new appointment</strong> at your convenience.
            Your medical history and previous records are safely stored in your account.
          </p>
        `),
      });
    }

    const { getIO } = require("../socketManager");
    const io = getIO();
    if (io) {
      io.to(`user:${bookingRequest.patientId._id.toString()}`).emit(
        "appointment_aborted",
        {
          requestId: bookingRequest._id,
          status:    "ABORTED_BY_DOCTOR",
          message:   "Your appointment has been marked as expired by the doctor.",
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Appointment has been marked as expired. Patient has been notified.",
      data: {
        requestId:  bookingRequest._id,
        status:     bookingRequest.status,
        abortedAt:  bookingRequest.abortedAt,
        abortReason: bookingRequest.abortReason,
      },
    });
  } catch (err) {
    console.error("abortBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getMyBookingRequests = async (req, res) => {
  try {
    const patientId = req.user.id;

    const requests = await BookingRequest.find({
      patientId,
      status: { $nin: ["PATIENT_CANCELLED"] },
    })
      .populate(
        "doctorId",
        "name specialization profilePicture consultingFee availability"
      )
      .sort({ createdAt: -1 });

    const activeCount = requests.filter((r) =>
      ACTIVE_STATUSES.includes(r.status)
    ).length;

    return res.status(200).json({
      success: true,
      data: requests,
      meta: {
        activeCount,
        maxAllowed:     MAX_ACTIVE_REQUESTS,
        remainingSlots: Math.max(0, MAX_ACTIVE_REQUESTS - activeCount),
      },
    });
  } catch (err) {
    console.error("getMyBookingRequests error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getDoctorQueue = async (req, res) => {
  try {
    const doctorId = req.user.id;

    const requests = await BookingRequest.find({
      doctorId,
      status: { $nin: ["PATIENT_CANCELLED"] },
    })
      .populate("patientId", "name email profilePicture")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    console.error("getDoctorQueue error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.getSingleRequest = async (req, res) => {
  try {
    const { id }  = req.params;
    const userId  = req.user.id;

    const request = await BookingRequest.findOne({
      _id: id,
      $or: [{ patientId: userId }, { doctorId: userId }],
    })
      .populate("patientId", "name email")
      .populate("doctorId",  "name specialization consultingFee");

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found." });
    }

    return res.status(200).json({ success: true, data: request });
  } catch (err) {
    console.error("getSingleRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Doctor marks a paid consultation as completed (releases the payout, unlocks reviews)
// ─────────────────────────────────────────────────────────────────────────────
exports.completeBookingRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const doctorId = req.user.id;

    const booking = await BookingRequest.findOne({
      _id: requestId, doctorId, status: "PAID_CONFIRMED",
    }).populate("patientId", "name email _id").populate("doctorId", "name");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or not in a confirmed (paid) state.",
      });
    }

    const start = slotStartOf(booking);
    if (start && new Date() < start) {
      return res.status(400).json({
        success: false,
        message: "You can mark a consultation as completed only after its scheduled start time.",
        startsAt: start.toISOString(),
      });
    }

    const claimed = await BookingRequest.findOneAndUpdate(
      { _id: booking._id, status: "PAID_CONFIRMED" },
      { $set: { status: "COMPLETED", completedAt: new Date(), completedBy: doctorId } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ success: false, message: "This appointment was just updated. Please refresh." });
    }

    await DoctorSchedule.findOneAndUpdate(
      { bookingRequestId: claimed._id },
      { status: "COMPLETED" }
    );

    let payoutStatus = null;
    if (claimed.paymentId) {
      try {
        const pay = await settleOnCompletion(claimed.paymentId);
        payoutStatus = pay?.payoutStatus || null;
      } catch (err) {
        console.error("settleOnCompletion error:", err);
      }
    }

    if (booking.patientId?.email) {
      await sendEmail({
        to:      booking.patientId.email,
        subject: "How was your consultation? — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${esc(booking.patientId.name)},</h2>
          <p>Your consultation with <strong>Dr. ${esc(booking.doctorId?.name || "your doctor")}</strong> has been marked as completed.</p>
          <p>Any prescription will appear under <strong>Consultations</strong> in your HealthHub account, where you can also rate your experience.</p>
        `),
      });
    }

    emitTo(booking.patientId._id, "appointment_completed", {
      requestId: claimed._id,
      status:    "COMPLETED",
      message:   "Your consultation was marked as completed.",
    });

    return res.status(200).json({
      success: true,
      message: "Consultation marked as completed.",
      data: { requestId: claimed._id, status: claimed.status, completedAt: claimed.completedAt, payoutStatus },
    });
  } catch (err) {
    console.error("completeBookingRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cancel a PAID booking with a full refund (patient: before the cutoff; doctor: before the slot ends)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelPaidWithRefund(req, res, by) {
  try {
    const { id: requestId } = req.params;
    const userId = req.user.id;
    const reason = String(req.body?.reason || "").trim().slice(0, 300) ||
      (by === "patient" ? "Cancelled by patient." : "Cancelled by doctor.");

    const filter = { _id: requestId, status: "PAID_CONFIRMED", [by === "patient" ? "patientId" : "doctorId"]: userId };
    const booking = await BookingRequest.findOne(filter)
      .populate("patientId", "name email _id")
      .populate("doctorId", "name email _id");

    if (!booking) {
      return res.status(404).json({ success: false, message: "No confirmed (paid) appointment found to cancel." });
    }

    const start = slotStartOf(booking);
    const end   = slotEndOf(booking);
    const now   = new Date();

    if (by === "patient" && start) {
      const hoursLeft = (start.getTime() - now.getTime()) / 3600000;
      if (hoursLeft < FREE_CANCEL_HOURS) {
        return res.status(403).json({
          success: false,
          code: "CANCEL_WINDOW_CLOSED",
          message: `Paid appointments can be cancelled for a full refund until ${FREE_CANCEL_HOURS} hours before the start time. Please contact support.`,
        });
      }
    }
    if (by === "doctor" && end && now > end) {
      return res.status(400).json({
        success: false,
        message: "The consultation window has already passed. Use 'Mark as expired' instead.",
      });
    }

    const payment = await AppointmentPayment.findOne({ bookingRequestId: booking._id });
    if (!payment) {
      return res.status(409).json({ success: false, message: "No payment record found for this booking. Please contact support." });
    }

    // Take the booking out of PAID_CONFIRMED first so a doctor can't complete it while we refund.
    const claimed = await BookingRequest.findOneAndUpdate(
      { _id: booking._id, status: "PAID_CONFIRMED" },
      { $set: { status: "PAID_CANCELLED", cancelledBy: userId, cancelledAt: now, cancellationReason: reason } },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ success: false, message: "This appointment was just updated. Please refresh." });
    }

    try {
      await refundStoredPayment(payment._id, { reason, by });
    } catch (err) {
      await BookingRequest.updateOne(
        { _id: booking._id, status: "PAID_CANCELLED" },
        { $set: { status: "PAID_CONFIRMED", cancelledBy: null, cancelledAt: null, cancellationReason: null } }
      );
      const code = err instanceof RefundError ? err.status : 502;
      const gatewayMismatch = ["NOT_CAPTURED", "NOT_AT_RAZORPAY", "RAZORPAY_AUTH", "RAZORPAY_UNREACHABLE"].includes(err?.code);
      return res.status(code).json({
        success: false,
        message: gatewayMismatch
          ? "We could not confirm this payment with the payment gateway, so nothing was cancelled. Please contact support."
          : (err.message || "Refund failed. Nothing was cancelled."),
      });
    }

    await DoctorSchedule.findOneAndUpdate({ bookingRequestId: booking._id }, { status: "RELEASED" });

    const when = start
      ? `${start.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", month: "long", day: "numeric" })} · ${booking.proposedByDoctor?.scheduledTime || ""}`
      : "";
    const amount = (payment.amountPaise / 100).toFixed(2);
    const whoText = by === "patient" ? "the patient" : "the doctor";

    await Promise.all([
      sendEmail({
        to:      booking.patientId.email,
        subject: "Appointment cancelled — refund issued — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${esc(booking.patientId.name)},</h2>
          <p>Your appointment with <strong>Dr. ${esc(booking.doctorId.name)}</strong> (${esc(when)}) was cancelled by ${whoText}.</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Refund:</strong> ₹${amount} to your original payment method (usually 5–7 working days).<br>
            <strong>Reason:</strong> ${esc(reason)}
          </div>
        `),
      }),
      sendEmail({
        to:      booking.doctorId.email,
        subject: "Appointment cancelled — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi Dr. ${esc(booking.doctorId.name)},</h2>
          <p>The appointment with <strong>${esc(booking.patientId.name)}</strong> (${esc(when)}) was cancelled by ${whoText}. The slot is free again.</p>
        `),
      }),
    ]);

    emitTo(booking.patientId._id, "appointment_cancelled", { requestId: booking._id, status: "PAID_CANCELLED", by });
    emitTo(booking.doctorId._id,  "appointment_cancelled", { requestId: booking._id, status: "PAID_CANCELLED", by });

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled and a full refund has been issued.",
      data: { requestId: booking._id, status: "PAID_CANCELLED", refundedRupees: payment.amountPaise / 100 },
    });
  } catch (err) {
    console.error("cancelPaidWithRefund error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

exports.cancelPaidBooking = (req, res) => cancelPaidWithRefund(req, res, "patient");
exports.doctorCancelPaidBooking = (req, res) => cancelPaidWithRefund(req, res, "doctor");