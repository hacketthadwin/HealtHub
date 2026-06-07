/**
 A lightweight singleton that holds the Socket.IO `io` instance after it is
 initialised in index.js.  Controllers and background jobs can call getIO()
 to emit events without creating circular-dependency chains through index.js.
 */

let io = null;

module.exports = {
  setIO: (ioInstance) => {
    io = ioInstance;
  },
  getIO: () => io,
};