import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Calculator, Receipt, ChevronDown, X, TrendingUp as TrendingUpIcon, Sparkles } from 'lucide-react'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line 
} from 'recharts'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../database/supabase'
import {
  fetchDashboardCharts,
  fetchDashboardChartsForRange,
  fetchDashboardKpisByInterval,
  normalizeDateRange,
} from '../services/dashboardService'

// Custom vibrant colors para mas mag-pop yung pie chart
const VIBRANT_COLORS = ['#0ea5e9', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899']

function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // --- UI STATES ---
  const [kpiIntervals, setKpiIntervals] = useState({
    revenue: 'monthly',
    collections: 'monthly',
    expenses: 'monthly',
    netProfit: 'monthly',
  })
  const [activeKpiMenu, setActiveKpiMenu] = useState(null)
  
  // Modal States
  const [activeChart, setActiveChart] = useState(null)
  const [modalFrom, setModalFrom] = useState('')
  const [modalTo, setModalTo] = useState('')

  // --- 1. MAIN DASHBOARD QUERY (Naka-cache) ---
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', kpiIntervals], // Mag-uupdate kusa pag nagbago ang intervals!
    queryFn: async () => {
      const uniqueIntervals = Array.from(new Set(Object.values(kpiIntervals)))
      const [intervalRows, chartRows] = await Promise.all([
        Promise.all(uniqueIntervals.map((iv) => fetchDashboardKpisByInterval(iv))),
        fetchDashboardCharts(),
      ])

      const nextKpiByInterval = {}
      uniqueIntervals.forEach((iv, idx) => {
        nextKpiByInterval[iv] = intervalRows[idx]
      })
      
      return { kpiByInterval: nextKpiByInterval, charts: chartRows }
    }
  })

  // Extract values with fallbacks
  const kpiByInterval = dashboardData?.kpiByInterval || {
    weekly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
    monthly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
    yearly: { revenue: 0, collections: 0, expenses: 0, netProfit: 0 },
  }
  const charts = dashboardData?.charts || { boundaryData: [], monthlyExpenses: [], categoryData: [], cashFlowData: [] }

  // --- 2. MODAL QUERY (Naka-cache na rin yung Range Picker!) ---
  const { data: modalChartsData, isLoading: isModalLoading } = useQuery({
    queryKey: ['dashboard-modal', modalFrom, modalTo],
    queryFn: async () => {
      const { fromISO, toISOExclusive } = normalizeDateRange(modalFrom, modalTo)
      return await fetchDashboardChartsForRange(fromISO, toISOExclusive)
    },
    enabled: !!activeChart && !!modalFrom && !!modalTo, // Magpe-fetch lang pag bukas ang modal
  })

  const modalCharts = modalChartsData || { boundaryData: [], expensesDaily: [], categoryData: [], cashFlowData: [] }
  const modalLoading = isModalLoading && !!activeChart

  // --- 3. REALTIME SUBSCRIPTION ---
  useEffect(() => {
    const channel = supabase.channel('dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core1_boundary_payments' }, () => {
        // Palihim na ire-refresh ang buong dashboard cache
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-modal'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_disbursement' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-modal'] })
      })
      .subscribe()
      
    return () => supabase.removeChannel(channel)
  }, [queryClient])

  const fmtCurrency = (val) => `₱${Number(val || 0).toLocaleString()}`
  const intervalLabel = (iv) => (iv === 'weekly' ? 'Weekly' : iv === 'yearly' ? 'Yearly' : 'Monthly')

  // Refined KPI Colors & Styling
  const kpis = useMemo(
    () => [
      {
        key: 'revenue',
        label: 'Revenue',
        interval: kpiIntervals.revenue,
        value: fmtCurrency(kpiByInterval[kpiIntervals.revenue]?.revenue || 0),
        icon: TrendingUp,
        color: 'text-blue-600',
        iconBg: 'bg-blue-50 border border-blue-100/50',
      },
      {
        key: 'collections',
        label: 'Collections',
        interval: kpiIntervals.collections,
        value: fmtCurrency(kpiByInterval[kpiIntervals.collections]?.collections || 0),
        icon: Receipt,
        color: 'text-indigo-600',
        iconBg: 'bg-indigo-50 border border-indigo-100/50',
      },
      {
        key: 'expenses',
        label: 'Expenses',
        interval: kpiIntervals.expenses,
        value: fmtCurrency(kpiByInterval[kpiIntervals.expenses]?.expenses || 0),
        icon: TrendingDown,
        color: 'text-rose-600',
        iconBg: 'bg-rose-50 border border-rose-100/50',
      },
      {
        key: 'netProfit',
        label: 'Net Profit',
        interval: kpiIntervals.netProfit,
        value: fmtCurrency(kpiByInterval[kpiIntervals.netProfit]?.netProfit || 0),
        icon: Calculator,
        color: 'text-emerald-600',
        iconBg: 'bg-emerald-50 border border-emerald-100/50',
      },
    ],
    [kpiByInterval, kpiIntervals],
  )

  const setKpiInterval = (kpiKey, nextInterval) => {
    setKpiIntervals((prev) => ({ ...prev, [kpiKey]: nextInterval }))
    setActiveKpiMenu(null)
    // Hindi na kailangan ng manual fetch dito, React Query will auto-fetch kung wala sa cache!
  }

  const openChartModal = (chartKey) => {
    setActiveChart(chartKey)
    const now = new Date()
    const toKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    const from = new Date(now.getTime() - 6 * 86400000)
    const fromKey = from.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    setModalFrom(fromKey)
    setModalTo(toKey)
    // Auto trigger na ang modal query dahil nagbago ang state!
  }

  // --- AI DYNAMIC INSIGHTS FROM GROQ ---
  const [aiInsights, setAiInsights] = useState([
    "Analyzing revenue patterns...",
    "Checking collection trends...",
    "Calculating expense ratios..."
  ])
  const [insightsLoading, setInsightsLoading] = useState(false)

  useEffect(() => {
    if (isLoading) return
    const monthly = kpiByInterval['monthly']
    if (!monthly) return

    const fetchInsights = async () => {
      setInsightsLoading(true)
      try {
        const summaryData = {
          monthly_revenue: monthly.revenue || 0,
          monthly_expenses: monthly.expenses || 0,
          monthly_net_profit: monthly.netProfit || 0,
          boundary_last_7_days: charts.boundaryData || [],
          top_expense_categories: (charts.categoryData || []).slice(0, 5).map(c => ({ name: c.name, amount: c.value })),
          total_drivers: charts.totalDrivers || 0,
        }

        const prompt = `You are Cabwise, the Financial AI Agent for Envirocab, a TNVS company in the Philippines. Based on this real-time financial data, generate exactly 3 short, sharp insights for the dashboard. Each insight must be 1-2 sentences max. Be specific with numbers. Always format all amounts in Philippine Peso using the peso sign and comma separators (e.g. ₱21,700). Never use dollar signs. Use emojis. Data: ${JSON.stringify(summaryData)}. Return ONLY a JSON array of 3 strings, nothing else. Example format: ["insight 1", "insight 2", "insight 3"]`

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.3
          })
        })

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content ?? '[]'
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed) && parsed.length === 3) {
          setAiInsights(parsed)
        }
      } catch (e) {
        console.error('AI Insights error:', e)
        // Fallback to computed insights
        const insights = []
        const monthlyNet = monthly.netProfit || 0
        const monthlyRev = monthly.revenue || 0
        const monthlyExp = monthly.expenses || 0
        if (monthlyRev > 0 && monthlyExp > monthlyRev) {
          insights.push(`⚠️ Monthly expenses (₱${monthlyExp.toLocaleString()}) are exceeding revenue.`)
        } else if (monthlyNet > 0) {
          insights.push(`✨ Healthy! Net profit of ₱${monthlyNet.toLocaleString()} this month.`)
        } else {
          insights.push("⚖️ Profitability is neutral. Monitor expenses closely.")
        }
        if (charts.boundaryData?.length >= 2) {
          const latest = charts.boundaryData[charts.boundaryData.length - 1]
          const prev = charts.boundaryData[charts.boundaryData.length - 2]
          insights.push(latest.amount < prev.amount
            ? `📉 Collections dropped to ₱${latest.amount.toLocaleString()} yesterday.`
            : `📈 Collections trending up at ₱${latest.amount.toLocaleString()}.`)
        } else {
          insights.push("⏳ Gathering boundary data for trend analysis.")
        }
        if (charts.categoryData?.length > 0) {
          const highest = [...charts.categoryData].sort((a, b) => b.value - a.value)[0]
          insights.push(`💡 "${highest.name}" is your largest expense at ₱${highest.value.toLocaleString()}.`)
        } else {
          insights.push("💡 Start categorizing expenses to see breakdowns.")
        }
        setAiInsights(insights)
      } finally {
        setInsightsLoading(false)
      }
    }

    fetchInsights()
  }, [isLoading, kpiByInterval, charts])

  // --- Helpers para sa Pie Chart ---
  const today = new Date()
  const lastWeek = new Date(today.getTime() - 6 * 86400000)
  const dateOptions = { month: 'short', day: 'numeric' }
  const expenseSubtitle = `Showing expenses from ${lastWeek.toLocaleDateString('en-US', dateOptions)} to ${today.toLocaleDateString('en-US', dateOptions)}`

  const modalTotalCategoryExpenses = (modalCharts.categoryData || []).reduce((sum, item) => sum + item.value, 0)

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 24 
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null; 

    return (
      <text 
        x={x} 
        y={y} 
        fill="#1e293b" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        className="text-[11px] font-extrabold tracking-tight"
      >
        ₱{value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({(percent * 100).toFixed(1)}%)
      </text>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium text-sm">Real-time insights of our financial performance</p>
      </div>

      {/* AI INSIGHTS PANEL */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-5 md:p-6 rounded-[32px] bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row items-start md:items-center gap-5 relative overflow-hidden group cursor-default"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200/50 shrink-0 relative z-10 flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        
        <div className="flex-1 relative z-10 w-full">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">AI Insights</h3>
            <span className="flex items-center gap-1.5 text-[9px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Status
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {aiInsights.map((insight, idx) => (
              <div key={idx} className={`bg-slate-50/70 border border-slate-100 p-3.5 rounded-2xl text-[13px] font-semibold text-slate-700 leading-snug shadow-sm ${insightsLoading ? 'animate-pulse text-slate-400' : ''}`}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* KPI CARDS (GLASS EFFECT & HOVER ANIMATION) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-[32px] bg-white/80 backdrop-blur-xl border border-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] relative cursor-pointer select-none hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 group"
            onClick={() => setActiveKpiMenu((prev) => (prev === kpi.key ? null : kpi.key))}
          >
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-[20px] ${kpi.iconBg} flex items-center justify-center mb-5 shadow-sm`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} strokeWidth={2.5} />
              </div>
              <p className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</p>
              <div className="flex items-center justify-between gap-2 mt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${kpi.color} bg-white/80 border border-gray-100 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm`}>
                  {intervalLabel(kpi.interval)}
                  <ChevronDown className="w-3 h-3" />
                </span>
              </div>
            </div>

            <AnimatePresence>
              {activeKpiMenu === kpi.key && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute z-50 top-4 right-4 mt-12 w-40 rounded-2xl border border-slate-100 bg-white/95 backdrop-blur-md shadow-xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {['weekly', 'monthly', 'yearly'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                        kpi.interval === opt ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Boundary Collections" subtitle="Performance over the last 7 days" onClick={() => openChartModal('boundary')}>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.boundaryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Expenses Trend" subtitle="Actual vs projected spending" onClick={() => openChartModal('expenses')}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.monthlyExpenses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Bar dataKey="amount" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REFINED EXPENSE CATEGORY BREAKDOWN CARD */}
        <div 
          className="bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col group relative overflow-hidden" 
          onClick={() => openChartModal('category')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          
          <div className="mb-6 relative z-10">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Expense Category Breakdown</h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{expenseSubtitle}</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-6 h-[250px] relative z-10">
            <div className="w-full h-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={charts.categoryData} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={95} 
                    label={renderCustomLabel}
                    labelLine={true}
                  >
                    {charts.categoryData.map((e, i) => (
                      <Cell key={i} fill={VIBRANT_COLORS[i % VIBRANT_COLORS.length]} stroke="white" strokeWidth={3} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <ChartCard title="Cash Flow Tracking" subtitle="Revenue vs Expense comparative analysis" onClick={() => openChartModal('cashflow')}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend wrapperStyle={{fontSize: '11px', fontWeight: 'bold', paddingTop: '10px'}} iconType="circle" />
              <Line type="monotone" dataKey="in" name="Revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="out" name="Expense" stroke="#f43f5e" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* DRILL DOWN MODAL */}
      <AnimatePresence>
        {!!activeChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 md:p-8 flex justify-center items-center"
            onClick={() => setActiveChart(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white w-full max-w-6xl h-[85vh] rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Detailed Analytics</p>
                  <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {activeChart === 'boundary'
                      ? 'Boundary Collections Performance'
                      : activeChart === 'expenses'
                        ? 'Monthly Expenses Trend'
                        : activeChart === 'category'
                          ? 'Expense Category Breakdown'
                          : 'Cash Flow Analysis'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChart(null)
                      navigate('/general-ledger')
                    }}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    General Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChart(null)
                      navigate('/budget-management')
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Budget
                  </button>
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  <button
                    type="button"
                    onClick={() => setActiveChart(null)}
                    className="p-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <X className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
              </div>

              <div className="px-8 py-5 border-b border-slate-100 flex flex-wrap items-end gap-4 bg-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Start Date</p>
                  <input
                    type="date"
                    value={modalFrom}
                    onChange={(e) => setModalFrom(e.target.value)} // Auto trigger ng fetch pag pinalitan
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">End Date</p>
                  <input
                    type="date"
                    value={modalTo}
                    onChange={(e) => setModalTo(e.target.value)} // Auto trigger ng fetch pag pinalitan
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  />
                </div>
                {modalLoading && <div className="text-sm text-emerald-600 font-bold bg-emerald-50 px-4 py-2.5 rounded-xl animate-pulse">Syncing Data...</div>}
              </div>

              <div className="flex-1 p-8 bg-white">
                {activeChart === 'category' ? (
                  <div className="flex flex-col md:flex-row items-center gap-8 h-full">
                    <div className="w-full md:w-1/2 h-full relative min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modalCharts.categoryData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={160}
                            label={renderCustomLabel}
                            labelLine={true}
                          >
                            {(modalCharts.categoryData || []).map((e, idx) => (
                              <Cell key={idx} fill={VIBRANT_COLORS[idx % VIBRANT_COLORS.length]} stroke="white" strokeWidth={4} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '16px', border: 'none', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-1/2 flex flex-col justify-center space-y-3 h-full overflow-y-auto pr-4 custom-scrollbar">
                      {modalCharts.categoryData.length === 0 ? (
                        <div className="text-sm font-semibold text-slate-400 text-center">No expenses recorded</div>
                      ) : (
                        modalCharts.categoryData.map((entry, index) => {
                          const percent = modalTotalCategoryExpenses > 0 ? ((entry.value / modalTotalCategoryExpenses) * 100).toFixed(1) : 0
                          return (
                            <div key={index} className="flex items-center justify-between p-5 rounded-[20px] bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-4 h-4 rounded-full shadow-inner" style={{backgroundColor: VIBRANT_COLORS[index % VIBRANT_COLORS.length]}}></div>
                                <div>
                                  <p className="text-base font-bold text-slate-900">{entry.name}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-xs font-bold text-slate-500">{percent}%</p>
                                    <span className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                                      <TrendingUpIcon className="w-3 h-3 mr-1" /> 1.2%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-lg font-extrabold text-slate-900">₱{entry.value.toLocaleString('en-PH', {minimumFractionDigits: 0})}</p>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'boundary' ? (
                      <AreaChart data={modalCharts.boundaryData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '16px', border: 'none', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="amount" stroke="#10b981" fill="#d1fae5" strokeWidth={3} />
                      </AreaChart>
                    ) : activeChart === 'expenses' ? (
                      <BarChart data={modalCharts.expensesDaily}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="amount" fill="#f43f5e" radius={[8, 8, 0, 0]} maxBarSize={60} />
                      </BarChart>
                    ) : (
                      <LineChart data={modalCharts.cashFlowData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                        <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} contentStyle={{borderRadius: '16px', border: 'none', padding: '12px 16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
                        <Line type="monotone" dataKey="in" name="Revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="out" name="Expense" stroke="#f43f5e" strokeWidth={4} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const ChartCard = ({ title, subtitle, children, onClick }) => (
  <div 
    className="bg-white/80 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.05)] cursor-pointer hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col group relative overflow-hidden" 
    onClick={onClick}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    <div className="mb-6 relative z-10">
      <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wider">{subtitle}</p>}
    </div>
    <div className="flex-1 flex flex-col justify-center relative z-10">
      {children}
    </div>
  </div>
)

export default Dashboard