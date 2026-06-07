const BookingRequest = require("../models/bookingRequestModel");
const DoctorSchedule = require("../models/doctorScheduleModel");

async function expireStalePayments() {
  try {
    const staleRequests = await BookingRequest.find({
      status:          "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
      paymentDeadline: { $lt: new Date() },
    });

    if (staleRequests.length === 0) return;

    console.log(
      `[ExpireJob] ${new Date().toISOString()} — Found ${staleRequests.length} expired payment request(s). Processing...`
    );

    for (const request of staleRequests) {
      request.status = "PAYMENT_EXPIRED";
      await request.save();


      await DoctorSchedule.findOneAndUpdate(
        { bookingRequestId: request._id, status: "RESERVED" },
        { status: "RELEASED" }
      );

      console.log(`[ExpireJob] Expired BookingRequest ${request._id} (doctor: ${request.doctorId})`);
    }
  } catch (err) {
    console.error("[ExpireJob] Error during expiry run:", err.message);
  }
}

module.exports = expireStalePayments;