const express = require("express");
const router  = express.Router();
const { auth, isPatient, isDoctor } = require("../middlewares/authMiddleware");
const {
  uploadMiddleware, createRecord, listMyRecords, listSharedForBooking,
  shareRecord, unshareRecord, streamRecordFile, deleteRecord,
} = require("../controller/recordController");

router.post(  "/records",                                auth, isPatient, uploadMiddleware, createRecord);
router.get(   "/records",                                auth, isPatient, listMyRecords);
router.get(   "/records/shared/:bookingRequestId",       auth, isDoctor,  listSharedForBooking);
router.post(  "/records/:id/share",                      auth, isPatient, shareRecord);
router.delete("/records/:id/share/:bookingRequestId",    auth, isPatient, unshareRecord);
router.get(   "/records/:id/file",                       auth, streamRecordFile);
router.delete("/records/:id",                            auth, isPatient, deleteRecord);

module.exports = router;