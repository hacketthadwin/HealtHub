const mongoose       = require("mongoose");
const Message        = require("../models/message");
const User           = require("../models/userModel");
const BookingRequest = require("../models/bookingRequestModel");
const { verifyToken } = require("../middlewares/authMiddleware");

const ROOM_RE        = /^([a-f\d]{24})_([a-f\d]{24})$/i;
const CHAT_STATUSES  = ["PAID_CONFIRMED", "COMPLETED"];       // chat exists only around a paid consultation
const MAX_TEXT       = 2000;
const AUTH_TTL_MS    = 60 * 1000;                              // re-check the booking at most once a minute per room
const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX       = 20;

// ── Handshake: a valid JWT is required to connect at all ─────────────────────
function socketAuth(socket, next) {
  try {
    const bearer = (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    const token  = socket.handshake.auth?.token || bearer;
    if (!token) return next(new Error("AUTH_REQUIRED"));
    const decoded = verifyToken(token);
    if (!decoded?.id || !decoded?.role) return next(new Error("AUTH_INVALID"));
    socket.user = { id: String(decoded.id), role: decoded.role, name: decoded.name || decoded.email || "User" };
    next();
  } catch {
    next(new Error("AUTH_INVALID"));
  }
}

// ── Room membership: roomId is "<idA>_<idB>" and the pair must have a paid consultation ──
async function authorizeRoom(user, roomId) {
  const m = ROOM_RE.exec(String(roomId || ""));
  if (!m) return null;
  const [a, b] = [m[1].toLowerCase(), m[2].toLowerCase()];
  if (user.id !== a && user.id !== b) return null;
  const otherId = user.id === a ? b : a;
  if (otherId === user.id) return null;

  const other = await User.findById(otherId).select("role name");
  if (!other) return null;
  if (user.role === "Patient" && other.role !== "Doctor") return null;
  if (user.role === "Doctor"  && other.role !== "Patient") return null;
  if (!["Doctor", "Patient"].includes(user.role)) return null;

  const patientId = user.role === "Patient" ? user.id : otherId;
  const doctorId  = user.role === "Doctor"  ? user.id : otherId;
  const ok = await BookingRequest.exists({ patientId, doctorId, status: { $in: CHAT_STATUSES } });
  return ok ? { otherId } : null;
}

function register(io) {
  io.use(socketAuth);

  io.on("connection", (socket) => {
    // Personal room is the authenticated user's own — the client can't pick someone else's.
    socket.join(`user:${socket.user.id}`);
    socket.data.rooms = new Map();            // roomId -> { otherId, expires }
    socket.data.sent  = [];

    // Kept for compatibility with the existing client; the argument is ignored.
    socket.on("joinUserRoom", () => socket.join(`user:${socket.user.id}`));

    socket.on("joinRoom", async (payload = {}) => {
      try {
        const roomId = payload?.roomId;
        const auth = await authorizeRoom(socket.user, roomId);
        if (!auth) return socket.emit("chatError", { message: "You can chat only with a doctor / patient you have a paid consultation with." });

        socket.join(roomId);
        socket.data.rooms.set(roomId, { otherId: auth.otherId, expires: Date.now() + AUTH_TTL_MS });
        const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(500);
        socket.emit("previousMessages", messages);
      } catch (err) {
        console.error("joinRoom error:", err.message);
      }
    });

    socket.on("sendMessage", async (payload = {}) => {
      try {
        const { roomId, message, fileUrl, fileName, fileType, messageType } = payload;

        // simple per-socket rate limit
        const now = Date.now();
        socket.data.sent = socket.data.sent.filter((t) => now - t < RATE_WINDOW_MS);
        if (socket.data.sent.length >= RATE_MAX) return socket.emit("chatError", { message: "You're sending messages too fast." });
        socket.data.sent.push(now);

        let entry = socket.data.rooms.get(roomId);
        if (!entry || !socket.rooms.has(roomId)) return socket.emit("chatError", { message: "Join the chat first." });
        if (entry.expires < now) {                                   // re-verify the booking periodically
          const auth = await authorizeRoom(socket.user, roomId);
          if (!auth) { socket.leave(roomId); socket.data.rooms.delete(roomId); return socket.emit("chatError", { message: "This chat is no longer available." }); }
          entry = { otherId: auth.otherId, expires: now + AUTH_TTL_MS };
          socket.data.rooms.set(roomId, entry);
        }

        const text = typeof message === "string" ? message.slice(0, MAX_TEXT) : "";
        const type = messageType === "file" ? "file" : "text";

        let safeFileUrl = null, safeFileName = null, safeFileType = null;
        if (fileUrl) {
          // Only files the sender uploaded themselves through /upload/medical.
          const cloud = process.env.CLOUDINARY_CLOUD_NAME;
          const prefix = cloud ? `https://res.cloudinary.com/${cloud}/` : "https://res.cloudinary.com/";
          const ownFolder = `/healthhub/medical-reports/${socket.user.id}/`;
          if (typeof fileUrl !== "string" || !fileUrl.startsWith(prefix) || !fileUrl.includes(ownFolder)) {
            return socket.emit("chatError", { message: "That file can't be sent." });
          }
          safeFileUrl  = fileUrl;
          safeFileName = String(fileName || "").slice(0, 150) || null;
          safeFileType = String(fileType || "").slice(0, 60) || null;
        }
        if (!text && !safeFileUrl) return;

        // Sender identity and receiver come from the verified token / room, never from the client.
        const msgData = {
          senderId:    socket.user.id,
          senderName:  socket.user.name,
          message:     text,
          fileUrl:     safeFileUrl,
          fileName:    safeFileName,
          fileType:    safeFileType,
          messageType: type,
          timestamp:   now,
          roomId,
        };
        io.to(roomId).emit("receiveMessage", msgData);

        await Message.create({
          roomId,
          sender:      socket.user.id,
          receiver:    entry.otherId,
          message:     text,
          fileUrl:     safeFileUrl,
          fileName:    safeFileName,
          fileType:    safeFileType,
          messageType: type,
        });
      } catch (err) {
        console.error("sendMessage error:", err.message);
      }
    });
  });
}

module.exports = register;
module.exports.socketAuth = socketAuth;
module.exports.authorizeRoom = authorizeRoom;