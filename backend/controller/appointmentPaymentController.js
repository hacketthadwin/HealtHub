const crypto           = require("crypto");
const razorpay         = require("../config/paymentConfig");
const BookingRequest   = require("../models/bookingRequestModel");
const DoctorSchedule   = require("../models/doctorScheduleModel");
const { confirmPaidBooking } = require("../services/bookingService");


function signatureMatches(orderId, paymentId, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature || ""), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}


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


// Browser-side confirmation. The Razorpay webhook (razorpayWebhookController) is the source of truth
// and reaches the same confirmPaidBooking(), so whichever of the two arrives first wins.
exports.verifyPayment = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const patientId         = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment details." });
    }

    const bookingRequest = await BookingRequest.findOne({
      _id:             requestId,
      patientId,
      razorpayOrderId: razorpay_order_id,
    });

    if (!bookingRequest) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found or order ID mismatch.",
      });
    }

    if (!signatureMatches(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({
        success: false,
        message: "Payment signature verification failed. Possible tamper attempt.",
      });
    }

    const result = await confirmPaidBooking({
      bookingRequestId: bookingRequest._id,
      orderId:          razorpay_order_id,
      paymentId:        razorpay_payment_id,
      signature:        razorpay_signature,
      via:              "checkout",
    });

    if (result.outcome === "already_confirmed") {
      return res.status(200).json({
        success:   true,
        message:   "Payment already recorded.",
        data:      { paymentId: result.payment?._id, status: "PAID_CONFIRMED" },
      });
    }

    if (result.outcome === "in_progress") {
      return res.status(409).json({
        success: false,
        message: "Your payment is being confirmed. Please refresh in a few seconds.",
      });
    }

    if (result.outcome !== "confirmed") {
      return res.status(409).json({
        success: false,
        message:
          "This booking can no longer be confirmed (it may have expired or been cancelled). " +
          "If you were charged, the amount is refunded automatically.",
      });
    }

    const booking = result.booking;
    return res.status(200).json({
      success: true,
      message: "Payment verified. Appointment is confirmed.",
      data: {
        requestId:        booking._id,
        status:           booking.status,
        meetLink:         booking.meetLink,
        scheduledDate:    booking.proposedByDoctor?.scheduledDate,
        scheduledTime:    booking.proposedByDoctor?.scheduledTime,
        amountPaidRupees: booking.consultingFeePaise / 100,
      },
    });
  } catch (err) {
    console.error("verifyPayment error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};