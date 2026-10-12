const bcrypt = require("bcrypt");
const User   = require("../models/userModel");
const jwt    = require("jsonwebtoken");
const Joi    = require("joi");

require("dotenv").config();


const signupSchema = Joi.object({
  name:           Joi.string().min(2).max(50).required(),
  email:          Joi.string().email().required(),
  password:       Joi.string().min(8).max(100).required(),
  role:           Joi.string().valid("Doctor", "Patient").required(),
  specialization: Joi.string().optional().allow(null, ""),
  experience:     Joi.number().min(0).max(60).optional().allow(null, ""),
  bio:            Joi.string().max(500).optional().allow(null, ""),
  phone:          Joi.string().pattern(/^\+?[0-9\s-]{10,16}$/).optional().allow(null, ""),
  notifyConsent:  Joi.boolean().optional(),
  // Required for doctors: checked by an admin against the national medical register.
  registrationNumber:  Joi.when("role", { is: "Doctor", then: Joi.string().trim().min(3).max(40).required(), otherwise: Joi.any().strip() }),
  registrationCouncil: Joi.when("role", { is: "Doctor", then: Joi.string().trim().min(2).max(80).required(), otherwise: Joi.any().strip() }),
});

// bcrypt hash of a random string — compared against when the email is unknown so timing doesn't leak it.
const DUMMY_HASH = "$2b$10$GHDwrIVmgsJdomeZroiCUOnSiWQafb.tspGMLZDPjs3FkL7K1TDNW";

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

exports.signup = async (req, res) => {
  try {
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const {
      name, email, password, role, specialization, experience, bio,
      phone, notifyConsent, registrationNumber, registrationCouncil,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User Already Exists" });
    }

    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error hashing password" });
    }

    const userData = { name, email, password: hashedPassword, role };

    if (phone) {
      userData.phone         = String(phone).trim();
      userData.notifyConsent = notifyConsent === true;
    }

    if (role === "Doctor") {
      if (specialization) userData.specialization = specialization;
      if (experience !== undefined && experience !== null && experience !== "") {
        userData.experience = parseInt(experience);
      }
      if (bio) userData.bio = bio;
      userData.registrationNumber  = String(registrationNumber).trim().toUpperCase();
      userData.registrationCouncil = String(registrationCouncil).trim();
      userData.verificationStatus  = "pending";
    }

    const user = await User.create(userData);

    // Never send the password hash back.
    const safeUser = user.toObject();
    delete safeUser.password;

    return res.status(200).json({
      success: true,
      message: role === "Doctor"
        ? "User Created Successfully. Your doctor registration will be verified before you appear to patients."
        : "User Created Successfully",
      data: safeUser,
    });
  } catch (err) {
    if (err?.code === 11000 && err?.keyPattern?.registrationNumber) {
      return res.status(400).json({
        success: false,
        message: "This registration number is already linked to another account.",
      });
    }
    if (err?.code === 11000 && err?.keyPattern?.email) {
      return res.status(400).json({ success: false, message: "User Already Exists" });
    }
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again later.",
    });
  }
};


exports.login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;

    let user = await User.findOne({ email });
    // Same response and similar timing whether the email exists or the password is wrong.
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (user && passwordOk) {



      const payload = {
        email:     user.email,
        id:        user._id,
        role:      user.role,
        name:      user.name,
        createdAt: user.createdAt,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

      user = user.toObject();
      user.token    = token;
      user.password = undefined;

      const options = {
        expires:  new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      return res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User logged in successfully",
      });
    } else {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};