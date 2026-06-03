const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

// GET /api/notifications
router.get("/", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 20, unread } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      userId: req.userId,
      ...(unread === "true" && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.userId, isRead: false } }),
    ]);

    res.json({ notifications, total, unreadCount });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/notifications/:id/read
router.put("/:id/read", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true, readAt: new Date() },
    });
    if (req.io && req.io.to) {
      req.io.to(`user_${req.userId}`).emit("notification_read", { id: notification.id });
    }
    res.json({ message: "Notification marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/notifications/read-all
router.put("/read-all", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    if (req.io && req.io.to) {
      req.io.to(`user_${req.userId}`).emit("notifications_read_all");
    }
    res.json({ message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const notification = await prisma.notification.findUnique({ where: { id: Number(req.params.id) } });
    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await prisma.notification.delete({ where: { id: notification.id } });
    if (req.io && req.io.to) {
      req.io.to(`user_${req.userId}`).emit("notification_deleted", { id: notification.id });
    }
    res.json({ message: "Notification deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/notifications/clear-all
router.delete("/clear-all", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.userId } });
    if (req.io && req.io.to) {
      req.io.to(`user_${req.userId}`).emit("notifications_cleared");
    }
    res.json({ message: "All notifications cleared." });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
