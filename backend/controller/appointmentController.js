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

// Get appointments for doctor
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

// Get all accepted doctors for the authenticated patient
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
      .exec();

    return res.status(200).json({
      success: true,
      message: "Accepted doctors retrieved successfully.",
      data: acceptedAppointments,
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

    // Send email notification to patient (Issue 11.3)
    if ((status === "accepted" || status === "rejected") && appointment?.patientId?.email) {
      const emailService = getResend();
      if (emailService) {
        try {
          const isAccepted = status === "accepted";
          await emailService.emails.send({
            from: "HealthHub <noreply@yourdomain.com>",
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
                    ${isAccepted && appointment.meetLink ? `<br><br><strong>Video Call Link:</strong> <a href="${appointment.meetLink}" style="color: #476407;">${appointment.meetLink}</a>` : ""}
                  </div>
                  <p style="color: #888; font-size: 14px; margin-top: 24px;">
                    Best regards,<br><strong>The HealthHub Team</strong>
                  </p>
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("Email notification error:", emailErr.message);
          // Don't fail the request if email fails
        }
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
