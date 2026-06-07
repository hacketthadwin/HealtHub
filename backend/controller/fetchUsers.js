const User = require("../models/userModel");

exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const validRoles = ["Doctor"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const query = role ? { role } : {};

    const users = await User.find(query).select(
      "name role specialization experience bio availability " +
      "profilePicture consultingFee consultingFeeCurrency consultingFeeConfirmed"
    );

    if (users.length === 0) {
      return res.status(200).json({ message: "No users found", data: [] });
    }

    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};