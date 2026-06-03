const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

// GET /api/users/profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        avatar: true, emailVerified: true, createdAt: true,
        client: { select: { id: true, city: true, address: true } },
        contractor: {
          select: {
            id: true, companyName: true, licenseNumber: true,
            yearsExperience: true, specializations: true, city: true,
            verificationStatus: true, rating: true, completedProjects: true, bio: true,
            documents: true,
          },
        },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/users/profile
router.put("/profile", authenticate, async (req, res) => {
  try {
    const { name, phone, city, address, companyName, licenseNumber,
      yearsExperience, specializations, bio } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, phone },
      select: { id: true, name: true, email: true, role: true, phone: true, avatar: true },
    });

    if (req.userRole === "CLIENT") {
      await prisma.clientProfile.update({
        where: { userId: req.userId },
        data: { city, address },
      });
    } else if (req.userRole === "CONTRACTOR") {
      await prisma.contractorProfile.update({
        where: { userId: req.userId },
        data: { companyName, licenseNumber, yearsExperience: yearsExperience ? Number(yearsExperience) : undefined, specializations, bio, city },
      });
    }

    res.json({ message: "Profile updated.", user });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/users/contractors — browse verified contractors (for clients)
router.get("/contractors", authenticate, async (req, res) => {
  try {
    const { search, city, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      verificationStatus: "VERIFIED",
      ...(city && { city: { contains: city } }),
      ...(search && {
        OR: [
          { companyName: { contains: search } },
          { specializations: { contains: search } },
          { user: { name: { contains: search } } },
        ],
      }),
    };

    const [contractors, total] = await Promise.all([
      prisma.contractorProfile.findMany({
        where,
        include: {
          user: { select: { name: true, avatar: true, email: true } },
        },
        orderBy: [{ rating: "desc" }, { completedProjects: "desc" }],
        skip,
        take: Number(limit),
      }),
      prisma.contractorProfile.count({ where }),
    ]);

    res.json({ contractors, total });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/users/contractors/:id
router.get("/contractors/:id", authenticate, async (req, res) => {
  try {
    const contractor = await prisma.contractorProfile.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { name: true, avatar: true, email: true, phone: true } },
        bids: {
          where: { status: "ACCEPTED" },
          include: { project: { select: { title: true, status: true } } },
        },
      },
    });
    if (!contractor) return res.status(404).json({ message: "Contractor not found." });
    res.json({ contractor });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/users/dashboard-stats
router.get("/dashboard-stats", authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const role = req.userRole;
    let stats = {};

    if (role === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId } });
      if (!client) return res.status(404).json({ message: "Client not found." });
      const [totalProjects, activeBids, activeContracts, totalSpent] = await Promise.all([
        prisma.project.count({ where: { clientId: client.id, isActive: true } }),
        prisma.bid.count({ where: { project: { clientId: client.id }, status: "PENDING" } }),
        prisma.contract.count({ where: { project: { clientId: client.id }, status: "ACTIVE" } }),
        prisma.payment.aggregate({
          where: { project: { clientId: client.id }, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);
      stats = { totalProjects, activeBids, activeContracts, totalSpent: totalSpent._sum.amount || 0 };
    } else if (role === "CONTRACTOR") {
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId } });
      if (!contractor) return res.status(404).json({ message: "Contractor not found." });
      const [bidsSubmitted, bidsAccepted, activeProjects, totalEarned] = await Promise.all([
        prisma.bid.count({ where: { contractorId: contractor.id } }),
        prisma.bid.count({ where: { contractorId: contractor.id, status: "ACCEPTED" } }),
        prisma.contract.count({ where: { contractorId: contractor.id, status: "ACTIVE" } }),
        prisma.payment.aggregate({
          where: { contract: { contractorId: contractor.id }, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);
      stats = { bidsSubmitted, bidsAccepted, activeProjects, totalEarned: totalEarned._sum.amount || 0 };
    } else {
      const [users, projects, bids, revenue] = await Promise.all([
        prisma.user.count(),
        prisma.project.count({ where: { isActive: true } }),
        prisma.bid.count(),
        prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
      ]);
      stats = { users, projects, bids, revenue: revenue._sum.amount || 0 };
    }

    res.json({ stats });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
