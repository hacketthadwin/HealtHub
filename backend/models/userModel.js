const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ["Doctor", "Patient", "Admin"], required: true },

    // Optional contact details. Reminders over SMS/WhatsApp are sent only when notifyConsent is true.
    phone:         { type: String, default: null },
    notifyConsent: { type: Boolean, default: false },

    specialization: {
      type: String,
      enum: [
        "General Physician", "Cardiologist", "Dermatologist", "Neurologist",
        "Orthopedic", "Gynecologist", "Pediatrician", "Psychiatrist",
        "Oncologist", "ENT Specialist", "Ophthalmologist", "Urologist",
        "Endocrinologist", "Gastroenterologist", "Pulmonologist",
      ],
      default: null,
    },
    experience:     { type: Number, default: null },
    bio:            { type: String, maxlength: 500, default: null },
    availability: {
      type: String,
      enum: ["Available", "Busy", "On Leave"],
      default: "Available",
    },
    profilePicture: { type: String, default: null },

    consultingFee: {
      type: Number,
      default: null,
      min: 0,
    },
    consultingFeeCurrency: {
      type: String,
      default: "INR",
    },
    consultingFeeConfirmed: {
      type: Boolean,
      default: false,
    },

    // ── Doctor verification (checked by an admin against the national medical register) ──
    registrationNumber:  { type: String, default: null },
    registrationCouncil: { type: String, default: null },
    verificationStatus: {
      type: String,
      enum: ["not_applicable", "pending", "approved", "rejected"],
      default: "not_applicable",
      index: true,
    },
    verificationNote: { type: String, default: null },
    verifiedAt:       { type: Date,   default: null },
    verifiedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Razorpay Route linked account (acc_xxx) used to pay the doctor's share. Set by an admin.
    razorpayLinkedAccountId: { type: String, default: null },
  },
  { timestamps: true }
);

// One licence can only be claimed by one account.
userSchema.index(
  { registrationCouncil: 1, registrationNumber: 1 },
  { unique: true, partialFilterExpression: { registrationNumber: { $type: "string" } } }
);

module.exports = mongoose.model("User", userSchema);