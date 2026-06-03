const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

// Helper: check if two users are linked by a contract (client <-> contractor)
async function hasContractBetween(userAId, userBId) {
  const contract = await prisma.contract.findFirst({
    where: {
      OR: [
        {
          AND: [
            { contractor: { userId: userAId } },
            { project: { client: { userId: userBId } } },
          ],
        },
        {
          AND: [
            { contractor: { userId: userBId } },
            { project: { client: { userId: userAId } } },
          ],
        },
      ],
    },
  });
  return !!contract;
}

// GET /api/messages/conversations — list unique conversations
router.get("/conversations", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const userId = req.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true, role: true } },
        receiver: { select: { id: true, name: true, avatar: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get unique conversation partners
    const conversationMap = new Map();
    messages.forEach((msg) => {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (req.userRole !== "ADMIN" && partner.role === "ADMIN") {
        return;
      }
      const key = partner.id;
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          partner,
          lastMessage: msg,
          unreadCount: !msg.isRead && msg.receiverId === userId ? 1 : 0,
        });
      } else {
        const existing = conversationMap.get(key);
        if (!msg.isRead && msg.receiverId === userId) {
          existing.unreadCount++;
        }
      }
    });

    res.json({ conversations: Array.from(conversationMap.values()) });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/messages/:userId — get messages with a specific user
router.get("/:userId", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const myId = req.userId;
    const otherId = Number(req.params.userId);
    const otherUser = await prisma.user.findUnique({ where: { id: otherId } });
    if (!otherUser) return res.status(404).json({ message: "User not found." });

    if (req.userRole !== "ADMIN" && otherUser.role === "ADMIN") {
      return res.status(403).json({ message: "Not authorized to view this conversation." });
    }

    // Authorization: only allow if users share a contract for non-admin users
    if (req.userRole !== "ADMIN") {
      const allowed = await hasContractBetween(myId, otherId);
      if (!allowed) return res.status(403).json({ message: "Not authorized to view this conversation." });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100, // last 100 messages
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: { senderId: otherId, receiverId: myId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/messages — send a message
router.post("/", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Message cannot be empty." });

    const receiver = await prisma.user.findUnique({ where: { id: Number(receiverId) } });
    if (!receiver) return res.status(404).json({ message: "Receiver not found." });

    if (req.userRole !== "ADMIN") {
      if (receiver.role === "ADMIN") {
        return res.status(403).json({ message: "Not authorized to message this user." });
      }

      const allowed = await hasContractBetween(req.userId, Number(receiverId));
      if (!allowed) return res.status(403).json({ message: "Not authorized to message this user." });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.userId,
        receiverId: Number(receiverId),
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Real-time delivery
    req.io.to(`user_${receiverId}`).emit("new_message", message);

    // Create notification
    await prisma.notification.create({
      data: {
        userId: Number(receiverId),
        type: "NEW_MESSAGE",
        title: "New Message",
        message: `${message.sender.name}: ${content.trim().substring(0, 60)}`,
        link: `/messages/${req.userId}`,
      },
    });

    res.status(201).json({ message: "Message sent.", data: message });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
