const jwt = require("jsonwebtoken")
require("dotenv").config();


// Shared by the HTTP middleware below and by the Socket.IO handshake check.
exports.verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

exports.auth = (req, res, next) => {  //this issue came when i tried to access token in community section to ask problems so i have to change the method to extract token
    try {

        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        // Check if the header exists and is in the correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "Token missing or malformed header"
            });
        }

        // Get the token part (remove "Bearer ")
        const token = authHeader.split(' ')[1];
        

        // Verify the token
        try {
            const decode = exports.verifyToken(token);
            req.user = decode; // Attach decoded payload to request object
        } catch (e) {
            return res.status(401).json({
                success: false,
                message: "Token is invalid"
            });
        }

        next();
    } catch (err) {
        console.error("Error in auth middleware:", err);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while verifying token"
        });
    }
};

exports.isDoctor = (req, res, next) => {
    try {
        if (req.user.role !== "Doctor") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for Doctors, you can not access it"
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}

exports.isPatient = (req, res, next) => {
    try {
        if (req.user.role !== "Patient") {
            return res.status(401).json({
                success: false,
                message: "This is a protect route for Patients,you can not access it"
            })
        }
        next();
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "User Role is not Matching"
        })
    }
}

exports.isAdmin = (req, res, next) => {
    if (req.user?.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Admin access required"
        });
    }
    next();
}

// Doctors act on bookings / prescriptions only after an admin approved their registration.
// Checked against the database (not the token) so a revoked doctor is blocked immediately.
exports.requireApprovedDoctor = async (req, res, next) => {
    try {
        const User = require("../models/userModel");
        const doctor = await User.findOne({ _id: req.user.id, role: "Doctor" }).select("verificationStatus");
        if (!doctor || doctor.verificationStatus !== "approved") {
            return res.status(403).json({
                success: false,
                code: "DOCTOR_NOT_VERIFIED",
                message: "Your doctor registration has not been verified yet. You can use this once an admin approves it."
            });
        }
        next();
    } catch (err) {
        console.error("requireApprovedDoctor error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
}