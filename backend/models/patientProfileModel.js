const mongoose = require("mongoose");

const list = { type: [String], default: [] };

// Patient-entered health profile. Created only after the patient gives explicit consent.
const patientProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    dateOfBirth: { type: Date, default: null },
    sex:         { type: String, enum: ["Female", "Male", "Other", "Prefer not to say", null], default: null },
    bloodGroup:  { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null], default: null },
    heightCm:    { type: Number, min: 30, max: 260, default: null },
    weightKg:    { type: Number, min: 1,  max: 500, default: null },

    allergies:          list,
    chronicConditions:  list,
    currentMedications: list,
    pastSurgeries:      list,

    emergencyContact: {
      name:  { type: String, default: null, maxlength: 100 },
      phone: { type: String, default: null, maxlength: 20 },
    },

    // Consent to store this data and to let doctors you book see it.
    consentedAt:    { type: Date, required: true },
    consentVersion: { type: String, default: "v1" },
    // Separate, optional consent: allow the AI intake summary to use this profile.
    allowAiSummary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientProfile", patientProfileSchema);