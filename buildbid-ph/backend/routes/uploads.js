const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads", req.uploadFolder || "general");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed. Upload images or PDF/Word documents."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/upload/document — contractor document upload
router.post("/document", authenticate, authorize("CONTRACTOR"), (req, res) => {
  req.uploadFolder = "documents";
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    try {
      const { type } = req.body;
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
      if (!contractor) return res.status(404).json({ message: "Contractor profile not found." });

      const doc = await prisma.verificationDocument.create({
        data: {
          contractorId: contractor.id,
          type: type || "OTHER",
          fileName: req.file.originalname,
          filePath: req.file.path,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        },
      });

      // Update verification to PENDING if UNVERIFIED
      if (contractor.verificationStatus === "UNVERIFIED") {
        await prisma.contractorProfile.update({
          where: { id: contractor.id },
          data: { verificationStatus: "PENDING" },
        });
      }

      // Notify admins
      const admins = await prisma.admin.findMany({ select: { userId: true } });
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.userId,
          type: "SYSTEM",
          title: "New Document Uploaded",
          message: `A contractor has uploaded a ${type} document for verification.`,
          link: "/admin",
        })),
      });

      res.status(201).json({ message: "Document uploaded.", document: doc });
    } catch (dbErr) {
      res.status(500).json({ message: "Database error." });
    }
  });
});

// POST /api/upload/project-image — project image upload
router.post("/project-image", authenticate, authorize("CLIENT"), (req, res) => {
  req.uploadFolder = "projects";
  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const filePath = `/${req.file.path.replace(/\\/g, "/")}`;
    res.json({ url: filePath, filename: req.file.filename });
  });
});

// POST /api/upload/avatar
router.post("/avatar", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), (req, res) => {
  req.uploadFolder = "avatars";
  upload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    try {
      const filePath = `/${req.file.path.replace(/\\/g, "/")}`;
      await prisma.user.update({
        where: { id: req.userId },
        data: { avatar: filePath },
      });
      res.json({ avatar: filePath });
    } catch {
      res.status(500).json({ message: "Database error." });
    }
  });
});

module.exports = router;
