const BookingRequest = require("../models/bookingRequestModel");
const { sendEmail, emailBase } = require("../utils/email");
const { esc } = require("../utils/html");

const HOURS = () => parseInt(process.env.DOCTOR_RESPONSE_HOURS || "48");

// A request the doctor never answered must not leave the patient waiting forever.
async function expireStaleRequests() {
  const result = { expired: 0 };
  try {
    const now    = new Date();
    const legacy = new Date(now.getTime() - HOURS() * 60 * 60 * 1000);   // requests created before responseDeadline existed

    const stale = await BookingRequest.find({
      status: "PENDING_DOCTOR_APPROVAL",
      $or: [
        { responseDeadline: { $lt: now } },
        { responseDeadline: null, createdAt: { $lt: legacy } },
      ],
    }).limit(200).populate("patientId", "name email _id").populate("doctorId", "name");

    for (const request of stale) {
      const claimed = await BookingRequest.findOneAndUpdate(
        { _id: request._id, status: "PENDING_DOCTOR_APPROVAL" },
        { $set: { status: "REQUEST_EXPIRED" } },
        { new: true }
      );
      if (!claimed) continue;
      result.expired++;

      await sendEmail({
        to:      request.patientId?.email,
        subject: "Your consultation request expired — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${esc(request.patientId?.name || "there")},</h2>
          <p>Dr. <strong>${esc(request.doctorId?.name || "the doctor")}</strong> did not respond to your request within ${HOURS()} hours, so it has expired. You were not charged.</p>
          <p>You can send a new request to the same doctor or choose another one.</p>
        `),
      });

      const io = require("../socketManager").getIO();
      if (io && request.patientId?._id) {
        io.to(`user:${request.patientId._id}`).emit("booking_request_expired", { requestId: request._id, status: "REQUEST_EXPIRED" });
      }
    }
  } catch (err) {
    console.error("[ExpireRequests] Error:", err.message);
  }
  return result;
}

module.exports = expireStaleRequests;