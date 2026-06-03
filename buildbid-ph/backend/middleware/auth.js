const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Verify JWT token and user approval/status
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { userStatus: true, isActive: true },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid token." });
    }

    if (user.userStatus !== "VERIFIED") {
      return res.status(403).json({ message: "Account must be approved by an admin before access is granted." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is suspended. Contact support." });
    }

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired. Please log in again." });
    }
    return res.status(401).json({ message: "Invalid token." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: "Access denied." });
    }
    next();
  };
}

async function requireVerified(req, res, next) {
  if (req.userRole !== "CONTRACTOR") return next();
  try {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { userId: req.userId },
    });
    if (!contractor || contractor.verificationStatus !== "VERIFIED") {
      return res.status(403).json({
        message: "Account must be verified to perform this action. Please submit your documents.",
      });
    }
    next();
  } catch {
    res.status(500).json({ message: "Server error." });
  }
}

async function requireClientVerified(req, res, next) {
  if (req.userRole !== "CLIENT") return next();
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (!client) {
      return res.status(404).json({ message: "Client profile not found." });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { userStatus: true },
    });
    if (!user || user.userStatus !== "VERIFIED") {
      return res.status(403).json({
        message: "Client account must be approved before posting projects.",
      });
    }
    next();
  } catch {
    res.status(500).json({ message: "Server error." });
  }
}

module.exports = { authenticate, authorize, requireVerified, requireClientVerified };
