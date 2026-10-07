const rateLimit = require("express-rate-limit");
const net = require("net");

// express-rate-limit v8+ ships its own IPv6-safe helper. On v7 it is undefined and we use the
// fallback below, so this file works on both versions.
const { ipKeyGenerator } = rateLimit;

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR    = 60 * 60 * 1000;

/**
 * Client key for rate limiting.
 *
 * Relies on `app.set("trust proxy", n)` in index.js so that `req.ip` is the real
 * client address (taken from X-Forwarded-For) and not Render's proxy address.
 *
 * IPv6 clients (very common on mobile networks) normally get a whole block of addresses
 * and can rotate inside it, so we key on the network prefix instead of the full address.
 * Otherwise a single device could dodge the limiter just by changing its address.
 */
function ipKey(req) {
  // v8+: the library's own helper (v8's validation also looks for this name in this function)
  if (typeof ipKeyGenerator === "function") return ipKeyGenerator(req.ip || "");

  // v7 fallback: key on the /64 prefix ourselves.
  const ip = req.ip || "";

  // IPv4-mapped IPv6 (::ffff:1.2.3.4) -> plain IPv4
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return mapped[1];

  if (!net.isIPv6(ip)) return ip;

  // Expand the address and keep the first 4 groups (the /64 prefix).
  const [head, tail = ""] = ip.split("%")[0].split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const fill = Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill("0");
  const groups = [...headParts, ...fill, ...tailParts];
  return groups.slice(0, 4).map((g) => g.toLowerCase().padStart(4, "0")).join(":") + "::/64";
}

const emailOf = (req) =>
  String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254);

const reply = (message) => ({ success: false, message });

// General API limiter — per real client IP.
// Same 100 / 15 min as before, but now counted per real client IP instead of one shared bucket.
const apiLimiter = rateLimit({
  windowMs:        FIFTEEN_MIN,
  max:             Number(process.env.API_RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    ipKey,
  message:         reply("Too many requests. Please try again later."),
});

// Login: only FAILED attempts (status >= 400) count. Successful logins — from this
// or any other device — never use up the budget.
//   1) per account + IP : stops password guessing against one account
//   2) per IP           : stops one client cycling through many accounts
const loginAccountLimiter = rateLimit({
  windowMs:              FIFTEEN_MIN,
  max:                   8,
  skipSuccessfulRequests: true,
  standardHeaders:       true,
  legacyHeaders:         false,
  keyGenerator:          (req) => `${ipKey(req)}|${emailOf(req)}`,
  message:               reply("Too many failed login attempts for this account. Please try again in 15 minutes."),
});

const loginIpLimiter = rateLimit({
  windowMs:              FIFTEEN_MIN,
  max:                   30,
  skipSuccessfulRequests: true,
  standardHeaders:       true,
  legacyHeaders:         false,
  keyGenerator:          ipKey,
  message:               reply("Too many failed login attempts. Please try again in 15 minutes."),
});

// Signup: every attempt counts (a successful signup is the thing being limited).
const signupLimiter = rateLimit({
  windowMs:        ONE_HOUR,
  max:             20,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator:    ipKey,
  message:         reply("Too many signup attempts. Please try again later."),
});

module.exports = {
  apiLimiter,
  loginLimiters: [loginIpLimiter, loginAccountLimiter],
  signupLimiter,
  ipKey, // exported for tests
};