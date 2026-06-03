import { useState } from "react";
import { Loader2, DollarSign, Calendar, FileText, Hammer } from "lucide-react";
import { bidsAPI } from "../services/api";

export default function BidModal({ project, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: "",
    proposal: "",
    laborCost: "",
    materialCost: "",
    estimatedDays: "",
    targetCompletionDate: "",
    attachments: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || !form.proposal) {
      setError("Bid amount and proposal are required.");
      return;
    }
    if (form.proposal.length < 50) {
      setError("Proposal must be at least 50 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = (() => {
        if (form.attachments.length > 0) {
          const data = new FormData();
          data.append("projectId", project.id);
          data.append("amount", form.amount);
          data.append("proposal", form.proposal);
          if (form.laborCost) data.append("laborCost", form.laborCost);
          if (form.materialCost) data.append("materialCost", form.materialCost);
          if (form.estimatedDays) data.append("estimatedDays", form.estimatedDays);
          if (form.targetCompletionDate) data.append("targetCompletionDate", form.targetCompletionDate);
          form.attachments.forEach((file) => data.append("attachments", file));
          return data;
        }
        return { ...form, projectId: project.id };
      })();

      const res = await bidsAPI.submit(payload);
      onSuccess?.(res.data.bid);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit bid.");
    } finally {
      setLoading(false);
    }
  }

  const budgetPercent = form.amount
    ? Math.round((Number(form.amount) / Number(project?.budget)) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-5 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Submit Bid</h2>
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{project?.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl mt-0.5">✕</button>
          </div>
          {/* Project budget context */}
          <div className="mt-3 bg-orange-50 rounded-xl px-3 py-2 flex items-center gap-2 text-sm">
            <DollarSign size={14} className="text-orange-500" />
            <span className="text-gray-600">Client budget:</span>
            <span className="font-semibold text-orange-600">₱{Number(project?.budget).toLocaleString()}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-3 py-2.5 text-sm">
              {error}
            </div>
          )}

          {/* Bid Amount */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">
              Your Bid Amount (₱) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                min="1000"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="e.g. 1500000"
              />
            </div>
            {form.amount && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${budgetPercent > 100 ? "bg-red-400" : budgetPercent > 90 ? "bg-amber-400" : "bg-green-500"}`}
                    style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                  />
                </div>
                <span className={budgetPercent > 100 ? "text-red-500 font-medium" : "text-gray-400"}>
                  {budgetPercent}% of client budget
                </span>
              </div>
            )}
          </div>

          {/* Cost breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Labor Cost (₱)</label>
              <div className="relative">
                <Hammer size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={form.laborCost}
                  onChange={(e) => setForm({ ...form, laborCost: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Material Cost (₱)</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={form.materialCost}
                  onChange={(e) => setForm({ ...form, materialCost: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Estimated Days</label>
              <input
                type="number"
                value={form.estimatedDays}
                onChange={(e) => setForm({ ...form, estimatedDays: e.target.value })}
                min="1"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="e.g. 90"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Target Completion</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={form.targetCompletionDate}
                  onChange={(e) => setForm({ ...form, targetCompletionDate: e.target.value })}
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>
          </div>

          {/* Proposal */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                Proposal / Cover Letter <span className="text-red-400">*</span>
              </label>
              <span className={`text-xs ${form.proposal.length < 50 ? "text-red-400" : "text-green-500"}`}>
                {form.proposal.length}/50 min
              </span>
            </div>
            <textarea
              value={form.proposal}
              onChange={(e) => setForm({ ...form, proposal: e.target.value })}
              rows={5}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
              placeholder="Describe your approach, experience, why you're the best fit for this project..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Attach Photos / Files (optional)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => setForm({ ...form, attachments: Array.from(e.target.files || []) })}
              className="w-full text-sm text-gray-600"
            />
            {form.attachments.length > 0 && (
              <div className="mt-3 space-y-2 text-sm text-gray-600">
                {form.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, i) => i !== index) })}
                      className="text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Submitting..." : "Submit Bid"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
