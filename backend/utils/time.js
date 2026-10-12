// All doctor-entered schedule times are Indian Standard Time. The server (Render) runs in UTC, so a
// date string without an offset would be parsed as UTC and land 5.5 hours off. Always parse with an
// explicit +05:30 offset.
const IST_OFFSET = "+05:30";

function convertTo24h(timeStr) {
  if (typeof timeStr !== "string") throw new Error("Invalid time");
  const parts    = timeStr.trim().split(/\s+/);
  const modifier = parts[1]?.toUpperCase();
  let [hours, minutes] = (parts[0] || "").split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) throw new Error("Invalid time");
  if (modifier && !["AM", "PM"].includes(modifier)) throw new Error("Invalid time");
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours  = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) throw new Error("Invalid time");
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

// "2026-10-08" + "10:30 AM"  ->  Date for 10:30 IST on that day.
function parseISTDateTime(dateStr, timeStr) {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    throw new Error("Invalid date");
  }
  const d = new Date(`${dateStr.trim()}T${convertTo24h(timeStr)}${IST_OFFSET}`);
  if (isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

module.exports = { IST_OFFSET, convertTo24h, parseISTDateTime };