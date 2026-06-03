const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
require("dotenv").config();

const path = require("path");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const projectRoutes = require("./routes/projects");
const bidRoutes = require("./routes/bids");
const contractRoutes = require("./routes/contracts");
const paymentRoutes = require("./routes/payments");
const messageRoutes = require("./routes/messages");
const notificationRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/uploads");

const { setupSocket } = require("./socket");
const { requestLogger, notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();
app.set("trust proxy", 1);
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin?.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    }
  },
  credentials: true,
};

const io = new Server(server, {
  cors: corsOptions,
});

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));

// ── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login attempts. Please wait 15 minutes." },
});
app.use("/api/", globalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static files ─────────────────────────────────────────────────────────────
app.use("/uploads", express.static("uploads"));

// ── Request logging ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(requestLogger);
}

// ── Inject socket.io into req ─────────────────────────────────────────────────
app.use((req, res, next) => { req.io = io; next(); });

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Socket.io ─────────────────────────────────────────────────────────────────
setupSocket(io);

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
server.listen(PORT, () => {
  console.log(`\n🚀 BuildBid PH API  →  http://localhost:${PORT}`);
  console.log(`📊 Environment      →  ${process.env.NODE_ENV || "development"}`);
  console.log(`🗄️  Database         →  ${process.env.DATABASE_URL?.split("@")[1] || "localhost"}\n`);
});
}

module.exports = { app, server, io };
