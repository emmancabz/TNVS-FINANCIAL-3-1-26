import {
  Wallet,
  BookOpen,
  FileText,
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      label: "Pending Disbursements",
      value: "12",
      icon: Wallet,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      label: "GL Entries Today",
      value: "245",
      icon: BookOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "AP Balance",
      value: "₱2.5M",
      icon: FileText,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Budget Utilization",
      value: "68%",
      icon: DollarSign,
      color: "text-primary-600",
      bgColor: "bg-primary-50",
    },
    {
      label: "Collections Today",
      value: "₱125K",
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
  ];

  const recentActivities = [
    { id: 1, type: "Disbursement", action: "DV-2026-001 approved", time: "2 mins ago", status: "approved" },
    { id: 2, type: "GL Entry", action: "Auto-posted from AP", time: "15 mins ago", status: "completed" },
    { id: 3, type: "Collection", action: "OR-2026-045 generated", time: "1 hour ago", status: "completed" },
    { id: 4, type: "Budget", action: "Over-budget alert: Operations", time: "2 hours ago", status: "alert" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to TNVS Financial Management System</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`${stat.bgColor} rounded-lg p-6 border border-gray-200`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activities</h2>
        <div className="space-y-3">
          {recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {activity.status === "approved" && (
                  <CheckCircle className="w-5 h-5 text-primary-600" />
                )}
                {activity.status === "alert" && (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                {activity.status === "completed" && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">{activity.type} • {activity.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
              Create New Disbursement Voucher
            </button>
            <button className="w-full text-left px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
              Generate Financial Reports
            </button>
            <button className="w-full text-left px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors">
              View Audit Trail
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Auto-posting Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Budget Lock Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Unlocked
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Backup Status</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Last: 2 hours ago
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
