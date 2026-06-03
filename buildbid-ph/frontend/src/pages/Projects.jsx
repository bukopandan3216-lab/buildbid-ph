
import BidModal from "../components/BidModal";
import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../hooks";
import { projectsAPI } from "../services/api";
import { Plus, Search, Filter, MapPin, Calendar, DollarSign, Eye, Edit, Trash2, ChevronDown, Image as ImageIcon, X, Upload } from "lucide-react";

const statusConfig = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-700" },
  BIDDING: { label: "Bidding", color: "bg-amber-100 text-amber-700" },
  AWARDED: { label: "Awarded", color: "bg-purple-100 text-purple-700" },
  IN_PROGRESS: { label: "In Progress", color: "bg-green-100 text-green-700" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-600" },
  CLOSED: { label: "Closed", color: "bg-red-100 text-red-700" },
};

const categoryColors = {
  Commercial: "bg-blue-50 text-blue-600",
  Residential: "bg-green-50 text-green-600",
  Industrial: "bg-orange-50 text-orange-600",
  Government: "bg-purple-50 text-purple-600",
  Hospitality: "bg-pink-50 text-pink-600",
};

export default function ProjectsNew() {
  const { user } = useAuth();
  const role = user?.role?.toUpperCase();
  const isClient = role === "CLIENT";
  const isContractor = role === "CONTRACTOR";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [clientProjectTab, setClientProjectTab] = useState("open"); // For clients: open or closed
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [bidProject, setBidProject] = useState(null);
  const [projectPhotos, setProjectPhotos] = useState([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState([]);
  const fileInputRef = useRef(null);
  
  const [newProject, setNewProject] = useState({
    title: "", description: "", budget: "", deadline: "", location: "", city: "", province: "", category: "Residential", scope: ""
  });
  
  const { projects, total, loading, refetch } = useProjects({ 
    status: filterStatus === "all" ? undefined : filterStatus.toUpperCase(), 
    search 
  });

  // Filter projects for clients based on tab
  const filteredProjects = (projects || []).filter((p) => {
    const clientName = p.client?.user?.name || p.client?.name || "";
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase());

    if (isClient && clientProjectTab === "open") {
      // Show only OPEN and BIDDING projects
      return matchSearch && (p.status === "OPEN" || p.status === "BIDDING");
    } else if (isClient && clientProjectTab === "closed") {
      // Show only AWARDED, IN_PROGRESS, COMPLETED, CLOSED
      return matchSearch && (p.status === "AWARDED" || p.status === "IN_PROGRESS" || p.status === "COMPLETED" || p.status === "CLOSED");
    }

    // For contractors
    const matchStatus = filterStatus === "all" || p.status === filterStatus.toUpperCase();
    return matchSearch && matchStatus;
  });

  function handlePhotoSelect(e) {
    const files = Array.from(e.target.files || []);
    setProjectPhotos(prev => [...prev, ...files]);
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviewUrls(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removePhoto(index) {
    setProjectPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", newProject.title);
      formData.append("description", newProject.description);
      formData.append("budget", Number(newProject.budget));
      formData.append("deadline", newProject.deadline);
      formData.append("location", newProject.location);
      formData.append("city", newProject.city);
      formData.append("province", newProject.province);
      formData.append("category", newProject.category);
      formData.append("scope", newProject.scope);
      
      // Add photos
      projectPhotos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      await projectsAPI.create(formData);
      setShowModal(false);
      setNewProject({ title: "", description: "", budget: "", deadline: "", location: "", city: "", province: "", category: "Residential", scope: "" });
      setProjectPhotos([]);
      setPhotoPreviewUrls([]);
      refetch();
    } catch (err) {
      console.error("Failed to create project", err);
      alert(err?.response?.data?.message || "Failed to create project.");
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">{filteredProjects.length} total projects</p>
          </div>
          {isClient ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-orange-600 shadow-md transition-all whitespace-nowrap"
            >
              <Plus size={18} /> Post Project
            </button>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">
              ✨ Browse and submit bids on open projects
            </div>
          )}
        </div>

        {/* Client Project Tabs */}
        {isClient && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setClientProjectTab("open")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                clientProjectTab === "open"
                  ? "bg-blue-100 text-blue-700 border-2 border-blue-300"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Open Projects
            </button>
            <button
              onClick={() => setClientProjectTab("closed")}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                clientProjectTab === "closed"
                  ? "bg-green-100 text-green-700 border-2 border-green-300"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Closed Projects
            </button>
          </div>
        )}

        {/* Filters */}
        {!isClient && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "open", "bidding", "in_progress", "awarded"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                    filterStatus === s
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "all" ? "All" : statusConfig[s]?.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((proj) => (
            <div 
              key={proj.id} 
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setSelectedProject(proj)}
            >
              {/* Photo or Placeholder */}
              <div className="w-full h-48 bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden relative">
                {proj.projectFiles && proj.projectFiles.length > 0 ? (
                  <img 
                    src={`/${proj.projectFiles[0].filePath}`} 
                    alt={proj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <ImageIcon size={48} className="mx-auto mb-2" />
                    <p className="text-sm">No photos</p>
                  </div>
                )}
                {proj.projectFiles && proj.projectFiles.length > 1 && (
                  <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    {proj.projectFiles.length} photos
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Category + Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${categoryColors[proj.category] || "bg-gray-100 text-gray-600"}`}>
                    {proj.category}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[proj.status]?.color}`}>
                    {statusConfig[proj.status]?.label}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{proj.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{proj.description}</p>

                <div className="space-y-1.5 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-gray-400" />
                    {proj.location}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" />
                    {new Date(proj.deadline).toLocaleDateString("en-PH")}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={13} className="text-gray-400" />
                    ₱{Number(proj.budget).toLocaleString()}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400">by {proj.client?.user?.name || "Client"}</span>
                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                    {proj._count?.bids ?? 0} bid{(proj._count?.bids ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📋</div>
            <p className="font-medium text-gray-500">No projects found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Create Project Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Post New Project</h2>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Project Title *</label>
                    <input
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="e.g. 3-bedroom House Construction"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Category *</label>
                    <select
                      value={newProject.category}
                      onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    >
                      {Object.keys(categoryColors).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Description *</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    required
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                    placeholder="Describe the work needed..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Budget (₱) *</label>
                    <input
                      type="number"
                      value={newProject.budget}
                      onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="500000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Deadline *</label>
                    <input
                      type="date"
                      value={newProject.deadline}
                      onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Location *</label>
                    <input
                      value={newProject.location}
                      onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                      required
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Project site address"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">City</label>
                    <input
                      value={newProject.city}
                      onChange={(e) => setNewProject({ ...newProject, city: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="City"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Province</label>
                    <input
                      value={newProject.province}
                      onChange={(e) => setNewProject({ ...newProject, province: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                      placeholder="Province"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Scope of Work</label>
                    <textarea
                      value={newProject.scope}
                      onChange={(e) => setNewProject({ ...newProject, scope: e.target.value })}
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                      placeholder="Describe the work scope and requirements..."
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Project Photos (Room, Area, or Space to Renovate) *
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center cursor-pointer hover:bg-orange-50 transition-colors"
                  >
                    <Upload size={32} className="mx-auto text-orange-400 mb-2" />
                    <p className="font-medium text-gray-700">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500 mt-1">PNG, JPG, WebP up to 10MB each</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Photo Previews */}
                {photoPreviewUrls.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Photos ({photoPreviewUrls.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {photoPreviewUrls.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden bg-gray-100">
                          <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={20} className="text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
                  >
                    Post Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Project Detail Modal */}
        {selectedProject && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[selectedProject.status]?.color}`}>
                    {statusConfig[selectedProject.status]?.label}
                  </span>
                </div>
                <button onClick={() => setSelectedProject(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedProject.title}</h2>
              <p className="text-gray-600 text-sm mb-6">{selectedProject.description}</p>

              {/* Photos */}
              {selectedProject.projectFiles && selectedProject.projectFiles.length > 0 && (
                <div className="mb-6">
                  <p className="font-medium text-gray-900 mb-3">Project Photos</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProject.projectFiles.map((file, idx) => (
                      <img
                        key={idx}
                        src={`/${file.filePath}`}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Budget</p>
                  <p className="font-bold text-lg text-orange-600">₱{Number(selectedProject.budget).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Deadline</p>
                  <p className="font-semibold text-gray-900">{new Date(selectedProject.deadline).toLocaleDateString("en-PH")}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="font-semibold text-gray-900">{selectedProject.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bids Received</p>
                  <p className="font-semibold text-gray-900">{selectedProject._count?.bids ?? 0}</p>
                </div>
              </div>

              {selectedProject.scope && (
                <div className="mb-6">
                  <p className="font-medium text-gray-900 mb-2">Scope of Work</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedProject.scope}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedProject(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
                >
                  Close
                </button>
                {isContractor && selectedProject.status !== "CLOSED" && selectedProject.status !== "COMPLETED" && (
                 <button
  onClick={() => {
    setBidProject(selectedProject);
    setSelectedProject(null);
  }}
  className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
>
  Submit Bid
</button>
                )}
              </div>
            </div>
          </div>
        )}
        {bidProject && (
  <BidModal
    project={bidProject}
    onClose={() => setBidProject(null)}
    onSuccess={() => {
      setBidProject(null);
      fetchProjects();
    }}
  />
)}
      </div>
    </div>
  );
}
