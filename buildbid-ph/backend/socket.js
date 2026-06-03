const jwt = require("jsonwebtoken");

function setupSocket(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 User ${socket.userId} connected`);

    // Join personal room
    socket.join(`user_${socket.userId}`);

    // Join role-based room
    socket.join(`role_${socket.userRole}`);

    // Handle joining project rooms
    socket.on("join_project", (projectId) => {
      socket.join(`project_${projectId}`);
      console.log(`User ${socket.userId} joined project room ${projectId}`);
    });

    socket.on("leave_project", (projectId) => {
      socket.leave(`project_${projectId}`);
    });

    // Real-time messaging
    socket.on("send_message", async ({ receiverId, content }) => {
      const messageData = {
        senderId: socket.userId,
        receiverId,
        content,
        timestamp: new Date().toISOString(),
      };
      // Emit to receiver's room
      io.to(`user_${receiverId}`).emit("new_message", messageData);
    });

    // Typing indicator
    socket.on("typing", ({ receiverId, isTyping }) => {
      socket.to(`user_${receiverId}`).emit("user_typing", {
        senderId: socket.userId,
        isTyping,
      });
    });

    // Project status updates
    socket.on("project_update", ({ projectId, update }) => {
      io.to(`project_${projectId}`).emit("project_updated", { projectId, update });
    });

    socket.on("disconnect", () => {
      console.log(`🔌 User ${socket.userId} disconnected`);
    });
  });
}

module.exports = { setupSocket };
