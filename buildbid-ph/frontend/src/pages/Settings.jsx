import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useUserProfile, useToast } from "../hooks";
import { uploadsAPI } from "../services/api";
import {
  User, Mail, Phone, MapPin, Building, Shield, Upload,
  CheckCircle, Clock, XCircle, Camera, Save, Bell, Lock, Eye, EyeOff
} from "lucide-react";

const documentTypes = [
  { key: "NBI_CLEARANCE", label: "NBI Clearance", required: true },
  { key: "PCAB_LICENSE", label: "PCAB License", required: true },
  { key: "DTI_REGISTRATION", label: "DTI/SEC Registration", required: true },
  { key: "VALID_ID", label: "Valid Government ID", required: true },
  { key: "BIR_REGISTRATION", label: "BIR Registration", required: false },
  { key: "BARANGAY_CLEARANCE", label: "Barangay Clearance", required: false },
  { key: "CERTIFICATION", label: "Certifications/Licenses", required: false },
];

export default function Settings() {
  const { user } = useAuth();
  const { profile, loading, updateProfile, refetch } = useUserProfile();
  const { toast } = useToast();
  const isContractor = user?.role === "CONTRACTOR" || user?.role === "contractor";

  const [activeTab, setActiveTab] = useState("profile");
  const [profileForm, setProfileForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [notifications, setNotifications] = useState({
    newBid: true, bidAccepted: true, messages: true,
    payments: true, contracts: true, system: false,
  });

  // Update profileForm when profile loads
  useEffect(() => {
    if (profile) {
      const contractor = profile.contractor;
      const client = profile.client;
      setProfileForm({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        city: contractor?.city || client?.city || "",
        address: client?.address || "",
        companyName: contractor?.companyName || "",
        licenseNumber: contractor?.licenseNumber || "",
        yearsExperience: contractor?.yearsExperience || "",
        bio: contractor?.bio || "",
        specializations: contractor?.specializations || "",
      });
      setUploadedDocs(contractor?.documents || []);
    }
  }, [profile]);

  async function handleSave() {
    try {
      await updateProfile(profileForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to save profile.");
    }
  }

  async function handleDocUpload(type) {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("documentType", type);
      try {
        const res = await uploadsAPI.document(formData);
        setUploadedDocs((prev) => [...prev, res.data.document]);
      } catch (err) {
        alert(err?.response?.data?.message || "Upload failed.");
      }
    };
    input.click();
  }

  async function handleAvatarUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".png,.jpg,.jpeg";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("file", file);
      try {
        await uploadsAPI.avatar(formData);
        toast("Avatar uploaded.", "success");
        await refetch();
      } catch (err) {
        toast(err?.response?.data?.message || "Upload failed.", "error");
      }
    };
    input.click();
  }

  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "security", label: "Security" },
    { id: "notifications", label: "Notifications" },
    ...(isContractor ? [{ id: "verification", label: "Verification" }] : []),
  ];

  const getDocStatus = (type) => {
    const doc = uploadedDocs.find((d) => d.type === type);
    if (!doc) return null;
    return doc;
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Manage your account and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Profile Photo</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl font-bold">
                  {(profileForm?.name || profile?.name || "U").charAt(0)}
                </div>
                <button
                  onClick={() => handleAvatarUpload()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-orange-600">
                  <Camera size={13} />
                </button>
              </div>
              <div>
                <p className="font-medium text-gray-800">{profileForm?.name || profile?.name || ""}</p>
                <p className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase() || "user"}</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Full Name", icon: User },
                { key: "email", label: "Email Address", icon: Mail, type: "email" },
                { key: "phone", label: "Phone Number", icon: Phone },
                { key: "city", label: "City", icon: MapPin },
                { key: "address", label: "Address", icon: MapPin },
              ].map(({ key, label, icon: Icon, type = "text" }) => (
                <div key={key} className={key === "address" ? "md:col-span-2" : ""}>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
                  <div className="relative">
                    <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={type}
                      value={profileForm?.[key] || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contractor-specific */}
          {isContractor && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4">Contractor Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "companyName", label: "Company Name", icon: Building },
                  { key: "licenseNumber", label: "License Number", icon: Shield },
                  { key: "yearsExperience", label: "Years of Experience", icon: User, type: "number" },
                  { key: "specializations", label: "Specializations", icon: Building },
                ].map(({ key, label, icon: Icon, type = "text" }) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
                    <div className="relative">
                      <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={type}
                        value={profileForm?.[key] || ""}
                        onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      />
                    </div>
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Bio</label>
                  <textarea
                    value={profileForm?.bio || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-600 transition-colors shadow-sm"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900 mb-2">Change Password</h2>
          {[
            { key: "current", label: "Current Password" },
            { key: "newPw", label: "New Password" },
            { key: "confirm", label: "Confirm New Password" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">{label}</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPw[key] ? "text" : "password"}
                  value={pwForm[key]}
                  onChange={(e) => setPwForm({ ...pwForm, [key]: e.target.value })}
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPw[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}
          <button className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-600 text-sm">
            Update Password
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            {[
              { key: "newBid", label: "New Bids Received", desc: "When contractors submit bids on your projects" },
              { key: "bidAccepted", label: "Bid Accepted/Rejected", desc: "When a client accepts or rejects your bid" },
              { key: "messages", label: "New Messages", desc: "When you receive a new direct message" },
              { key: "payments", label: "Payment Updates", desc: "Payment received, due, or overdue notifications" },
              { key: "contracts", label: "Contract Updates", desc: "Contract signed, approved, or requires your signature" },
              { key: "system", label: "System Announcements", desc: "Platform updates and maintenance notices" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <button
                  onClick={() => setNotifications({ ...notifications, [key]: !notifications[key] })}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    notifications[key] ? "bg-orange-500" : "bg-gray-200"
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    notifications[key] ? "left-5" : "left-0.5"
                  }`} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={handleSave} className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-orange-600 text-sm">
            {saved ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      )}

      {/* Verification Tab (contractors only) */}
      {activeTab === "verification" && isContractor && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <Shield size={16} className="text-amber-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Verification Status</h2>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending Review</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2 ml-11">
              Upload all required documents to get verified. Verified contractors can submit bids on projects.
            </p>
          </div>

          {documentTypes.map((docType) => {
            const uploaded = getDocStatus(docType.key);
            return (
              <div key={docType.key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    uploaded
                      ? uploaded.status === "approved" ? "bg-green-100" : "bg-amber-100"
                      : "bg-gray-100"
                  }`}>
                    {uploaded ? (
                      uploaded.status === "approved"
                        ? <CheckCircle size={16} className="text-green-600" />
                        : <Clock size={16} className="text-amber-600" />
                    ) : (
                      <Upload size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {docType.label}
                      {docType.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                    {uploaded ? (
                      <p className="text-xs text-gray-400">{uploaded.fileName} · {uploaded.uploadedAt}</p>
                    ) : (
                      <p className="text-xs text-gray-400">Not uploaded</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDocUpload(docType.key)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                    uploaded
                      ? "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      : "bg-orange-50 text-orange-600 hover:bg-orange-100"
                  }`}
                >
                  {uploaded ? "Replace" : "Upload"}
                </button>
              </div>
            );
          })}

          <p className="text-xs text-gray-400 ml-1">* Required documents. All uploads must be valid and government-issued.</p>
        </div>
      )}
    </div>
  );
}
