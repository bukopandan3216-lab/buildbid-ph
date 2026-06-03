// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock adminAPI before importing AdminPanel so hooks use the mock
vi.mock('../services/api', () => ({
  adminAPI: {
    auditLogs: () => Promise.resolve({ data: { logs: [{ id: 1, actionType: 'APPROVE', resourceType: 'CONTRACT', createdAt: new Date().toISOString(), user: { name: 'Admin' }, changes: 'Approved contract #1' }], total: 1 } }),
    verificationLogs: () => Promise.resolve({ data: { logs: [], total: 0 } }),
    dashboard: () => Promise.resolve({ data: { stats: { totalUsers: 10, pendingVerifications: 1, totalRevenue: 0 } } }),
    contractors: () => Promise.resolve({ data: { contractors: [], total: 0 } }),
    contracts: () => Promise.resolve({ data: { contracts: [] } }),
    users: () => Promise.resolve({ data: { users: [] } }),
    syncPendingNotifications: () => Promise.resolve({ data: {} }),
  },
  messagesAPI: {
    send: () => Promise.resolve({ data: {} }),
  },
  contractsAPI: {
    get: () => Promise.resolve({ data: { contract: {}, bid: null } }),
  },
  paymentsAPI: {
    verify: () => Promise.resolve({ data: {} }),
  },
}));

import AdminPanel from '../pages/AdminPanel';

describe('AdminPanel - Audit Logs', () => {
  test('renders audit log entries when audit tab is selected', async () => {
    render(<AdminPanel />);
    // click the Audit Logs tab
    const tab = await screen.findByRole('button', { name: /Audit Logs/i });
    tab.click();
    // wait for a log item to appear
    const logItem = await screen.findByText(/Approved contract #1/i);
    expect(logItem).toBeTruthy();
  });
});
