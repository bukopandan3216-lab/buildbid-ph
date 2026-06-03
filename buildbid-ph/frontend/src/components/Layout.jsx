import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import {
  LayoutDashboard, FolderOpen, Gavel, FileText, CreditCard,
  MessageSquare, Bell, Settings, LogOut, Menu, X, Search,
  HardHat, ChevronDown, Shield, BarChart2
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderOpen, label: "Projects" },
  { to: "/bids", icon: Gavel, label: "Bids", roles: ["CLIENT", "CONTRACTOR"] },
  { to: "/contracts", icon: FileText, label: "Contracts" },
  { to: "/payments", icon: CreditCard, label: "Payments", roles: ["ADMIN", "CLIENT", "CONTRACTOR"] },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/analytics", icon: BarChart2, label: "Analytics", roles: ["ADMIN"] },
  { to: "/notifications", icon: Bell, label: "Notifications" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-white border-r border-gray-100 flex flex-col transition-all duration-300 shadow-sm z-30 flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <HardHat size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-gray-900 text-sm leading-tight">BuildBid PH</p>
              <p className="text-xs text-gray-400">Construction Bidding</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {navItems
            .filter(({ roles }) => !roles || roles.includes(user?.role?.toUpperCase()))
            .map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`
                }
              >
                <Icon size={18} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{label}</span>}
                {label === "Notifications" && unreadCount > 0 && sidebarOpen && (
                  <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
          {user?.role?.toUpperCase() === "ADMIN" && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-purple-50 text-purple-600" : "text-gray-500 hover:bg-gray-50"
                }`
              }
            >
              <Shield size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>Admin Panel</span>}
            </NavLink>
          )}
        </nav>

        {/* Bottom nav */}
        <div className="p-2 border-t border-gray-100 space-y-0.5">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-50"
              }`
            }
          >
            <Settings size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Settings</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Nav */}
        <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 z-20 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1 max-w-md relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects, bids, contractors..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <NavLink to="/notifications" className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-xl">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </NavLink>
            <NavLink to="/messages" className="p-2 text-gray-500 hover:bg-gray-50 rounded-xl">
              <MessageSquare size={18} />
            </NavLink>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name || "User"}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase() || "user"}</p>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-400">{user?.email}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <Settings size={14} /> Settings
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={14} /> Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
