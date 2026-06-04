import axios from "axios";

// Base instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsAPI = {
  list: (params) => api.get("/projects", { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post("/projects", data, { headers: { "Content-Type": undefined } });
    }
    return api.post("/projects", data);
  },
  update: (id, data) => api.put(`/projects/${id}`, data),
  remove: (id) => api.delete(`/projects/${id}`),
};

// ── Bids ──────────────────────────────────────────────────────────────────────
export const bidsAPI = {
  forProject: (projectId) => api.get(`/bids/project/${projectId}`),
  get: (id) => api.get(`/bids/${id}`),
  myBids: () => api.get("/bids/my"),
  received: () => api.get("/bids/received"),
  submit: (data) => {
    if (data instanceof FormData) {
      return api.post("/bids", data, { headers: { "Content-Type": undefined } });
    }
    return api.post("/bids", data);
  },
  accept: (id) => api.put(`/bids/${id}/accept`),
  reject: (id, note) => api.put(`/bids/${id}/reject`, { note }),
};

// ── Contracts ─────────────────────────────────────────────────────────────────
export const contractsAPI = {
  list: () => api.get("/contracts"),
  get: (id) => api.get(`/contracts/${id}`),
  sign: (id, signatureData) => api.put(`/contracts/${id}/sign`, { signatureData }),
  requestChange: (id, data) => api.post(`/contracts/${id}/request-change`, data),
  approveChange: (id) => api.put(`/contracts/${id}/approve-change`),
  rejectChange: (id, data) => api.put(`/contracts/${id}/reject-change`, data),
  markComplete: (id) => api.put(`/contracts/${id}/mark-complete`),
  approveCompletion: (id) => api.put(`/contracts/${id}/approve-completion`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  list: (params) => api.get("/payments", { params }),
  summary: () => api.get("/payments/summary"),
  uploadProof: (id, data) => api.put(`/payments/${id}/proof`, data, { headers: { "Content-Type": undefined } }),
  verify: (id, approved) => api.put(`/payments/${id}/verify`, { approved }),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messagesAPI = {
  conversations: () => api.get("/messages/conversations"),
  thread: (userId) => api.get(`/messages/${userId}`),
  send: (receiverId, content) => api.post("/messages", { receiverId, content }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  list: (params) => api.get("/notifications", { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete("/notifications/clear-all"),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersAPI = {
  profile: () => api.get("/users/profile"),
  updateProfile: (data) => api.put("/users/profile", data),
  contractors: (params) => api.get("/users/contractors", { params }),
  contractor: (id) => api.get(`/users/contractors/${id}`),
  dashboardStats: () => api.get("/users/dashboard-stats"),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  dashboard: () => api.get("/admin/dashboard"),
  contractors: (params) => api.get("/admin/contractors", { params }),
  verifyContractor: (id, status, note) => api.put(`/admin/contractors/${id}/verify`, { status, note }),
  users: (params) => api.get("/admin/users", { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  contracts: () => api.get("/admin/contracts"),
  approveContract: (id) => api.put(`/admin/contracts/${id}/approve`),
  rejectContract: (id, reason) => api.put(`/admin/contracts/${id}/reject`, { reason }),
  verificationLogs: (params) => api.get(`/admin/verification-logs`, { params }),
  auditLogs: (params) => api.get(`/admin/audit-logs`, { params }),
  syncPendingNotifications: () => api.get(`/admin/sync-pending-notifications`),
  payments: (params) => api.get("/admin/payments", { params }),
};

// ── Uploads ───────────────────────────────────────────────────────────────────
export const uploadsAPI = {
  document: (formData) => api.post("/upload/document", formData, { headers: { "Content-Type": undefined } }),
  projectImage: (formData) => api.post("/upload/project-image", formData, { headers: { "Content-Type": undefined } }),
  avatar: (formData) => api.post("/upload/avatar", formData, { headers: { "Content-Type": undefined } }),
};

// ── File URL helper ───────────────────────────────────────────────────────────
// Locally, Vite proxies /uploads → localhost:5000/uploads.
// In production (Vercel), the frontend has no backend — we must use the full
// backend URL stored in VITE_API_URL.
export function getFileUrl(filePath) {
  if (!filePath) return null;
  // Already an absolute URL
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  const base = import.meta.env.VITE_API_URL || "";
  // Ensure single leading slash
  const normalised = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${base}${normalised}`;
}

export default api;