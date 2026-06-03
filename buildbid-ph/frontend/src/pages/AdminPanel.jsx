import { useState, useEffect } from "react";
import { useAdminDashboard, useAdminContractors, useAdminContracts, useAdminAuditLogs } from "../hooks";
import { adminAPI, messagesAPI, contractsAPI, paymentsAPI } from "../services/api";
import {
  Users, FolderOpen, Gavel, FileText, CreditCard, Shield,
  CheckCircle, XCircle, Clock, AlertCircle, Eye, Ban,
  TrendingUp, HardHat, BarChart2, Download
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";

const colorMap = {
  blue: "bg-blue-50 text-blue-600",
  orange: "bg-orange-50 text-orange-600",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-green-50 text-green-600",
};

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const { dashboard, loading: dashLoading } = useAdminDashboard();
  const { contractors, verifyContractor, loading: contractorLoading } = useAdminContractors({ status: "PENDING" });
  const { contracts, loading: contractsLoading, refetch: refetchContracts } = useAdminContracts();
  const [selectedContractDetail, setSelectedContractDetail] = useState(null); // will hold { contract, bid }
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [verifyNote, setVerifyNote] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageBody, setMessageBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedUserSearch, setSelectedUserSearch] = useState("");

  const activityData = dashboard?.activity || [
    { month: "Jan", projects: 12, bids: 38, contracts: 10 },
    { month: "Feb", projects: 14, bids: 44, contracts: 12 },
    { month: "Mar", projects: 18, bids: 52, contracts: 16 },
    { month: "Apr", projects: 22, bids: 61, contracts: 19 },
    { month: "May", projects: 20, bids: 55, contracts: 17 },
    { month: "Jun", projects: 24, bids: 64, contracts: 22 },
  ];

  const roleDistribution = dashboard?.roleDistribution || [
    { name: "Clients", value: Math.max(1, Math.round((dashboard?.stats?.totalUsers || 10) * 0.55)), color: "#60A5FA" },
    { name: "Contractors", value: Math.max(1, Math.round((dashboard?.stats?.totalUsers || 10) * 0.35)), color: "#34D399" },
    { name: "Admins", value: Math.max(1, Math.round((dashboard?.stats?.totalUsers || 10) * 0.1)), color: "#FBBF24" },
  ];

  async function approveContractor(id) {
    await handleVerifyContractor(id, "VERIFIED");
  }

  async function rejectContractor(id) {
    await handleVerifyContractor(id, "REJECTED");
  }

  async function handleVerifyContractor(id, status) {
    try {
      await verifyContractor(id, status, verifyNote);
      setSelectedContractor(null);
      setVerifyNote("");
      alert(`Contractor ${status === "VERIFIED" ? "approved" : "rejected"} successfully!`);
    } catch (err) {
      alert(err?.response?.data?.message || "Verification failed.");
    }
  }

  async function loadAdminUsers() {
    try {
      const res = await adminAPI.users({ limit: 50 });
      setUsers(res.data.users || []);
      if (!selectedUser && res.data.users?.length) {
        setSelectedUser(res.data.users[0]);
      }
    } catch (err) {
      console.error("Failed to load admin users", err);
    }
  }

  async function sendAdminMessage() {
    if (!selectedUser || !messageBody.trim()) return;
    setIsSending(true);
    try {
      await messagesAPI.send(selectedUser.id, messageBody.trim());
      setMessageBody("");
      alert("Message sent successfully.");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    loadAdminUsers();
    // Sync pending notifications when admin loads
    adminAPI.syncPendingNotifications().catch((err) => console.error("Failed to sync notifications:", err));
  }, []);

  const stats = dashboard?.stats ? [
    { label: "Total Users", value: dashboard.stats.totalUsers, icon: Users, color: "blue" },
    { label: "Active Projects", value: dashboard.stats.totalProjects, icon: FolderOpen, color: "orange" },
    { label: "Pending Verifications", value: dashboard.stats.pendingVerifications, icon: Shield, color: "amber" },
    { label: "Total Revenue", value: `₱${(dashboard.stats.totalRevenue / 1000000).toFixed(1)}M`, icon: CreditCard, color: "green" },
  ] : [];

  const [auditParams, setAuditParams] = useState({ page: 1, limit: 20, actionType: "", resourceType: "", userId: "" });
  const { logs: auditLogs, loading: auditLoading, refetch: refetchAudit } = useAdminAuditLogs(auditParams);
  const [selectedLog, setSelectedLog] = useState(null);

  // Compute notification counts
  const pendingContractCount = contracts.filter((c) => c.status !== "ACTIVE").length;
  const pendingVerificationCount = contractors.filter((c) => c.verificationStatus === "PENDING").length;

  const [adminPayments, setAdminPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsFilter, setPaymentsFilter] = useState("all");

  async function loadAdminPayments() {
    setPaymentsLoading(true);
    try {
      const res = await adminAPI.payments(paymentsFilter !== "all" ? { status: paymentsFilter } : {});
      setAdminPayments(res.data.payments || []);
    } catch (e) {
      console.error("Failed to load payments", e);
    } finally {
      setPaymentsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "payments") loadAdminPayments();
  }, [activeTab, paymentsFilter]);

  async function handleVerifyPayment(id, approved) {
    try {
      await paymentsAPI.verify(id, approved);
      await loadAdminPayments();
      alert(`Payment ${approved ? "approved" : "rejected"} successfully.`);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to update payment.");
    }
  }

  const processingPayments = adminPayments.filter(p => p.status === "PROCESSING");
  const pendingPaymentsCount = processingPayments.length;

  const tabs = [
    { label: "Overview", id: "overview" },
    { label: `Verifications ${pendingVerificationCount > 0 ? `(${pendingVerificationCount})` : ""}`, id: "verifications", badge: pendingVerificationCount },
    { label: `Contracts ${pendingContractCount > 0 ? `(${pendingContractCount})` : ""}`, id: "contracts", badge: pendingContractCount },
    { label: `Payments ${pendingPaymentsCount > 0 ? `(${pendingPaymentsCount})` : ""}`, id: "payments", badge: pendingPaymentsCount },
    { label: "Messaging", id: "messaging" },
    { label: "Audit Logs", id: "audit" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-500 text-sm">BuildBid PH system management</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
          <Download size={15} /> Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map(({ label, value, change, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">{change}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Platform Activity</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={activityData} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="projects" fill="#f97316" radius={[4, 4, 0, 0]} name="Projects" />
                  <Bar dataKey="bids" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Bids" />
                  <Bar dataKey="contracts" fill="#22c55e" radius={[4, 4, 0, 0]} name="Contracts" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">User Distribution</h2>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={roleDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                    {roleDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {roleDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Verifications alert */}
          {contractors.filter((c) => c.verificationStatus === "PENDING").length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">
                  {contractors.filter((c) => c.verificationStatus === "PENDING").length} contractor(s) pending verification
                </p>
                <p className="text-sm text-amber-600">Review and approve contractor documents to allow them to bid on projects.</p>
              </div>
              <button onClick={() => setActiveTab("verifications")}
                className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600 flex-shrink-0">
                Review Now
              </button>
            </div>
          )}

          {/* Pending Contracts alert */}
          {pendingContractCount > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {pendingContractCount} contract(s) pending admin approval
                </p>
                <p className="text-sm text-orange-600">Review and approve contracts to activate client-contractor agreements.</p>
              </div>
              <button onClick={() => setActiveTab("contracts")}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 flex-shrink-0">
                Review Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Verifications */}
      {activeTab === "verifications" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review contractor documents and approve or reject their verification requests.</p>
          {contractors.map((contractor) => {
            const name = contractor.user?.name || contractor.user?.email || "Contractor";
            const email = contractor.user?.email || "Not available";
            const roleLabel = contractor.user?.role?.toLowerCase() || "contractor";
            const submittedAt = contractor.createdAt ? new Date(contractor.createdAt).toLocaleDateString() : "Unknown";

            return (
              <div key={contractor.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center font-bold text-sm">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{name}</h3>
                      <p className="text-sm text-gray-500">{roleLabel} · {email}</p>
                      <p className="text-xs text-gray-400">{contractor.city || "Location not provided"} · Submitted {submittedAt}</p>
                    </div>
                  </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    contractor.verificationStatus === "PENDING" ? "bg-amber-100 text-amber-700"
                      : contractor.verificationStatus === "VERIFIED" ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {contractor.verificationStatus}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Uploaded Documents</p>
                  <div className="flex flex-wrap gap-2">
                    {contractor.documents?.length ? contractor.documents.map((doc) => (
                        <span key={doc.id} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                          <CheckCircle size={11} />
                          {doc.fileName || doc.type || "Document"}
                        </span>
                      )) : (
                        <span className="text-xs text-gray-500">No documents uploaded.</span>
                      )}
                  </div>
                </div>

                {contractor.verificationStatus === "PENDING" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleVerifyContractor(contractor.id, "VERIFIED")}
                      className="flex items-center gap-1.5 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-600">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleVerifyContractor(contractor.id, "REJECTED")}
                      className="flex items-center gap-1.5 border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50">
                      <XCircle size={14} /> Reject
                    </button>
                    <button onClick={() => setSelectedContractor(contractor)}
                      className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
                      <Eye size={14} /> View Docs
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Contracts */}
      {activeTab === "contracts" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Approve contracts and activate client-contractor agreements from the admin dashboard.</p>
          {contractsLoading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500">Loading contracts...</div>
          ) : contracts.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500">No contracts found.</div>
          ) : (
            <div className="space-y-4">
              {contracts.map((contract) => (
                <div key={contract.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Contract #{contract.contractNumber || contract.id}</p>
                      <h3 className="text-lg font-semibold text-gray-900">{contract.project?.title || "Project contract"}</h3>
                      <p className="text-sm text-gray-500">Contractor: {contract.contractor?.user?.name || "Unknown"}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        contract.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {contract.status}
                      </span>
                      {contract.status !== "ACTIVE" && (
                        <>
                          <button
                            onClick={async () => {
                              try {
                                const res = await contractsAPI.get(contract.id);
                                // backend now returns { contract, bid }
                                setSelectedContractDetail({ contract: res.data.contract, bid: res.data.bid });
                              } catch (err) {
                                alert(err?.response?.data?.message || 'Failed to load contract.');
                              }
                            }}
                            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
                          >
                            View Details
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                await adminAPI.approveContract(contract.id);
                                await refetchContracts();
                                alert("Contract approved and activated.");
                              } catch (err) {
                                alert(err?.response?.data?.message || "Failed to approve contract.");
                              }
                            }}
                            className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600"
                          >
                            Accept Contract
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm("Reject this contract?")) return;
                              try {
                                await adminAPI.rejectContract(contract.id, "Rejected by admin review.");
                                await refetchContracts();
                                alert("Contract rejected.");
                              } catch (err) {
                                alert(err?.response?.data?.message || "Failed to reject contract.");
                              }
                            }}
                            className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50"
                          >
                            Reject Contract
                          </button>
                        </>
                      )}
                      {contract.status === "ACTIVE" && (
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                const res = await contractsAPI.get(contract.id);
                                setSelectedContractDetail({ contract: res.data.contract, bid: res.data.bid });
                              } catch (err) {
                                alert(err?.response?.data?.message || 'Failed to load contract.');
                              }
                            }}
                            className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin Payments */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-gray-500">Review and verify client payment submissions. Approve to activate contracts.</p>
            </div>
            <button onClick={loadAdminPayments} className="text-sm border border-gray-200 px-3 py-1.5 rounded-xl text-gray-600 hover:bg-gray-50">Refresh</button>
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {["all", "PROCESSING", "PENDING", "COMPLETED", "FAILED"].map(s => (
              <button key={s} onClick={() => setPaymentsFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${paymentsFilter === s ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {s === "all" ? "All" : s === "PROCESSING" ? "🔍 Under Review" : s === "PENDING" ? "⏳ Pending" : s === "COMPLETED" ? "✅ Approved" : "❌ Rejected"}
              </button>
            ))}
          </div>

          {paymentsLoading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">Loading payments...</div>
          ) : adminPayments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
              <CreditCard size={28} className="mx-auto text-gray-300 mb-2" />
              No payment records found.
            </div>
          ) : (
            <div className="space-y-3">
              {adminPayments.map((pay) => (
                <div key={pay.id} className={`bg-white rounded-2xl border p-5 shadow-sm ${pay.status === "PROCESSING" ? "border-orange-200" : "border-gray-100"}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{pay.referenceNumber}</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          pay.status === "PROCESSING" ? "bg-blue-100 text-blue-700" :
                          pay.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          pay.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {pay.status === "PROCESSING" ? "Under Review" : pay.status === "COMPLETED" ? "✅ Approved" : pay.status === "PENDING" ? "Awaiting Payment" : "Rejected"}
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {pay.type === "DOWNPAYMENT" ? "50% Downpayment" : pay.type}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{pay.project?.title || "Project"}</h3>
                      <p className="text-sm text-gray-500">
                        Client: {pay.contract?.project?.client?.user?.name || "—"} ·
                        Contractor: {pay.contract?.contractor?.user?.name || "—"}
                      </p>
                      {pay.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">Note: {pay.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xl font-bold text-gray-900">₱{Number(pay.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                      <p className="text-xs text-gray-400">
                        {pay.paidAt ? `Paid: ${new Date(pay.paidAt).toLocaleDateString("en-PH")}` : `Due: ${pay.dueDate ? new Date(pay.dueDate).toLocaleDateString("en-PH") : "—"}`}
                      </p>
                    </div>
                  </div>

                  {/* Proof of payment & actions */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {pay.proofOfPayment && (
                      <a
                        href={`${import.meta.env.VITE_API_URL || ""}/${pay.proofOfPayment}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye size={13}/> View Payment Proof
                      </a>
                    )}
                    {pay.status === "PROCESSING" && (
                      <>
                        <button
                          onClick={() => handleVerifyPayment(pay.id, true)}
                          className="flex items-center gap-1.5 text-sm bg-green-500 text-white px-4 py-1.5 rounded-lg hover:bg-green-600 transition-colors font-medium"
                        >
                          <CheckCircle size={13}/> Approve Payment
                        </button>
                        <button
                          onClick={() => handleVerifyPayment(pay.id, false)}
                          className="flex items-center gap-1.5 text-sm border border-red-200 text-red-500 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <XCircle size={13}/> Reject
                        </button>
                        <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                          ⚠️ Approving this will activate the contract and notify both parties.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">System audit trail and verification logs for administrative actions.</p>
          <div className="mb-4 flex items-center gap-2">
            <input value={auditParams.actionType} onChange={(e) => setAuditParams((p) => ({ ...p, actionType: e.target.value, page: 1 }))} placeholder="Action (e.g. APPROVE)" className="px-3 py-2 rounded-xl border bg-white text-sm" />
            <input value={auditParams.resourceType} onChange={(e) => setAuditParams((p) => ({ ...p, resourceType: e.target.value, page: 1 }))} placeholder="Resource (e.g. CONTRACT)" className="px-3 py-2 rounded-xl border bg-white text-sm" />
            <input value={auditParams.userId} onChange={(e) => setAuditParams((p) => ({ ...p, userId: e.target.value, page: 1 }))} placeholder="User ID" className="px-3 py-2 rounded-xl border bg-white text-sm" />
            <button onClick={() => refetchAudit()} className="px-3 py-2 rounded-xl border bg-orange-50 text-sm">Filter</button>
          </div>

          {auditLoading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500">Loading logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-gray-500">No audit logs found.</div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{log.actionType} {log.resourceType ? `· ${log.resourceType}` : ''}</p>
                    <p className="text-xs text-gray-500">By: {log.user?.name || log.user?.email || 'System'} · {new Date(log.createdAt).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2 truncate max-w-xl">{log.changes || log.notes || log.metadata || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedLog(log)} className="text-sm text-gray-600 px-3 py-2 border rounded-lg">View</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">Total: {auditLogs.length}</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAuditParams((p) => ({ ...p, page: Math.max(1, p.page - 1) }))} className="px-3 py-1 rounded-lg border">Prev</button>
              <div className="px-3 py-1 text-sm">Page {auditParams.page}</div>
              <button onClick={() => setAuditParams((p) => ({ ...p, page: p.page + 1 }))} className="px-3 py-1 rounded-lg border">Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Messaging */}
      {activeTab === "messaging" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Send direct messages to any registered user from the admin account.</p>
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="mb-4">
                <input
                  value={selectedUserSearch}
                  onChange={(e) => setSelectedUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div className="space-y-2 max-h-[56vh] overflow-y-auto">
                {users
                  .filter((user) => user.role !== "ADMIN")
                  .filter((user) => user.name?.toLowerCase().includes(selectedUserSearch.toLowerCase()) || user.email?.toLowerCase().includes(selectedUserSearch.toLowerCase()))
                  .map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left rounded-2xl px-4 py-3 border ${selectedUser?.id === user.id ? "border-orange-500 bg-orange-50" : "border-gray-100 bg-white"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{user.name || user.email}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                        <span className="text-xs text-gray-400 capitalize">{user.role || "user"}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedUser ? selectedUser.name || selectedUser.email : "Select a user"}</h3>
                <p className="text-sm text-gray-500">{selectedUser ? selectedUser.email : "Choose a user on the left to start a new conversation."}</p>
              </div>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={8}
                disabled={!selectedUser}
                placeholder={selectedUser ? "Write your message here..." : "Select a user first."}
                className="flex-1 resize-none rounded-3xl border border-gray-200 bg-gray-50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  onClick={sendAdminMessage}
                  disabled={!selectedUser || !messageBody.trim() || isSending}
                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedContractor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContractor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">{selectedContractor.user?.name || selectedContractor.user?.email || "Contractor"}</h2>
            <p className="text-sm text-gray-500 mb-4">Document Review</p>
                  <div className="space-y-4 mb-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Account</p>
                  <p className="text-sm text-gray-900 font-semibold">{selectedContractor.user?.name || "Unknown"}</p>
                  <p className="text-sm text-gray-500">{selectedContractor.user?.email}</p>
                  <p className="text-sm text-gray-500">{selectedContractor.user?.phone || "No phone provided"}</p>
                  <p className="text-xs text-gray-400 mt-2">Status: {selectedContractor.verificationStatus}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Profile</p>
                  <p className="text-sm text-gray-900">{selectedContractor.companyName || "No company name"}</p>
                  <p className="text-sm text-gray-500">{selectedContractor.licenseNumber || "No license number"}</p>
                  <p className="text-sm text-gray-500">{selectedContractor.city || "No city specified"}</p>
                  <p className="text-sm text-gray-500">{selectedContractor.address || "No address provided"}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-2">Experience</p>
                <p className="text-sm text-gray-900">{selectedContractor.yearsExperience ? `${selectedContractor.yearsExperience} years` : "Not specified"}</p>
                <p className="text-sm text-gray-500 mt-2">{selectedContractor.specializations || "No specializations listed."}</p>
                <p className="text-sm text-gray-500 mt-2">{selectedContractor.bio || "No bio available."}</p>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Uploaded Documents</p>
              <div className="flex flex-wrap gap-2">
                {selectedContractor.documents?.length ? selectedContractor.documents.map((doc) => (
                  <span key={doc?.id || doc?.fileName || doc?.type || JSON.stringify(doc)} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                    <CheckCircle size={11} />
                    {typeof doc === "string" ? doc : doc.fileName || doc.type || "Document"}
                  </span>
                )) : (
                  <span className="text-xs text-gray-500">No documents available.</span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => rejectContractor(selectedContractor.id)}
                className="flex-1 border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium hover:bg-red-50">
                Reject Account
              </button>
              <button onClick={() => approveContractor(selectedContractor.id)}
                className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-600">
                Approve Account
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedLog(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">{selectedLog.actionType} — {selectedLog.resourceType || 'System'}</h2>
            <p className="text-sm text-gray-500 mb-3">By: {selectedLog.user?.name || selectedLog.user?.email || 'System'} · {new Date(selectedLog.createdAt).toLocaleString()}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Details</p>
                <pre className="text-sm bg-gray-50 p-3 rounded-md max-h-48 overflow-auto text-xs">{selectedLog.changes || selectedLog.notes || selectedLog.metadata || 'No details available.'}</pre>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {selectedLog.resourceId !== undefined && <div className="text-xs text-gray-500">Resource ID: <div className="text-sm text-gray-900">{selectedLog.resourceId}</div></div>}
                {selectedLog.ipAddress && <div className="text-xs text-gray-500">IP: <div className="text-sm text-gray-900">{selectedLog.ipAddress}</div></div>}
                {selectedLog.userAgent && <div className="text-xs text-gray-500">Agent: <div className="text-sm text-gray-900">{selectedLog.userAgent}</div></div>}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 rounded-xl border">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Contract Detail Modal */}
      {selectedContractDetail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContractDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-gray-900 mb-1">Contract {selectedContractDetail.contract.contractNumber || selectedContractDetail.contract.id}</h2>
            <p className="text-sm text-gray-500 mb-3">Project: {selectedContractDetail.contract.project?.title}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-400 mb-1">Parties</p>
                <p className="text-sm text-gray-900">Client: {selectedContractDetail.contract.project?.client?.user?.name || 'Unknown'}</p>
                <p className="text-sm text-gray-900">Contractor: {selectedContractDetail.contract.contractor?.user?.name || 'Unknown'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs uppercase text-gray-400 mb-1">Financials</p>
                <p className="text-sm text-gray-900">Total: ₱{Number(selectedContractDetail.contract.totalAmount).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Downpayment: {selectedContractDetail.contract.downpaymentPercent}%</p>
                <p className="text-sm text-gray-500">Status: {selectedContractDetail.contract.status}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Payments / Milestones</p>
              <div className="space-y-2">
                {selectedContractDetail.contract.payments?.length ? selectedContractDetail.contract.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-white border border-gray-100 p-3 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.type}</p>
                      <p className="text-xs text-gray-500">Amount: ₱{Number(p.amount).toLocaleString()} · {p.status}</p>
                    </div>
                    <div className="text-xs text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'Due'}</div>
                  </div>
                )) : (
                  <div className="text-sm text-gray-500">No payments configured.</div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Files</p>
              <div className="flex flex-wrap gap-2">
                {selectedContractDetail.contract.contractFiles?.length ? selectedContractDetail.contract.contractFiles.map((f) => (
                  <a key={f.id} href={f.filePath} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">{f.fileName}</a>
                )) : <div className="text-sm text-gray-500">No files attached.</div>}
              </div>
            </div>

            {/* Project Post Details */}
            <div className="mb-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Project Post</p>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-sm font-semibold">Description</p>
                <p className="text-sm text-gray-600 mb-2">{selectedContractDetail.contract.project?.description || 'No description'}</p>
                <p className="text-sm font-semibold">Scope</p>
                <p className="text-sm text-gray-600 mb-2">{selectedContractDetail.contract.project?.scope || 'Not specified'}</p>
                <p className="text-sm font-semibold">Materials</p>
                <p className="text-sm text-gray-600 mb-2">{selectedContractDetail.contract.project?.materials || 'Not specified'}</p>
                <p className="text-sm text-gray-500">Budget: ₱{Number(selectedContractDetail.contract.project?.budget || 0).toLocaleString()}</p>
                <p className="text-sm text-gray-500">Deadline: {selectedContractDetail.contract.project?.deadline ? new Date(selectedContractDetail.contract.project.deadline).toLocaleDateString() : 'Not set'}</p>
              </div>
            </div>

            {/* Contractor's Bid */}
            <div className="mb-4">
              <p className="text-xs uppercase text-gray-400 mb-2">Contractor's Bid</p>
              {selectedContractDetail.bid ? (
                <div className="rounded-2xl bg-white border border-gray-100 p-4">
                  <p className="text-sm font-semibold">Amount: ₱{Number(selectedContractDetail.bid.amount).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Proposal: {selectedContractDetail.bid.proposal || 'No proposal'}</p>
                  <p className="text-sm text-gray-500 mt-2">Labor: ₱{Number(selectedContractDetail.bid.laborCost || 0).toLocaleString()} · Material: ₱{Number(selectedContractDetail.bid.materialCost || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Estimated days: {selectedContractDetail.bid.estimatedDays || '—'}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedContractDetail.bid.bidFiles?.length ? selectedContractDetail.bid.bidFiles.map((bf) => (
                      <a key={bf.id} href={bf.filePath} target="_blank" rel="noreferrer" className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">{bf.fileName}</a>
                    )) : <div className="text-sm text-gray-500">No bid files.</div>}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No bid found for this contractor on this project.</div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setSelectedContractDetail(null)} className="px-4 py-2 rounded-xl border">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
