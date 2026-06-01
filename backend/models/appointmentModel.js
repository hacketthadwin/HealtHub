const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    appointmentDate: { type: Date },        // BUG FIX: was missing
    scheduledTime: { type: String },        // e.g. "10:30 AM"
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    // Video call support (Issue 2)
    meetLink: { type: String, default: null },     // Jitsi room URL
    meetRoomId: { type: String, default: null },   // e.g. "HealthHub-abc123"
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
