import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, FolderOpen, Gavel, Users } from "lucide-react";

const revenueData = [
  { month: "Jan", revenue: 1200000, expenses: 850000 },
  { month: "Feb", revenue: 1850000, expenses: 1100000 },
  { month: "Mar", revenue: 1400000, expenses: 950000 },
  { month: "Apr", revenue: 2300000, expenses: 1600000 },
  { month: "May", revenue: 1900000, expenses: 1200000 },
  { month: "Jun", revenue: 2800000, expenses: 1800000 },
  { month: "Jul", revenue: 2400000, expenses: 1500000 },
  { month: "Aug", revenue: 3100000, expenses: 2000000 },
];

const projectStatusData = [
  { name: "Open", value: 12, color: "#3b82f6" },
  { name: "Bidding", value: 18, color: "#f97316" },
  { name: "In Progress", value: 15, color: "#22c55e" },
  { name: "Completed", value: 32, color: "#8b5cf6" },
  { name: "Cancelled", value: 4, color: "#ef4444" },
];

const bidActivityData = [
  { week: "W1", submitted: 14, accepted: 4, rejected: 7 },
  { week: "W2", submitted: 22, accepted: 6, rejected: 10 },
  { week: "W3", submitted: 18, accepted: 5, rejected: 8 },
  { week: "W4", submitted: 26, accepted: 8, rejected: 12 },
  { week: "W5", submitted: 19, accepted: 7, rejected: 9 },
  { week: "W6", submitted: 31, accepted: 10, rejected: 14 },
];

const contractorPerformance = [
  { name: "Jose Construction", rating: 4.8, projects: 8, onTime: 92 },
  { name: "Cruz Builders", rating: 4.5, projects: 5, onTime: 85 },
  { name: "Bernardo Const.", rating: 4.2, projects: 6, onTime: 78 },
  { name: "Visayas Builders", rating: 4.6, projects: 3, onTime: 88 },
  { name: "Northern Const.", rating: 4.0, projects: 4, onTime: 80 },
];

const categoryData = [
  { category: "Residential", count: 28, value: 18500000 },
  { category: "Commercial", count: 22, value: 42000000 },
  { category: "Industrial", count: 8, value: 31000000 },
  { category: "Government", count: 6, value: 15000000 },
  { category: "Hospitality", count: 4, value: 9500000 },
];

function fmt(n) {
  if (n >= 1000000) return `₱${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₱${(n / 1000).toFixed(0)}K`;
  return `₱${n}`;
}

const kpiCards = [
  { label: "Total Revenue", value: "₱18.2M", change: "+23%", up: true, icon: DollarSign, color: "green" },
  { label: "Active Projects", value: "38", change: "+5", up: true, icon: FolderOpen, color: "orange" },
  { label: "Bids This Month", value: "130", change: "+18%", up: true, icon: Gavel, color: "blue" },
  { label: "Avg. Bid Amount", value: "₱1.4M", change: "-5%", up: false, icon: TrendingUp, color: "purple" },
];

const colorMap = {
  green: { bg: "bg-green-50", text: "text-green-600", icon: "bg-green-100" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "bg-orange-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "bg-purple-100" },
};

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm">Platform performance and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, change, up, icon: Icon, color }) => {
          const c = colorMap[color];
          return (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${c.icon} ${c.text} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-lg ${
                  up ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                }`}>
                  {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Revenue vs Expenses</h2>
            <p className="text-xs text-gray-400">Jan – Aug 2024</p>
          </div>
          <div className="flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-orange-500 rounded inline-block" />Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-300 rounded inline-block" />Expenses</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
            <Tooltip
              formatter={(v, name) => [fmt(v), name === "revenue" ? "Revenue" : "Expenses"]}
              contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" name="revenue" />
            <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expGrad)" name="expenses" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Row: Project Status + Bid Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Project Status Donut */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Project Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {projectStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [v, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {projectStatusData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600 truncate">{item.name}</span>
                <span className="font-semibold text-gray-800 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bid Activity */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Weekly Bid Activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={bidActivityData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
              <Bar dataKey="submitted" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Submitted" />
              <Bar dataKey="accepted" fill="#22c55e" radius={[4, 4, 0, 0]} name="Accepted" />
              <Bar dataKey="rejected" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Projects by Category</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 rounded-xl">
              <tr>
                {["Category", "Projects", "Total Value", "Avg. Value", "Share"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryData.map((row) => {
                const total = categoryData.reduce((s, r) => s + row.value, 0);
                const share = Math.round((row.value / categoryData.reduce((s, r) => s + r.value, 0)) * 100);
                return (
                  <tr key={row.category} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{row.category}</td>
                    <td className="px-4 py-3 text-gray-600">{row.count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{fmt(row.value)}</td>
                    <td className="px-4 py-3 text-gray-600">{fmt(Math.round(row.value / row.count))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-20">
                          <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contractor Performance */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Top Contractor Performance</h2>
        <div className="space-y-3">
          {contractorPerformance.map((c, i) => (
            <div key={c.name} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50">
              <span className="text-sm font-bold text-gray-400 w-5 text-center">{i + 1}</span>
              <div className="w-9 h-9 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.projects} projects completed</p>
              </div>
              <div className="flex items-center gap-1 text-amber-500 text-sm font-semibold">
                ⭐ {c.rating}
              </div>
              <div className="text-right min-w-[80px]">
                <p className="text-sm font-semibold text-gray-800">{c.onTime}%</p>
                <p className="text-xs text-gray-400">On-time</p>
              </div>
              <div className="w-24">
                <div className="bg-gray-100 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${c.onTime}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
