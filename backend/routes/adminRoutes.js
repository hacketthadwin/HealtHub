const express = require("express");
const router  = express.Router();
const { auth, isAdmin } = require("../middlewares/authMiddleware");
const c = require("../controller/adminController");

router.use(auth, isAdmin);

router.get(  "/overview",                      c.getOverview);
router.get(  "/doctors",                       c.listDoctors);
router.patch("/doctors/:id/verification",      c.reviewDoctor);
router.patch("/doctors/:id/linked-account",    c.setLinkedAccount);

router.get(  "/payments",                      c.listPayments);
router.get(  "/disputes",                      c.listDisputes);
router.post( "/payments/:id/check",            c.checkPayment);
router.post( "/payments/:id/void",             c.voidPayment);
router.post( "/payments/:id/refund",           c.refundPayment);
router.post( "/payments/:id/payout/release",   c.releasePayout);
router.post( "/payments/:id/payout/mark-paid", c.markPayoutPaid);
router.get(  "/webhook-events",                c.listWebhookEvents);

module.exports = router;