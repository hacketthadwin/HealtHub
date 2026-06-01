const Appointment = require("../models/appointmentModel");
const crypto = require("crypto");
const User = require("../models/userModel");

// Lazy-load Resend so the app doesn't crash if RESEND_API_KEY is not set
let resend = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    const { Resend } = require("resend");
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

// Helper: send email via Resend
const sendEmail = async ({ to, subject, html }) => {
  const emailService = getResend();
  if (!emailService) return; // silently skip if no API key configured
  // Use Resend's default sandbox sender so no custom domain verification is needed.
  // In production, replace with your verified domain e.g. "HealthHub <noreply@yourdomain.com>"
  const fromAddress = process.env.EMAIL_FROM || "HealthHub <onboarding@resend.dev>";
  try {
    await emailService.emails.send({ from: fromAddress, to, subject, html });
  } catch (err) {
    console.error("Email send error:", err.message);
  }
};

// Schedule a pre-meeting reminder email 5 minutes before the appointment
const scheduleReminderEmail = (appointment) => {
  if (!appointment.appointmentDate) return;
  if (!appointment.patientId?.email) return;

  const appointmentTime = new Date(appointment.appointmentDate).getTime();
  const reminderTime = appointmentTime - 5 * 60 * 1000; // 5 minutes before
  const now = Date.now();
  const delay = reminderTime - now;

  if (delay <= 0) return; // appointment already past or within 5 minutes

  setTimeout(async () => {
    try {
      // Re-fetch appointment to make sure it wasn't cancelled
      const freshApp = await Appointment.findById(appointment._id)
        .populate("patientId", "name email")
        .populate("doctorId", "name");

      if (!freshApp || freshApp.status !== "accepted") return;

      await sendEmail({
        to: freshApp.patientId.email,
        subject: "⏰ Reminder: Your Video Appointment Starts in 5 Minutes — HealthHub",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1F3A4B; padding: 24px; border-radius: 12px; text-align: center;">
              <h1 style="color: #C2F84F; font-style: italic; margin: 0;">HealthHub</h1>
            </div>
            <div style="padding: 24px; background: white; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1F3A4B;">Hi ${freshApp.patientId.name},</h2>
              <p style="color: #555; line-height: 1.6;">
                Your video appointment with <strong>Dr. ${freshApp.doctorId?.name || "your doctor"}</strong> 
                starts in <strong style="color: #476407;">5 minutes</strong>!
              </p>
              <div style="background: #FAFDEE; border-left: 4px solid #C2F84F; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <strong>Reason:</strong> ${freshApp.reason}<br><br>
                <strong>Join your video call now:</strong><br>
                <a href="${freshApp.meetLink}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background: #1F3A4B; color: #C2F84F; text-decoration: none; border-radius: 8px; font-weight: bold;">
                  Join Video Call →
                </a>
              </div>
              <p style="color: #888; font-size: 14px; margin-top: 24px;">
                Best regards,<br><strong>The HealthHub Team</strong>
              </p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("Reminder email error:", err.message);
    }
  }, delay);
};

// Book appointment controller
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, reason, appointmentDate } = req.body;
    console.log("Received doctorId:", doctorId);
    console.log("Received reason:", reason);
    console.log("Authenticated user:", req.user);

    if (!doctorId || !reason) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newAppointment = await Appointment.create({
      doctorId,
      patientId: req.user.id,
      reason,
      appointmentDate: appointmentDate ? new Date(appointmentDate) : null,
    });

    res.status(201).json({ message: "Appointment booked", data: newAppointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get appointments for doctor — returns all appointments but the frontend
// must deduplicate patients in the "My Patients" chat list.
// We also provide a deduplicated patients list for convenience.
const getDoctorAppointments = async (req, res) => {
  try {
    console.log("--- getDoctorAppointments Called ---");
    console.log("req.user:", req.user);

    const appointments = await Appointment.find({ doctorId: req.user.id }).populate("patientId");

    console.log("Number of appointments found:", appointments.length);

    res.status(200).json({ data: appointments });
  } catch (err) {
    console.error("Error in getDoctorAppointments:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all accepted appointments for the authenticated patient
// Deduplicates by doctorId so patient chat list shows each doctor once
const getPatientAcceptedDoctors = async (req, res) => {
  try {
    const patientId = req.user.id;

    const acceptedAppointments = await Appointment.find({
      patientId: patientId,
      status: "accepted",
    })
      .populate({
        path: "doctorId",
        select: "name specialization",
      })
      .sort({ updatedAt: -1 }) // newest first so we keep the latest meetLink per doctor
      .exec();

    // Deduplicate by doctorId — keep the first (newest) appointment per doctor
    const seenDoctors = new Set();
    const deduplicatedAppointments = acceptedAppointments.filter((app) => {
      const doctorKey = app.doctorId?._id?.toString();
      if (!doctorKey || seenDoctors.has(doctorKey)) return false;
      seenDoctors.add(doctorKey);
      return true;
    });

    return res.status(200).json({
      success: true,
      message: "Accepted doctors retrieved successfully.",
      data: deduplicatedAppointments,
    });
  } catch (error) {
    console.error("Error fetching accepted doctors for patient:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving accepted doctors.",
    });
  }
};

// Update appointment status — auto-generates Jitsi Meet link on accept
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const appointmentId = req.params.id;

    let updateData = { status };

    // When doctor accepts appointment → auto-generate Jitsi Meet link
    if (status === "accepted") {
      const meetRoomId = `HealthHub-${crypto.randomBytes(8).toString("hex")}`;
      const meetLink = `https://meet.jit.si/${meetRoomId}`;
      updateData.meetLink = meetLink;
      updateData.meetRoomId = meetRoomId;
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      updateData,
      { new: true }
    )
      .populate("patientId", "name email")
      .populate("doctorId", "name email");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Send email notification to patient when accepted or rejected
    if ((status === "accepted" || status === "rejected") && appointment?.patientId?.email) {
      const isAccepted = status === "accepted";
      await sendEmail({
        to: appointment.patientId.email,
        subject: isAccepted
          ? `Appointment Confirmed ✅ — HealthHub`
          : `Appointment Update — HealthHub`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #1F3A4B; padding: 24px; border-radius: 12px; text-align: center;">
              <h1 style="color: #C2F84F; font-style: italic; margin: 0;">HealthHub</h1>
            </div>
            <div style="padding: 24px; background: white; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
              <h2 style="color: #1F3A4B;">Hi ${appointment.patientId.name},</h2>
              <p style="color: #555; line-height: 1.6;">
                Your appointment with <strong>Dr. ${appointment.doctorId?.name || "your doctor"}</strong> has been 
                <strong style="color: ${isAccepted ? "#476407" : "#dc2626"};">${status}</strong>.
              </p>
              <div style="background: #FAFDEE; border-left: 4px solid #C2F84F; padding: 16px; border-radius: 4px; margin: 20px 0;">
                <strong>Reason:</strong> ${appointment.reason}
                ${
                  isAccepted && appointment.meetLink
                    ? `<br><br>
                       <strong>Your Video Call Link:</strong><br>
                       <a href="${appointment.meetLink}" style="display: inline-block; margin-top: 10px; padding: 12px 24px; background: #1F3A4B; color: #C2F84F; text-decoration: none; border-radius: 8px; font-weight: bold;">
                         Join Video Call →
                       </a>
                       <br><br>
                       <span style="font-size: 12px; color: #888;">You will also receive a reminder email 5 minutes before your appointment.</span>`
                    : ""
                }
              </div>
              <p style="color: #888; font-size: 14px; margin-top: 24px;">
                Best regards,<br><strong>The HealthHub Team</strong>
              </p>
            </div>
          </div>
        `,
      });

      // Schedule 5-minute reminder if appointment was accepted and has a date
      if (isAccepted) {
        scheduleReminderEmail(appointment);
      }
    }

    res.status(200).json({ message: `Appointment ${status} successfully`, data: appointment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  bookAppointment,
  getDoctorAppointments,
  updateAppointmentStatus,
  getPatientAcceptedDoctors,
};