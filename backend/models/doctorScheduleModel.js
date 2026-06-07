const mongoose = require("mongoose");

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
    },


    scheduledDate:       { type: Date,   required: true },
    scheduledTime:       { type: String, required: true }, 
    slotDurationMinutes: { type: Number, default: 30 },


    slotEnd: { type: Date, required: true },

    status: {
      type: String,
      enum: ["RESERVED", "ACTIVE", "COMPLETED", "RELEASED"],
      default: "RESERVED",




    },
  },
  { timestamps: true }
);


doctorScheduleSchema.index(
  { doctorId: 1, scheduledDate: 1, slotEnd: 1, status: 1 },
  { name: "idx_doctor_slot_collision" }
);

module.exports = mongoose.model("DoctorSchedule", doctorScheduleSchema);