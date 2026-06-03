const request = require('supertest');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { app } = require('../server');

const prisma = new PrismaClient();

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Admin integration flows', () => {
  let adminUser, adminToken;
  let contractorUser, contractorProfile;
  let clientUser, clientProfile;
  let project, contract;

  beforeAll(async () => {
    // Clean test artifacts if exist
    await prisma.verificationLog.deleteMany({ where: { reason: { contains: 'test' } } }).catch(() => {});

    // Create admin user
    adminUser = await prisma.user.create({ data: { email: 'admin@test.local', password: 'x', name: 'Admin', role: 'ADMIN', userStatus: 'VERIFIED', isActive: true } });
    await prisma.admin.create({ data: { userId: adminUser.id } });
    adminToken = jwt.sign({ userId: adminUser.id, role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Create contractor user (unverified at profile level)
    contractorUser = await prisma.user.create({ data: { email: 'contractor@test.local', password: 'x', name: 'Contractor', role: 'CONTRACTOR', userStatus: 'VERIFIED', isActive: true } });
    contractorProfile = await prisma.contractorProfile.create({ data: { userId: contractorUser.id, companyName: 'Test Co', licenseNumber: 'LIC-123', verificationStatus: 'PENDING' } });

    // Create client user and profile
    clientUser = await prisma.user.create({ data: { email: 'client@test.local', password: 'x', name: 'Client', role: 'CLIENT', userStatus: 'VERIFIED', isActive: true } });
    clientProfile = await prisma.clientProfile.create({ data: { userId: clientUser.id, address: 'Test Address' } });

    // Create project
    project = await prisma.project.create({ data: { clientId: clientProfile.id, title: 'Test Project', description: 'Test', budget: 10000, location: 'Manila', deadline: new Date(Date.now() + 7*24*3600*1000) } });

    // Create contract (draft)
    contract = await prisma.contract.create({ data: { projectId: project.id, contractorId: contractorProfile.id, contractNumber: `T-${Date.now()}`, terms: 'T&C', totalAmount: 8000 } });
  });

  afterAll(async () => {
    // cleanup
    await prisma.payment.deleteMany({ where: { projectId: project?.id } }).catch(() => {});
    await prisma.contractSignature.deleteMany({ where: { contractId: contract?.id } }).catch(() => {});
    await prisma.contractFile.deleteMany({ where: { contractId: contract?.id } }).catch(() => {});
    await prisma.contract.deleteMany({ where: { id: contract?.id } }).catch(() => {});
    await prisma.project.deleteMany({ where: { id: project?.id } }).catch(() => {});
    await prisma.clientProfile.deleteMany({ where: { id: clientProfile?.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: clientUser?.id } }).catch(() => {});
    await prisma.contractorProfile.deleteMany({ where: { id: contractorProfile?.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: contractorUser?.id } }).catch(() => {});
    await prisma.admin.deleteMany({ where: { userId: adminUser?.id } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: adminUser?.id } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { message: { contains: 'Test' } } }).catch(() => {});
    await prisma.verificationLog.deleteMany({ where: { reason: { contains: 'test' } } }).catch(() => {});
  });

  test('Admin can approve contractor verification', async () => {
    const res = await request(app)
      .put(`/api/admin/contractors/${contractorProfile.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'VERIFIED', note: 'Manual test approval' });

    expect(res.status).toBe(200);
    expect(res.body.contractor).toBeDefined();
    const updated = await prisma.contractorProfile.findUnique({ where: { id: contractorProfile.id } });
    expect(updated.verificationStatus).toBe('VERIFIED');

    const log = await prisma.verificationLog.findFirst({ where: { userId: contractorUser.id }, orderBy: { createdAt: 'desc' } });
    expect(log).toBeTruthy();
    expect(log.actionBy).toBe(adminUser.id);
  });

  test('Admin can approve contract and activate project', async () => {
    const res = await request(app)
      .put(`/api/admin/contracts/${contract.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(res.status).toBe(200);
    const updatedContract = await prisma.contract.findUnique({ where: { id: contract.id } });
    expect(updatedContract.status).toBe('ACTIVE');
    const updatedProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updatedProject.status).toBe('IN_PROGRESS');

    const notifications = await prisma.notification.findMany({ where: { link: { contains: `/contracts/${contract.id}` } } });
    expect(notifications.length).toBeGreaterThanOrEqual(1);
  });
});
