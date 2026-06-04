import { useState, useRef } from "react";
import { usePayments, useToast } from "../hooks";
import { paymentsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  CreditCard, CheckCircle, Clock, AlertCircle, ArrowUpRight,
  ArrowDownLeft, Download, DollarSign, Receipt, Eye, X,
  FileText, Upload, TrendingUp, Calendar, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const statusConfig = {
  COMPLETED: { label: "Paid", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  PROCESSING: { label: "Under Review", color: "bg-blue-100 text-blue-700 border-blue-200", icon: RefreshCw },
  FAILED: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
  REFUNDED: { label: "Refunded", color: "bg-purple-100 text-purple-700 border-purple-200", icon: ArrowDownLeft },
};

const typeLabels = {
  DOWNPAYMENT: "50% Downpayment",
  PROGRESS: "Progress Billing",
  COMPLETION: "Final Payment",
  PENALTY: "Penalty",
  REFUND: "Refund",
};

const typeColors = {
  DOWNPAYMENT: "bg-blue-50 text-blue-700",
  PROGRESS: "bg-orange-50 text-orange-700",
  COMPLETION: "bg-green-50 text-green-700",
  PENALTY: "bg-red-50 text-red-700",
  REFUND: "bg-purple-50 text-purple-700",
};

function fmt(n) {
  return `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function Payments() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const { payments = [], summary = {}, loading, refetch } = usePayments({ status: filter === "all" ? undefined : filter });
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [uploading, setUploading] = useState(false);

  const filtered = filter === "all" ? payments : payments.filter((p) => p.status === filter);

  const totalPaid = summary.totalPaid ?? 0;
  const totalPending = summary.totalPending ?? 0;
  const totalProcessing = payments.filter((p) => p.status === "PROCESSING").reduce((s, p) => s + Number(p.amount), 0);
  const overdueCount = summary.overdueCount ?? 0;

  // Build monthly chart from real data
  const monthlyMap = {};
  payments.forEach((p) => {
    const m = new Date(p.createdAt).toLocaleString("en-PH", { month: "short" });
    if (!monthlyMap[m]) monthlyMap[m] = { month: m, paid: 0, pending: 0 };
    if (p.status === "COMPLETED") monthlyMap[m].paid += Number(p.amount);
    else if (p.status === "PENDING" || p.status === "PROCESSING") monthlyMap[m].pending += Number(p.amount);
  });
  const monthlyData = Object.values(monthlyMap).slice(-6);

  const isClient = user?.role === "CLIENT";
  const isContractor = user?.role === "CONTRACTOR";

  async function handleUploadProof() {
    if (!proofFile) { toast("Please choose a proof file.", "error"); return; }
    if (!paymentMethod) { toast("Please select a payment method.", "error"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("proof", proofFile);
      form.append("notes", notes || "");
      form.append("paymentMethod", paymentMethod);
      await paymentsAPI.uploadProof(selectedPayment.id, form);
      toast("Payment proof submitted. Awaiting admin verification.", "success");
      await refetch();
      setShowUploadModal(false);
      setProofFile(null);
      setNotes("");
      setPaymentMethod("");
    } catch (err) {
      toast(err?.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-500 text-sm">
            {isClient ? "Track and manage your project payments" : isContractor ? "View payment records for your projects" : "All payment transactions"}
          </p>
        </div>
        <button
          onClick={() => {
            const rows = [["Reference","Project","Type","Amount","Status","Due Date","Paid Date"]];
            payments.forEach(p => rows.push([
              p.referenceNumber, p.project?.title, typeLabels[p.type], Number(p.amount).toFixed(2),
              p.status, fmtDate(p.dueDate), fmtDate(p.paidAt)
            ]));
            const csv = rows.map(r => r.map(c => `"${c||""}"`).join(",")).join("\n");
            const a = document.createElement("a");
            a.href = "data:text/csv," + encodeURIComponent(csv);
            a.download = "payments.csv";
            a.click();
          }}
          className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* How It Works — client */}
      {isClient && payments.some(p => p.status === "PENDING" && p.type === "DOWNPAYMENT") && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><CreditCard size={16}/> Downpayment Required</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Pay 50% of your project total via bank transfer, GCash, or Maya</li>
            <li>Upload your payment receipt/proof using the <strong>Upload Proof</strong> button</li>
            <li>Admin will verify and confirm your payment within 1-2 business days</li>
            <li>Once verified, your contract becomes fully active and work begins</li>
          </ol>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Paid", value: fmt(totalPaid), icon: CheckCircle, color: "bg-green-100", iconColor: "text-green-600", bar: "bg-green-500", pct: "62%" },
          { label: "Pending", value: fmt(totalPending), icon: Clock, color: "bg-amber-100", iconColor: "text-amber-600", bar: "bg-amber-400", pct: "28%" },
          { label: "Under Review", value: fmt(totalProcessing), icon: RefreshCw, color: "bg-blue-100", iconColor: "text-blue-600", bar: "bg-blue-400", pct: "15%" },
          { label: "Overdue", value: `${overdueCount} item${overdueCount !== 1 ? "s" : ""}`, icon: AlertCircle, color: "bg-red-100", iconColor: "text-red-500", bar: "bg-red-400", pct: overdueCount > 0 ? "40%" : "0%" },
        ].map(({ label, value, icon: Icon, color, iconColor, bar, pct }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center`}>
                <Icon size={16} className={iconColor} />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-bold text-gray-900 text-sm">{value}</p>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div className={`${bar} h-1 rounded-full transition-all`} style={{ width: pct }} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart — only show if there's data */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Payment Timeline</h2>
              <p className="text-xs text-gray-400">Paid vs. Pending by month</p>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-green-500 rounded inline-block" />Paid</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-amber-400 rounded inline-block" />Pending</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, name) => [fmt(v), name === "paid" ? "Paid" : "Pending"]} contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", fontSize: 12 }} />
              <Bar dataKey="paid" fill="#22c55e" radius={[4,4,0,0]} name="paid" />
              <Bar dataKey="pending" fill="#fbbf24" radius={[4,4,0,0]} name="pending" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "PENDING", "PROCESSING", "COMPLETED", "FAILED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors capitalize ${
              filter === s ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "all" ? "All" : statusConfig[s]?.label}
            {s !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                {payments.filter(p => p.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Payment List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading payments...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <CreditCard size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No payments found</p>
          <p className="text-gray-400 text-sm mt-1">
            {filter === "all" ? "Payment records will appear here once contracts are active." : `No ${statusConfig[filter]?.label?.toLowerCase()} payments.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Reference", "Project", "Type", "Amount", "Due Date", "Paid Date", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((pay) => {
                  const StatusIcon = statusConfig[pay.status]?.icon || Clock;
                  return (
                    <tr key={pay.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{pay.referenceNumber}</td>
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="font-medium text-gray-800 truncate max-w-[160px]">{pay.project?.title || "Project"}</p>
                        <p className="text-xs text-gray-400">{pay.contract?.contractor?.user?.name || (isContractor ? "Your project" : "—")}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${typeColors[pay.type]}`}>
                          {typeLabels[pay.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{fmt(pay.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(pay.dueDate)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{fmtDate(pay.paidAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium w-fit border ${statusConfig[pay.status]?.color}`}>
                          <StatusIcon size={11} />
                          {statusConfig[pay.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {pay.status === "PENDING" && isClient && (
                            <button
                              onClick={() => { setSelectedPayment(pay); setShowUploadModal(true); }}
                              className="flex items-center gap-1 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 font-medium whitespace-nowrap transition-colors"
                            >
                              <Upload size={11} /> Upload Proof
                            </button>
                          )}
                          {pay.status === "PROCESSING" && (
                            <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
                              ⏳ Verifying...
                            </span>
                          )}
                          {(pay.status === "COMPLETED" || pay.proofOfPayment) && (
                            <button
                              onClick={() => { setSelectedPayment(pay); setShowReceiptModal(true); }}
                              className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 whitespace-nowrap transition-colors"
                            >
                              <Receipt size={11} /> Receipt
                            </button>
                          )}
                          <button
                            onClick={() => { setSelectedPayment(pay); setShowReceiptModal(true); }}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                            title="View details"
                          >
                            <Eye size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Proof Modal */}
      {showUploadModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Upload Proof of Payment</h2>
                <p className="text-sm text-gray-500">{selectedPayment.project?.title || "Project"}</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
              <p className="text-sm font-semibold text-orange-800">Amount Due: {fmt(selectedPayment.amount)}</p>
              <p className="text-xs text-orange-600 mt-0.5">50% downpayment · {typeLabels[selectedPayment.type]}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700 mb-2">Payment Methods Accepted:</p>
              <p>🏦 Bank Transfer — BDO, BPI, Metrobank, UnionBank</p>
              <p>📱 GCash — Send to linked account</p>
              <p>📱 Maya — Send to linked account</p>
            </div>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  toast("Only JPG, PNG, and WebP receipt images are allowed.", "error");
                  return;
                }
                if (file.size > 10 * 1024 * 1024) {
                  toast("File is too large. Maximum 10MB.", "error");
                  return;
                }
                setProofFile(file);
              }}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center mb-4 hover:border-orange-300 transition-colors cursor-pointer"
            >
              <Upload size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WebP up to 10MB</p>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.size > 10 * 1024 * 1024) {
                    toast("File is too large. Maximum 10MB.", "error");
                    return;
                  }
                  setProofFile(file);
                }}
              />
              {proofFile && (
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                  <FileText size={12} /> {proofFile.name}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              >
                <option value="">Select method</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="GCASH">GCash</option>
                <option value="PAYMAYA">PayMaya</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Notes / Transaction Reference (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. GCash transaction ID: 1234567890, BDO reference: REF-XXX"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setShowUploadModal(false); setProofFile(null); setNotes(""); setPaymentMethod(""); }}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleUploadProof} disabled={uploading || !proofFile || !paymentMethod}
                className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {uploading ? <><div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/>Submitting...</> : "Submit for Verification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt / Detail Modal */}
      {showReceiptModal && selectedPayment && (
        
        (() => {
          const ReceiptStatusIcon = statusConfig[selectedPayment.status]?.icon || Clock;
          return (
       //     console.log("selectedPayment", selectedPayment);
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowReceiptModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs opacity-75 font-mono">{selectedPayment.referenceNumber}</p>
                <button onClick={() => setShowReceiptModal(false)} className="opacity-75 hover:opacity-100"><X size={16}/></button>
              </div>
              <p className="text-2xl font-bold">{fmt(selectedPayment.amount)}</p>
              <p className="text-sm opacity-80 mt-0.5">{typeLabels[selectedPayment.type]}</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Status</span>
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${statusConfig[selectedPayment.status]?.color}`}>
                  <ReceiptStatusIcon size={11} />
                  {statusConfig[selectedPayment.status]?.label}
                </span>
              </div>

              {[
                ["Project", selectedPayment.project?.title],
                ["Contractor", selectedPayment.contract?.contractor?.user?.name],
                ["Due Date", fmtDate(selectedPayment.dueDate)],
                ["Paid Date", fmtDate(selectedPayment.paidAt)],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}

              {selectedPayment.notes && (
                <div className="bg-gray-50 rounded-xl p-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Transaction Notes</p>
                  <p className="text-sm text-gray-700">{selectedPayment.notes}</p>
                </div>
              )}

              {selectedPayment.proofOfPayment && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Proof of Payment</p>
                  <a
                    href={`${import.meta.env.VITE_API_URL || ""}/${selectedPayment.proofOfPayment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <FileText size={14}/> View uploaded proof
                  </a>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex gap-2">
                {selectedPayment.status === "COMPLETED" && (
                  <button
                    onClick={() => window.print()}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    <Download size={14}/> Download Receipt
                  </button>
                )}
                <button onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
          );
        })()
      )}
    </div>
  );
}
