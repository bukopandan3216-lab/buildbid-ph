const { PrismaClientKnownRequestError } = require("@prisma/client/runtime/library");

// Request logger
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 500 ? "\x1b[31m"
      : res.statusCode >= 400 ? "\x1b[33m"
      : "\x1b[32m";
    console.log(
      `${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${duration}ms)`
    );
  });
  next();
}

// 404 handler
function notFound(req, res, next) {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
}

// Global error handler
function errorHandler(err, req, res, next) {
  console.error("❌ Error:", err.message);

  // Prisma unique constraint violation
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const field = err.meta?.target?.[0] || "field";
      return res.status(409).json({ message: `${field} already exists.` });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found." });
    }
    return res.status(400).json({ message: "Database error.", code: err.code });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired. Please log in again." });
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File size exceeds 10MB limit." });
  }

  // Default
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: err.message || "An unexpected error occurred.",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = { requestLogger, notFound, errorHandler };
