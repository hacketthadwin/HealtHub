const BookingRequest = require("../models/bookingRequestModel");
const DoctorSchedule = require("../models/doctorScheduleModel");
const { reconcileBooking, AWAITING } = require("../services/bookingService");

async function expireStalePayments() {
  const result = { expired: 0, confirmed: 0, skipped: 0 };
  try {
    const staleRequests = await BookingRequest.find({
      status:          AWAITING,
      paymentDeadline: { $lt: new Date() },
    }).limit(200);

    if (staleRequests.length === 0) return result;

    console.log(
      `[ExpireJob] ${new Date().toISOString()} — Found ${staleRequests.length} expired payment request(s). Processing...`
    );

    for (const request of staleRequests) {
      // Never expire a booking that was actually paid: ask Razorpay first (covers a missed webhook).
      const check = await reconcileBooking(request);
      if (check === "confirmed") { result.confirmed++; continue; }
      if (check === "error")     { result.skipped++;   continue; }     // retry on the next run

      const claimed = await BookingRequest.findOneAndUpdate(
        { _id: request._id, status: AWAITING },
        { $set: { status: "PAYMENT_EXPIRED" } },
        { new: true }
      );
      if (!claimed) continue;

      await DoctorSchedule.findOneAndUpdate(
        { bookingRequestId: request._id, status: "RESERVED" },
        { status: "RELEASED" }
      );

      result.expired++;
      console.log(`[ExpireJob] Expired BookingRequest ${request._id} (doctor: ${request.doctorId})`);
    }
  } catch (err) {
    console.error("[ExpireJob] Error during expiry run:", err.message);
  }
  return result;
}

module.exports = expireStalePayments;