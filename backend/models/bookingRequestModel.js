const mongoose = require("mongoose");

const BOOKING_STATES = [
  "PENDING_DOCTOR_APPROVAL",
  "DOCTOR_ACCEPTED_AWAITING_PAYMENT",
  "PAID_CONFIRMED",
  "DOCTOR_REJECTED",
  "PATIENT_CANCELLED",
  "PAYMENT_EXPIRED",
  "ABORTED_BY_DOCTOR",          // ← NEW: doctor marks expired after consultation window passes
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

    // ── Abort / expire fields (populated when doctor marks appointment expired) ──
    abortedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    abortedAt:   { type: Date,   default: null },
    abortReason: { type: String, default: null },
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

const BookingRequest = mongoose.model("BookingRequest", bookingRequestSchema);

BookingRequest.BOOKING_STATES  = BOOKING_STATES;
BookingRequest.ACTIVE_STATUSES = ACTIVE_STATUSES;

module.exports = BookingRequest;