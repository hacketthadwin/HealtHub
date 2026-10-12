const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    // Current flow: a prescription belongs to a BookingRequest.
    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
    },
    // Legacy field from the old Appointment model — kept so old documents still load.
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    diagnosis: { type: String, maxlength: 500 },
    notes: { type: String, maxlength: 5000 },
    advice: { type: String, maxlength: 2000 },
    medications: [
      {
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
      },
    ],
    followUpDate: { type: Date },

    // Frozen at issue time so the PDF never changes if the profile does.
    doctorSnapshot: {
      name:                String,
      specialization:      String,
      registrationNumber:  String,
      registrationCouncil: String,
    },
    patientSnapshot: {
      name: String,
    },
  },
  { timestamps: true }
);

// One prescription per consultation (partial so legacy documents without the field never collide).
prescriptionSchema.index(
  { bookingRequestId: 1 },
  { unique: true, partialFilterExpression: { bookingRequestId: { $exists: true } } }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);