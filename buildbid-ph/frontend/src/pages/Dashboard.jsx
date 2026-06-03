import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  TrendingUp, Clock, CheckCircle, AlertCircle, Calendar, Users,
  DollarSign, HardHat, FileText, ArrowUp, ArrowDown, Plus,
  MessageSquare, Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usersAPI } from "../services/api";

// Mock data
const weeklyData = [
  { day: "Mon", hours: 6, completed: 2 },
  { day: "Tue", hours: 8, completed: 3 },
  { day: "Wed", hours: 7, completed: 2 },
  { day: "Thu", hours: 9, completed: 4 },
  { day: "Fri", hours: 5, completed: 1 },
  { day: "Sat", hours: 4, completed: 2 },
  { day: "Sun", hours: 2, completed: 1 },
];

const projectProgressData = [
  { month: "Jan", completed: 4, active: 7, new: 5 },
  { month: "Feb", completed: 6, active: 8, new: 4 },
  { month: "Mar", completed: 5, active: 9, new: 6 },
  { month: "Apr", completed: 8, active: 6, new: 3 },
  { month: "May", completed: 7, active: 11, new: 8 },
  { month: "Jun", completed: 10, active: 9, new: 5 },
];

const invoiceData = [
  { name: "Paid", value: 68, color: "#22c55e" },
  { name: "Pending", value: 22, color: "#f59e0b" },
  { name: "Overdue", value: 10, color: "#ef4444" },
];

const currentProjects = [
  { id: 1, name: "SM Mall Renovation", client: "SM Group", progress: 78, status: "active", deadline: "Jul 15", budget: "₱2.4M" },
  { id: 2, name: "BF Homes Residential", client: "Reyes Family", progress: 45, status: "active", deadline: "Aug 22", budget: "₱850K" },
  { id: 3, name: "Makati Office Fit-out", client: "TechCorp Inc.", progress: 92, status: "finishing", deadline: "Jun 30", budget: "₱1.2M" },
  { id: 4, name: "Cebu Warehouse Build", client: "LogiPH", progress: 20, status: "starting", deadline: "Oct 10", budget: "₱3.1M" },
];

const appointments = [
  { id: 1, title: "Site inspection – BF Homes", time: "9:00 AM", date: "Today", type: "inspection" },
  { id: 2, title: "Contract signing – SM Group", time: "2:30 PM", date: "Today", type: "contract" },
  { id: 3, title: "Bid review – LogiPH project", time: "10:00 AM", date: "Tomorrow", type: "meeting" },
  { id: 4, title: "Payment follow-up – Reyes", time: "4:00 PM", date: "Jun 28", type: "payment" },
];

const todos = [
  { id: 1, task: "Review 3 new bids for Makati project", done: false, priority: "high" },
  { id: 2, task: "Upload NBI clearance renewal", done: true, priority: "medium" },
  { id: 3, task: "Send invoice #INV-2024-089", done: false, priority: "high" },
  { id: 4, task: "Schedule contractor walkthrough", done: false, priority: "medium" },
  { id: 5, task: "Approve contract draft for SM Group", done: true, priority: "low" },
];

const teamChat = [
  { id: 1, user: "Marvin Cruz", role: "Foreman", avatar: "MC", message: "Foundation work completed on Block C. Ready for inspection.", time: "10:32 AM" },
  { id: 2, user: "Ana Santos", role: "Engineer", avatar: "AS", message: "I've uploaded the revised structural drawings.", time: "11:15 AM" },
  { id: 3, user: "Rico Dela Torre", role: "Architect", avatar: "RT", message: "Client approved the revised floor plan. We can proceed.", time: "12:00 PM" },
];

const statsCards = [
  { label: "Active Projects", key: "activeProjects", value: "—", change: "+3", up: true, icon: FolderOpen, color: "blue", route: "/projects" },
  { label: "Pending Bids", key: "pendingBids", value: "—", change: "+8", up: true, icon: Gavel, color: "orange", route: "/bids" },
  { label: "Total Revenue", key: "totalRevenue", value: "—", change: "+12%", up: true, icon: DollarSign, color: "green", route: "/payments" },
  { label: "Verified Contractors", key: "verifiedContractors", value: "—", change: "-2", up: false, icon: HardHat, color: "purple", route: "/projects" },
];

const dashboardStatMeta = {
  totalProjects: { label: "Active Projects", route: "/projects", icon: FolderOpen, color: "blue", change: "+3", up: true },
  activeBids: { label: "Pending Bids", route: "/bids", icon: Gavel, color: "orange", change: "+8", up: true },
  activeContracts: { label: "Active Contracts", route: "/contracts", icon: FileText, color: "green", change: "+5", up: true },
  totalSpent: { label: "Total Spent", route: "/payments", icon: DollarSign, color: "purple", change: "+12%", up: true, currency: true },
  bidsSubmitted: { label: "Bids Submitted", route: "/bids", icon: Gavel, color: "orange", change: "+8", up: true },
  bidsAccepted: { label: "Accepted Bids", route: "/bids", icon: CheckCircle, color: "green", change: "+6", up: true },
  totalEarned: { label: "Total Earned", route: "/payments", icon: DollarSign, color: "green", change: "+9%", up: true, currency: true },
  users: { label: "Users", route: "/settings", icon: Users, color: "purple", change: "+2", up: true },
  projects: { label: "Projects", route: "/projects", icon: FolderOpen, color: "blue", change: "+4", up: true },
  bids: { label: "Total Bids", route: "/bids", icon: Gavel, color: "orange", change: "+4", up: true },
  revenue: { label: "Total Revenue", route: "/payments", icon: DollarSign, color: "green", change: "+12%", up: true, currency: true },
};

// Local imports (icons not from recharts)
import { FolderOpen, Gavel } from "lucide-react";

const colorMap = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "bg-orange-100" },
  green: { bg: "bg-green-50", text: "text-green-600", icon: "bg-green-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100" },
};

const statusColors = {
  active: "bg-blue-100 text-blue-700",
  finishing: "bg-green-100 text-green-700",
  starting: "bg-gray-100 text-gray-600",
};

const apptColors = {
  inspection: "bg-blue-500",
  contract: "bg-orange-500",
  meeting: "bg-purple-500",
  payment: "bg-green-500",
};

export default function Dashboard() {
  const [todoList, setTodoList] = useState(todos);
  const [chatMsg, setChatMsg] = useState("");
  const [messages, setMessages] = useState(teamChat);
  const [stats, setStats] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await usersAPI.dashboardStats();
        if (!mounted) return;
        setStats(res.data.stats || {});
      } catch (e) {
        console.warn('Failed to load dashboard stats', e);
      }
    })();
    return () => { mounted = false };
  }, []);

  function toggleTodo(id) {
    setTodoList((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function sendChat() {
    if (!chatMsg.trim()) return;
    setMessages((prev) => [...prev, {
      id: Date.now(), user: "You", role: "Admin", avatar: "YO",
      message: chatMsg, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);
    setChatMsg("");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm">
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(Object.keys(stats).length ? Object.entries(stats).map(([key, value]) => {
          const meta = dashboardStatMeta[key] || { label: key, icon: FileText, color: "blue", route: "/dashboard", change: "", up: true };
          const c = colorMap[meta.color] || colorMap.blue;
          const Icon = meta.icon;
          const displayValue = meta.currency ? `₱${Number(value).toLocaleString()}` : value;
          return (
            <div key={key} onClick={() => meta.route && navigate(meta.route)} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${c.icon} ${c.text} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${meta.up ? "text-green-600" : "text-red-500"}`}>
                  {meta.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {meta.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
              <p className="text-sm text-gray-500 mt-0.5">{meta.label}</p>
            </div>
          );
        }) : statsCards.map((card) => {
          const c = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div key={card.label} onClick={() => card.route && navigate(card.route)} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${c.icon} ${c.text} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${card.up ? "text-green-600" : "text-red-500"}`}>
                  {card.up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
            </div>
          );
        }))}
      </div>

      {/* Row 2: Weekly Schedule + Project Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Weekly Hours Card */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Weekly Work Hours</h2>
              <p className="text-xs text-gray-400">This week's labor tracking</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Clock size={13} />
              41 hrs total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="hours" fill="#f97316" radius={[6, 6, 0, 0]} name="Hours" />
              <Bar dataKey="completed" fill="#fed7aa" radius={[6, 6, 0, 0]} name="Tasks Done" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Invoice Stats */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-1">Invoice Stats</h2>
          <p className="text-xs text-gray-400 mb-4">June 2024 summary</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={invoiceData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value">
                {invoiceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {invoiceData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Current Projects + Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Projects */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Current Projects</h2>
            <button className="text-orange-500 text-sm font-medium hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {currentProjects.map((proj) => (
              <div key={proj.id} className="p-3 rounded-xl bg-gray-50 hover:bg-orange-50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{proj.name}</p>
                    <p className="text-xs text-gray-500">{proj.client} · Due {proj.deadline}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{proj.budget}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[proj.status]}`}>
                      {proj.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{proj.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Appointments</h2>
            <button className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg font-medium">
              + Add
            </button>
          </div>
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${apptColors[appt.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{appt.title}</p>
                  <p className="text-xs text-gray-400">{appt.date} · {appt.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Project Report Line Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Project Activity Report</h2>
            <p className="text-xs text-gray-400">Jan – Jun 2024 breakdown</p>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-orange-500 rounded inline-block" />Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-500 rounded inline-block" />Active</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-gray-300 rounded inline-block" />New</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={projectProgressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
            <Line type="monotone" dataKey="completed" stroke="#f97316" strokeWidth={2.5} dot={{ fill: "#f97316", r: 4 }} name="Completed" />
            <Line type="monotone" dataKey="active" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: "#3b82f6", r: 4 }} name="Active" />
            <Line type="monotone" dataKey="new" stroke="#d1d5db" strokeWidth={2} dot={{ fill: "#d1d5db", r: 3 }} name="New" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 5: To-Do + Team Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* To-Do */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">My To-Dos</h2>
            <span className="text-xs text-gray-400">{todoList.filter(t => t.done).length}/{todoList.length} done</span>
          </div>
          <div className="space-y-2">
            {todoList.map((todo) => (
              <div
                key={todo.id}
                onClick={() => toggleTodo(todo.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${todo.done ? "bg-gray-50" : "bg-white hover:bg-orange-50"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${todo.done ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                  {todo.done && <CheckCircle size={12} className="text-white" />}
                </div>
                <span className={`text-sm flex-1 ${todo.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                  {todo.task}
                </span>
                {!todo.done && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    todo.priority === "high" ? "bg-red-100 text-red-600" :
                    todo.priority === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {todo.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-sm text-orange-500 font-medium hover:text-orange-600 flex items-center justify-center gap-1.5 py-2 border border-dashed border-orange-200 rounded-xl hover:bg-orange-50 transition-colors">
            <Plus size={14} /> Add task
          </button>
        </div>

        {/* Team Chat */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Team Chat</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              3 online
            </span>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-56 mb-3">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {msg.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-gray-800">{msg.user}</span>
                    <span className="text-xs text-gray-400">{msg.role}</span>
                    <span className="text-xs text-gray-300 ml-auto">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-gray-100 pt-3">
            <input
              type="text"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Type a message..."
              className="flex-1 text-sm bg-gray-50 rounded-xl px-3 py-2 outline-none border border-gray-200 focus:border-orange-300"
            />
            <button
              onClick={sendChat}
              className="bg-orange-500 text-white px-3 py-2 rounded-xl hover:bg-orange-600 transition-colors"
            >
              <MessageSquare size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
