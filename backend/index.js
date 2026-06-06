require("dotenv").config();
const express = require("express");
const app = express();
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Message = require("./models/message");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

console.log("Loaded DB URL:", process.env.DATABASE_URL);

const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://healthub-six.vercel.app",
    "https://healthub-hmdmkbue6-adarsh-jhas-projects-f89f8c07.vercel.app",
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Security headers
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());


if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    const host = req.headers.host || "";
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) //even if the app is in production, allow localhost for development/testing purposes
    {
      return next();
    }
    if (req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many login attempts. Please try again in 15 minutes." },
});

app.use("/api/v1", apiLimiter);

// Database connection
require("./config/database").connect();

// Socket.IO server setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://healthub-six.vercel.app",
      "https://healthub-hmdmkbue6-adarsh-jhas-projects-f89f8c07.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

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
      message: message || "",
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      messageType: messageType || "text",
      timestamp: Date.now(),
      roomId,
    };

    io.to(roomId).emit("receiveMessage", msgData);

    try {
      await Message.create({
        roomId,
        sender: senderId,
        receiver: receiverId,
        message: message || "",
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
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

// Routes
const user = require("./routes/user");
const paymentRoutes = require("./routes/paymentRoutes");
const aiRoutes = require("./routes/aiRoutes");

app.use("/api/v1/login", authLimiter);
app.use("/api/v1/signup", authLimiter);

app.use("/api/v1", user);
app.use("/api/v1/appointments", require("./routes/appointmentRoutes"));
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/ai", aiRoutes);

app.use("/api/v1", require("./routes/contactRoutes"));
app.use("/api/v1", require("./routes/uploadRoutes"));
app.use("/api/v1", require("./routes/videoRoutes"));
app.use("/api/v1", require("./routes/prescriptionRoutes"));
app.use("/api/v1", require("./routes/reviewRoutes"));

app.get("/api/v1/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/", (req, res) => {
  res.send("HealthHub API is running.");
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});