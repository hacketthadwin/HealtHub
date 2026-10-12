// WhatsApp / SMS reminders through Twilio's REST API (no SDK needed).
// Off unless NOTIFY_CHANNEL is "sms" or "whatsapp" and the Twilio variables are set.
// Only sends to users who gave a phone number AND ticked the reminder-consent box.
const axios = require("axios");

function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return digits;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;       // bare Indian mobile number
  if (/^91\d{10}$/.test(digits)) return `+${digits}`;
  return null;
}

async function sendPhoneMessage(user, body) {
  try {
    const channel = (process.env.NOTIFY_CHANNEL || "none").toLowerCase();
    if (!["sms", "whatsapp"].includes(channel)) return false;
    if (!user?.notifyConsent) return false;

    const sid   = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from  = channel === "whatsapp" ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;
    const to    = normalizePhone(user.phone);
    if (!sid || !token || !from || !to) return false;

    const params = new URLSearchParams({
      To:   channel === "whatsapp" ? `whatsapp:${to}` : to,
      From: channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from,
      Body: body,
    });

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      params.toString(),
      {
        auth: { username: sid, password: token },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      }
    );
    return true;
  } catch (err) {
    console.error("Phone notification error:", err?.response?.data?.message || err.message);
    return false;
  }
}

module.exports = { sendPhoneMessage, normalizePhone };