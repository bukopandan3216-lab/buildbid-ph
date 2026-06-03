// ── Currency ──────────────────────────────────────────────────────────────────
export function formatPeso(amount, compact = false) {
  const n = Number(amount);
  if (isNaN(n)) return "₱0";
  if (compact) {
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `₱${(n / 1_000).toFixed(0)}K`;
  }
  return `₱${n.toLocaleString("en-PH")}`;
}

// ── Dates ─────────────────────────────────────────────────────────────────────
export function formatDate(date, style = "medium") {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-PH", { dateStyle: style });
}

export function formatDateTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

export function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

export function daysUntil(date) {
  if (!date) return null;
  const diff = new Date(date) - Date.now();
  return Math.ceil(diff / 86400000);
}

// ── Strings ───────────────────────────────────────────────────────────────────
export function truncate(str, len = 80) {
  if (!str) return "";
  return str.length <= len ? str : `${str.slice(0, len)}…`;
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function initials(name = "") {
  return name.split(" ").map((n) => n.charAt(0)).slice(0, 2).join("").toUpperCase();
}

// ── Numbers ───────────────────────────────────────────────────────────────────
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

// ── Status helpers ────────────────────────────────────────────────────────────
export const PROJECT_STATUS = {
  DRAFT: { label: "Draft", color: "gray" },
  OPEN: { label: "Open", color: "blue" },
  BIDDING: { label: "Bidding", color: "amber" },
  AWARDED: { label: "Awarded", color: "purple" },
  IN_PROGRESS: { label: "In Progress", color: "green" },
  COMPLETED: { label: "Completed", color: "gray" },
  CANCELLED: { label: "Cancelled", color: "red" },
  DISPUTED: { label: "Disputed", color: "red" },
};

export const BID_STATUS = {
  PENDING: { label: "Pending", color: "amber" },
  ACCEPTED: { label: "Accepted", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
  WITHDRAWN: { label: "Withdrawn", color: "gray" },
};

export const CONTRACT_STATUS = {
  DRAFT: { label: "Draft", color: "gray" },
  PENDING_CLIENT_SIGN: { label: "Awaiting Client Signature", color: "amber" },
  PENDING_CONTRACTOR_SIGN: { label: "Awaiting Contractor Signature", color: "blue" },
  ACTIVE: { label: "Active", color: "green" },
  COMPLETED: { label: "Completed", color: "purple" },
  DISPUTED: { label: "Disputed", color: "red" },
  CANCELLED: { label: "Cancelled", color: "gray" },
};

export const PAYMENT_STATUS = {
  PENDING: { label: "Pending", color: "amber" },
  PROCESSING: { label: "Processing", color: "blue" },
  COMPLETED: { label: "Paid", color: "green" },
  FAILED: { label: "Failed", color: "red" },
  REFUNDED: { label: "Refunded", color: "purple" },
};

// ── File helpers ──────────────────────────────────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isImage(mimeType) {
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType);
}

// ── Validation helpers ────────────────────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  return /^(\+63|0)[0-9]{10}$/.test(phone?.replace(/\s/g, ""));
}

// ── Color maps for Tailwind (must be complete strings for purge) ───────────────
export const tailwindColors = {
  orange: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  green: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200" },
  red: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-200" },
  gray: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
};
