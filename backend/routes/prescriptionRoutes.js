const express = require("express");
const router = express.Router();
const { auth, isDoctor, isPatient, requireApprovedDoctor } = require("../middlewares/authMiddleware");
const {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionForBooking,
  downloadPrescriptionPdf,
} = require("../controller/prescriptionController");

router.post("/prescriptions", auth, isDoctor, requireApprovedDoctor, createPrescription);
router.get("/prescriptions/patient", auth, isPatient, getPatientPrescriptions);
router.get("/prescriptions/doctor", auth, isDoctor, getDoctorPrescriptions);
router.get("/prescriptions/booking/:bookingRequestId", auth, getPrescriptionForBooking);
router.get("/prescriptions/:id/pdf", auth, downloadPrescriptionPdf);

module.exports = router;