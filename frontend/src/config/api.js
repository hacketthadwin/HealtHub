export const API_URL = process.env.REACT_APP_API_URL;

/**
 * Ping the backend to wake it from Render's free-tier sleep.
 * Called on page mount so the server is warm by the time the user submits.
 * Returns true if the server responded, false on timeout/error.
 */
export async function pingServer(timeoutMs = 8000) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_URL}/api/v1/ping`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}