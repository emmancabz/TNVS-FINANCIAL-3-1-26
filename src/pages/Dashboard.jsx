import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Calculator, Receipt, ChevronDown, X } from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts'
import { supabase } from '../../database/supabase'
import {
  fetchDashboardCharts,
  fetchDashboardChartsForRange,
  fetchDashboardKpisByInterval,
  normalizeDateRange,
} from '../services/dashboardService'

function Dashboard() {
  const navigate = useNavigate()

  const [kpiByInterval, setKpiByInterval] = useState({
    weekly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
    monthly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
    yearly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
  })
  const [kpiIntervals, setKpiIntervals] = useState({
    revenue: 'monthly',
    collections: 'weekly',
    expenses: 'monthly',
    netProfit: 'monthly',
  })
  const [activeKpiMenu, setActiveKpiMenu] = useState(null)

  const [charts, setCharts] = useState({ boundaryData: [], monthlyExpenses: [], categoryData: [], cashFlowData: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [activeChart, setActiveChart] = useState(null)
  const [modalFrom, setModalFrom] = useState('')
  const [modalTo, setModalTo] = useState('')
  const [modalCharts, setModalCharts] = useState({ boundaryData: [], expensesDaily: [], categoryData: [], cashFlowData: [] })
  const [modalLoading, setModalLoading] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const uniqueIntervals = Array.from(new Set(Object.values(kpiIntervals)))
      const [intervalRows, chartRows] = await Promise.all([
        Promise.all(uniqueIntervals.map((iv) => fetchDashboardKpisByInterval(iv))),
        fetchDashboardCharts(),
      ])

      setKpiByInterval((prev) => {
        const next = { ...prev }
        uniqueIntervals.forEach((iv, idx) => {
          next[iv] = intervalRows[idx]
        })
        return next
      })
      setCharts(chartRows)
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
  }, [kpiIntervals])

  const fmtCurrency = (val) => `₱${Number(val || 0).toLocaleString()}`
  const intervalLabel = (iv) => (iv === 'weekly' ? 'Weekly' : iv === 'yearly' ? 'Yearly' : 'Monthly')

  const kpis = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Revenue',
        interval: kpiIntervals.revenue,
        value: fmtCurrency(kpiByInterval[kpiIntervals.revenue]?.revenue || 0),
        icon: TrendingUp,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        key: 'collections',
        label: 'Collections',
        interval: kpiIntervals.collections,
        value: fmtCurrency(kpiByInterval[kpiIntervals.collections]?.collections || 0),
        icon: Receipt,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
      },
      {
        key: 'expenses',
        label: 'Expenses',
        interval: kpiIntervals.expenses,
        value: fmtCurrency(kpiByInterval[kpiIntervals.expenses]?.expenses || 0),
        icon: TrendingDown,
        color: 'text-red-600',
        bg: 'bg-red-50',
      },
      {
        key: 'netProfit',
        label: 'Net Profit',
        interval: kpiIntervals.netProfit,
        value: fmtCurrency(kpiByInterval[kpiIntervals.netProfit]?.netProfit || 0),
        icon: Calculator,
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
      },
    ],
    [kpiByInterval, kpiIntervals],
  )

  const setKpiInterval = async (kpiKey, nextInterval) => {
    setKpiIntervals((prev) => ({ ...prev, [kpiKey]: nextInterval }))
    setActiveKpiMenu(null)
    setIsLoading(true)
    try {
      const next = await fetchDashboardKpisByInterval(nextInterval)
      setKpiByInterval((prev) => ({ ...prev, [nextInterval]: next }))
    } catch (err) {
      console.error('Dashboard KPI Interval Sync Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const openChartModal = async (chartKey) => {
    setActiveChart(chartKey)
    const now = new Date()
    const toKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const from = new Date(now.getTime() - 6 * 86400000)
    const fromKey = from.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    setModalFrom(fromKey)
    setModalTo(toKey)
    setModalLoading(true)
    try {
      const { fromISO, toISOExclusive } = normalizeDateRange(fromKey, toKey)
      const rangeCharts = await fetchDashboardChartsForRange(fromISO, toISOExclusive)
      setModalCharts(rangeCharts)
    } catch (err) {
      console.error('Dashboard Chart Range Sync Error:', err)
    } finally {
      setModalLoading(false)
    }
  }

  const refreshModalRange = async (fromStr, toStr) => {
    if (!activeChart) return
    setModalLoading(true)
    try {
      const { fromISO, toISOExclusive } = normalizeDateRange(fromStr, toStr)
      const rangeCharts = await fetchDashboardChartsForRange(fromISO, toISOExclusive)
      setModalCharts(rangeCharts)
    } catch (err) {
      console.error('Dashboard Chart Range Sync Error:', err)
    } finally {
      setModalLoading(false)
    }
  }

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
            className={`${kpi.bg} p-6 rounded-2xl border border-gray-100 shadow-sm relative cursor-pointer select-none`}
            onClick={() => setActiveKpiMenu((prev) => (prev === kpi.key ? null : kpi.key))}
          >
            <kpi.icon className={`w-8 h-8 ${kpi.color} mb-4`} />
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-white/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                {intervalLabel(kpi.interval)}
                <ChevronDown className="w-3 h-3" />
              </span>
            </div>

            <AnimatePresence>
              {activeKpiMenu === kpi.key && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute z-20 top-4 right-4 mt-10 w-40 rounded-2xl border border-emerald-200 bg-white shadow-lg overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {['weekly', 'monthly', 'yearly'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm font-semibold ${
                        kpi.interval === opt ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      onClick={() => setKpiInterval(kpi.key, opt)}
                    >
                      {intervalLabel(opt)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid: All 4 charts restored */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Boundary Collections (Last 7 Days)" onClick={() => openChartModal('boundary')}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.boundaryData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Expenses Trend" onClick={() => openChartModal('expenses')}>
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
        <ChartCard title="Expense Category Breakdown" onClick={() => openChartModal('category')}>
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

        <ChartCard title="Cash Flow (Revenue vs Expense)" onClick={() => openChartModal('cashflow')}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="in" name="Revenue" stroke="#10b981" strokeWidth={2} dot={{r: 4}} />
              <Line type="monotone" dataKey="out" name="Expense" stroke="#ef4444" strokeWidth={2} dot={{r: 4}} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <AnimatePresence>
        {!!activeChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 p-4 md:p-8"
            onClick={() => setActiveChart(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="bg-white w-full h-full rounded-2xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Chart Drill-down</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activeChart === 'boundary'
                      ? 'Boundary Collections'
                      : activeChart === 'expenses'
                        ? 'Expenses Trend'
                        : activeChart === 'category'
                          ? 'Expense Category Breakdown'
                          : 'Cash Flow'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChart(null)
                      navigate('/general-ledger')
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Go to General Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChart(null)
                      navigate('/budget-management')
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold hover:bg-emerald-100"
                  >
                    Go to Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveChart(null)}
                    className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-end gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">From</p>
                  <input
                    type="date"
                    value={modalFrom}
                    onChange={(e) => {
                      const v = e.target.value
                      setModalFrom(v)
                      refreshModalRange(v, modalTo)
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">To</p>
                  <input
                    type="date"
                    value={modalTo}
                    onChange={(e) => {
                      const v = e.target.value
                      setModalTo(v)
                      refreshModalRange(modalFrom, v)
                    }}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                {modalLoading && <div className="text-sm text-gray-400 font-semibold">Refreshing…</div>}
              </div>

              <div className="flex-1 p-5">
                <ResponsiveContainer width="100%" height="100%">
                  {activeChart === 'boundary' ? (
                    <AreaChart data={modalCharts.boundaryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                    </AreaChart>
                  ) : activeChart === 'expenses' ? (
                    <BarChart data={modalCharts.expensesDaily}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : activeChart === 'category' ? (
                    <PieChart>
                      <Pie
                        data={modalCharts.categoryData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={90}
                        outerRadius={130}
                        paddingAngle={4}
                      >
                        {(modalCharts.categoryData || []).map((e, idx) => (
                          <Cell key={idx} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  ) : (
                    <LineChart data={modalCharts.cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="in" name="Revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="out" name="Expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ChartCard = ({ title, children, onClick }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm cursor-pointer hover:bg-gray-50/40 transition-colors" onClick={onClick}>
    <h2 className="text-lg font-bold text-gray-900 mb-6">{title}</h2>
    {children}
  </div>
)

export default Dashboard
