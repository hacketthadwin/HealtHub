// One-time migration for the verification / payments / reviews update.
//
//   node scripts/migrateV2.js                       -> dry run (prints what it would do)
//   node scripts/migrateV2.js --apply               -> apply the safe steps
//
// Options (combine with --apply):
//   --approve-legacy-doctors   approve doctors who signed up BEFORE verification existed (use for known/test accounts).
//                              Without it they are set to "pending" and must be approved in the admin panel.
//   --shift-schedule-timezone  correct upcoming appointment times that were stored 5.5h off by the old UTC parsing.
//                              Run it ONCE, right when you deploy this update, and only if your server runs in UTC.
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/userModel");
const AppointmentPayment = require("../models/appointmentPaymentModel");
const BookingRequest = require("../models/bookingRequestModel");
const DoctorSchedule = require("../models/doctorScheduleModel");

const APPLY   = process.argv.includes("--apply");
const APPROVE = process.argv.includes("--approve-legacy-doctors");
const SHIFT   = process.argv.includes("--shift-schedule-timezone");
const SHIFT_MS = -(5.5 * 60 * 60 * 1000);           // stored "10:30" as 10:30Z, real instant is 05:00Z

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  console.log(APPLY ? "APPLYING changes" : "DRY RUN (add --apply to write)");

  // 1. Doctors created before verification existed
  const legacy = await User.find({ role: "Doctor", verificationStatus: { $in: [null, "not_applicable"] } }).select("_id email");
  const target = APPROVE ? "approved" : "pending";
  console.log(`Doctors without a verification status: ${legacy.length} -> ${target}`);
  if (APPLY && legacy.length) {
    await User.updateMany(
      { _id: { $in: legacy.map((d) => d._id) } },
      { $set: { verificationStatus: target, verificationNote: APPROVE ? "Grandfathered (existing account)" : null, verifiedAt: APPROVE ? new Date() : null } }
    );
  }

  // 2. The old reviews collection has a unique index on appointmentId that would block new reviews
  try {
    const col = mongoose.connection.collection("reviews");
    const idx = await col.indexes().catch(() => []);
    const old = idx.find((i) => i.name === "appointmentId_1");
    console.log(old ? "Legacy reviews index appointmentId_1: found -> drop" : "Legacy reviews index: not present");
    if (APPLY && old) await col.dropIndex("appointmentId_1");
  } catch (e) { console.log("Index check skipped:", e.message); }

  // 3. Payments saved before the payout fields existed: give them the defaults the admin pages expect
  const legacyPayments = await AppointmentPayment.countDocuments({ payoutStatus: { $exists: false } });
  console.log(`Payments without a payout status: ${legacyPayments} -> NOT_DUE`);
  if (APPLY && legacyPayments) {
    await AppointmentPayment.updateMany(
      { payoutStatus: { $exists: false } },
      { $set: { payoutStatus: "NOT_DUE" } }
    );
    await AppointmentPayment.updateMany(
      { capturedVia: { $exists: false } },
      { $set: { capturedVia: "checkout" } }
    );
  }

  // 4. Optional: shift upcoming schedule times
  if (SHIFT) {
    const now = new Date();
    const upcoming = await BookingRequest.find({
      status: { $in: ["DOCTOR_ACCEPTED_AWAITING_PAYMENT", "PAID_CONFIRMED"] },
      "proposedByDoctor.scheduledDate": { $gt: new Date(now.getTime() - 24 * 3600 * 1000) },
    });
    console.log(`Upcoming bookings to shift by -5.5h: ${upcoming.length}`);
    if (APPLY) {
      for (const b of upcoming) {
        b.proposedByDoctor.scheduledDate = new Date(b.proposedByDoctor.scheduledDate.getTime() + SHIFT_MS);
        await b.save();
        const sch = await DoctorSchedule.findOne({ bookingRequestId: b._id });
        if (sch) {
          for (const f of ["scheduledDate", "slotEnd"]) {
            if (sch[f] instanceof Date) sch[f] = new Date(sch[f].getTime() + SHIFT_MS);
          }
          await sch.save();
        }
      }
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
})().catch((e) => { console.error(e); process.exit(1); });