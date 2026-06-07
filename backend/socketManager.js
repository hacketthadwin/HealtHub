/**
 * socketManager.js
 *
 * A lightweight singleton that holds the Socket.IO `io` instance after it is
 * initialised in index.js.  Controllers and background jobs can call getIO()
 * to emit events without creating circular-dependency chains through index.js.
 *
 * Usage:
 *   // In index.js – after `new Server(...)`:
 *   require('./socketManager').setIO(io);
 *
 *   // In any controller:
 *   const { getIO } = require('../socketManager');
 *   const io = getIO();
 *   if (io) io.to(`user:${userId}`).emit('some_event', payload);
 */

let io = null;

module.exports = {
  setIO: (ioInstance) => {
    io = ioInstance;
  },
  getIO: () => io,
};