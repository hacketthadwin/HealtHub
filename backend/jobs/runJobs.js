const expireStalePayments = require("./expireStalePayments");
const expireStaleRequests = require("./expireStaleRequests");
const sendDueReminders    = require("./sendReminders");

let running = false;

// All background work in one place. Every job is driven by database state and is safe to run twice, so it
// can be triggered by the in-process timer AND by an external cron hitting POST /api/v1/internal/run-jobs.
async function runAllJobs() {
  if (running) return { skipped: "already running" };
  running = true;
  const summary = {};
  try {
    summary.payments  = await expireStalePayments();
    summary.requests  = await expireStaleRequests();
    summary.reminders = await sendDueReminders();
  } finally {
    running = false;
  }
  return summary;
}

// Best-effort in-process schedule. On a host that sleeps (e.g. Render free tier) an external cron
// calling the internal endpoint is what keeps things on time; this is the fallback while awake.
function startJobs() {
  const first = setTimeout(() => runAllJobs().catch((e) => console.error("[Jobs]", e.message)), 15 * 1000);
  const timer = setInterval(() => runAllJobs().catch((e) => console.error("[Jobs]", e.message)), 60 * 1000);
  first.unref?.(); timer.unref?.();
}

module.exports = { runAllJobs, startJobs };