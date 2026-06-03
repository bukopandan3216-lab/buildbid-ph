import { MapPin, Calendar, DollarSign, Users } from "lucide-react";
import { formatPeso, formatDate, PROJECT_STATUS, tailwindColors } from "../utils/helpers";

export default function ProjectCard({ project, onClick, showBidButton = false, onBid }) {
  const status = PROJECT_STATUS[project.status] || PROJECT_STATUS.OPEN;
  const c = tailwindColors[status.color] || tailwindColors.gray;
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline) - Date.now()) / 86400000)
    : null;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
          project.category === "Commercial" ? "bg-blue-50 text-blue-700"
            : project.category === "Residential" ? "bg-green-50 text-green-700"
            : project.category === "Industrial" ? "bg-orange-50 text-orange-700"
            : project.category === "Government" ? "bg-purple-50 text-purple-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {project.category || "General"}
        </span>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.bg} ${c.text}`}>
          {status.label}
        </span>
      </div>

      {/* Title + description */}
      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors line-clamp-1">
        {project.title}
      </h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">
        {project.description}
      </p>

      {/* Details */}
      <div className="space-y-1.5 text-sm text-gray-500 mb-4">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{project.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gray-400 flex-shrink-0" />
          <span>
            {formatDate(project.deadline)}
            {daysLeft !== null && (
              <span className={`ml-1.5 text-xs ${daysLeft < 7 ? "text-red-500 font-medium" : daysLeft < 30 ? "text-amber-600" : "text-gray-400"}`}>
                ({daysLeft > 0 ? `${daysLeft}d left` : "Overdue"})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-gray-400 flex-shrink-0" />
          <span className="font-semibold text-gray-700">{formatPeso(project.budget)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          by <span className="font-medium text-gray-600">
            {project.client?.user?.name || project.client || "Client"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
            {project._count?.bids ?? project.bids ?? 0} bid{(project._count?.bids ?? project.bids ?? 0) !== 1 ? "s" : ""}
          </span>
          {(showBidButton && (project.status === "OPEN" || project.status === "BIDDING")) ? (
            <button
              onClick={(e) => { e.stopPropagation(); onBid?.(project); }}
              className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 font-medium transition-colors"
            >
              Bid Now
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
