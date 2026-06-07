const express  = require("express");
const router   = express.Router();
const { auth, isPatient, isDoctor } = require("../middlewares/authMiddleware");

const {
  createBookingRequest,
  getMyBookingRequests,
  cancelBookingRequest,
  acceptBookingRequest,
  rejectBookingRequest,
  abortBookingRequest,      
  getDoctorQueue,
  getSingleRequest,
} = require("../controller/bookingRequestController");

const {
  initiatePayment,
  verifyPayment,
} = require("../controller/appointmentPaymentController");

const {
  updateConsultingFee,
} = require("../controller/doctorController");

router.get(   "/doctor/queue",          auth, isDoctor,  getDoctorQueue);
router.patch( "/doctor/consulting-fee", auth, isDoctor,  updateConsultingFee);


router.post(  "/",               auth, isPatient, createBookingRequest);
router.get(   "/my-requests",    auth, isPatient, getMyBookingRequests);


router.patch( "/:id/cancel",           auth, isPatient, cancelBookingRequest);
router.post(  "/:id/initiate-payment", auth, isPatient, initiatePayment);
router.post(  "/:id/verify-payment",   auth, isPatient, verifyPayment);

router.patch( "/:id/accept", auth, isDoctor,  acceptBookingRequest);
router.patch( "/:id/reject", auth, isDoctor,  rejectBookingRequest);

router.patch( "/:id/abort",  auth, isDoctor,  abortBookingRequest);


router.get(   "/:id",        auth, getSingleRequest);

module.exports = router;