import { Loader2, X } from "lucide-react";

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({
  children, onClick, type = "button", variant = "primary",
  size = "md", loading = false, disabled = false, className = "", icon: Icon,
}) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-300 shadow-sm",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-gray-200",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-300",
    ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-200",
    success: "bg-green-500 text-white hover:bg-green-600 focus:ring-green-300",
  };
  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2.5",
    lg: "text-base px-6 py-3",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = "gray", size = "sm" }) {
  const variants = {
    gray: "bg-gray-100 text-gray-600",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-600",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    amber: "bg-amber-100 text-amber-700",
  };
  const sizes = { sm: "text-xs px-2 py-0.5", md: "text-sm px-2.5 py-1" };
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "", padding = true, hover = false }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${padding ? "p-5" : ""} ${hover ? "hover:shadow-md transition-shadow cursor-pointer" : ""} ${className}`}>
      {children}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${maxWidth} shadow-2xl max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, icon: Icon, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          className={`w-full border rounded-xl py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent transition-colors
            ${Icon ? "pl-9 pr-3" : "px-3"}
            ${error ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
export function Textarea({ label, error, className = "", rows = 3, ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>}
      <textarea
        rows={rows}
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none
          ${error ? "border-red-300 bg-red-50" : "border-gray-200"}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, options = [], className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>}
      <select
        className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white
          ${error ? "border-red-300" : "border-gray-200"}`}
        {...props}
      >
        {options.map(({ value, label: l }) => (
          <option key={value} value={value}>{l}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
export function Skeleton({ className = "", lines = 1 }) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`bg-gray-200 rounded-lg h-4 ${i < lines - 1 ? "mb-2" : ""} ${i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-20 h-5 bg-gray-200 rounded-lg" />
        <div className="w-16 h-5 bg-gray-200 rounded-full" />
      </div>
      <div className="w-3/4 h-5 bg-gray-200 rounded-lg mb-2" />
      <div className="w-full h-4 bg-gray-100 rounded-lg mb-1" />
      <div className="w-2/3 h-4 bg-gray-100 rounded-lg mb-4" />
      <div className="flex gap-2 mt-4">
        <div className="w-24 h-4 bg-gray-100 rounded" />
        <div className="w-24 h-4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "📋", title, description, action }) {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="font-semibold text-gray-600 text-lg mb-1">{title}</p>
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-orange-500" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? "left-5" : "left-0.5"}`} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name = "", src, size = "md", color = "orange" }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-xl" };
  const colors = { orange: "bg-orange-100 text-orange-700", blue: "bg-blue-100 text-blue-700", green: "bg-green-100 text-green-700", purple: "bg-purple-100 text-purple-700" };
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  return (
    <div className={`${sizes[size]} ${colors[color]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, color = "orange", showLabel = false }) {
  const colors = { orange: "bg-orange-500", green: "bg-green-500", blue: "bg-blue-500", red: "bg-red-500" };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${colors[color]} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8 text-right">{value}%</span>}
    </div>
  );
}

// ── Stats card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, change, up, icon: Icon, color = "orange" }) {
  const colors = {
    orange: { bg: "bg-orange-100", text: "text-orange-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    green: { bg: "bg-green-100", text: "text-green-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
  };
  const c = colors[color];
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${c.bg} ${c.text} rounded-xl flex items-center justify-center`}>
          {Icon && <Icon size={18} />}
        </div>
        {change !== undefined && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
            {up ? "↑" : "↓"} {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </Card>
  );
}
