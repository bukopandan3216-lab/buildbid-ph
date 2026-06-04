const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");


const supabase = require("../config/supabase");


const prisma = new PrismaClient();
const PAYMENT_METHODS = new Set(["BANK_TRANSFER", "GCASH", "PAYMAYA"]);

const proofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads", "payment-proofs");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const proofUpload = multer({
  storage: proofStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WebP receipt images are allowed."), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/payments/:id/proof — upload payment proof
router.put(
  "/:id/proof",
  authenticate,
  proofUpload.single("proof"),
  async (req, res) => {
    try {
      const { notes, paymentMethod } = req.body;

      if (!PAYMENT_METHODS.has(paymentMethod)) {
        return res.status(400).json({
          message: "Please select a valid payment method."
        });
      }

      const payment = await prisma.payment.findUnique({
        where: {
          id: Number(req.params.id)
        },
        include: {
          project: true,
          contract: {
            include: {
              contractor: true
            }
          }
        }
      });

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Proof file is required."
        });
      }

      if (payment.status === "COMPLETED") {
        return res.status(400).json({
          message: "Payment already approved."
        });
      }

      if (payment.status === "PROCESSING") {
        return res.status(400).json({
          message: "Payment proof is already under review."
        });
      }

      if (req.userRole !== "CLIENT") {
        return res.status(403).json({
          message: "Only the client can upload payment proof."
        });
      }

      const client = await prisma.clientProfile.findUnique({
        where: { userId: req.userId }
      });

      if (payment.project.clientId !== client?.id) {
        return res.status(403).json({
          message: "Not authorized."
        });
      }

      console.log("CLIENT SIGNATURE:", payment.contract?.clientSignature);
      console.log("CONTRACTOR SIGNATURE:", payment.contract?.contractorSignature);

      if (
        !payment.contract?.clientSignature ||
        !payment.contract?.contractorSignature
      ) {
        return res.status(400).json({
          message: "Contract must be signed by both parties."
        });
      }



     const fileBuffer = fs.readFileSync(req.file.path);

const fileName = `payments/${Date.now()}-${req.file.originalname}`;

const { error } = await supabase.storage
  .from("payment-proofs")
  .upload(fileName, fileBuffer, {
    contentType: req.file.mimetype,
    upsert: false
  });

if (error) {
  throw error;
}

const { data } = supabase.storage
  .from("payment-proofs")
  .getPublicUrl(fileName);

const proofPath = data.publicUrl;

      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          proofOfPayment: proofPath,
          proofScreenshot: proofPath,
          notes,
          paymentMethod,
          status: "PROCESSING"
        }
      });

      const admins = await prisma.admin.findMany({
        select: { userId: true }
      });

      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.userId,
          type: "PAYMENT_UPLOADED",
          title: "Payment Proof Submitted",
          message: `Payment proof uploaded for ${payment.referenceNumber}`,
          link: "/admin"
        }))
      });

      res.json({
        message: "Payment proof submitted.",
        payment: updated
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({
        message: "Server error."
      });
    }
  }
);

// ==========================================
// PUT /api/payments/:id/approve
// ==========================================
router.put(
  "/:id/approve",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          project: true,
          contract: {
            include: { contractor: true }
          }
        }
      });

      if (!payment) return res.status(404).json({ message: "Payment not found" });

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED" }
        });

        await tx.contract.update({
          where: { id: payment.contractId },
          data: {
            status: "ACTIVE",
            adminApprovedAt: new Date()
          }
        });

        const remainingAmount = Number(payment.contract.totalAmount) - Number(payment.amount);

        await tx.payment.create({
          data: {
            contractId: payment.contractId,
            projectId: payment.projectId,
            type: "FINAL_PAYMENT",
            amount: remainingAmount,
            status: "PENDING",
            referenceNumber: `FINAL-${Date.now()}`
          }
        });

        await tx.notification.create({
          data: {
            userId: payment.contract.contractor.userId,
            type: "PAYMENT_APPROVED",
            title: "Project Ready To Start",
            message: "Downpayment has been verified. You may begin work.",
            link: "/contracts"
          }
        });
      });

      res.json({ message: "Payment approved." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error." });
    }
  }
);

// ==========================================
// PUT /api/payments/:id/verify
// ==========================================
router.put(
  "/:id/verify",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: Number(req.params.id) },
        include: {
          project: true,
          contract: {
            include: { contractor: true }
          }
        }
      });

      if (!payment) return res.status(404).json({ message: "Payment not found" });

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED" }
        });

        await tx.contract.update({
          where: { id: payment.contractId },
          data: {
            status: "ACTIVE",
            adminApprovedAt: new Date()
          }
        });

        await tx.notification.create({
          data: {
            userId: payment.contract.contractor.userId,
            type: "PAYMENT_APPROVED",
            title: "Project Ready To Start",
            message: "Downpayment has been verified. You may begin work.",
            link: "/contracts"
          }
        });

        await tx.project.update({
          where: { id: payment.projectId },
          data: { status: "IN_PROGRESS" }
        });
      });

      res.json({ message: "Payment verified and approved." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error." });
    }
  }
);

// GET /api/payments/summary — analytics summary
router.get("/summary", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.userRole;
    let projectWhere = {};

    if (role === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId } });
      projectWhere = { project: { clientId: client?.id } };
    } else if (role === "CONTRACTOR") {
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId } });
      projectWhere = { contract: { contractorId: contractor?.id } };
    }

    const [paid, pending, overdue] = await Promise.all([
      prisma.payment.aggregate({ where: { ...projectWhere, status: "COMPLETED" }, _sum: { amount: true }, _count: true }),
      prisma.payment.aggregate({ where: { ...projectWhere, status: "PENDING" }, _sum: { amount: true }, _count: true }),
      prisma.payment.count({ where: { ...projectWhere, status: "PENDING", dueDate: { lt: new Date() } } }),
    ]);

    res.json({
      totalPaid: paid._sum.amount || 0,
      paidCount: paid._count,
      totalPending: pending._sum.amount || 0,
      pendingCount: pending._count,
      overdueCount: overdue,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
