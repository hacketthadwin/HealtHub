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
  if (!emailService || !to) return;
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

module.exports = { sendEmail, emailBase };