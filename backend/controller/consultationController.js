const BookingRequest     = require("../models/bookingRequestModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const Prescription       = require("../models/prescription");
const Review             = require("../models/review");

const FREE_CANCEL_HOURS = Number(process.env.FREE_CANCEL_HOURS || 24);

// One role-aware list for the Consultations page: bookings joined with payment / prescription / review state.
exports.listConsultations = async (req, res) => {
  try {
    const isDoctor = req.user.role === "Doctor";
    const mine     = isDoctor ? "doctorId" : "patientId";
    const other    = isDoctor ? "patientId" : "doctorId";

    const bookings = await BookingRequest.find({ [mine]: req.user.id, status: { $ne: "PATIENT_CANCELLED" } })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate(other, "name specialization")
      .lean();

    const ids = bookings.map((b) => b._id);
    const [payments, prescriptions, reviews] = await Promise.all([
      AppointmentPayment.find({ bookingRequestId: { $in: ids } })
        .select("bookingRequestId status amountPaise refundStatus payoutStatus doctorPayoutPaise").lean(),
      Prescription.find({ bookingRequestId: { $in: ids } }).select("_id bookingRequestId").lean(),
      Review.find({ bookingRequestId: { $in: ids } }).select("bookingRequestId rating").lean(),
    ]);
    const payBy = new Map(payments.map((p) => [String(p.bookingRequestId), p]));
    const rxBy  = new Map(prescriptions.map((p) => [String(p.bookingRequestId), p]));
    const rvBy  = new Map(reviews.map((r) => [String(r.bookingRequestId), r]));

    const now = Date.now();
    const data = bookings.map((b) => {
      const key   = String(b._id);
      const pay   = payBy.get(key);
      const start = b.proposedByDoctor?.scheduledDate ? new Date(b.proposedByDoctor.scheduledDate) : null;
      const end   = start ? new Date(start.getTime() + (b.proposedByDoctor?.slotDurationMinutes || 30) * 60000) : null;
      const paidActive = b.status === "PAID_CONFIRMED";

      const row = {
        _id: b._id,
        status: b.status,
        reason: b.reason,
        createdAt: b.createdAt,
        scheduledDate: b.proposedByDoctor?.scheduledDate || null,
        scheduledTime: b.proposedByDoctor?.scheduledTime || null,
        meetLink: paidActive ? b.meetLink : null,
        feeRupees: b.consultingFeePaise / 100,
        counterpart: b[other]
          ? { _id: b[other]._id, name: b[other].name, specialization: b[other].specialization || null }
          : null,
        paymentStatus: pay?.status || null,
        refundStatus:  pay?.refundStatus || null,
        prescriptionId: rxBy.get(key)?._id || null,
        reviewRating:   rvBy.get(key)?.rating ?? null,
        hasAiSummary:   !!b.aiIntakeSummary?.text,
      };

      if (isDoctor) {
        row.payoutStatus       = pay?.payoutStatus || null;
        row.doctorPayoutRupees = pay?.doctorPayoutPaise != null ? pay.doctorPayoutPaise / 100 : null;
        row.canComplete = paidActive && (!start || now >= start.getTime());
        row.canCancel   = paidActive && (!end || now < end.getTime());
        row.canPrescribe = ["PAID_CONFIRMED", "COMPLETED"].includes(b.status) && !rxBy.has(key);
      } else {
        row.canCancel = paidActive && (!start || (start.getTime() - now) / 3600000 >= FREE_CANCEL_HOURS);
        row.freeCancelUntil = paidActive && start ? new Date(start.getTime() - FREE_CANCEL_HOURS * 3600000) : null;
        row.canReview = b.status === "COMPLETED" && !rvBy.has(key);
        row.canShareRecords = ["PAID_CONFIRMED", "COMPLETED"].includes(b.status);
      }
      return row;
    });

    return res.status(200).json({ success: true, data, meta: { freeCancelHours: FREE_CANCEL_HOURS } });
  } catch (err) {
    console.error("listConsultations error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};