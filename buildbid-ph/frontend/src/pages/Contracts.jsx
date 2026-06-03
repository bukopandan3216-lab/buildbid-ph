import { useState } from "react";
import { useContracts, useToast } from "../hooks";
import { contractsAPI, paymentsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FileText, CheckCircle, Clock, Download, Eye, Pen, AlertCircle,
  Shield, CreditCard, X, Upload, FileCheck, ArrowRight, Info
} from "lucide-react";

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-600", icon: FileText },
  PENDING_CLIENT_SIGN: { label: "Awaiting Client Signature", color: "bg-amber-100 text-amber-700", icon: Pen },
  PENDING_CONTRACTOR_SIGN: { label: "Awaiting Contractor Signature", color: "bg-blue-100 text-blue-700", icon: Pen },
  PENDING_ADMIN: { label: "Pending Admin Approval", color: "bg-purple-100 text-purple-700", icon: Shield },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle },
  COMPLETED: { label: "Completed", color: "bg-purple-100 text-purple-700", icon: CheckCircle },
  DISPUTED: { label: "Disputed", color: "bg-red-100 text-red-700", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

function fmt(n) {
  return `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function Contracts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [showSign, setShowSign] = useState(false);
  const [signatureInput, setSignatureInput] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentContract, setPaymentContract] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showChangeRequest, setShowChangeRequest] = useState(false);
  const [changeRequestField, setChangeRequestField] = useState("");
  const [changeRequestValue, setChangeRequestValue] = useState("");
  const [changeRequestReason, setChangeRequestReason] = useState("");
  const [changeRequestSubmitting, setChangeRequestSubmitting] = useState(false);
  const [showChangeApprovalModal, setShowChangeApprovalModal] = useState(false);
  const [changeApprovalReason, setChangeApprovalReason] = useState("");
  const { contracts, loading, setContracts, refetch } = useContracts();

  const isClient = user?.role === "CLIENT";
  const isContractor = user?.role === "CONTRACTOR";

  async function handleSign() {
    if (!selected) return;
    setSignatureError("");
    
    const trimmed = signatureInput.trim();
    
    // Validation
    if (!trimmed) {
      setSignatureError("Please enter your signature.");
      return;
    }
    if (trimmed.length < 3) {
      setSignatureError("Signature must be at least 3 characters (your full name).");
      return;
    }
    if (trimmed.length > 100) {
      setSignatureError("Signature is too long.");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await contractsAPI.sign(selected.id, trimmed);
      const updated = res.data.contract;
      setSelected(updated);
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      refetch();
      setShowSign(false);
      setSignatureInput("");
      setSignatureError("");
      toast("Contract signed successfully!", "success");
    } catch (err) {
      setSignatureError(err?.response?.data?.message || "Unable to sign contract. Please try again.");
      toast(err?.response?.data?.message || "Unable to sign contract.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitPaymentProof() {
    if (!proofFile) { 
      toast("Please attach a payment receipt/proof.", "error"); 
      return; 
    }
    if (!selectedPaymentMethod) {
      toast("Please select a payment method.", "error");
      return;
    }
    
    setSubmitting(true);
    try {
      // Get the pending downpayment for this contract
      const form = new FormData();
      form.append("proof", proofFile);
      form.append("notes", paymentNotes || "");
      form.append("paymentMethod", selectedPaymentMethod);
      
      // Find the payment ID from the contract's payments
      const paymentId = paymentContract?.payments?.[0]?.id;
      if (!paymentId) { 
        toast("No pending payment found for this contract.", "error"); 
        setSubmitting(false); 
        return; 
      }
      
      await paymentsAPI.uploadProof(paymentId, form);
      toast("Payment proof submitted to admin for verification!", "success");
      await refetch();
      
      // Reset states
      setShowPaymentModal(false);
      setProofFile(null);
      setPaymentNotes("");
      setSelectedPaymentMethod(null);
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to submit payment proof.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRequestChange() {
    if (!selected) return;
    if (!changeRequestField) {
      toast("Please select a field to change.", "error");
      return;
    }
    if (!changeRequestValue) {
      toast("Please enter the new value.", "error");
      return;
    }
    if (!changeRequestReason) {
      toast("Please provide a reason for the change.", "error");
      return;
    }

    setChangeRequestSubmitting(true);
    try {
      const res = await contractsAPI.requestChange(selected.id, {
        fieldName: changeRequestField,
        newValue: changeRequestValue,
        reason: changeRequestReason,
      });
      toast("Change request submitted! Waiting for client approval.", "success");
      setSelected(res.data.contract);
      setContracts((prev) => prev.map((c) => (c.id === res.data.contract.id ? res.data.contract : c)));
      setShowChangeRequest(false);
      setChangeRequestField("");
      setChangeRequestValue("");
      setChangeRequestReason("");
      await refetch();
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to submit change request.", "error");
    } finally {
      setChangeRequestSubmitting(false);
    }
  }

  async function handleApproveChange() {
    if (!selected) return;
    try {
      const res = await contractsAPI.approveChange(selected.id);
      toast("Change request approved!", "success");
      setSelected(res.data.contract);
      setContracts((prev) => prev.map((c) => (c.id === res.data.contract.id ? res.data.contract : c)));
      setShowChangeApprovalModal(false);
      setChangeApprovalReason("");
      await refetch();
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to approve change.", "error");
    }
  }

  async function handleRejectChange() {
    if (!selected) return;
    try {
      const res = await contractsAPI.rejectChange(selected.id, {
        reason: changeApprovalReason,
      });
      toast("Change request rejected.", "success");
      setSelected(res.data.contract);
      setContracts((prev) => prev.map((c) => (c.id === res.data.contract.id ? res.data.contract : c)));
      setShowChangeApprovalModal(false);
      setChangeApprovalReason("");
      await refetch();
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to reject change.", "error");
    }
  }

  // Determine the flow step for a contract
  function getContractStep(contract) {
    if (!contract.clientSignature && !contract.contractorSignature) return "unsigned";
    if (contract.clientSignature && !contract.contractorSignature) return "client_signed";
    if (!contract.clientSignature && contract.contractorSignature) return "contractor_signed";
    if (contract.clientSignature && contract.contractorSignature && !contract.adminApprovedAt) return "both_signed";
    if (contract.adminApprovedAt) return "approved";
    return "other";
  }

  const canSignContract = (contract) => {
    if (isClient && contract.status === "PENDING_CLIENT_SIGN" && !contract.clientSignature) return true;
    if (isContractor && contract.status === "PENDING_CONTRACTOR_SIGN" && !contract.contractorSignature) return true;
    return false;
  };

  const canRequestChange = (contract) => (
    isContractor &&
    contract.clientSignature &&
    contract.contractorSignature &&
    !contract.adminApprovedAt &&
    contract.status !== "ACTIVE" &&
    contract.changeRequestStatus !== "REQUESTED"
  );

  const canReviewChange = (contract) => isClient && contract.changeRequestStatus === "REQUESTED";

  async function handleMarkComplete(contract) {
    try {
      const res = await contractsAPI.markComplete(contract.id);
      toast("Completion submitted for client review.", "success");
      setContracts((prev) => prev.map((c) => (c.id === contract.id ? { ...c, notes: res.data.contract?.notes || "COMPLETION_REQUESTED" } : c)));
      await refetch();
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to submit completion.", "error");
    }
  }

  async function handleApproveCompletion(contract) {
    try {
      const res = await contractsAPI.approveCompletion(contract.id);
      toast("Project marked completed.", "success");
      setContracts((prev) => prev.map((c) => (c.id === contract.id ? { ...c, status: res.data.contract?.status || "COMPLETED" } : c)));
      await refetch();
    } catch (err) {
      toast(err?.response?.data?.message || "Failed to approve completion.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contracts</h1>
        <p className="text-gray-500 text-sm">Manage digital contracts and signatures</p>
      </div>

      {/* Process Flow Banner */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contract Process Flow</p>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { step: "1", label: "Bid Accepted", desc: "Client accepts contractor bid" },
            { step: "2", label: "Contractor Signs", desc: "Contractor reviews & signs" },
            { step: "3", label: "Client Signs", desc: "Client reviews & signs" },
            { step: "4", label: "50% Downpayment", desc: "Client pays 50% upfront" },
            { step: "5", label: "Admin Approval", desc: "Admin reviews & approves" },
            { step: "6", label: "Active", desc: "Work begins!" },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center text-xs">{item.step}</div>
                <p className="font-medium text-gray-700 mt-1 whitespace-nowrap">{item.label}</p>
                <p className="text-gray-400 text-center max-w-[80px] leading-tight">{item.desc}</p>
              </div>
              {i < arr.length - 1 && <ArrowRight size={14} className="text-gray-300 flex-shrink-0 mb-4" />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Contracts", value: contracts.length },
          { label: "Active", value: contracts.filter((c) => c.status === "ACTIVE").length },
          { label: "Pending Signature", value: contracts.filter((c) => c.status.includes("SIGN")).length },
          { label: "Completed", value: contracts.filter((c) => c.status === "COMPLETED").length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Contracts List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading contracts...</p>
        </div>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No contracts yet</p>
          <p className="text-gray-400 text-sm mt-1">Contracts appear here after a bid is accepted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => {
            console.log(contract);
            const StatusIcon = statusConfig[contract.status]?.icon || FileText;
            const step = getContractStep(contract);
            const downpaymentAmount = Number(contract.totalAmount) * 0.5 //(contract.downpaymentPercent || 50) / 100;
            const downpayment = contract.payments?.find(p => p.type === "DOWNPAYMENT");
            const needsDownpayment = isClient && step === "both_signed" && downpayment?.status === "PENDING";

            return (
              <div key={contract.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">{contract.contractNumber}</span>
                      <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[contract.status]?.color}`}>
                        <StatusIcon size={11} />
                        {statusConfig[contract.status]?.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{contract.project?.title || "Project"}</h3>
                    <p className="text-sm text-gray-500">
                      {contract.project?.client?.user?.name || "Client"} ↔ {contract.contractor?.user?.name || "Contractor"}
                    </p>
                  </div>
                  {contract.totalAmount > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-gray-900">{fmt(contract.totalAmount)}</p>
                      <p className="text-xs text-gray-400">Total Value</p>
                      <p className="text-xs text-orange-600 font-medium mt-0.5">
                        {fmt(downpaymentAmount)} downpayment
                      </p>
                    </div>
                  )}
                </div>

                {/* Signature Progress */}
                <div className="flex items-center gap-3 mb-4 flex-wrap text-xs">
                  <div className={`flex items-center gap-1.5 ${contract.clientSignature ? "text-green-600" : "text-gray-400"}`}>
                    <CheckCircle size={13} className={contract.clientSignature ? "fill-green-500 text-green-500" : ""} />
                    Client {contract.clientSignature ? "signed" : "pending"}
                  </div>
                  <div className="w-6 h-px bg-gray-200" />
                  <div className={`flex items-center gap-1.5 ${contract.contractorSignature ? "text-green-600" : "text-gray-400"}`}>
                    <CheckCircle size={13} className={contract.contractorSignature ? "fill-green-500 text-green-500" : ""} />
                    Contractor {contract.contractorSignature ? "signed" : "pending"}
                  </div>
                  <div className="w-6 h-px bg-gray-200" />
                  <div className={`flex items-center gap-1.5 ${downpayment?.status === "COMPLETED" ? "text-green-600" : downpayment?.status === "PROCESSING" ? "text-blue-600" : "text-gray-400"}`}>
                    <CreditCard size={13} />
                    Downpayment {downpayment?.status === "COMPLETED" ? "paid" : downpayment?.status === "PROCESSING" ? "verifying" : "pending"}
                  </div>
                  <div className="w-6 h-px bg-gray-200" />
                  <div className={`flex items-center gap-1.5 ${contract.adminApprovedAt ? "text-green-600" : "text-gray-400"}`}>
                    <Shield size={13} className={contract.adminApprovedAt ? "text-green-500" : ""} />
                    Admin {contract.adminApprovedAt ? "approved" : "pending"}
                  </div>
                </div>

                {/* Alert for actions needed */}
                {canSignContract(contract) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-sm text-amber-700">
                    <AlertCircle size={15}/> Your signature is required to proceed.
                  </div>
                )}
                {needsDownpayment && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3 flex items-start gap-2 text-sm text-orange-700">
                    <CreditCard size={15} className="mt-0.5 flex-shrink-0"/>
                    <div>
                      <p className="font-medium">50% Downpayment Required</p>
                      <p className="text-xs mt-0.5">Please pay {fmt(downpaymentAmount)} and upload your payment receipt to proceed.</p>
                    </div>
                  </div>
                )}
                {isClient && step === "both_signed" && downpayment?.status === "PENDING" && !needsDownpayment && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 flex items-start gap-2 text-sm text-green-700">
                    <CheckCircle size={15} className="mt-0.5 flex-shrink-0"/>
                    <div>
                      <p className="font-medium">Ready to Pay!</p>
                      <p className="text-xs mt-0.5">Both parties have signed. Click "Pay Downpayment" to proceed.</p>
                    </div>
                  </div>
                )}
                {step !== "both_signed" && !canSignContract(contract) && isClient && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 flex items-start gap-2 text-sm text-gray-700">
                    <Clock size={15} className="mt-0.5 flex-shrink-0"/>
                    <div>
                      <p className="font-medium">Waiting for Signatures</p>
                      <p className="text-xs mt-0.5">
                        {!contract.contractorSignature && "Contractor's signature pending. "}
                        {contract.contractorSignature && !contract.clientSignature && "Your signature required to unlock payment."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelected(contract)}
                    className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye size={14} /> View Contract
                  </button>
                  {canSignContract(contract) && (
                    <button
                      onClick={() => { setSelected(contract); setShowSign(true); }}
                      className="flex items-center gap-1.5 text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 transition-colors"
                    >
                      <Pen size={14} /> Sign Contract
                    </button>
                  )}
                  {needsDownpayment && (
                    <button
                      onClick={() => { setPaymentContract(contract); setShowPaymentModal(true); }}
                      className="flex items-center gap-1.5 text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CreditCard size={14} /> Pay Downpayment
                    </button>
                  )}
                  {canRequestChange(contract) && (
                    <button
                      onClick={() => { setSelected(contract); setShowChangeRequest(true); }}
                      className="flex items-center gap-1.5 text-sm text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <AlertCircle size={14} /> Request Changes
                    </button>
                  )}
                  {canReviewChange(contract) && (
                    <button
                      onClick={() => { setSelected(contract); setShowChangeApprovalModal(true); }}
                      className="flex items-center gap-1.5 text-sm text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Eye size={14} /> Review Change
                    </button>
                  )}
                  {isContractor && contract.status === "ACTIVE" && contract.notes !== "COMPLETION_REQUESTED" && (
                    <button
                      onClick={() => handleMarkComplete(contract)}
                      className="flex items-center gap-1.5 text-sm text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle size={14} /> Mark Complete
                    </button>
                  )}
                  {isClient && contract.status === "ACTIVE" && contract.notes === "COMPLETION_REQUESTED" && (
                    <button
                      onClick={() => handleApproveCompletion(contract)}
                      className="flex items-center gap-1.5 text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={14} /> Approve Completion
                    </button>
                  )}
                  {contract.status === "ACTIVE" && contract.pdfPath && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.open(contract.pdfPath, "_blank"); }}
                      className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contract View Modal */}
      {selected && !showSign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono">{selected.contractNumber}</p>
                <h2 className="font-bold text-gray-900">{selected.project?.title || selected.contractNumber}</h2>
              </div>
              <div className="flex gap-2 items-center">
                {selected.pdfPath && (
                  <button onClick={() => window.open(selected.pdfPath, "_blank")}
                    className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-50">
                    <Download size={14} /> PDF
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  ["Contract No.", selected.contractNumber],
                  ["Status", statusConfig[selected.status]?.label],
                  ["Total Amount", selected.totalAmount > 0 ? fmt(selected.totalAmount) : "TBD"],
                  [`Downpayment (${selected.downpaymentPercent || 50}%)`, selected.totalAmount > 0 ? fmt(Number(selected.totalAmount) * (selected.downpaymentPercent || 50) / 100) : "TBD"],
                  ["Start Date", selected.startDate ? new Date(selected.startDate).toLocaleDateString("en-PH") : "Upon signing"],
                  ["Target Completion", selected.targetCompletionDate ? new Date(selected.targetCompletionDate).toLocaleDateString("en-PH") : selected.endDate ? new Date(selected.endDate).toLocaleDateString("en-PH") : "TBD"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{k}</p>
                    <p className="text-sm font-semibold text-gray-800">{v}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">Contract Terms</h3>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{selected.terms || "Contract terms pending."}</pre>
              </div>
              {/* Signatures section */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="font-semibold text-gray-800 mb-3">Signatures</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">Client Signature</p>
                    {selected.clientSignature ? (
                      <p className="text-lg text-gray-700" style={{ fontFamily: "cursive" }}>{selected.clientSignature}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Not yet signed</p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200">
                    <p className="text-xs text-gray-400 mb-1">Contractor Signature</p>
                    {selected.contractorSignature ? (
                      <p className="text-lg text-gray-700" style={{ fontFamily: "cursive" }}>{selected.contractorSignature}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">Not yet signed</p>
                    )}
                  </div>
                </div>
              </div>
              {canSignContract(selected) && (
                <button onClick={() => setShowSign(true)}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 flex items-center justify-center gap-2 transition-colors">
                  <Pen size={16} /> Sign This Contract
                </button>
              )}
              {selected.changeRequestStatus === "REQUESTED" && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
                  <p className="text-sm font-semibold text-amber-900">Pending Change Request</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {selected.changeRequestField || "Field"} requested to become {selected.changeRequestValue || "new value"}.
                  </p>
                  {selected.changeRequestReason && (
                    <p className="text-xs text-amber-600 mt-2">{selected.changeRequestReason}</p>
                  )}
                  {canReviewChange(selected) && (
                    <button
                      onClick={() => setShowChangeApprovalModal(true)}
                      className="mt-3 w-full bg-blue-500 text-white py-2.5 rounded-xl font-medium hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Eye size={15} /> Review Change
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {showChangeRequest && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChangeRequest(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Request Contract Changes</h2>
                <p className="text-sm text-gray-500">{selected.contractNumber}</p>
              </div>
              <button onClick={() => setShowChangeRequest(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Field to Change</label>
                <select
                  value={changeRequestField}
                  onChange={(e) => setChangeRequestField(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                >
                  <option value="">Select field</option>
                  <option value="amount">Contract Amount</option>
                  <option value="targetCompletionDate">Target Completion Date</option>
                  <option value="terms">Contract Terms / Scope</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">New Value</label>
                <input
                  type={changeRequestField === "targetCompletionDate" ? "date" : changeRequestField === "amount" ? "number" : "text"}
                  value={changeRequestValue}
                  onChange={(e) => setChangeRequestValue(e.target.value)}
                  placeholder={changeRequestField === "amount" ? "e.g. 250000" : "Enter the requested value"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Reason</label>
                <textarea
                  rows={3}
                  value={changeRequestReason}
                  onChange={(e) => setChangeRequestReason(e.target.value)}
                  placeholder="Explain why this contract detail needs to change."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                Changes require client approval and remain locked after payment is verified.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowChangeRequest(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestChange}
                  disabled={changeRequestSubmitting}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {changeRequestSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Approval Modal */}
      {showChangeApprovalModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowChangeApprovalModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Review Change Request</h2>
                <p className="text-sm text-gray-500">{selected.contractNumber}</p>
              </div>
              <button onClick={() => setShowChangeApprovalModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Requested Field</p>
                <p className="text-sm font-semibold text-gray-900">{selected.changeRequestField || "Not specified"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">New Value</p>
                <p className="text-sm font-semibold text-gray-900">{selected.changeRequestValue || "Not specified"}</p>
              </div>
              {selected.changeRequestReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs text-amber-500 mb-1">Contractor Reason</p>
                  <p className="text-sm text-amber-800">{selected.changeRequestReason}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Rejection Reason</label>
                <textarea
                  rows={2}
                  value={changeApprovalReason}
                  onChange={(e) => setChangeApprovalReason(e.target.value)}
                  placeholder="Optional, only used when rejecting."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleRejectChange}
                  className="flex-1 border border-red-200 text-red-600 rounded-xl py-3 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApproveChange}
                  className="flex-1 bg-green-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSign && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Sign Contract</h2>
              <button onClick={() => { setShowSign(false); setSignatureInput(""); setSignatureError(""); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>
            
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                By signing, you legally agree to all terms in contract <strong className="text-gray-900">{selected.contractNumber}</strong>.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700 flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0"/>
                <span>This is a legally binding digital signature. Please review the contract carefully before signing.</span>
              </div>

              {/* Signature Input */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 block mb-2">Your Full Legal Name</label>
                <input
                  value={signatureInput}
                  onChange={(e) => { setSignatureInput(e.target.value); if (signatureError) setSignatureError(""); }}
                  placeholder="e.g. Juan Dela Cruz"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-lg focus:outline-none transition-all ${
                    signatureError 
                      ? "border-red-300 bg-red-50 focus:ring-0" 
                      : "border-gray-200 focus:ring-2 focus:ring-orange-200"
                  }`}
                  style={{ fontFamily: "cursive" }}
                />
                {signatureError && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12}/> {signatureError}
                  </p>
                )}
              </div>

              {/* Signature Preview */}
              {signatureInput && !signatureError && (
                <div className="border-2 border-gray-200 rounded-xl p-5 mb-5 bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-2">Signature Preview</p>
                  <p className="text-4xl text-gray-800 mb-3" style={{ fontFamily: "cursive" }}>
                    {signatureInput}
                  </p>
                  <div className="border-t border-gray-300 pt-3">
                    <p className="text-xs text-gray-500">
                      Signed: {new Date().toLocaleDateString("en-PH", { 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric" 
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-xs text-blue-700 flex items-start gap-2">
                <Info size={13} className="mt-0.5 flex-shrink-0"/>
                <span>Minimum 3 characters required. Use your full legal name as it appears on your ID.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => { 
                    setShowSign(false); 
                    setSignatureInput(""); 
                    setSignatureError(""); 
                  }}
                  className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSign} 
                  disabled={signatureInput.trim().length < 3 || submitting}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                      Signing...
                    </>
                  ) : (
                    <>
                      <Shield size={14}/> Confirm Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downpayment Upload Modal */}
      {showPaymentModal && paymentContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Submit 50% Downpayment</h2>
                <p className="text-sm text-gray-500">{paymentContract.project?.title || "Project"}</p>
              </div>
              <button onClick={() => { setShowPaymentModal(false); setProofFile(null); setPaymentNotes(""); setSelectedPaymentMethod(null); }} className="text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Amount Box */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-lg font-bold text-orange-900">
                  {fmt(Number(paymentContract.totalAmount) * (paymentContract.downpaymentPercent || 50) / 100)}
                </p>
                <p className="text-xs text-orange-600 mt-0.5">{paymentContract.downpaymentPercent || 50}% of total contract value {fmt(paymentContract.totalAmount)}</p>
              </div>

              {/* Payment Method Selection */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <CreditCard size={16} className="text-orange-600"/>
                  Select Payment Method
                </h3>
                
                <div className="space-y-2">
                  {/* Bank Transfer */}
                  <button
                    onClick={() => setSelectedPaymentMethod("BANK_TRANSFER")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPaymentMethod === "BANK_TRANSFER"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">Bank Transfer</p>
                        <p className="text-xs text-gray-500 mt-0.5">Direct bank-to-bank transfer</p>
                      </div>
                      {selectedPaymentMethod === "BANK_TRANSFER" && <CheckCircle size={18} className="text-orange-600" />}
                    </div>
                    {selectedPaymentMethod === "BANK_TRANSFER" && (
                      <div className="bg-white rounded-lg p-3 mt-2 text-xs space-y-1.5 text-gray-600 border border-orange-100">
                        <p><strong>Account Name:</strong> BuildBid Philippines</p>
                        <p><strong>Bank:</strong> BDO Unibank</p>
                        <p><strong>Account #:</strong> 123-456-789-0</p>
                        <p><strong>Swift Code:</strong> BDOPHPH</p>
                        <p className="text-gray-500 pt-1">After transfer, upload your bank confirmation/receipt below.</p>
                      </div>
                    )}
                  </button>

                  {/* GCash */}
                  <button
                    onClick={() => setSelectedPaymentMethod("GCASH")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPaymentMethod === "GCASH"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">GCash</p>
                        <p className="text-xs text-gray-500 mt-0.5">Mobile payment via GCash</p>
                      </div>
                      {selectedPaymentMethod === "GCASH" && <CheckCircle size={18} className="text-orange-600" />}
                    </div>
                    {selectedPaymentMethod === "GCASH" && (
                      <div className="bg-white rounded-lg p-3 mt-2 text-xs space-y-1.5 text-gray-600 border border-orange-100">
                        <p><strong>GCash #:</strong> +63 917 123 4567</p>
                        <p><strong>Name:</strong> BuildBid PH Receivable</p>
                        <p className="text-gray-500 pt-1">Send the amount via GCash and take a screenshot of the transaction confirmation.</p>
                      </div>
                    )}
                  </button>

                  {/* PayMaya */}
                  <button
                    onClick={() => setSelectedPaymentMethod("PAYMAYA")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedPaymentMethod === "PAYMAYA"
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">PayMaya</p>
                        <p className="text-xs text-gray-500 mt-0.5">Pay with PayMaya account</p>
                      </div>
                      {selectedPaymentMethod === "PAYMAYA" && <CheckCircle size={18} className="text-orange-600" />}
                    </div>
                    {selectedPaymentMethod === "PAYMAYA" && (
                      <div className="bg-white rounded-lg p-3 mt-2 text-xs space-y-1.5 text-gray-600 border border-orange-100">
                        <p><strong>PayMaya Account:</strong> buildbid-ph@paymaya.com</p>
                        <p><strong>Phone:</strong> +63 912 345 6789</p>
                        <p className="text-gray-500 pt-1">Send payment and include your reference number or transaction ID in the notes below.</p>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Payment Proof */}
              {selectedPaymentMethod && (
                <div className="pt-2">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Upload size={16} className="text-orange-600"/>
                    Upload Payment Receipt
                  </h3>
                  
                  <div
                    onClick={() => document.getElementById("dp-proof-input")?.click()}
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
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer bg-gray-50 hover:bg-orange-50"
                  >
                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-700">
                      {proofFile ? "Click to change or drag new file" : "Drag & drop your receipt or click to select"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, or WebP (max 10MB)</p>
                    <input 
                      id="dp-proof-input" 
                      type="file" 
                      className="hidden" 
                      accept=".png,.jpg,.jpeg,.webp" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                            toast("Only JPG, PNG, and WebP receipt images are allowed.", "error");
                            return;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            toast("File is too large. Maximum 10MB.", "error");
                            return;
                          }
                          setProofFile(file);
                        }
                      }} 
                    />
                  </div>
                  
                  {proofFile && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <FileCheck size={16} className="text-green-600" />
                        <span className="font-medium">{proofFile.name}</span>
                        <button 
                          onClick={() => setProofFile(null)}
                          className="ml-auto text-green-600 hover:text-green-800"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Reference */}
              {selectedPaymentMethod && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Transaction Reference / Notes</label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder={
                      selectedPaymentMethod === "GCASH" 
                        ? "e.g. GCash Reference #: GC1234567890"
                        : selectedPaymentMethod === "PAYMAYA"
                        ? "e.g. PayMaya Ref: PM-XXXX or Transaction ID"
                        : "e.g. BDO Ref: REF-12345 or Confirmation Code"
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include any reference numbers from your payment for tracking.</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
                <Info size={14} className="mt-0.5 flex-shrink-0"/>
                <div>
                  <p className="font-medium">Admin Verification Required</p>
                  <p className="mt-1">After submission, admin will verify your payment and approve the contract within 24 hours. Both you and your contractor will be notified.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white border-t border-gray-100">
                <button 
                  onClick={() => { 
                    setShowPaymentModal(false); 
                    setProofFile(null); 
                    setPaymentNotes(""); 
                    setSelectedPaymentMethod(null); 
                  }}
                  className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitPaymentProof} 
                  disabled={submitting || !proofFile || !selectedPaymentMethod}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileCheck size={14}/> 
                      Submit Payment Proof
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
