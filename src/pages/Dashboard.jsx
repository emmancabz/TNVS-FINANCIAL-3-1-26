import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useEffect, useState } from 'react'
import { Clock, Receipt, Wallet, X } from 'lucide-react'
import { supabase } from '../../database/supabase'
import { fetchDashboardMetrics, fetchDashboardCharts } from '../services/dashboardService'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    totalCollected: 0,
    totalDebits: 0,
    totalCredits: 0,
    netBalance: 0,
    totalAssets: 0,
  })
  const [charts, setCharts] = useState({
    boundaryData: [],
    monthlyExpenses: [],
    cashFlowData: [],
    categoryData: [],
    healthCheck: { paidPct: 0, unpaidPct: 0, paidCount: 0, totalCount: 0 },
  })
  const [selectedChart, setSelectedChart] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchDashboardMetrics()
        setMetrics(data)
        const chartData = await fetchDashboardCharts()
        setCharts(chartData)
      } catch (err) {
        const message = err?.message || err
        console.error('Failed to load dashboard metrics', message)
      }
    }
    load()

    const channel = supabase
      .channel('dashboard-metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fin_collections' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'core1_boundary_payments' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fin_disbursement' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fin_general_ledger' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'core1_drivers' },
        () => load()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const kpis = [
    {
      label: 'Total Assets',
      value: `₱${metrics.totalAssets.toLocaleString()}`,
      icon: Wallet,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      label: 'Accounts Receivable',
      value: `${charts.healthCheck.totalCount - charts.healthCheck.paidCount} Unpaid`,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Daily Collection',
      value: `₱${metrics.totalCollected.toLocaleString()}`,
      icon: Receipt,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Net Balance',
      value: `₱${metrics.netBalance.toLocaleString()}`,
      icon: Wallet,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  const sourceByChart = {
    boundary: { path: '/collections', label: 'Go to Source' },
    monthly: { path: '/disbursement', label: 'Go to Source' },
    category: { path: '/general-ledger', label: 'Go to Source' },
    cashflow: { path: '/accounts-payable', label: 'Go to Source' },
  }

  const renderModalChart = () => {
    if (selectedChart === 'boundary') {
      return (
        <AreaChart data={charts.boundaryData}>
          <defs>
            <linearGradient id="boundaryGradModal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
          <Area type="monotone" dataKey="amount" stroke="#16a34a" fill="url(#boundaryGradModal)" strokeWidth={2} />
        </AreaChart>
      )
    }
    if (selectedChart === 'monthly') {
      return (
        <BarChart data={charts.monthlyExpenses}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`} />
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
          <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      )
    }
    if (selectedChart === 'category') {
      return (
        <PieChart>
          <Pie
            data={charts.categoryData}
            cx="50%"
            cy="50%"
            innerRadius={0}
            outerRadius={110}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            animationBegin={0}
            animationDuration={800}
          >
            {charts.categoryData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
          <Legend />
        </PieChart>
      )
    }
    if (selectedChart === 'cashflow') {
      return (
        <LineChart data={charts.cashFlowData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, '']} />
          <Legend />
          <Line type="monotone" dataKey="in" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="In" />
          <Line type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Out" />
        </LineChart>
      )
    }
    return null
  }

  return (
    <div className="p-6 md:p-8 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">Dashboard</h1>
        <p className="text-gray-500">TNVS Financial Management System</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`${kpi.bg} rounded-2xl p-5 md:p-6 border border-gray-100 shadow-soft hover:shadow-card transition-shadow duration-200`}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-8 h-8 ${kpi.color}`} strokeWidth={1.6} />
              </div>
              <p className="text-xl md:text-2xl font-semibold text-gray-900">{kpi.value}</p>
              <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
            </div>
          )
        })}
      </div>
      {/* Charts - responsive wrappers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 md:p-6 overflow-hidden cursor-pointer hover:scale-[1.01] transition-all"
          onClick={() => setSelectedChart('boundary')}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Boundary Collected</h2>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.boundaryData}>
                <defs>
                  <linearGradient id="boundaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
                <Area type="monotone" dataKey="amount" stroke="#16a34a" fill="url(#boundaryGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 md:p-6 overflow-hidden cursor-pointer hover:scale-[1.01] transition-all"
          onClick={() => setSelectedChart('monthly')}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Monthly Expenses</h2>
          <p className="text-xs text-gray-500 mb-4">Fuel, Payroll, Utilities, Office (excl. driver-funded maintenance)</p>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 md:p-6 overflow-hidden cursor-pointer hover:scale-[1.01] transition-all"
          onClick={() => setSelectedChart('category')}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Category Breakdown</h2>
          <p className="text-xs text-gray-500 mb-4">Company expenses only</p>
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {charts.categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Amount']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 md:p-6 overflow-hidden cursor-pointer hover:scale-[1.01] transition-all"
          onClick={() => setSelectedChart('cashflow')}
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Overview</h2>
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, '']} />
                <Legend />
                <Line type="monotone" dataKey="in" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="In" />
                <Line type="monotone" dataKey="out" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Out" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {selectedChart && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedChart === 'boundary' && 'Total Boundary Collected'}
                {selectedChart === 'monthly' && 'Monthly Expenses'}
                {selectedChart === 'category' && 'Category Breakdown'}
                {selectedChart === 'cashflow' && 'Cash Flow Overview'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedChart(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <div className="h-[420px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  {renderModalChart()}
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const target = sourceByChart[selectedChart]
                    if (target) navigate(target.path)
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  {sourceByChart[selectedChart]?.label || 'Go to Source'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
