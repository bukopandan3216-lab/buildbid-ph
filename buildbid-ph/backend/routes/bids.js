const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize, requireVerified } = require("../middleware/auth");

const prisma = new PrismaClient();

const bidStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads", "bids");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const bidUpload = multer({
  storage: bidStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Upload images or PDFs."), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/bids/project/:projectId — get all bids for a project
router.get("/project/:projectId", authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: Number(req.params.projectId) } });
    if (!project) return res.status(404).json({ message: "Project not found." });

    const bids = await prisma.bid.findMany({
      where: {
            rojectId: Number(req.params.projectId)
},// changed from projectId: Number(req.params.projectId) to allow Prisma to handle type conversion
      include: {
  images: true,
  contractor: {
    include: {
      user: {
        select: {
          name: true,
          avatar: true,
          email: true,
        },
      },
    },
  },
},
      orderBy: { amount: "asc" },
    });

    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});



// GET /api/bids/my — contractor's own bids
router.get("/my", authenticate, authorize("CONTRACTOR"), async (req, res) => {
  try {
    const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
    if (!contractor) return res.status(404).json({ message: "Contractor profile not found." });

    const bids = await prisma.bid.findMany({
      where: { contractorId: contractor.id },
      include: {
        project: {
          include: {
            client: { include: { user: { select: { name: true } } } },
          },
        },
        bidFiles: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ bids });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/bids/received — client's received bids across their projects
router.get("/received", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (!client) return res.status(404).json({ message: "Client profile not found." });

    const bids = await prisma.bid.findMany({
      where: { project: { clientId: client.id } },
      include: {
        project: { select: { id: true, title: true, status: true, budget: true } },
        contractor: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        bidFiles: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ bids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/bids/:id — get single bid with files
router.get("/:id", authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ message: "Invalid bid id." });
    const bid = await prisma.bid.findUnique({
      where: { id },
      include: {
        project: { include: { client: { include: { user: true } } } },
        contractor: { include: { user: { select: { id: true, name: true, avatar: true, email: true } } } },
        bidFiles: true,
      },
    });
    if (!bid) return res.status(404).json({ message: "Bid not found." });
    res.json({ bid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/bids — submit a bid
router.post(
  "/",
  authenticate,
  authorize("CONTRACTOR"),
  requireVerified,
  async (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.startsWith("multipart/form-data")) {
      bidUpload.array("attachments", 5)(req, res, next);
    } else {
      next();
    }
  },
  async (req, res) => {
    try {
      const { projectId, amount, proposal, laborCost, materialCost, estimatedDays, completionDate } = req.body;

      // Defensive: Check contractor profile and verification
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
    if (!contractor) return res.status(404).json({ message: "Contractor profile not found." });
    if (contractor.verificationStatus !== "VERIFIED") {
      return res.status(403).json({ message: "Your contractor account must be verified to submit bids." });
    }

    // Defensive: Check user status
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || user.userStatus !== "VERIFIED" || !user.isActive) {
      return res.status(403).json({ message: "Your user account is not active or not verified." });
    }

    // Project checks
    const project = await prisma.project.findUnique({ where: { id: Number(projectId) } });
    if (!project) return res.status(404).json({ message: "Project not found." });
    if (project.status !== "OPEN" && project.status !== "BIDDING") {
      return res.status(400).json({ message: "Project is not accepting bids." });
    }

    // Unique bid check
    const existing = await prisma.bid.findUnique({
      where: { projectId_contractorId: { projectId: project.id, contractorId: contractor.id } },
    });
    if (existing) return res.status(409).json({ message: "You already submitted a bid for this project." });

    // Create bid
    const bid = await prisma.bid.create({
      data: {
        projectId: project.id,
        contractorId: contractor.id,
        amount: Number(amount),
        proposal,
        laborCost: laborCost ? Number(laborCost) : null,
        materialCost: materialCost ? Number(materialCost) : null,
        estimatedDays: estimatedDays ? Number(estimatedDays) : null,
      //  completionDate: completionDate ? new Date(completionDate) : null,
      targetCompletionDate: completionDate
  ? new Date(completionDate)
  : null,
      },
    });

    if (req.files?.length) {
      await Promise.all(req.files.map((file) =>
        prisma.bidFile.create({
          data: {
            bidId: bid.id,
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
          },
        })
      ));
    }

    // Update project status to BIDDING
    if (project.status === "OPEN") {
      await prisma.project.update({ where: { id: project.id }, data: { status: "BIDDING" } });
    }

    // Notify client
    const client = await prisma.clientProfile.findUnique({
      where: { id: project.clientId },
      select: { userId: true },
    });

    await prisma.notification.create({
      data: {
        userId: client.userId,
        type: "NEW_BID",
        title: "New Bid Received",
        message: `A new bid of ₱${Number(amount).toLocaleString()} was submitted for \"${project.title}\"`,
        link: `/projects/${project.id}`,
      },
    });

    if (req.io && req.io.to) {
      req.io.to(`user_${client.userId}`).emit("notification", {
        type: "NEW_BID",
        message: `New bid for ${project.title}`,
      });
    }

    res.status(201).json({ message: "Bid submitted successfully.", bid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Server error." });
  }
});

// PUT /api/bids/:id/accept — client accepts a bid
//router.put("/:id/accept", authenticate, authorize("CLIENT"), async (req, res) => {
router.put("/:id/accept", authenticate, authorize("CLIENT"), async (req, res) => {
  try {

    const bid = await prisma.bid.findUnique({
      where: {
        id: Number(req.params.id)
      },
      include: {
        project: true,
        contractor: {
          include: {
            user: true
          }
        }
      }
    });

    if (!bid) {
      return res.status(404).json({
        message: "Bid not found."
      });
    }

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (bid.project.clientId !== client?.id) {
      return res.status(403).json({ message: "Not authorized to accept bids for this project." });
    }

    const declinedBids = await prisma.bid.findMany({
  where: {
    projectId: bid.projectId,
    id: { not: bid.id }
  },
  include: {
    contractor: true
  }
});

    // Accept this bid, decline all others, and close the project
    await prisma.$transaction([
      prisma.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } }),
      prisma.bid.updateMany({
        where: { projectId: bid.projectId, id: { not: bid.id } },
        data: { status: "DECLINED" },
      }),
      prisma.project.update({
        where: { id: bid.projectId },
        data: { status: "CLOSED", awardedBidId: bid.id },
      }),
    ]);

    // Auto-generate contract (active)
    const contractNumber = `BB-${Date.now()}-${bid.projectId}`;
    const contract = await prisma.contract.create({
  data: {
    projectId: bid.projectId,
    contractorId: bid.contractorId,

    contractNumber,

    totalAmount: bid.amount,

    targetCompletionDate:
      bid.targetCompletionDate,
      

   endDate: bid.targetCompletionDate,

    status: "PENDING_CONTRACTOR_SIGN",

    terms:
      "BuildBid PH Standard Construction Agreement"
  }
});

// Notify all declined contractors

for (const declinedBid of declinedBids) {
  const contractorProfile =
    await prisma.contractorProfile.findUnique({
      where: { id: declinedBid.contractorId },
      select: { userId: true }
    });

  if (!contractorProfile) continue;

  await prisma.notification.create({
    data: {
      userId: contractorProfile.userId,
      type: "BID_REJECTED",
      title: "Bid Declined",
      message: `Your bid for "${bid.project.title}" was not selected.`,
      link: "/bids"
    }
  });

  if (req.io?.to) {
    req.io.to(`user_${contractorProfile.userId}`).emit(
      "notification",
      {
        type: "BID_REJECTED",
        message: `Your bid for "${bid.project.title}" was not selected.`
      }
    );
  }
}

    // Create initial messaging entry (auto-create conversation)
    try {
      await prisma.message.create({
        data: {
          senderId: client.userId,
          receiverId: bid.contractor.userId,
          content: `Hello ${bid.contractor.user.name}, your bid for "${bid.project.title}" was accepted. This conversation was created automatically for contract discussions.`,
        },
      });
    } catch (msgErr) {
      console.error("Failed to create initial message:", msgErr);
    }

    // Create audit logs for both parties
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.userId,
          actionType: "APPROVE",
          resourceType: "Bid",
          resourceId: bid.id,
          changes: `Client accepted bid ${bid.id} for project ${bid.projectId}`,
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: bid.contractor.userId,
          actionType: "CREATE",
          resourceType: "Contract",
          resourceId: contract.id,
          changes: `Contract ${contract.id} created from accepted bid ${bid.id}`,
        },
      });
    } catch (auditErr) {
      console.error("Failed to write audit logs:", auditErr);
    }

    

    // Notify contractor
    await prisma.notification.create({
      data: {
        userId: bid.contractor.userId,
        type: "BID_ACCEPTED",
        title: "Your Bid Was Accepted! 🎉",
        message: `Congratulations! Your bid for "${bid.project.title}" has been accepted.`,
        link: `/contracts/${contract.id}`,
      },
    });
    

  

    // Notify client as confirmation
    await prisma.notification.create({
      data: {
        userId: req.userId,
        type: "CONTRACT_READY",
        title: "Contract Created",
        message: `Contract ${contract.contractNumber} has been created for project "${bid.project.title}".`,
        link: `/contracts/${contract.id}`,
      },
    });

    if (req.io && req.io.to) {
      req.io.to(`user_${bid.contractor.userId}`).emit("notification", {
        type: "BID_ACCEPTED",
        message: `Your bid for "${bid.project.title}" was accepted!`,
        contractId: contract.id,
      });
      req.io.to(`user_${req.userId}`).emit("notification", {
        type: "CONTRACT_READY",
        message: `Contract ${contract.contractNumber} created.`,
        contractId: contract.id,
      });
      // Also emit a 'conversation_created' event to both users to update their conversation list
      req.io.to(`user_${bid.contractor.userId}`).emit("conversation_created", { withUser: req.userId });
      req.io.to(`user_${req.userId}`).emit("conversation_created", { withUser: bid.contractor.userId });
    }

    res.json({ message: "Bid accepted. Contract created.", bid, contract });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/bids/:id/reject
router.put("/:id/reject", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const bid = await prisma.bid.update({
      where: { id: Number(req.params.id) },
      data: { status: "DECLINED", clientNote: req.body.note },
    });

    // Notify contractor about bid decline
    await prisma.notification.create({
      data: {
        userId: bid.contractorId ? (await prisma.contractorProfile.findUnique({ where: { id: bid.contractorId }, select: { userId: true } })).userId : null,
        type: "BID_REJECTED",
        title: "Bid Declined",
        message: `Your bid for project ${bid.projectId} was declined.`,
        link: `/projects/${bid.projectId}`,
      },
    });

    if (req.io && req.io.to) {
      const contractorUserId = (await prisma.contractorProfile.findUnique({ where: { id: bid.contractorId }, select: { userId: true } })).userId;
      req.io.to(`user_${contractorUserId}`).emit("notification", {
        type: "BID_REJECTED",
        message: `Your bid for project ${bid.projectId} was declined.`,
      });
    }

    res.json({ message: "Bid declined.", bid });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

function generateContractTerms(bid, client) {
  return `This Construction Contract is entered into between the CLIENT and the CONTRACTOR for the project referenced above.

SCOPE OF WORK: As described in the project posting and bid proposal.
CONTRACT PRICE: ₱${Number(bid.amount).toLocaleString()}
PAYMENT SCHEDULE:
  - 30% Downpayment upon contract signing
  - 40% Upon reaching 60% project completion
  - 30% Upon final inspection and completion

ESTIMATED COMPLETION: ${bid.estimatedDays || 90} days from contract signing date.

TERMS AND CONDITIONS:
1. The Contractor shall provide all labor, materials, and equipment necessary to complete the work.
2. The Client shall provide unobstructed access to the work site.
3. All changes to the scope of work must be documented via a Change Order and signed by both parties.
4. The Contractor shall maintain liability insurance throughout the project.
5. Disputes shall be resolved through the CIAC (Construction Industry Arbitration Commission).

This contract is governed by Philippine laws.`;
}

module.exports = router;
