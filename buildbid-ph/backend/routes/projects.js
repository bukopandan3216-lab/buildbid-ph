const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize, requireVerified, requireClientVerified } = require("../middleware/auth");

const prisma = new PrismaClient();

// Multer config for project photos
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join("uploads", "projects");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed. Upload JPG, PNG, or WebP images."), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET /api/projects — list projects with filters based on role
router.get("/", authenticate, async (req, res) => {
  try {
    const { status, city, category, minBudget, maxBudget, search, page = 1, limit = 12 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const role = req.userRole;
    const statusFilter = status ? status.toString().toUpperCase() : undefined;

    let where = {
      isActive: true,
      ...(statusFilter && { status: statusFilter }),
      ...(city && { city: { contains: city } }),
      ...(category && { category }),
      ...(minBudget || maxBudget ? {
        budget: {
          ...(minBudget && { gte: Number(minBudget) }),
          ...(maxBudget && { lte: Number(maxBudget) }),
        }
      } : {}),
      ...(search && {
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { location: { contains: search } },
        ],
      }),
    };

    if (role === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
      if (!client) return res.status(404).json({ message: "Client profile not found." });
      where = { ...where, clientId: client.id };
    } else if (role === "CONTRACTOR") {
      // Contractors should see active projects with optional filters.
      // If no explicit status filter is applied, show open/bidding opportunities.
      if (!status) {
        where = { ...where, status: { in: ["OPEN", "BIDDING"] } };
      }
    } else if (role !== "ADMIN") {
      return res.status(403).json({ message: "Not authorized to view projects." });
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          client: { include: { user: { select: { name: true, avatar: true } } } },
          projectFiles: true,
          _count: { select: { bids: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/projects/:id
router.get("/:id", authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        client: { include: { user: { select: { name: true, avatar: true, email: true, phone: true } } } },
        projectFiles: true,
        bids: {
          include: {
            contractor: { include: { user: { select: { name: true, avatar: true } } } },
          },
          orderBy: { amount: "asc" },
        },
        contract: true,
      },
    });

    if (!project) return res.status(404).json({ message: "Project not found." });

    // Authorization: clients can view their own projects; contractors can view open/bidding projects; admins see all
    if (req.userRole === "ADMIN") {
      // allowed
    } else if (req.userRole === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
      if (!client || project.clientId !== client.id) return res.status(403).json({ message: "Not authorized to view this project." });
    } else if (req.userRole === "CONTRACTOR") {
      if (!(project.status === "OPEN" || project.status === "BIDDING")) {
        return res.status(403).json({ message: "Not authorized to view this project." });
      }
    } else {
      return res.status(403).json({ message: "Not authorized." });
    }

    // Increment view count
    await prisma.project.update({ where: { id: project.id }, data: { viewCount: { increment: 1 } } });

    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/projects — create project (client only)
router.post("/", authenticate, authorize("CLIENT"), requireClientVerified, photoUpload.array("photos", 10), async (req, res) => {
  try {
    const { title, description, budget, deadline, location, city, province, category, scope } = req.body;

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (!client) return res.status(404).json({ message: "Client profile not found." });

    const project = await prisma.project.create({
      data: {
        clientId: client.id,
        title,
        description,
        budget: Number(budget),
        deadline: new Date(deadline),
        location,
        city,
        province,
        category,
        scope,
        materials: "", // Keep for backwards compatibility
        status: "OPEN",
      },
    });

    // Save uploaded photos
    if (req.files && req.files.length > 0) {
      await prisma.projectFile.createMany({
        data: req.files.map((file) => ({
          projectId: project.id,
          fileName: file.originalname,
          filePath: file.path.replace(/\\/g, "/"),
          fileSize: file.size,
          mimeType: file.mimetype,
        })),
      });
    }

    // Fetch project with files
    const projectWithFiles = await prisma.project.findUnique({
      where: { id: project.id },
      include: { projectFiles: true },
    });

    // Notify all verified contractors
    const contractors = await prisma.contractorProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      select: { userId: true },
    });

    await prisma.notification.createMany({
      data: contractors.map((c) => ({
        userId: c.userId,
        type: "PROJECT_UPDATE",
        title: "New Project Posted",
        message: `A new project "${title}" has been posted. Budget: ₱${Number(budget).toLocaleString()}`,
        link: `/projects/${project.id}`,
      })),
    });

    // Emit socket event
    req.io.emit("new_project", { project: projectWithFiles });

    res.status(201).json({ message: "Project posted successfully.", project: projectWithFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/projects/:id — update project
router.put("/:id", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!project) return res.status(404).json({ message: "Project not found." });

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (project.clientId !== client?.id) return res.status(403).json({ message: "Not authorized." });

    if (project.status !== "OPEN" && project.status !== "DRAFT") {
      return res.status(400).json({ message: "Cannot edit project in current status." });
    }

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: req.body,
    });

    res.json({ message: "Project updated.", project: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", authenticate, authorize("CLIENT", "ADMIN"), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: Number(req.params.id) } });
    if (!project) return res.status(404).json({ message: "Project not found." });

    await prisma.project.update({ where: { id: project.id }, data: { isActive: false } });
    res.json({ message: "Project removed." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
