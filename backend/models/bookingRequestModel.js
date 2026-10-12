const mongoose = require("mongoose");

const BOOKING_STATES = [
  "PENDING_DOCTOR_APPROVAL",
  "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
  "PAID_CONFIRMED",
  "COMPLETED",                  // consultation finished (doctor marked it) — payout becomes due
  "DOCTOR_REJECTED",
  "PATIENT_CANCELLED",
  "PAID_CANCELLED",             // cancelled after payment (patient or doctor) — refunded
  "PAYMENT_EXPIRED",
  "REQUEST_EXPIRED",            // doctor never answered within the response window
  "ABORTED_BY_DOCTOR",          // doctor marks expired after consultation window passes
];

const ACTIVE_STATUSES = [
  "PENDING_DOCTOR_APPROVAL",
  "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
];

const bookingRequestSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: BOOKING_STATES,
      default: "PENDING_DOCTOR_APPROVAL",
      index: true,
    },

    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    consultingFeePaise: {
      type: Number,
      required: true,
    },

    proposedByDoctor: {
      scheduledDate:       { type: Date,   default: null },
      scheduledTime:       { type: String, default: null },
      slotDurationMinutes: { type: Number, default: 30 },
    },

    // Doctor must accept/reject before this; the background job expires the request afterwards.
    responseDeadline: { type: Date, default: null },

    paymentDeadline: { type: Date, default: null },

    razorpayOrderId: { type: String, default: null },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AppointmentPayment",
      default: null,
    },

    meetLink:   { type: String, default: null },
    meetRoomId: { type: String, default: null },

    rejectionReason:    { type: String, default: null },
    cancellationReason: { type: String, default: null },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancelledAt: { type: Date, default: null },

    // ── Abort / expire fields (populated when doctor marks appointment expired) ──
    abortedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    abortedAt:   { type: Date,   default: null },
    abortReason: { type: String, default: null },

    // ── Completion ──
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // ── Reminder bookkeeping (claimed atomically by the reminder job so each is sent once) ──
    reminder24hSentAt:  { type: Date, default: null },
    reminderSoonSentAt: { type: Date, default: null },

    // ── AI pre-consult summary for the doctor (cached) ──
    aiIntakeSummary: {
      text:          { type: String, default: null },
      generatedAt:   { type: Date,   default: null },
      redFlags:      { type: [String], default: [] },
      usedProfile:   { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

bookingRequestSchema.index(
  { patientId: 1, status: 1 },
  { name: "idx_patient_active_requests" }
);

bookingRequestSchema.index(
  { doctorId: 1, status: 1, createdAt: -1 },
  { name: "idx_doctor_queue" }
);

bookingRequestSchema.index(
  { paymentDeadline: 1 },
  { sparse: true, name: "idx_payment_deadline" }
);

bookingRequestSchema.index(
  { responseDeadline: 1 },
  { sparse: true, name: "idx_response_deadline" }
);

bookingRequestSchema.index(
  { razorpayOrderId: 1 },
  { sparse: true, name: "idx_razorpay_order" }
);

const BookingRequest = mongoose.model("BookingRequest", bookingRequestSchema);

BookingRequest.BOOKING_STATES  = BOOKING_STATES;
BookingRequest.ACTIVE_STATUSES = ACTIVE_STATUSES;

module.exports = BookingRequest;