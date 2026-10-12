const express = require("express");
const router  = express.Router();
const { auth, isPatient, isDoctor } = require("../middlewares/authMiddleware");
const {
  getMyHealthProfile, saveMyHealthProfile, deleteMyHealthProfile,
  updateContact, getPatientProfileForDoctor,
} = require("../controller/patientProfileController");

router.get(   "/profile/health",  auth, isPatient, getMyHealthProfile);
router.put(   "/profile/health",  auth, isPatient, saveMyHealthProfile);
router.delete("/profile/health",  auth, isPatient, deleteMyHealthProfile);
router.patch( "/profile/contact", auth, updateContact);
router.get(   "/profile/health/booking/:bookingRequestId", auth, isDoctor, getPatientProfileForDoctor);

module.exports = router;