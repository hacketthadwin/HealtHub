// Escape user-supplied text before it is placed inside an HTML email.
const MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}

module.exports = { escapeHtml, esc: escapeHtml };