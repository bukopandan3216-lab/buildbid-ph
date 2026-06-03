import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Gavel, ChevronDown, CheckCircle, XCircle, Clock, DollarSign,
  Calendar, FileText, Eye, TrendingUp, Star, MapPin, Image as ImageIcon,
  AlertCircle, Send, X
} from "lucide-react";

import { bidsAPI } from "../services/api";

const statusConfig = {
  PENDING: { label: "Pending", color: "bg-amber-100 text-amber-700", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  REJECTED: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
  DECLINED: { label: "Declined", color: "bg-red-100 text-red-700", icon: XCircle },
  WITHDRAWN: { label: "Withdrawn", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

export default function Bids() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isClient = role === "CLIENT";
  
  // Unified state keys matching both parts of your code
  const [activeMainTab, setActiveMainTab] = useState(isClient ? "received" : "submitted");
  const [activeTab, setActiveTab] = useState(isClient ? "received" : "submitted");
  const [projectStatusTab, setProjectStatusTab] = useState("open"); // open or closed
  const [selectedBid, setSelectedBid] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [compareProjectId, setCompareProjectId] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changeRequestData, setChangeRequestData] = useState({});
  const [showChangeRequest, setShowChangeRequest] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        if (role === "CONTRACTOR") {
          const res = await bidsAPI.myBids();
          if (mounted) setBids(res.data.bids || []);
        } else {
          const res = await bidsAPI.received();
          if (mounted) setBids(res.data.bids || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [role]);

  async function handleAccept(bidId) {
    try {
      await bidsAPI.accept(bidId);
      setBids((prev) => prev.map((b) => b.id === bidId ? { ...b, status: "ACCEPTED" } : { ...b, status: b.status === "PENDING" ? "DECLINED" : b.status }));
      setSelectedBid(null);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to accept bid.");
    }
  }

  async function handleReject(bidId) {
    try {
      await bidsAPI.reject(bidId, "Declined by client");
      setBids((prev) => prev.map((b) => b.id === bidId ? { ...b, status: "DECLINED" } : b));
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to decline bid.");
    }
  }

  async function openBid(id) {
    try {
      const res = await bidsAPI.get(id);
      setSelectedBid(res.data.bid);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to load bid details.");
    }
  }

  // Filter bids based on project status
  const filteredBids = bids.filter(bid => {
    const status = bid.project?.status?.toUpperCase() || "OPEN";
    if (projectStatusTab === "open") {
      return status === "OPEN" || status === "BIDDING";
    } else {
      return status === "AWARDED" || status === "CLOSED" || status === "IN_PROGRESS" || status === "COMPLETED";
    }
  });

  const projectGroups = Object.values(filteredBids.reduce((acc, bid) => {
    const project = bid.project || { id: null, title: "Unknown Project", status: "OPEN", budget: 0 };
    const projectId = project.id || "unknown";
    if (!acc[projectId]) {
      acc[projectId] = { project, bids: [] };
    }
    acc[projectId].bids.push(bid);
    return acc;
  }, {}));

  // Handle syncing local sub-tabs together 
  const updateTabs = (tabValue) => {
    setActiveMainTab(tabValue);
    setActiveTab(tabValue);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Bids</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage and track all bidding activity</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm text-gray-600">
              <Gavel size={16} className="text-orange-500" />
              {isClient ? "Bids received from contractors" : "Your submitted bids"}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 items-center justify-between bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            {isClient ? (
              ["received"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => updateTabs(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    activeTab === tab ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  Bids Received
                </button>
              ))
            ) : (
              ["submitted", "active"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => updateTabs(tab)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                    activeTab === tab ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {tab === "submitted" ? "My Submitted Bids" : tab}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Bids", value: bids.length, color: "orange" },
            { label: "Pending", value: bids.filter((b) => b.status === "PENDING").length, color: "amber" },
            { label: "Accepted", value: bids.filter((b) => b.status === "ACCEPTED").length, color: "green" },
            { label: "Declined", value: bids.filter((b) => b.status === "DECLINED" || b.status === "REJECTED").length, color: "red" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Project Status Tabs (For filtering view collections) */}
        <div className="flex gap-2">
          <button
            onClick={() => setProjectStatusTab("open")}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              projectStatusTab === "open"
                ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Open Projects
          </button>
          <button
            onClick={() => setProjectStatusTab("closed")}
            className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
              projectStatusTab === "closed"
                ? "bg-green-100 text-green-700 border-2 border-green-300"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Closed Projects
          </button>
        </div>

        {/* Contractor View Side logic list */}
        {!isClient && (
          <div className="space-y-3">
            {filteredBids.map((bid) => {
              const StatusIcon = statusConfig[bid.status]?.icon || Clock;
              const projectTitle = bid.project?.title || "Project";
              const clientName = bid.project?.client?.user?.name || "Client";
              return (
                <div key={bid.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => openBid(bid.id)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{projectTitle}</h3>
                      <p className="text-sm text-gray-500">Client: {clientName}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[bid.status]?.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig[bid.status]?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Bid Amount</p>
                      <p className="font-bold text-gray-900">₱{Number(bid.amount).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Project Budget</p>
                      <p className="font-semibold text-gray-700">₱{Number(bid.project?.budget || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Est. Days</p>
                      <p className="font-semibold text-gray-700">{bid.estimatedDays || "-"} days</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">Submitted</p>
                      <p className="font-semibold text-gray-700">{new Date(bid.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{bid.proposal}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Client Interface View collection */}
        {isClient && activeTab === "received" && (
          <div className="space-y-4">
            {projectGroups.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <Gavel size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium mb-2">No bids found</p>
                <p className="text-sm text-gray-400">
                  {projectStatusTab === "open" ? "No bids for open projects yet" : "No bids for closed projects"}
                </p>
              </div>
            ) : (
              projectGroups.map(({ project, bids: projectBids }) => (
                <div key={project.id || project.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Project Header */}
                  <div className="p-4 md:p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{project.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin size={14} />
                            Location info
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={14} />
                            Budget: ₱{Number(project.budget || 0).toLocaleString()}
                          </div>
                          <div className={`px-2 py-1 rounded font-medium text-xs ${statusConfig[project.status] ? statusConfig[project.status].color : "bg-gray-100"}`}>
                            {project.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCompareProjectId(compareProjectId === project.id ? null : project.id)}
                          className={`text-sm px-3 py-1.5 rounded-lg font-medium ${compareProjectId === project.id ? "bg-gray-900 text-white shadow-sm" : "bg-orange-50 text-orange-600"}`}
                        >
                          Compare Bids
                        </button>
                        <button
                          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                          className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 font-medium"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bids Row Layout list inside Groups */}
                  <div className="divide-y divide-gray-100">
                    {projectBids.map((bid) => {
                      const StatusIcon = statusConfig[bid.status]?.icon || Clock;
                      return (
                        <div key={bid.id} className="p-4 md:p-6 hover:bg-orange-50/50 transition-colors cursor-pointer" onClick={() => openBid(bid.id)}>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                                  {(bid.contractor?.user?.name || "C").charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">{bid.contractor?.user?.name || bid.contractor?.name || "Contractor"}</p>
                                  <p className="text-xs text-gray-500">{bid.contractor?.companyName || "Contractor"}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[bid.status]?.color}`}>
                                <StatusIcon size={12} /> {statusConfig[bid.status]?.label}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Bid Amount</p>
                              <p className="font-bold text-lg text-orange-600">₱{Number(bid.amount).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Timeline</p>
                              <p className="font-semibold text-gray-900">{bid.estimatedDays || "—"} days</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Labor</p>
                              <p className="font-semibold text-gray-900">₱{Number(bid.laborCost || 0).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs mb-1">Materials</p>
                              <p className="font-semibold text-gray-900">₱{Number(bid.materialCost || 0).toLocaleString()}</p>
                            </div>
                          </div>


{bid.bidFiles?.length > 0 && (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
    {bid.bidFiles.map((file) => (
      <img
        key={file.id}
        src={file.filePath}
        alt={file.fileName}
        className="w-full h-32 rounded-lg object-cover cursor-pointer"
        onClick={() => setPreviewImage(file.filePath)}
      />
    ))}
  </div>
)}
{previewImage && (
  <div
    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
    onClick={() => setPreviewImage(null)}
  >
    <img
      src={previewImage}
      className="max-h-[90vh] max-w-[90vw] rounded-xl"
    />
  </div>
)}
                          {bid.bidFiles && bid.bidFiles.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                              <ImageIcon size={14} className="text-blue-500" />
                              {bid.bidFiles.length} photo{bid.bidFiles.length !== 1 ? "s" : ""} attached
                            </div>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">{bid.proposal}</p>
                          
                          <div className="flex justify-end gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            {bid.status === "PENDING" && (
                              <>
                                <button onClick={() => handleAccept(bid.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600">Accept</button>
                                <button onClick={() => handleReject(bid.id)} className="border border-red-200 text-red-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50">Reject</button>
                              </>
                            )}
                            <button onClick={() => openBid(bid.id)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 bg-white hover:bg-gray-50">Details</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Matrix Analysis comparison block implementation */}
                  {compareProjectId === project.id && (
                    <div className="p-4 bg-slate-50 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                      <h4 className="font-semibold text-sm mb-3 text-gray-800">Compare Bids — {project.title}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm bg-white rounded-xl border border-gray-200">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="text-left p-3 text-gray-500 font-medium">Metric</th>
                              {projectBids.map((b) => (
                                <th key={b.id} className="text-center p-3 font-semibold text-gray-800">{b.contractor?.user?.name || "Contractor"}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {[
                              ["Bid Amount", (b) => `₱${Number(b.amount).toLocaleString()}`],
                              ["Labor Cost", (b) => `₱${Number(b.laborCost || 0).toLocaleString()}`],
                              ["Material Cost", (b) => `₱${Number(b.materialCost || 0).toLocaleString()}`],
                              ["Est. Duration", (b) => `${b.estimatedDays || "-"} days`],
                            ].map(([label, getValue]) => (
                              <tr key={label}>
                                <td className="p-3 font-medium text-gray-700">{label}</td>
                                {projectBids.map((b) => (
                                  <td key={b.id} className="p-3 text-center text-gray-600">{getValue(b)}</td>
                                ))}
                              </tr>
                            ))}
                            <tr>
                              <td className="p-3 font-medium text-gray-700">Action</td>
                              {projectBids.map((b) => (
                                <td key={b.id} className="p-3 text-center">
                                  {b.status === "PENDING" ? (
                                    <button onClick={() => handleAccept(b.id)} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-orange-600">Accept</button>
                                  ) : (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[b.status]?.color}`}>{statusConfig[b.status]?.label}</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Integrated Modal Details Window view handler */}
        {selectedBid && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedBid(null)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Bid Details</h2>
                  <p className="text-sm text-gray-500">{selectedBid.project?.title || "Project Activity Setup"}</p>
                </div>
                <button onClick={() => setSelectedBid(null)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content container layout wrapper body */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Contractor Profiles Data card block components */}
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-4 mb-1">
                    <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold">
                      {(selectedBid.contractor?.user?.name || "C").charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{selectedBid.contractor?.user?.name || selectedBid.contractor?.name}</p>
                      <p className="text-sm text-gray-600">{selectedBid.contractor?.companyName || "Field Agent Contractor Office"}</p>
                      {selectedBid.contractor?.user?.email && (
                        <p className="text-xs text-gray-400 mt-0.5">{selectedBid.contractor.user.email}</p>
                      )}
                      {selectedBid.contractor?.rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">{selectedBid.contractor.rating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({selectedBid.contractor.completedProjects || 0} projects)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Matrix item layout blocks */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Total Bid Amount</p>
                  <p className="text-3xl font-bold text-blue-600">₱{Number(selectedBid.amount).toLocaleString()}</p>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-600 text-xs mb-1">Labor Cost</p>
                      <p className="font-semibold text-gray-900">₱{Number(selectedBid.laborCost || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs mb-1">Material Cost</p>
                      <p className="font-semibold text-gray-900">₱{Number(selectedBid.materialCost || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Time Estimation card configurations blocks */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Estimated Duration</p>
                      <p className="text-2xl font-bold text-purple-600">{selectedBid.estimatedDays || "—"} days</p>
                    </div>
                    {selectedBid.completionDate && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Target Completion</p>
                        <p className="text-base font-semibold text-gray-900">{new Date(selectedBid.completionDate).toLocaleDateString("en-PH")}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proposal Text box layout block */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Proposal Summary</h3>
                  <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl whitespace-pre-wrap border border-gray-100">{selectedBid.proposal}</p>
                </div>

                {/* Image Attachments view loops component parameters setup */}
                {selectedBid.bidFiles && selectedBid.bidFiles.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 text-sm">Attached Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedBid.bidFiles.map((file) => (
                        <div key={file.id} className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
                          <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-600 truncate">{file.fileName}</p>
                          <a href={`/${file.filePath}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-2 inline-block font-medium">
                            View File
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Control Actions System */}
                {isClient && selectedBid.status === "PENDING" && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleReject(selectedBid.id)}
                      className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-xl font-medium hover:bg-red-50 text-sm transition-colors"
                    >
                      Decline Bid
                    </button>
                    <button
                      onClick={() => handleAccept(selectedBid.id)}
                      className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 text-sm transition-colors shadow-sm"
                    >
                      Accept Bid
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
