const express = require("express");
const crypto  = require("crypto");
const router  = express.Router();
const { runAllJobs } = require("../jobs/runJobs");

function secretOk(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const given = req.get("x-cron-secret") || (req.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Hit this from an external scheduler (cron-job.org, GitHub Actions, Render cron) every 1–5 minutes.
// It also wakes a sleeping free-tier server.
router.post("/internal/run-jobs", async (req, res) => {
  if (!secretOk(req)) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const summary = await runAllJobs();
    return res.status(200).json({ success: true, summary });
  } catch (err) {
    console.error("run-jobs error:", err);
    return res.status(500).json({ success: false, message: "Job run failed" });
  }
});

module.exports = router;