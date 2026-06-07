const User = require("../models/userModel");


exports.updateConsultingFee = async (req, res) => {
  try {
    const { consultingFeeRupees } = req.body;


    if (
      typeof consultingFeeRupees !== "number" ||
      consultingFeeRupees <= 0 ||
      consultingFeeRupees > 50000
    ) {
      return res.status(400).json({
        success: false,
        message: "Consulting fee must be a number between ₹1 and ₹50,000.",
      });
    }


    const consultingFeePaise = Math.round(consultingFeeRupees * 100);

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { consultingFee: consultingFeePaise, consultingFeeConfirmed: true },
      { new: true, select: "name consultingFee consultingFeeCurrency consultingFeeConfirmed" }
    );

    return res.status(200).json({
      success: true,
      message: "Consulting fee updated successfully.",
      data: {
        consultingFeeRupees:    updated.consultingFee / 100,
        consultingFeePaise:     updated.consultingFee,
        currency:               updated.consultingFeeCurrency,
        consultingFeeConfirmed: updated.consultingFeeConfirmed,
      },
    });
  } catch (err) {
    console.error("updateConsultingFee error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};


exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};