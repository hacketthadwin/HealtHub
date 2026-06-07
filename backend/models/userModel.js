const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ["Doctor", "Patient"], required: true },







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


  },
  { timestamps: true }
);


module.exports = mongoose.model("User", userSchema);