const mongoose       = require("mongoose");
const Joi            = require("joi");
const PatientProfile = require("../models/patientProfileModel");
const BookingRequest = require("../models/bookingRequestModel");
const User           = require("../models/userModel");

const listField = Joi.array().items(Joi.string().trim().min(1).max(100)).max(50).default([]);

const profileSchema = Joi.object({
  consent:     Joi.boolean().valid(true).required()
    .messages({ "any.only": "You must consent to store your health information.", "any.required": "You must consent to store your health information." }),
  allowAiSummary: Joi.boolean().default(false),
  dateOfBirth: Joi.date().iso().max("now").allow(null, ""),
  sex:         Joi.string().valid("Female", "Male", "Other", "Prefer not to say").allow(null, ""),
  bloodGroup:  Joi.string().valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-").allow(null, ""),
  heightCm:    Joi.number().min(30).max(260).allow(null, ""),
  weightKg:    Joi.number().min(1).max(500).allow(null, ""),
  allergies:          listField,
  chronicConditions:  listField,
  currentMedications: listField,
  pastSurgeries:      listField,
  emergencyContact: Joi.object({
    name:  Joi.string().trim().max(100).allow("", null),
    phone: Joi.string().trim().max(20).allow("", null),
  }).default({}),
}).options({ stripUnknown: true });

const blank = (v) => (v === "" || v === undefined ? null : v);

exports.getMyHealthProfile = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user.id });
    const user    = await User.findById(req.user.id).select("phone notifyConsent");
    return res.status(200).json({
      success: true,
      data: profile,                                    // null until the patient saves one
      contact: { phone: user?.phone || "", notifyConsent: !!user?.notifyConsent },
    });
  } catch (err) {
    console.error("getMyHealthProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

exports.saveMyHealthProfile = async (req, res) => {
  try {
    const { error, value } = profileSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const existing = await PatientProfile.findOne({ userId: req.user.id }).select("consentedAt");

    const update = {
      dateOfBirth: blank(value.dateOfBirth),
      sex:         blank(value.sex),
      bloodGroup:  blank(value.bloodGroup),
      heightCm:    blank(value.heightCm),
      weightKg:    blank(value.weightKg),
      allergies:          value.allergies,
      chronicConditions:  value.chronicConditions,
      currentMedications: value.currentMedications,
      pastSurgeries:      value.pastSurgeries,
      emergencyContact: {
        name:  blank(value.emergencyContact?.name),
        phone: blank(value.emergencyContact?.phone),
      },
      allowAiSummary: value.allowAiSummary === true,
      consentedAt:    existing?.consentedAt || new Date(),
      consentVersion: "v1",
    };

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error("saveMyHealthProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Withdraw consent: deletes the profile.
exports.deleteMyHealthProfile = async (req, res) => {
  try {
    await PatientProfile.deleteOne({ userId: req.user.id });
    return res.status(200).json({ success: true, message: "Health profile deleted." });
  } catch (err) {
    console.error("deleteMyHealthProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

const contactSchema = Joi.object({
  phone:         Joi.string().pattern(/^\+?[0-9\s-]{10,16}$/).allow("", null),
  notifyConsent: Joi.boolean(),
}).options({ stripUnknown: true });

// Any logged-in user: phone number + consent for SMS / WhatsApp reminders.
exports.updateContact = async (req, res) => {
  try {
    const { error, value } = contactSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: "Enter a valid phone number (10–15 digits)." });

    const phone = value.phone ? String(value.phone).trim() : null;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { phone, notifyConsent: phone ? value.notifyConsent === true : false },
      { new: true, select: "phone notifyConsent" }
    );
    return res.status(200).json({ success: true, data: { phone: user.phone || "", notifyConsent: user.notifyConsent } });
  } catch (err) {
    console.error("updateContact error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// Doctor: read-only view of a patient's profile, only for a booking that is paid/completed with this doctor.
exports.getPatientProfileForDoctor = async (req, res) => {
  try {
    const { bookingRequestId } = req.params;
    if (!mongoose.isValidObjectId(bookingRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid booking id." });
    }
    const booking = await BookingRequest.findOne({
      _id: bookingRequestId,
      doctorId: req.user.id,
      status: { $in: ["PAID_CONFIRMED", "COMPLETED"] },
    }).select("patientId");
    if (!booking) return res.status(404).json({ success: false, message: "Consultation not found." });

    const profile = await PatientProfile.findOne({ userId: booking.patientId })
      .select("-_id -userId -createdAt -updatedAt -__v");
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    console.error("getPatientProfileForDoctor error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};