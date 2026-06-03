import { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { notificationsAPI } from "../services/api";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    // fetch initial notifications
    (async () => {
      try {
        const res = await notificationsAPI.list();
        if (!mounted) return;
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      } catch (e) {
        console.warn("Failed to load notifications", e);
      }
    })();

    const s = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      auth: { token },
      reconnectionAttempts: 5,
    });

    s.on("connect", () => {
      console.log("Socket connected", s.id);
    });

    s.on("notification", (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    s.on("verification_update", (payload) => {
      // optional: push a system notification for verification changes
      setNotifications((prev) => [
        {
          id: `verif_${payload.userId}_${Date.now()}`,
          type: "VERIFICATION_UPDATE",
          title: "Verification Update",
          message: `Verification status: ${payload.status}`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    });

    s.on("conversation_created", (data) => {
      // emit an event so UI can refresh conversation list if implemented
      setNotifications((prev) => [
        {
          id: `conv_${data.withUser}_${Date.now()}`,
          type: "CONVERSATION_CREATED",
          title: "Conversation Created",
          message: "A conversation has been created.",
          relatedUser: data.withUser,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    });

    s.on("contract_fully_signed", (info) => {
      setNotifications((prev) => [
        {
          id: `contract_${info.contractId}_${Date.now()}`,
          type: "CONTRACT_SIGNED",
          title: "Contract Signed",
          message: `Contract ${info.contractNumber || info.contractId} signed.`,
          contractId: info.contractId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setUnreadCount((c) => c + 1);
    });

    s.on("notification_read", ({ id }) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    });

    s.on("notifications_read_all", () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    s.on("notification_deleted", ({ id }) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    });

    setSocket(s);
    return () => {
      mounted = false;
      s.disconnect();
    };
  }, [token]);

  function markRead(id) {
    notificationsAPI.markRead(id).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  function clearAll() {
    notificationsAPI.markAllRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <NotificationContext.Provider value={{ socket, notifications, unreadCount, markRead, clearAll, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
