const BookingRequest = require("../models/bookingRequestModel");
const { sendEmail, emailBase } = require("../utils/email");
const { sendPhoneMessage }     = require("../utils/notify");
const { esc }                  = require("../utils/html");

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

async function sendOne(booking, kind) {
  const start = new Date(booking.proposedByDoctor.scheduledDate);
  const minsLeft = Math.max(1, Math.round((start.getTime() - Date.now()) / MIN));
  const when = kind === "soon"
    ? `in about ${minsLeft} minute${minsLeft === 1 ? "" : "s"}`
    : `tomorrow (${start.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short" })}, ${booking.proposedByDoctor.scheduledTime})`;

  const patient = booking.patientId;
  const doctor  = booking.doctorId;
  const link    = booking.meetLink;
  const subject = kind === "soon" ? "⏰ Your appointment is starting soon — HealthHub" : "📅 Appointment reminder — HealthHub";

  const mail = (name, other, role) => emailBase(`
    <h2 style="color:#1F3A4B;">Hi ${role === "doctor" ? "Dr. " : ""}${esc(name)},</h2>
    <p>Your appointment with <strong>${role === "doctor" ? "" : "Dr. "}${esc(other)}</strong> starts <strong>${esc(when)}</strong>.</p>
    <a href="${link}" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">Join Video Call →</a>
  `);

  await Promise.all([
    sendEmail({ to: patient?.email, subject, html: mail(patient?.name, doctor?.name, "patient") }),
    sendEmail({ to: doctor?.email,  subject, html: mail(doctor?.name, patient?.name, "doctor") }),
    sendPhoneMessage(patient, `HealthHub: your appointment with Dr. ${doctor?.name} starts ${when}. Join: ${link}`),
    sendPhoneMessage(doctor,  `HealthHub: your appointment with ${patient?.name} starts ${when}. Join: ${link}`),
  ]);
}

// Each reminder is claimed atomically (flag set BEFORE sending), so it goes out at most once even if
// two job runners overlap. Driven purely by database state, so a restart or sleeping server loses nothing.
async function sendDueReminders() {
  const result = { soon: 0, day: 0 };
  try {
    const now = Date.now();
    const windows = [
      { kind: "soon", flag: "reminderSoonSentAt", from: now,            to: now + 10 * MIN },
      { kind: "day",  flag: "reminder24hSentAt",  from: now + 6 * HOUR,  to: now + 24 * HOUR },
    ];

    for (const w of windows) {
      const due = await BookingRequest.find({
        status: "PAID_CONFIRMED",
        [w.flag]: null,
        "proposedByDoctor.scheduledDate": { $gt: new Date(w.from), $lte: new Date(w.to) },
      }).select("_id").limit(200);

      for (const d of due) {
        const claimed = await BookingRequest.findOneAndUpdate(
          { _id: d._id, status: "PAID_CONFIRMED", [w.flag]: null },
          { $set: { [w.flag]: new Date() } },
          { new: true }
        ).populate("patientId", "name email phone notifyConsent").populate("doctorId", "name email phone notifyConsent");
        if (!claimed) continue;
        try {
          await sendOne(claimed, w.kind);
          result[w.kind]++;
        } catch (err) {
          console.error(`[Reminders] ${w.kind} reminder failed for ${claimed._id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("[Reminders] Error:", err.message);
  }
  return result;
}

module.exports = sendDueReminders;