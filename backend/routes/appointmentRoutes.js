const express = require("express");
const { auth } = require("../middlewares/authMiddleware");
const {
 bookAppointment,
 getDoctorAppointments,
 updateAppointmentStatus,
 getPatientAcceptedDoctors // <-- NEW: Import the controller function
} = require("../controller/appointmentController");

const router = express.Router();
console.log("bookAppointment:", typeof bookAppointment);
console.log("getDoctorAppointments:", typeof getDoctorAppointments);
console.log("updateAppointmentStatus:", typeof updateAppointmentStatus);
console.log("getPatientAcceptedDoctors:", typeof getPatientAcceptedDoctors); // Check new function availability


router.post("/book", auth, bookAppointment);
router.get("/doctorappointment", auth, getDoctorAppointments);
router.patch("/:id", auth, updateAppointmentStatus);

// --- NEW ROUTE: Retrieves accepted doctors for the authenticated patient ---
router.get("/patient-doctors", auth, getPatientAcceptedDoctors);
// --------------------------------------------------------------------------

module.exports = router;
