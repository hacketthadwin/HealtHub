const express = require("express");
const router = express.Router();
const { auth, isDoctor, isPatient } = require("../middlewares/authMiddleware");
const {
  createPrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
} = require("../controller/prescriptionController");

router.post("/prescriptions", auth, isDoctor, createPrescription);
router.get("/prescriptions/patient", auth, isPatient, getPatientPrescriptions);
router.get("/prescriptions/doctor", auth, isDoctor, getDoctorPrescriptions);

module.exports = router;
