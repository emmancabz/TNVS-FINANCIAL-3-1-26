import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Calculator, Wallet, Receipt, Clock, X } from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts'
import { supabase } from '../../database/supabase'
import { fetchDashboardMetrics, fetchDashboardCharts } from '../services/dashboardService'

function Dashboard() {
  const [metrics, setMetrics] = useState({ monthlyRevenue: 0, dailyCollection: 0, monthlyExpenses: 0, netProfit: 0 })
  const [charts, setCharts] = useState({ boundaryData: [], monthlyExpenses: [], categoryData: [], cashFlowData: [] })
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    try {
      const [m, c] = await Promise.all([fetchDashboardMetrics(), fetchDashboardCharts()])
      setMetrics(m);
      setCharts(c);
    } catch (err) {
      console.error('Dashboard Sync Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // REAL-TIME AUTO SYNC: Refresh data when payments or expenses change
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core1_boundary_payments' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_disbursement' }, loadData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const kpis = [
    { label: 'Monthly Revenue', value: `₱${metrics.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Daily Collection', value: `₱${metrics.dailyCollection.toLocaleString()}`, icon: Receipt, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Monthly Expenses', value: `₱${metrics.monthlyExpenses.toLocaleString()}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Net Profit (Month)', value: `₱${metrics.netProfit.toLocaleString()}`, icon: Calculator, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-500 italic">Live tracking of March 2026 performance and assets.</p>
      </div>

      {/* KPI Cards: Live Sync with Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`${kpi.bg} p-6 rounded-2xl border border-gray-100 shadow-sm`}
          >
            <kpi.icon className={`w-8 h-8 ${kpi.color} mb-4`} />
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid: All 4 charts restored */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Boundary Collections (Last 7 Days)">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.boundaryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Expenses Trend">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.monthlyExpenses}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Expense Category Breakdown">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                {charts.categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{fontSize: '12px'}} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cash Flow (Revenue vs Expense)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="in" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={{r: 4}} />
              <Line type="monotone" dataKey="out" name="Expense" stroke="#ef4444" strokeWidth={2} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

const ChartCard = ({ title, children }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
    <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
    {children}
  </div>
)

export default Dashboard