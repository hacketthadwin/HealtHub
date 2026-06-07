const crypto             = require("crypto");
const razorpay           = require("../config/paymentConfig");
const BookingRequest     = require("../models/bookingRequestModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const DoctorSchedule     = require("../models/doctorScheduleModel");


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


const scheduleReminderEmail = (bookingRequest, patientEmail, patientName, doctorName) => {
  if (!bookingRequest.proposedByDoctor?.scheduledDate) return;

  const appointmentTime = new Date(bookingRequest.proposedByDoctor.scheduledDate).getTime();
  const delay           = appointmentTime - 5 * 60 * 1000 - Date.now();
  if (delay <= 0) return;

  setTimeout(async () => {
    try {
      const fresh = await BookingRequest.findById(bookingRequest._id);
      if (!fresh || fresh.status !== "PAID_CONFIRMED") return;

      await sendEmail({
        to:      patientEmail,
        subject: "⏰ Your Appointment Starts in 5 Minutes — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${patientName},</h2>
          <p>Your video appointment with <strong>Dr. ${doctorName}</strong> starts in <strong style="color:#476407;">5 minutes</strong>!</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <a href="${fresh.meetLink}" style="display:inline-block;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">
              Join Video Call →
            </a>
          </div>
        `),
      });
    } catch (err) {
      console.error("Reminder email error:", err.message);
    }
  }, delay);
};


exports.initiatePayment = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const patientId         = req.user.id;

    const bookingRequest = await BookingRequest.findOne({
      _id:      requestId,
      patientId,
      status:   "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
    });

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "No payment-ready booking found. It may have already been cancelled or expired.",
      });
    }


    if (bookingRequest.paymentDeadline && new Date() > bookingRequest.paymentDeadline) {
      bookingRequest.status = "PAYMENT_EXPIRED";
      await bookingRequest.save();

      await DoctorSchedule.findOneAndUpdate(
        { bookingRequestId: bookingRequest._id },
        { status: "RELEASED" }
      );

      return res.status(410).json({
        success: false,
        message: "The 48-hour payment window has expired. Please send a new consultation request.",
      });
    }


    if (!bookingRequest.consultingFeePaise || bookingRequest.consultingFeePaise <= 0) {
      return res.status(400).json({
        success: false,
        message: "Booking has no consulting fee recorded. Please contact support.",
      });
    }

    const receipt = `pay_${Date.now()}`;

    let order;
    try {
      order = await razorpay.orders.create({
        amount:   bookingRequest.consultingFeePaise,
        currency: "INR",
        receipt,
        notes: {
          bookingRequestId: bookingRequest._id.toString(),
          patientId:        patientId.toString(),
          doctorId:         bookingRequest.doctorId.toString(),
        },
      });
    } catch (razorpayErr) {
      console.error("Razorpay order creation failed:", razorpayErr);
      return res.status(502).json({
        success: false,
        message: razorpayErr?.error?.description || "Payment gateway error. Please try again.",
      });
    }

    bookingRequest.razorpayOrderId = order.id;
    await bookingRequest.save();

    return res.status(200).json({
      success:             true,
      orderId:             order.id,
      amountPaise:         bookingRequest.consultingFeePaise,
      consultingFeeRupees: bookingRequest.consultingFeePaise / 100,
      currency:            "INR",
    });
  } catch (err) {
    console.error("initiatePayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};


exports.verifyPayment = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const patientId         = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;


    const bookingRequest = await BookingRequest.findOne({
      _id:             requestId,
      patientId,
      status:          "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
      razorpayOrderId: razorpay_order_id,
    });

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found or order ID mismatch.",
      });
    }


    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Possible tamper attempt.",
      });
    }


    const existingPayment = await AppointmentPayment.findOne({
      bookingRequestId: bookingRequest._id,
    });
    if (existingPayment) {
      return res.status(200).json({
        success:   true,
        message:   "Payment already recorded.",
        data:      { paymentId: existingPayment._id, status: "PAID_CONFIRMED" },
      });
    }


    const payment = await AppointmentPayment.create({
      bookingRequestId:    bookingRequest._id,
      patientId,
      doctorId:            bookingRequest.doctorId,
      amountPaise:         bookingRequest.consultingFeePaise,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: "paid",
    });


    const meetRoomId = `HealthHub-${crypto.randomBytes(8).toString("hex")}`;
    const meetLink   = `https://meet.jit.si/${meetRoomId}`;


    bookingRequest.status     = "PAID_CONFIRMED";
    bookingRequest.paymentId  = payment._id;
    bookingRequest.meetLink   = meetLink;
    bookingRequest.meetRoomId = meetRoomId;
    await bookingRequest.save();


    await DoctorSchedule.findOneAndUpdate(
      { bookingRequestId: bookingRequest._id, status: "RESERVED" },
      { status: "ACTIVE" }
    );


    const populated = await bookingRequest.populate([
      { path: "patientId", select: "name email" },
      { path: "doctorId",  select: "name email" },
    ]);

    const scheduledDate = bookingRequest.proposedByDoctor?.scheduledDate
      ? new Date(bookingRequest.proposedByDoctor.scheduledDate).toLocaleDateString("en-IN")
      : "TBD";
    const scheduledTime = bookingRequest.proposedByDoctor?.scheduledTime || "TBD";
    const feeRupees     = (bookingRequest.consultingFeePaise / 100).toFixed(2);

    await Promise.all([
      sendEmail({
        to:      populated.patientId.email,
        subject: "✅ Appointment Confirmed & Paid — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi ${populated.patientId.name},</h2>
          <p>Your payment has been received and your appointment with <strong>Dr. ${populated.doctorId.name}</strong> is confirmed!</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Date:</strong> ${scheduledDate}<br>
            <strong>Time:</strong> ${scheduledTime}<br>
            <strong>Amount Paid:</strong> ₹${feeRupees}<br><br>
            <a href="${meetLink}" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">
              Join Video Call →
            </a>
          </div>
          <p style="font-size:12px;color:#888;">You'll receive a reminder 5 minutes before your appointment.</p>
        `),
      }),
      sendEmail({
        to:      populated.doctorId.email,
        subject: "💳 Payment Received — Appointment Confirmed — HealthHub",
        html: emailBase(`
          <h2 style="color:#1F3A4B;">Hi Dr. ${populated.doctorId.name},</h2>
          <p>Payment from <strong>${populated.patientId.name}</strong> has been received. The appointment is confirmed!</p>
          <div style="background:#FAFDEE;border-left:4px solid #C2F84F;padding:16px;border-radius:4px;margin:20px 0;">
            <strong>Patient:</strong> ${populated.patientId.name}<br>
            <strong>Date:</strong> ${scheduledDate}<br>
            <strong>Time:</strong> ${scheduledTime}<br>
            <strong>Fee Received:</strong> ₹${feeRupees}<br><br>
            <a href="${meetLink}" style="display:inline-block;margin-top:10px;padding:12px 24px;background:#1F3A4B;color:#C2F84F;text-decoration:none;border-radius:8px;font-weight:bold;">
              Start Video Call →
            </a>
          </div>
        `),
      }),
    ]);


    scheduleReminderEmail(
      bookingRequest,
      populated.patientId.email,
      populated.patientId.name,
      populated.doctorId.name
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified. Appointment is confirmed.",
      data: {
        requestId:        bookingRequest._id,
        status:           bookingRequest.status,
        meetLink,
        scheduledDate:    bookingRequest.proposedByDoctor?.scheduledDate,
        scheduledTime:    bookingRequest.proposedByDoctor?.scheduledTime,
        amountPaidRupees: bookingRequest.consultingFeePaise / 100,
      },
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};