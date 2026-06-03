import { useState } from "react";
import { useNotifications as useNotificationsHook } from "../hooks";
import { AlertCircle, Bell, CheckCheck, Trash2, Gavel, FileText, CreditCard, MessageSquare, Shield, Info } from "lucide-react";

const mockNotifications = [
  {
    id: 1, type: "NEW_BID", title: "New Bid Received",
    message: "Jose Construction Corp submitted a bid of ₱2,250,000 for your SM Mall Renovation project.",
    link: "/bids", isRead: false, createdAt: "2 minutes ago",
  },
  {
    id: 2, type: "VERIFICATION_APPROVED", title: "Verification Approved ✅",
    message: "Your contractor account has been verified. You can now submit bids on available projects.",
    link: "/dashboard", isRead: false, createdAt: "1 hour ago",
  },
  {
    id: 3, type: "CONTRACT_READY", title: "Contract Ready for Signature",
    message: "Contract BB-2024-002 for SM Mall Cebu Renovation is ready. Please review and sign.",
    link: "/contracts", isRead: false, createdAt: "3 hours ago",
  },
  {
    id: 4, type: "PAYMENT_RECEIVED", title: "Payment Received",
    message: "Downpayment of ₱246,000 for BF Homes Residential Build has been confirmed.",
    link: "/payments", isRead: true, createdAt: "Yesterday",
  },
  {
    id: 5, type: "NEW_MESSAGE", title: "New Message from SM Group",
    message: "Please send the revised quotation by Friday. We need to finalize the project timeline.",
    link: "/messages", isRead: true, createdAt: "Yesterday",
  },
  {
    id: 6, type: "BID_ACCEPTED", title: "Your Bid Was Accepted! 🎉",
    message: "Congratulations! Your bid for BF Homes Residential Build has been accepted by the client.",
    link: "/contracts", isRead: true, createdAt: "2 days ago",
  },
  {
    id: 7, type: "SYSTEM", title: "Welcome to BuildBid PH",
    message: "Your account is ready. Start posting projects or browsing available construction opportunities.",
    link: "/dashboard", isRead: true, createdAt: "Jun 10, 2024",
  },
];

const typeConfig = {
  NEW_BID: { icon: Gavel, color: "bg-orange-100 text-orange-600" },
  BID_ACCEPTED: { icon: Gavel, color: "bg-green-100 text-green-600" },
  BID_REJECTED: { icon: Gavel, color: "bg-red-100 text-red-600" },
  CONTRACT_READY: { icon: FileText, color: "bg-blue-100 text-blue-600" },
  CONTRACT_SIGNED: { icon: FileText, color: "bg-green-100 text-green-600" },
  PAYMENT_RECEIVED: { icon: CreditCard, color: "bg-green-100 text-green-600" },
  PAYMENT_APPROVED: { icon: CreditCard, color: "bg-green-100 text-green-600" },
  PAYMENT_REJECTED: { icon: AlertCircle, color: "bg-red-100 text-red-600" },
  PAYMENT_UPLOADED: { icon: CreditCard, color: "bg-blue-100 text-blue-600" },
  PAYMENT_DUE: { icon: CreditCard, color: "bg-red-100 text-red-600" },
  NEW_MESSAGE: { icon: MessageSquare, color: "bg-purple-100 text-purple-600" },
  VERIFICATION_APPROVED: { icon: Shield, color: "bg-green-100 text-green-600" },
  VERIFICATION_REJECTED: { icon: Shield, color: "bg-red-100 text-red-600" },
  SYSTEM: { icon: Info, color: "bg-gray-100 text-gray-600" },
  PROJECT_UPDATE: { icon: Info, color: "bg-blue-100 text-blue-600" },
};

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const { notifications, unreadCount, loading, markRead, markAllRead, clearAll, deleteNotification } = useNotificationsHook();

  const filtered = (notifications || []).filter((n) => {
    if (filter === "unread") return !n.isRead;
    return true;
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50"
            >
              <Trash2 size={14} /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {["all", "unread"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {f === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-medium text-gray-500">No notifications</p>
          <p className="text-sm text-gray-400">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif) => {
            const cfg = typeConfig[notif.type] || typeConfig.SYSTEM;
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                  !notif.isRead
                    ? "bg-orange-50 border-orange-100"
                    : "bg-white border-gray-100 hover:bg-gray-50"
                }`}
                onClick={() => markRead(notif.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${!notif.isRead ? "text-gray-900" : "text-gray-700"}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-snug">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-1.5">{notif.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notif.isRead && (
                        <span className="w-2 h-2 bg-orange-500 rounded-full" />
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
