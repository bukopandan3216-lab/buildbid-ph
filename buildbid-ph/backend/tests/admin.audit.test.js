const request = require('supertest');
const { app } = require('../server');

describe('Admin endpoints (unauthenticated)', () => {
  test('GET /api/admin/audit-logs should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/admin/audit-logs');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/admin/verification-logs should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/admin/verification-logs');
    expect([401, 403]).toContain(res.status);
  });
});
