const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  receiver: { type: String },           
  message: { type: String, default: "" },

  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  messageType: {
    type: String,
    enum: ["text", "file"],
    default: "text",
  },

  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
