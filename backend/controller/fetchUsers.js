const User   = require("../models/userModel");
const Review = require("../models/review");

// Patients only ever see doctors whose registration an admin has approved.
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const validRoles = ["Doctor"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const query = { role: "Doctor", verificationStatus: "approved" };

    const users = await User.find(query).select(
      "name role specialization experience bio availability " +
      "profilePicture consultingFee consultingFeeCurrency consultingFeeConfirmed " +
      "registrationNumber registrationCouncil verificationStatus"
    ).lean();

    if (users.length === 0) {
      return res.status(200).json({ message: "No users found", data: [] });
    }

    const ratings = await Review.aggregate([
      { $match: { doctorId: { $in: users.map((u) => u._id) } } },
      { $group: { _id: "$doctorId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    const byDoctor = new Map(ratings.map((r) => [String(r._id), r]));

    const data = users.map((u) => {
      const r = byDoctor.get(String(u._id));
      return {
        ...u,
        ratingAvg:   r ? Math.round(r.avg * 10) / 10 : null,
        ratingCount: r ? r.count : 0,
      };
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};