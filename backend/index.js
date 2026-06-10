require("dotenv").config();
const express   = require("express");
const app       = express();
const helmet    = require("helmet");
const rateLimit = require("express-rate-limit");
const Message   = require("./models/message");
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

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://healthub-six.vercel.app",
    "https://healthub-hmdmkbue6-adarsh-jhas-projects-f89f8c07.vercel.app",
  ],
  methods:        ["GET", "POST", "PATCH", "DELETE"],
  credentials:    true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

app.use("/api/v1", apiLimiter);


require("./config/database").connect();


const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://healthub-six.vercel.app",
      "https://healthub-hmdmkbue6-adarsh-jhas-projects-f89f8c07.vercel.app",
    ],
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

socketManager.setIO(io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinUserRoom", (userId) => {
    if (!userId) return;
    const roomName = `user:${userId}`;
    socket.join(roomName);
    console.log(`User ${userId} joined personal room: ${roomName}`);
  });

  socket.on("joinRoom", async ({ roomId, userId, role }) => {
    socket.join(roomId);
    console.log(`${role} ${userId} joined room: ${roomId}`);
    try {
      const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
      socket.emit("previousMessages", messages);
    } catch (err) {
      console.error("Error fetching previous messages:", err);
    }
  });

  socket.on("sendMessage", async ({
    roomId, senderId, senderName, receiverId, message,
    fileUrl, fileName, fileType, messageType,
  }) => {
    const msgData = {
      senderId,
      senderName,
      message:     message || "",
      fileUrl:     fileUrl  || null,
      fileName:    fileName || null,
      fileType:    fileType || null,
      messageType: messageType || "text",
      timestamp:   Date.now(),
      roomId,
    };
    io.to(roomId).emit("receiveMessage", msgData);
    try {
      await Message.create({
        roomId,
        sender:      senderId,
        receiver:    receiverId,
        message:     message || "",
        fileUrl:     fileUrl  || null,
        fileName:    fileName || null,
        fileType:    fileType || null,
        messageType: messageType || "text",
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


const userRoutes  = require("./routes/user");
const aiRoutes    = require("./routes/aiRoutes");
const { auth }    = require("./middlewares/authMiddleware");
const { getMyProfile } = require("./controller/doctorController");
const razorpay    = require("./config/paymentConfig");

app.use("/api/v1/login",  authLimiter);
app.use("/api/v1/signup", authLimiter);


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

app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/", (req, res) => {
  res.send("HealthHub API is running (PPR mode).");
});


const expireStalePayments = require("./jobs/expireStalePayments");
expireStalePayments();
setInterval(expireStalePayments, 30 * 60 * 1000);


server.listen(5000, () => {
  console.log("Server is running on port 5000 (PPR architecture active)");
});