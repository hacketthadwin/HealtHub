const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    appointmentDate: { type: Date },        
    scheduledTime: { type: String },        
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    meetLink: { type: String, default: null },    
    meetRoomId: { type: String, default: null },   
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
