const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");
const { validateRegister, validateLogin } = require("../validators/auth");

const prisma = new PrismaClient();

// POST /api/auth/register
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const normalizedRole = role?.toUpperCase() === "CONTRACTOR" ? "CONTRACTOR" : "CLIENT";

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: normalizedRole,
        phone,
        // Create related profile
        ...(normalizedRole === "CLIENT"
          ? { client: { create: {} } }
          : { contractor: { create: {} } }),
      },
      select: {
        id: true, name: true, email: true, role: true, phone: true, avatar: true,
        emailVerified: true, userStatus: true, createdAt: true,
      },
    });

    res.status(201).json({
      message: "Registration submitted. Your account must be approved by an admin before you can log in.",
      pendingApproval: true,
      user,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// POST /api/auth/login
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, email: true, password: true, role: true,
        phone: true, avatar: true, isActive: true, emailVerified: true, userStatus: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.userStatus !== "VERIFIED") {
      return res.status(403).json({ message: "Account pending admin approval." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is suspended. Contact support." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    res.json({ message: "Login successful.", token, user: userWithoutPassword });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        avatar: true, isActive: true, emailVerified: true, createdAt: true,
        client: true,
        contractor: { include: { documents: true } },
      },
    });

    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/auth/logout (client-side handles token removal, this is just for audit)
router.post("/logout", authenticate, (req, res) => {
  res.json({ message: "Logged out successfully." });
});

module.exports = router;
