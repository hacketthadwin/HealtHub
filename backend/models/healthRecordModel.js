const mongoose = require("mongoose");

const healthRecordSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:     { type: String, required: true, maxlength: 150 },
    category: {
      type: String,
      enum: ["lab_report", "imaging", "prescription", "discharge_summary", "other"],
      default: "other",
    },
    recordDate: { type: Date, default: null },

    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    bytes:    { type: Number, default: 0 },
    storage: {
      publicId:     { type: String, required: true },
      resourceType: { type: String, required: true },   // image | raw | video
      format:       { type: String, default: null },
      version:      { type: Number, default: null },
    },

    // Consent-based sharing: a doctor can open a record only while it is shared with one of their bookings.
    sharedWith: [
      {
        bookingRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "BookingRequest", required: true },
        doctorId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sharedAt:         { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

healthRecordSchema.index({ "sharedWith.bookingRequestId": 1 });

module.exports = mongoose.model("HealthRecord", healthRecordSchema);