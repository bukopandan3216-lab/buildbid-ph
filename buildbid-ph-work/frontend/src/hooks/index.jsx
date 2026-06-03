import { useState, useEffect, useCallback } from "react";
import { projectsAPI, bidsAPI, contractsAPI, paymentsAPI, usersAPI, notificationsAPI, adminAPI } from "../services/api";

// ── Generic data fetcher hook ─────────────────────────────────────────────────
export function useAsync(asyncFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await asyncFn(...args);
      setData(res.data);
      return res.data;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Something went wrong.");
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}

// ── Projects ──────────────────────────────────────────────────────────────────
export function useProjects(params = {}) {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await projectsAPI.list(params);
      setProjects(res.data.projects);
      setTotal(res.data.total);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [JSON.stringify(params)]);

  return { projects, total, loading, error, refetch: load, setProjects };
}

// ── Single Project ────────────────────────────────────────────────────────────
export function useProject(id) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await projectsAPI.get(id);
        setProject(res.data.project);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load project.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return { project, loading, error };
}

// ── Bids ──────────────────────────────────────────────────────────────────────
export function useBids(projectId) {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await bidsAPI.forProject(projectId);
        setBids(res.data.bids);
      } catch { }
      finally { setLoading(false); }
    })();
  }, [projectId]);

  return { bids, loading, setBids };
}

export function useMyBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await bidsAPI.myBids();
        setBids(res.data.bids);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  return { bids, loading };
}

// ── Contracts ─────────────────────────────────────────────────────────────────
export function useContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await contractsAPI.list();
      setContracts(res.data.contracts);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return { contracts, loading, setContracts, refetch: load };
}

// ── Payments ──────────────────────────────────────────────────────────────────
export function usePayments(params = {}) {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [paymentsRes, summaryRes] = await Promise.all([
          paymentsAPI.list(params),
          paymentsAPI.summary(),
        ]);
        setPayments(paymentsRes.data.payments);
        setSummary(summaryRes.data);
      } catch { }
      finally { setLoading(false); }
    })();
  }, [JSON.stringify(params)]);

  async function refetch() {
    setLoading(true);
    try {
      const [paymentsRes, summaryRes] = await Promise.all([
        paymentsAPI.list(params),
        paymentsAPI.summary(),
      ]);
      setPayments(paymentsRes.data.payments);
      setSummary(summaryRes.data);
    } catch { }
    finally { setLoading(false); }
  }

  return { payments, summary, loading, refetch };
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────
export function useDashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await usersAPI.dashboardStats();
        setStats(res.data.stats);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  return { stats, loading };
}

// ── Notifications ─────────────────────────────────────────────────────────────
export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await notificationsAPI.list();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    await notificationsAPI.markRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await notificationsAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function clearAll() {
    await notificationsAPI.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  }

  async function deleteNotification(id) {
    await notificationsAPI.delete(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return { notifications, unreadCount, loading, markRead, markAllRead, clearAll, deleteNotification, refetch: load };
}

// ── Debounce ──────────────────────────────────────────────────────────────────
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Window size ───────────────────────────────────────────────────────────────
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

// ── User Profile ──────────────────────────────────────────────────────────────
export function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await usersAPI.profile();
        setProfile(res.data.user);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  async function updateProfile(data) {
    try {
      const res = await usersAPI.updateProfile(data);
      setProfile(res.data.user);
      return res.data;
    } catch (err) {
      throw err;
    }
  }

  return { profile, loading, updateProfile, refetch: async () => {
    const res = await usersAPI.profile();
    setProfile(res.data.user);
  } };
}

// ── Admin Dashboard ───────────────────────────────────────────────────────────
export function useAdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminAPI.dashboard();
        setDashboard(res.data);
      } catch { }
      finally { setLoading(false); }
    })();
  }, []);

  return { dashboard, loading, refetch: async () => {
    const res = await adminAPI.dashboard();
    setDashboard(res.data);
  } };
}

// ── Admin Contractors ──────────────────────────────────────────────────────────
export function useAdminContractors(params = {}) {
  const [contractors, setContractors] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAPI.contractors(params);
      setContractors(res.data.contractors);
      setTotal(res.data.total);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [JSON.stringify(params)]);

  async function verifyContractor(id, status, note = "") {
    try {
      const res = await adminAPI.verifyContractor(id, status, note);
      setContractors((prev) => prev.map((c) => c.id === id ? res.data.contractor : c));
      return res.data;
    } catch (err) {
      throw err;
    }
  }

  return { contractors, total, loading, verifyContractor, refetch: load };
}

// ── Admin Contracts ─────────────────────────────────────────────────────────────────────────
export function useAdminContracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAPI.contracts();
      setContracts(res.data.contracts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return { contracts, loading, refetch: load };
}

// ── Admin Logs (Audit & Verification) ─────────────────────────────────────────
export function useAdminVerificationLogs(params = {}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAPI.verificationLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [JSON.stringify(params)]);

  return { logs, total, loading, refetch: load };
}

export function useAdminAuditLogs(params = {}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminAPI.auditLogs(params);
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [JSON.stringify(params)]);

  return { logs, total, loading, refetch: load };
}

// ── Toast / notification helper ───────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  function toast(message, type = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  function ToastContainer() {
    return (
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white pointer-events-auto animate-bounce-in ${
              t.type === "success" ? "bg-green-500"
                : t.type === "error" ? "bg-red-500"
                : t.type === "warning" ? "bg-amber-500"
                : "bg-gray-800"
            }`}
          >
            {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"} {t.message}
          </div>
        ))}
      </div>
    );
  }

  return { toast, ToastContainer };
}
