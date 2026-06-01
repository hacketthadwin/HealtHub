const mongoose = require("mongoose");

const healthMetricSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, default: Date.now },
    metricType: {
      type: String,
      enum: ["bloodPressure", "bloodGlucose", "weight", "steps", "sleepHours", "heartRate"],
      required: true,
    },
    value: { type: Number, required: true },
    unit: { type: String },
    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HealthMetric", healthMetricSchema);
