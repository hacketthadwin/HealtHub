const BookingRequest  = require("../models/bookingRequestModel");
const DoctorSchedule  = require("../models/doctorScheduleModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const User            = require("../models/userModel");

const { ACTIVE_STATUSES } = require("../models/bookingRequestModel");

const MAX_ACTIVE_REQUESTS  = parseInt(process.env.MAX_ACTIVE_REQUESTS  || "5");
const PAYMENT_WINDOW_HOURS = parseInt(process.env.PAYMENT_WINDOW_HOURS || "48");

// ─── Statuses that block a new request to the same doctor ───────────────────
// Includes PAID_CONFIRMED because the slot is live until the consultation ends.
const BLOCKING_STATUSES = [
  "PENDING_DOCTOR_APPROVAL",
  "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
  "PAID_CONFIRMED",
];

let resend = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    const { Resend } = require("resend");
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const sendEmail = async ({ to, subject, html }) => {
  const emailService = getResend();
  if (!emailService) return;
  const fromAddress = process.env.EMAIL_FROM || "HealthHub <onboarding@resend.dev>";
  try {
    await emailService.emails.send({ from: fromAddress, to, subject, html });
  } catch (err) {
    console.error("Email send error:", err.message);
  }
};

const emailBase = (content) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1F3A4B;padding:24px;border-radius:12px;text-align:center;">
      <h1 style="color:#C2F84F;font-style:italic;margin:0;">HealthHub</h1>
    </div>
    <div style="padding:24px;background:white;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;">
      ${content}
      <p style="color:#888;font-size:14px;margin-top:24px;">Best regards,<br><strong>The HealthHub Team</strong></p>
    </div>
  </div>
`;

function convertTo24h(timeStr) {
  const parts    = timeStr.trim().split(" ");
  const modifier = parts[1]?.toUpperCase();
  let [hours, minutes] = parts[0].split(":").map(Number);
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours  = 0;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

// ─── CREATE BOOKING REQUEST ──────────────────────────────────────────────────
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

    // ── Global active-slot cap ─────────────────────────────────────────────
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

    // ── ISSUE 1 FIX: Per-doctor duplicate check ────────────────────────────
    // Block if any existing request with this doctor is in a blocking status
    // AND (for PAID_CONFIRMED) the slot has not yet ended.
    const existingRequests = await BookingRequest.find({
      patientId,
      doctorId,
      status: { $in: BLOCKING_STATUSES },
    });

    for (const existing of existingRequests) {
      // For terminal-pending states: always block
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

      // For PAID_CONFIRMED: block until the consultation slot has ended
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
          // Slot has already ended — allow a new request (fall through)
        } else {
          // No scheduled date means consultation is pending scheduling — still block
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
    });

    const [patient, doctorDoc] = await Promise.all([
      User.findById(patientId).select("name"),
      User.findById(doctorId).select("name email"),
    ]);

    await sendEmail({
      to:      doctorDoc.email,
      subject: "🩺 New Consultation Request — HealthHub",
      html: emailBase(`
        <h2 style="color:#1F3A4B;">Hi Dr. ${doctorDoc.name},</h2>
        <p><strong>${patient.name}</strong> has sent you a new consultation request.</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Reason:</strong> ${reason.trim()}<br>
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

// ─── ACCEPT BOOKING REQUEST ──────────────────────────────────────────────────
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
      proposedStart = new Date(`${scheduledDate}T${convertTo24h(scheduledTime)}`);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid scheduledTime format. Use 'HH:MM AM/PM'." });
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
        <h2 style="color:#1F3A4B;">Hi ${populated.patientId.name},</h2>
        <p>Dr. <strong>${populated.doctorId.name}</strong> has accepted your consultation request and proposed a time!</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Proposed Date:</strong> ${scheduledDate}<br>
          <strong>Proposed Time:</strong> ${scheduledTime}<br>
          <strong>Duration:</strong> ${duration} minutes<br>
          <strong>Consultation Fee:</strong> ₹${(bookingRequest.consultingFeePaise / 100).toFixed(2)}<br>
          <strong>Pay Before:</strong> ${paymentDeadline.toLocaleString()}
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

// ─── REJECT BOOKING REQUEST ──────────────────────────────────────────────────
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
        <h2 style="color:#1F3A4B;">Hi ${bookingRequest.patientId.name},</h2>
        <p>Unfortunately, your consultation request has been <strong style="color:#dc2626;">declined</strong>.</p>
        <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
          <strong>Reason:</strong> ${bookingRequest.rejectionReason}
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

// ─── CANCEL BOOKING REQUEST — ISSUE 2 FIX: Hard delete instead of soft cancel ─
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

    // ── Release the doctor's schedule slot if one was reserved ──────────────
    if (wasAccepted) {
      await DoctorSchedule.deleteOne({ bookingRequestId: bookingRequest._id });
    }

    // ── Notify the doctor only if they had already accepted ─────────────────
    if (wasAccepted) {
      const populated = await bookingRequest.populate("doctorId", "name email");
      await sendEmail({
        to:      populated.doctorId.email,
        subject: "Patient Cancelled Appointment — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi Dr. ${populated.doctorId.name},</h2>
          <p>A patient has cancelled their appointment after you accepted it.</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Was Scheduled:</strong> ${bookingRequest.proposedByDoctor?.scheduledTime} on ${bookingRequest.proposedByDoctor?.scheduledDate?.toLocaleDateString()}<br>
            <strong>Reason:</strong> Patient chose to cancel.
          </div>
          <p>Your time slot has been freed and is available for other patients.</p>
        `),
      });
    }

    // ── Hard-delete the BookingRequest — as if it was never created ─────────
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

// ─── GET MY BOOKING REQUESTS (Patient) ──────────────────────────────────────
exports.getMyBookingRequests = async (req, res) => {
  try {
    const patientId = req.user.id;

    // Exclude cancelled records — after cancellation they are deleted,
    // but defensive-exclude any lingering soft-cancelled ones.
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

// ─── GET DOCTOR QUEUE ────────────────────────────────────────────────────────
exports.getDoctorQueue = async (req, res) => {
  try {
    const doctorId = req.user.id;

    // Exclude hard-deleted (already gone) and soft-cancelled records from doctor view
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

// ─── GET SINGLE REQUEST ──────────────────────────────────────────────────────
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