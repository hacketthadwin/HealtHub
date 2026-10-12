require("dotenv").config();
const express   = require("express");
const app       = express();
const helmet    = require("helmet");
const { apiLimiter, loginLimiters, signupLimiter } = require("./middlewares/rateLimiters");
const cors      = require("cors");
const http      = require("http");
const { Server } = require("socket.io");
const server    = http.createServer(app);

const socketManager = require("./socketManager");

// REMOVED: console.log("Loaded DB URL:", process.env.DATABASE_URL)
// Logging the full connection string (including credentials) to stdout is a
// security risk — Render forwards logs to external collectors in production.
if (process.env.NODE_ENV !== "production") {
  console.log("DB connection initiated (development mode)");
}

// One list for both HTTP CORS and Socket.IO. Extra origins can be added with EXTRA_ALLOWED_ORIGINS (comma-separated).
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://healthub-six.vercel.app",
  "https://healthub-hmdmkbue6-adarsh-jhas-projects-f89f8c07.vercel.app",
  ...(process.env.EXTRA_ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
];

const corsOptions = {
  origin:         ALLOWED_ORIGINS,
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials:    true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Render puts a reverse proxy in front of the app. Without this, req.ip is the proxy's address,
// so EVERY visitor shares one rate-limit bucket. Override with TRUST_PROXY_HOPS if
// /api/v1/debug-ip (enable with DEBUG_IP=true) shows the wrong address.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);

if (process.env.DEBUG_IP === "true") {
  app.get("/api/v1/debug-ip", (req, res) => {
    res.json({
      ip: req.ip,
      xForwardedFor: req.headers["x-forwarded-for"] || null,
      trustProxyHops: app.get("trust proxy"),
    });
  });
}

app.use(helmet());
app.use(cors(corsOptions));

// Razorpay webhook: needs the RAW request body to verify its signature, so it is registered BEFORE
// express.json() and before the rate limiter (Razorpay retries must never be throttled).
app.post(
  "/api/v1/payment/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  require("./controller/razorpayWebhookController").razorpayWebhook
);

app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Health check used by the frontend warm-up and by uptime monitors. Registered BEFORE the
// rate limiter so these pings never use up (or get blocked by) the API budget.
app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

// Scheduler hook for an external cron (protected by CRON_SECRET). Also before the limiter.
app.use("/api/v1", require("./routes/internalRoutes"));

app.use("/api/v1", apiLimiter);


const io = new Server(server, {
  cors: {
    origin:      ALLOWED_ORIGINS,
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

socketManager.setIO(io);

// JWT-authenticated chat: see sockets/chatSocket.js
require("./sockets/chatSocket")(io);


const userRoutes  = require("./routes/user");
const aiRoutes    = require("./routes/aiRoutes");
const { auth }    = require("./middlewares/authMiddleware");
const { getMyProfile } = require("./controller/doctorController");
const razorpay    = require("./config/paymentConfig");

app.post("/api/v1/login",  ...loginLimiters);
app.post("/api/v1/signup", signupLimiter);


app.use("/api/v1", userRoutes);


app.use("/api/v1/booking-requests", require("./routes/bookingRequestRoutes"));


app.get("/api/v1/payment/razorpay-key", auth, (req, res) => {
  return res.status(200).json({
    success: true,
    keyId:   process.env.RAZORPAY_KEY_ID,
  });
});


app.get("/api/v1/me", auth, getMyProfile);


app.use("/api/v1/ai",   aiRoutes);
app.use("/api/v1", require("./routes/contactRoutes"));
app.use("/api/v1", require("./routes/uploadRoutes"));
app.use("/api/v1", require("./routes/videoRoutes"));
app.use("/api/v1", require("./routes/prescriptionRoutes"));
app.use("/api/v1", require("./routes/reviewRoutes"));
app.use("/api/v1", require("./routes/consultationRoutes"));
app.use("/api/v1", require("./routes/profileRoutes"));
app.use("/api/v1", require("./routes/recordRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));

app.get("/", (req, res) => {
  res.send("HealthHub API is running (PPR mode).");
});

// Last-resort JSON error handler (bad JSON bodies etc.)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error("Unhandled error:", err);
  res.status(status).json({ success: false, message: status >= 500 ? "Server error." : (err.message || "Bad request.") });
});


// Started only when run directly (node index.js), so tests can import the app without a database.
if (require.main === module) {
  require("./config/database").connect();

  // Background work (payment expiry, doctor-response expiry, reminders). Driven by database state, so it is
  // safe to run from this timer AND from an external cron (POST /api/v1/internal/run-jobs).
  require("./jobs/runJobs").startJobs();

  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (PPR architecture active)`);
  });
}

module.exports = { app, server, io };