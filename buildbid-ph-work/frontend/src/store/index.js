import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── UI Store (sidebar, theme, etc.) ───────────────────────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      darkMode: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
    }),
    { name: "buildbid-ui" }
  )
);

// ── Project Store ─────────────────────────────────────────────────────────────
export const useProjectStore = create((set) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,
  filters: { status: "all", category: "", search: "" },

  setProjects: (projects) => set({ projects }),
  setSelected: (project) => set({ selectedProject: project }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  clearFilters: () => set({ filters: { status: "all", category: "", search: "" } }),
}));

// ── Bids Store ────────────────────────────────────────────────────────────────
export const useBidStore = create((set) => ({
  bids: [],
  myBids: [],
  loading: false,
  setBids: (bids) => set({ bids }),
  setMyBids: (myBids) => set({ myBids }),
  setLoading: (loading) => set({ loading }),
  addBid: (bid) => set((s) => ({ bids: [bid, ...s.bids] })),
  updateBid: (id, update) =>
    set((s) => ({
      bids: s.bids.map((b) => (b.id === id ? { ...b, ...update } : b)),
    })),
}));

// ── Notification Store ────────────────────────────────────────────────────────
export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }),
  addNotification: (notif) =>
    set((s) => ({
      notifications: [notif, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));

// ── Message Store ─────────────────────────────────────────────────────────────
export const useMessageStore = create((set) => ({
  conversations: [],
  activeThread: [],
  activePartnerId: null,
  loading: false,
  setConversations: (conversations) => set({ conversations }),
  setActiveThread: (messages, partnerId) => set({ activeThread: messages, activePartnerId: partnerId }),
  addMessage: (msg) => set((s) => ({ activeThread: [...s.activeThread, msg] })),
  setLoading: (loading) => set({ loading }),
  updateConversation: (partnerId, lastMessage) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.partnerId === partnerId ? { ...c, lastMessage, time: "now" } : c
      ),
    })),
}));
