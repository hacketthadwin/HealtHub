const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const Joi = require("joi");

require("dotenv").config();

// Joi schemas (Issue 12.2)
const signupSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(100).required(),
  role: Joi.string().valid("Doctor", "Patient").required(),
  specialization: Joi.string().optional().allow(null, ""),
  experience: Joi.number().min(0).max(60).optional().allow(null, ""),
  bio: Joi.string().max(500).optional().allow(null, ""),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Sign up route handler
exports.signup = async (req, res) => {
  try {
    // Validate input (Issue 12.2)
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { name, email, password, role, specialization, experience, bio } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User Already Exists" });
    }

    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await bcrypt.hash(password, 10);
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error in hashing password" });
    }

    // Build user data
    const userData = { name, email, password: hashedPassword, role };

    // Add doctor profile fields if role is Doctor (Issue 11.1)
    if (role === "Doctor") {
      if (specialization) userData.specialization = specialization;
      if (experience !== undefined && experience !== null && experience !== "") {
        userData.experience = parseInt(experience);
      }
      if (bio) userData.bio = bio;
    }

    const user = await User.create(userData);

    return res.status(200).json({
      success: true,
      message: "User Created Successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "User cannot be registered. Please try again later.",
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    // Validate input (Issue 12.2)
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { email, password } = req.body;

    // Check for registered user
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "User does not exist" });
    }

    // Verify password & generate JWT token
    if (await bcrypt.compare(password, user.password)) {
      const payload = {
        email: user.email,
        id: user._id,
        role: user.role,
        name: user.name,
        subscription: user.subscription,
        createdAt: user.createdAt,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

      user = user.toObject();
      user.token = token;
      user.password = undefined;

      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User logged in successfully",
      });
    } else {
      return res.status(403).json({ success: false, message: "Password does not match" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
};
