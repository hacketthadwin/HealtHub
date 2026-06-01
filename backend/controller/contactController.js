const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

// Rate limiting store
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_SUBMISSIONS = 3;

exports.sendContactEmail = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Input validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "Message too long (max 2000 chars)" });
    }

    // Basic rate limiting by email
    const now = Date.now();
    const key = email.toLowerCase();
    const attempts = rateLimitMap.get(key) || [];
    const recentAttempts = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recentAttempts.length >= MAX_SUBMISSIONS) {
      return res.status(429).json({
        success: false,
        message: "Too many submissions. Please wait 15 minutes before trying again.",
      });
    }
    rateLimitMap.set(key, [...recentAttempts, now]);

    const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    const adminEmail = process.env.CONTACT_RECIPIENT_EMAIL || "support@healthhub.com";

    // Send notification to admin/team
    await resend.emails.send({
      from: `HealthHub Contact <${FROM_ADDRESS}>`,
      to: adminEmail,
      subject: `Contact Form: Message from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 12px;">
          <div style="background: #1F3A4B; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #C2F84F; margin: 0; font-style: italic;">HealthHub — New Contact Message</h2>
          </div>
          <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #1F3A4B; width: 30%;">Name</td>
                <td style="padding: 8px; color: #333;">${name}</td>
              </tr>
              <tr style="background: #f8f9fa;">
                <td style="padding: 8px; font-weight: bold; color: #1F3A4B;">Email</td>
                <td style="padding: 8px; color: #333;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; color: #1F3A4B; vertical-align: top;">Message</td>
                <td style="padding: 8px; color: #333; white-space: pre-wrap;">${message}</td>
              </tr>
            </table>
            <div style="margin-top: 20px; padding: 12px; background: #FAFDEE; border-left: 4px solid #C2F84F; border-radius: 4px;">
              <small style="color: #666;">Received at ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</small>
            </div>
          </div>
        </div>
      `,
    });

    // Send auto-reply to the user
    await resend.emails.send({
      from: `HealthHub Support <${FROM_ADDRESS}>`,
      to: email,
      subject: "We received your message — HealthHub",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1F3A4B; padding: 24px; border-radius: 12px; text-align: center;">
            <h1 style="color: #C2F84F; font-style: italic; margin: 0;">HealthHub</h1>
            <p style="color: #FAFDEE; margin: 8px 0 0;">Your health matters to us.</p>
          </div>
          <div style="padding: 24px; background: white; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1F3A4B;">Hi ${name},</h2>
            <p style="color: #555; line-height: 1.6;">
              Thank you for reaching out to HealthHub. We have received your message and our team will get back to you within <strong>24–48 hours</strong>.
            </p>
            <div style="background: #FAFDEE; border-left: 4px solid #C2F84F; padding: 16px; border-radius: 4px; margin: 20px 0;">
              <strong style="color: #1F3A4B;">Your Message:</strong>
              <p style="color: #555; margin: 8px 0 0; white-space: pre-wrap;">${message}</p>
            </div>
            <p style="color: #555; line-height: 1.6;">
              In the meantime, you can also explore our <a href="https://healthub-six.vercel.app/community-support" style="color: #476407;">Community Support</a> section for peer discussions.
            </p>
            <p style="color: #888; font-size: 14px; margin-top: 24px;">
              Best regards,<br>
              <strong>The HealthHub Team</strong>
            </p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "Message sent successfully! We'll get back to you within 24-48 hours.",
    });

  } catch (error) {
    console.error("Contact email error:", error);

    if (error?.statusCode === 422 || error?.name === "validation_error") {
      return res.status(422).json({
        success: false,
        message: "Email delivery failed: sender domain is not verified. Set RESEND_FROM_EMAIL in your environment variables.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again.",
    });
  }
};