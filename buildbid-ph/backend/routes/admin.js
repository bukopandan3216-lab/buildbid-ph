const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize("ADMIN"));

// GET /api/admin/dashboard — overall stats
router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalUsers, totalProjects, totalBids, totalContracts,
      totalPayments, pendingVerifications, openProjects,
      recentProjects, recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { isActive: true } }),
      prisma.bid.count(),
      prisma.contract.count(),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
      prisma.contractorProfile.count({ where: { verificationStatus: "PENDING" } }),
      prisma.project.count({ where: { status: "OPEN", isActive: true } }),
      prisma.project.findMany({
        take: 5, orderBy: { createdAt: "desc" }, where: { isActive: true },
        include: { client: { include: { user: { select: { name: true } } } } },
      }),
      prisma.user.findMany({
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
    ]);

    res.json({
      stats: {
        totalUsers, totalProjects, totalBids, totalContracts,
        totalRevenue: totalPayments._sum.amount || 0,
        pendingVerifications, openProjects,
      },
      recentProjects,
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

router.put(
  "/:id/approve",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const payment =
        await prisma.payment.findUnique({
          where: {
            id: Number(req.params.id)
          },
          include: {
            contract: true,
            project: true
          }
        });

      if (!payment) {
        return res.status(404).json({
          message: "Payment not found"
        });
      }

      const updatedPayment =
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED"
          }
        });

      await prisma.contract.update({
        where: {
          id: payment.contractId
        },
        data: {
          status: "ACTIVE"
        }
      });

      await prisma.project.update({
        where: {
          id: payment.projectId
        },
        data: {
          status: "IN_PROGRESS"
        }
      });

      res.json({
        message: "Payment approved",
        payment: updatedPayment
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Server error"
      });
    }
  }
);





router.put(
  "/:id/reject",
  authenticate,
  authorize("ADMIN"),
  async (req, res) => {
    try {
      const payment =
        await prisma.payment.update({
          where: {
            id: Number(req.params.id)
          },
          data: {
            status: "FAILED"
          }
        });

      res.json({
        message: "Payment rejected",
        payment
      });
    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: "Server error"
      });
    }
  }
);



// GET /api/admin/contractors — list contractors with verification status
router.get("/contractors", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = status ? { verificationStatus: status } : {};

    const [contractors, total] = await Promise.all([
      prisma.contractorProfile.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true, createdAt: true } },
          documents: true,
        },
        orderBy: { createdAt: "desc" },
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

// PUT /api/admin/contractors/:id/verify — approve or reject contractor
router.put("/contractors/:id/verify", async (req, res) => {
  try {
    const { status, note } = req.body; // VERIFIED or REJECTED
    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const contractor = await prisma.contractorProfile.findUnique({ where: { id: Number(req.params.id) } });
    if (!contractor) return res.status(404).json({ message: "Contractor not found." });

    const previousStatus = contractor.verificationStatus;
    const updated = await prisma.contractorProfile.update({
      where: { id: contractor.id },
      data: {
        verificationStatus: status,
        verifiedAt: status === "VERIFIED" ? new Date() : null,
        verifiedBy: req.userId,
      },
      include: { user: true },
    });

    await prisma.verificationLog.create({
      data: {
        userId: updated.userId,
        actionType: status === "VERIFIED" ? "VERIFY" : "REJECT",
        actionBy: req.userId,
        oldContractorStatus: previousStatus,
        newContractorStatus: status,
        reason: note,
        notes: `Contractor verification ${status.toLowerCase()}.`,
      },
    });

    // Notify contractor
    await prisma.notification.create({
      data: {
        userId: updated.userId,
        type: status === "VERIFIED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        title: status === "VERIFIED" ? "Verification Approved ✅" : "Verification Rejected ❌",
        message: status === "VERIFIED"
          ? "Your account has been verified. You can now submit bids on projects."
          : `Your verification was rejected. Reason: ${note || "Please resubmit your documents."}`,
        link: "/settings",
      },
    });
    // Emit real-time update to the contractor's personal room
    if (req.io && req.io.to) {
      req.io.to(`user_${updated.userId}`).emit("verification_update", {
        userId: updated.userId,
        status,
      });
      req.io.to(`user_${updated.userId}`).emit("notification", {
        type: status === "VERIFIED" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        message: status === "VERIFIED" ? "Your account has been verified." : `Verification rejected: ${note || "Check your documents."}`,
      });
      // Notify admins to refresh verification queue / dashboard
      req.io.to(`role_ADMIN`).emit("verification_queue_update", { userId: updated.userId, status });
    }

    res.json({ message: `Contractor ${status.toLowerCase()}.`, contractor: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/users — manage all users
router.get("/users", async (req, res) => {
  try {
    const { role, userStatus, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(role && { role }),
      ...(userStatus && { userStatus }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, isActive: true, userStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/admin/users/:id/toggle — activate/deactivate user
router.put("/users/:id/toggle", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isActive: !user.isActive },
    });

    res.json({ message: `User ${updated.isActive ? "activated" : "deactivated"}.`, user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/admin/users/:id/approve — approve or reject signup
router.put("/users/:id/approve", async (req, res) => {
  try {
    const { approve } = req.body;
    if (typeof approve !== "boolean") {
      return res.status(400).json({ message: "Missing or invalid approval flag." });
    }

    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const previousStatus = user.userStatus;
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        userStatus: approve ? "VERIFIED" : "REJECTED",
        approvedAt: approve ? new Date() : null,
        approvedBy: req.userId,
      },
    });

    await prisma.verificationLog.create({
      data: {
        userId: updated.id,
        actionType: approve ? "APPROVE" : "REJECT",
        actionBy: req.userId,
        oldStatus: previousStatus,
        newStatus: updated.userStatus,
        reason: approve ? "Admin approved signup." : "Admin rejected signup.",
        notes: `User ${approve ? "approved" : "rejected"} by admin.`,
      },
    });

    // Notify user and emit realtime update
    await prisma.notification.create({
      data: {
        userId: updated.id,
        type: approve ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
        title: approve ? "Account Approved ✅" : "Account Rejected ❌",
        message: approve ? "Your account is approved. You can now log in." : "Your account was rejected by admin.",
        link: "/dashboard",
      },
    });
    if (req.io && req.io.to) {
      req.io.to(`user_${updated.id}`).emit("verification_update", { userId: updated.id, status: updated.userStatus });
      req.io.to(`user_${updated.id}`).emit("notification", { type: approve ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED", message: approve ? "Your account is approved." : "Your account was rejected." });
      // notify admins to refresh list
      req.io.to(`role_ADMIN`).emit("verification_queue_update", { userId: updated.id, status: updated.userStatus });
    }

    res.json({ message: `User ${approve ? "approved" : "rejected"}.`, user: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/contracts — all contracts
router.get("/contracts", async (req, res) => {
  try {
   const contracts = await prisma.contract.findMany({
  include:{
    project:true,
    contractor:{
      include:{
        user:true
      }
    }
  }
})
    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/verification-logs — list verification logs (audit trail)
router.get("/verification-logs", async (req, res) => {
  try {
    const { page = 1, limit = 40, actionType, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(actionType && { actionType }),
      ...(userId && { userId: Number(userId) }),
    };

    const [logs, total] = await Promise.all([
      prisma.verificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
        skip,
        take: Number(limit),
      }),
      prisma.verificationLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/audit-logs — system-wide audit logs
router.get("/audit-logs", async (req, res) => {
  try {
    const { page = 1, limit = 40, actionType, resourceType, userId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      ...(actionType && { actionType }),
      ...(resourceType && { resourceType }),
      ...(userId && { userId: Number(userId) }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, email: true } } },
        skip,
        take: Number(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/admin/contracts/:id/approve
router.put("/contracts/:id/approve", async (req, res) => {
  try {
    const contract = await prisma.contract.update({
      where: { id: Number(req.params.id) },
      data: { status: "ACTIVE", adminApprovedAt: new Date(), adminApprovedBy: req.userId },
    });

    // Update project to IN_PROGRESS
    await prisma.project.update({ where: { id: contract.projectId }, data: { status: "IN_PROGRESS" } });

    // Notify both parties
    try {
      // fetch contractor and client user ids
      const full = await prisma.contract.findUnique({ where: { id: contract.id }, include: { contractor: { include: { user: true } }, project: { include: { client: { include: { user: true } } } } } });
      const contractorUserId = full.contractor?.userId;
      const clientUserId = full.project?.client?.userId;

      const notifData = [
        contractorUserId && {
          userId: contractorUserId,
          type: "SYSTEM",
          title: "Contract Approved ✅",
          message: `Your contract ${contract.contractNumber || contract.id} has been approved by admin.`,
          link: `/contracts/${contract.id}`,
        },
        clientUserId && {
          userId: clientUserId,
          type: "SYSTEM",
          title: "Contract Approved ✅",
          message: `Contract for project ${full.project?.title || contract.projectId} is now active.`,
          link: `/contracts/${contract.id}`,
        },
      ].filter(Boolean);

      if (notifData.length) {
        await prisma.notification.createMany({ data: notifData });
        if (req.io && req.io.to) {
          if (contractorUserId) req.io.to(`user_${contractorUserId}`).emit("notification", { type: "SYSTEM", message: "Your contract has been approved by admin.", contractId: contract.id });
          if (clientUserId) req.io.to(`user_${clientUserId}`).emit("notification", { type: "SYSTEM", message: "Your contract is now active.", contractId: contract.id });
        }
      }
    } catch (e) {
      console.error("Failed to notify parties after contract approval:", e);
    }

    res.json({ message: "Contract approved. Project is now active.", contract });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/admin/contracts/:id/reject
router.put("/contracts/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        project: { include: { client: { include: { user: true } } } },
        contractor: { include: { user: true } },
      },
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        status: "CANCELLED",
        adminApprovedAt: new Date(),
        adminApprovedBy: req.userId,
      },
    });

    await prisma.project.update({
      where: { id: contract.projectId },
      data: { status: "CANCELLED" },
    });

    const notifData = [
      contract.contractor?.userId && {
        userId: contract.contractor.userId,
        type: "SYSTEM",
        title: "Contract Rejected ❌",
        message: `Admin rejected contract ${contract.contractNumber || contract.id}. ${reason || "Please contact support."}`,
        link: "/contracts",
      },
      contract.project?.client?.userId && {
        userId: contract.project.client.userId,
        type: "SYSTEM",
        title: "Contract Rejected ❌",
        message: `Admin rejected contract ${contract.contractNumber || contract.id}. ${reason || "Please contact support."}`,
        link: "/contracts",
      },
    ].filter(Boolean);

    if (notifData.length) {
      await prisma.notification.createMany({ data: notifData });
      if (req.io && req.io.to) {
        if (contract.contractor?.userId) req.io.to(`user_${contract.contractor.userId}`).emit("notification", { type: "SYSTEM", message: "Your contract was rejected by admin.", contractId: contract.id });
        if (contract.project?.client?.userId) req.io.to(`user_${contract.project.client.userId}`).emit("notification", { type: "SYSTEM", message: "A contract was rejected by admin.", contractId: contract.id });
      }
    }

    res.json({ message: "Contract rejected.", contract: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/sync-pending-notifications — create notifications for pending items
router.get("/sync-pending-notifications", async (req, res) => {
  try {
    // Get all admins
    const admins = await prisma.admin.findMany({ select: { userId: true } });
    if (!admins.length) return res.json({ message: "No admins found." });

    const adminIds = admins.map((a) => a.userId);

    // Get pending contractors
    const pendingContractors = await prisma.contractorProfile.findMany({
      where: { verificationStatus: "PENDING" },
      include: { user: { select: { name: true } } },
    });

    // Get pending contracts that still need admin review or signature progression
    const pendingContracts = await prisma.contract.findMany({
      where: { status: { in: ["PENDING_CLIENT_SIGN", "PENDING_CONTRACTOR_SIGN"] } },
      include: {
        project: { select: { title: true } },
        contractor: { include: { user: { select: { name: true } } } },
      },
    });

    // Create notifications for each admin
    const notifications = [];

    // Add notifications for each pending contractor
    for (const contractor of pendingContractors) {
      for (const adminId of adminIds) {
        // Check if notification already exists
        const existing = await prisma.notification.findFirst({
          where: {
            userId: adminId,
            type: "SYSTEM",
            title: "New Contractor Verification",
            metadata: { contains: `"resourceId":${contractor.id}` },
          },
        });
        if (!existing) {
          notifications.push({
            userId: adminId,
            type: "SYSTEM",
            title: "New Contractor Verification",
            message: `Contractor ${contractor.user?.name || "Unknown"} is pending verification.`,
            link: `/admin`,
            metadata: JSON.stringify({ resourceType: "ContractorProfile", resourceId: contractor.id }),
          });
        }
      }
    }

    // Add notifications for each pending contract
    for (const contract of pendingContracts) {
      for (const adminId of adminIds) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: adminId,
            type: "SYSTEM",
            title: "Contract Pending Approval",
            metadata: { contains: `"resourceId":${contract.id}` },
          },
        });
        if (!existing) {
          notifications.push({
            userId: adminId,
            type: "SYSTEM",
            title: "Contract Pending Approval",
            message: `Contract for ${contract.project?.title || "Project"} from ${contract.contractor?.user?.name || "Contractor"} needs review.`,
            link: `/admin`,
            metadata: JSON.stringify({ resourceType: "Contract", resourceId: contract.id }),
          });
        }
      }
    }

    // Create all notifications and emit them in real time
    const createdNotifications = [];
    for (const notificationData of notifications) {
      const created = await prisma.notification.create({ data: notificationData });
      createdNotifications.push(created);
      if (req.io && req.io.to) {
        req.io.to(`user_${created.userId}`).emit("notification", created);
      }
    }

    res.json({
      message: `${createdNotifications.length} notifications created.`,
      count: createdNotifications.length,
      notifications: createdNotifications,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/admin/payments — list all payments for admin
router.get("/payments", async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = status ? { status } : {};

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          project: { select: { title: true, status: true } },
          contract: {
            include: {
              contractor: { include: { user: { select: { name: true, email: true } } } },
              project: { include: { client: { include: { user: { select: { name: true, email: true } } } } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    const summary = await prisma.payment.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    res.json({ payments, total, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
