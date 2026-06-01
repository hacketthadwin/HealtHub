const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["Doctor", "Patient"],
    },

    subscription: {
      type: String,
      enum: ["Free", "Premium"],
      default: "Free",
    },

    // === Doctor Profile Fields (Issue 11.1) ===
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
    experience: { type: Number, default: null },  // Years of experience
    bio: { type: String, maxlength: 500, default: null },
    availability: {
      type: String,
      enum: ["Available", "Busy", "On Leave"],
      default: "Available",
    },
    profilePicture: { type: String, default: null }, // Cloudinary URL

    // === Doctor Verification Fields (Issue 11.5) ===
    isVerified: { type: Boolean, default: false },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    medicalLicenseNumber: { type: String, default: null },
    medicalLicenseDocument: { type: String, default: null }, // Cloudinary URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
