const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const { authenticate, authorize } = require("../middleware/auth");

const prisma = new PrismaClient();

const ALLOWED_CHANGE_FIELDS = new Set([
  "amount",
  "targetCompletionDate",
  "endDate",
  "terms",
  //"scope"
]);

function contractInclude() {
  return {
    project: {
      include: {
        client: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      },
    },
    contractor: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
    payments: true,
    contractFiles: true,
    contractSignatures: true,
  };
}

function paymentAmount(contract) {
  return (Number(contract.totalAmount) * (contract.downpaymentPercent || 50)) / 100;
}

async function assertContractAccess(contract, req) {
  if (req.userRole === "ADMIN") return true;

  if (req.userRole === "CLIENT") {
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    return contract.project.clientId === client?.id;
  }

  if (req.userRole === "CONTRACTOR") {
    const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
    return contract.contractorId === contractor?.id;
  }

  return false;
}

async function createNotification(userId, data, req) {
  if (!userId) return;
  const notification = await prisma.notification.create({ data: { userId, ...data } });
  if (req.io?.to) req.io.to(`user_${userId}`).emit("notification", notification);
}

// GET /api/contracts
router.get("/", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    let where = {};

    if (req.userRole === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
      if (!client) return res.status(404).json({ message: "Client profile not found." });
      where = { project: { clientId: client.id } };
    }

    if (req.userRole === "CONTRACTOR") {
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
      if (!contractor) return res.status(404).json({ message: "Contractor profile not found." });
      where = { contractorId: contractor.id };
    }

    const contracts = await prisma.contract.findMany({
      where,
      include: contractInclude(),
      orderBy: { createdAt: "desc" },
    });

    res.json({ contracts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/contracts/:id
router.get("/:id", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });
    if (!(await assertContractAccess(contract, req))) return res.status(403).json({ message: "Not authorized." });

    const bid = await prisma.bid.findFirst({
      where: { projectId: contract.projectId, contractorId: contract.contractorId },
      include: { bidFiles: true },
    });

    res.json({ contract, bid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/contracts/:id/sign
router.put("/:id/sign", authenticate, authorize("CLIENT", "CONTRACTOR"), async (req, res) => {
  try {
    const signature = req.body.signatureData?.trim();
    if (!signature) return res.status(400).json({ message: "Signature is required." });
    if (signature.length < 3) return res.status(400).json({ message: "Signature must be at least 3 characters." });

    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        project: { include: { client: { include: { user: true } } } },
        contractor: { include: { user: true } },
      },
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    const now = new Date();
    let signerRole;
    let updateData;
    let notifyUserId;
    let notifyTitle;
    let notifyMessage;

    if (req.userRole === "CLIENT") {
      const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
      if (contract.project.clientId !== client?.id) return res.status(403).json({ message: "Not authorized." });
      if (contract.clientSignature) return res.status(400).json({ message: "Contract already signed by client." });

      const bothSigned = Boolean(contract.contractorSignature);
      signerRole = "CLIENT";
      updateData = {
  clientSignature: signature,
  clientSignedAt: now,
  status: bothSigned
    ? "PENDING_ADMIN"
    : "PENDING_CONTRACTOR_SIGN",
};
      notifyUserId = contract.contractor.userId;
      notifyTitle = bothSigned ? "Both Parties Signed" : "Client Signed the Contract";
      notifyMessage = bothSigned
        ? `Contract ${contract.contractNumber} is ready for 50% downpayment.`
        : `Client signed contract ${contract.contractNumber}. Please review and sign.`;
    } else {
      const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
      if (contract.contractorId !== contractor?.id) return res.status(403).json({ message: "Not authorized." });
      if (contract.contractorSignature) return res.status(400).json({ message: "Contract already signed by contractor." });

      const bothSigned = Boolean(contract.clientSignature);
      signerRole = "CONTRACTOR";
      updateData = {
  contractorSignature: signature,
  contractorSignedAt: now,
  status: bothSigned
    ? "PENDING_ADMIN"
    : "PENDING_CLIENT_SIGN",
};
      notifyUserId = contract.project.client.userId;
      notifyTitle = bothSigned ? "Both Parties Signed" : "Contractor Signed - Your Signature Needed";
      notifyMessage = bothSigned
        ? `Contract ${contract.contractNumber} is ready for 50% downpayment.`
        : `Contractor signed contract ${contract.contractNumber}. Please review and sign.`;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.contract.update({
        where: { id: contract.id },
        data: updateData,
        include: contractInclude(),
      });

      await tx.contractSignature.create({
        data: {
          contractId: contract.id,
          signerRole,
          signatureData: signature,
          signedAt: now,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      });

      if (saved.status === "PENDING_ADMIN") {
        const existingPayment = await tx.payment.findFirst({
          where: { contractId: contract.id, type: "DOWNPAYMENT" },
        });
        if (!existingPayment) {
          await tx.payment.create({
            data: {
              contractId: contract.id,
              projectId: contract.projectId,
              type: "DOWNPAYMENT",
              amount: paymentAmount(contract),
              status: "PENDING",
              dueDate: now,
              referenceNumber: `BB-PAY-${Date.now()}-${contract.id}`,
            },
          });
        }
      }

      return saved;
    });

    await createNotification(notifyUserId, {
      type: "CONTRACT_SIGNED",
      title: notifyTitle,
      message: notifyMessage,
      link: "/contracts",
    }, req);

    if (updated.status === "PENDING_ADMIN") {
      const admins = await prisma.admin.findMany({ select: { userId: true } });
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.userId,
          type: "PAYMENT_DUE",
          title: "Contract Ready for Downpayment",
          message: `Contract ${contract.contractNumber} has both signatures and is awaiting payment proof.`,
          link: "/admin",
        })),
      });
    }

    res.json({ message: "Contract signed successfully.", contract: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/contracts/:id/request-change
router.post("/:id/request-change", authenticate, authorize("CONTRACTOR"), async (req, res) => {
  try {
    const { fieldName, newValue, reason } = req.body;
    if (!ALLOWED_CHANGE_FIELDS.has(fieldName)) return res.status(400).json({ message: "Invalid change field." });
    if (newValue === undefined || String(newValue).trim() === "") return res.status(400).json({ message: "New value is required." });
    if (!reason?.trim()) return res.status(400).json({ message: "Reason is required." });

    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
    if (contract.contractorId !== contractor?.id) return res.status(403).json({ message: "Not authorized." });
    if (!contract.clientSignature || !contract.contractorSignature) {
      return res.status(400).json({ message: "Both parties must sign before requesting changes." });
    }
    if (contract.status === "ACTIVE" || contract.adminApprovedAt) {
      return res.status(400).json({ message: "Contract details are locked after payment verification." });
    }
    if (contract.changeRequestStatus === "REQUESTED") {
      return res.status(400).json({ message: "A change request is already pending." });
    }

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: {
        changeRequestStatus: "REQUESTED",
        changeRequestField: fieldName,
        changeRequestValue: String(newValue),
        changeRequestReason: reason.trim(),
      },
      include: contractInclude(),
    });

    await createNotification(contract.project.client.userId, {
      type: "CHANGE_REQUEST",
      title: "Contract Change Request",
      message: `${contract.contractor.user.name} requested a change to ${fieldName}.`,
      link: "/contracts",
    }, req);

    res.json({ message: "Change request submitted.", contract: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// GET /api/contracts/:id/change-request
router.get("/:id/change-request", authenticate, authorize("CLIENT", "CONTRACTOR", "ADMIN"), async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });
    if (!(await assertContractAccess(contract, req))) return res.status(403).json({ message: "Not authorized." });

    res.json({
      changeRequestStatus: contract.changeRequestStatus,
      changeData: {
        fieldName: contract.changeRequestField,
        newValue: contract.changeRequestValue,
        reason: contract.changeRequestReason,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/contracts/:id/approve-change
router.put("/:id/approve-change", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (contract.project.clientId !== client?.id) return res.status(403).json({ message: "Not authorized." });
    if (contract.changeRequestStatus !== "REQUESTED") return res.status(400).json({ message: "No pending change request." });
    if (!contract.clientSignature || !contract.contractorSignature) {
      return res.status(400).json({ message: "Both parties must sign first." });
    }
    if (contract.status === "ACTIVE" || contract.adminApprovedAt) {
      return res.status(400).json({ message: "Contract details are locked after payment verification." });
    }

    const field = contract.changeRequestField;
    const value = contract.changeRequestValue;

   const data = {
  changeRequestStatus: "APPROVED",
  changeApprovedAt: new Date(),
  changeApprovedBy: req.userId,
};

switch (field) {
  case "amount":
    data.totalAmount = Number(value);
    break;

  case "targetCompletionDate":
    data.targetCompletionDate = new Date(value);
    break;

  case "endDate":
    data.endDate = new Date(value);
    break;

  case "terms":
    data.terms = value;
    break;
}

const updated = await prisma.contract.update({
  where: { id: contract.id },
  data,
  include: contractInclude(),
});

    await createNotification(contract.contractor.userId, {
      type: "CHANGE_APPROVED",
      title: "Change Request Approved",
      message: `Your requested change to ${field} was approved.`,
      link: "/contracts",
    }, req);

    res.json({ message: "Change request approved.", contract: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/contracts/:id/reject-change
router.put("/:id/reject-change", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const { reason } = req.body;
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    
    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (contract.project.clientId !== client?.id) return res.status(403).json({ message: "Not authorized." });
    if (contract.changeRequestStatus !== "REQUESTED") return res.status(400).json({ message: "No pending change request." });

    const updated = await prisma.contract.update({
  where: { id: contract.id },
  data: {
    changeRequestStatus: "REJECTED",
    changeRequestReason: reason?.trim() || contract.changeRequestReason,
  },
  include: contractInclude(),
});

    await createNotification(contract.contractor.userId, {
      type: "CHANGE_REJECTED",
      title: "Change Request Rejected",
      message: `Your requested change for contract ${contract.contractNumber} was rejected.`,
      link: "/contracts",
    }, req);

   res.json({
  message: "Change request rejected.",
  contract: updated
});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/contracts/:id/mark-complete
router.put("/:id/mark-complete", authenticate, authorize("CONTRACTOR"), async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract || contract.status !== "ACTIVE") return res.status(400).json({ message: "Contract is not active." });

    const contractor = await prisma.contractorProfile.findUnique({ where: { userId: req.userId } });
    if (contract.contractorId !== contractor?.id) return res.status(403).json({ message: "Not authorized." });

    const updated = await prisma.contract.update({
      where: { id: contract.id },
      data: { status: "COMPLETION_REQUESTED" },
      include: contractInclude(),
    });

    await createNotification(contract.project.client.userId, {
      type: "PROJECT_UPDATE",
      title: "Completion Submitted",
      message: `${contract.contractor.user.name} marked the project as ready for completion review.`,
      link: "/contracts",
    }, req);

    res.json({ message: "Completion submitted.", contract: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/contracts/:id/approve-completion
router.put("/:id/approve-completion", authenticate, authorize("CLIENT"), async (req, res) => {
  try {
    const contract = await prisma.contract.findUnique({
      where: { id: Number(req.params.id) },
      include: contractInclude(),
    });
    if (!contract) return res.status(404).json({ message: "Contract not found." });

    if (contract.status !== "COMPLETION_REQUESTED") {
  return res.status(400).json({
    message: "Project is not awaiting completion approval."
  });
}

    const client = await prisma.clientProfile.findUnique({ where: { userId: req.userId } });
    if (contract.project.clientId !== client?.id) return res.status(403).json({ message: "Not authorized." });

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.contract.update({
        where: { id: contract.id },
        data: {
  status: "AWAITING_FINAL_PAYMENT"
},
      });
      await tx.project.update({ where: { id: contract.projectId }, data: { status: "COMPLETED" } });
      
      await tx.contractorProfile.update({
        where: { id: contract.contractorId },
        data: { completedProjects: { increment: 1 } },
      });
      return saved;
    });

    await createNotification(contract.contractor.userId, {
      type: "PROJECT_UPDATE",
      title: "Project Completed",
      message: `The client approved completion for ${contract.project.title}.`,
      link: "/contracts",
    }, req);

    res.json({ message: "Project completed successfully.", contract: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
