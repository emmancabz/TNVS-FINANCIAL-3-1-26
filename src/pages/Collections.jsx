import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Users, Wallet, BarChart3 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../database/supabase'
import {
  fetchCollectionsByDate,
  fetchCollectionsLast7DaysTotals,
  fetchCollectionsTotalByDate,
  fetchTotalDrivers,
} from '../services/collectionsService'

const DAY_MS = 24 * 60 * 60 * 1000

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

const toPhilippinesDate = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

const maskName = (fullName) => {
  const parts = String(fullName || '')
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0]?.[0] ? `${parts[0][0].toUpperCase()}*` : '—'
  const last = parts.length > 1 && parts[parts.length - 1]?.[0]
    ? `${parts[parts.length - 1][0].toUpperCase()}*`
    : ''
  return last ? `${first} ${last}` : first
}

const fmtCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

function Collections() {
  const [selectedDate, setSelectedDate] = useState(() => toPhilippinesDate(getPhilippinesNow()))
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const queryClient = useQueryClient()

  // 1. MAIN DATA QUERY (Naka-cache na!)
  const { data: mainData, isLoading } = useQuery({
    queryKey: ['collections', selectedDate],
    queryFn: async () => {
      const [data, total, drivers] = await Promise.all([
        fetchCollectionsByDate(selectedDate),
        fetchCollectionsTotalByDate(selectedDate),
        fetchTotalDrivers(),
      ])
      return {
        rows: data || [],
        totalCollected: total || 0,
        totalDrivers: drivers || 0,
      }
    },
  })

  // Extract values mula sa cached data (may default values para di mag-error)
  const rows = mainData?.rows || []
  const totalCollected = mainData?.totalCollected || 0
  const totalDrivers = mainData?.totalDrivers || 0

  // 2. 7-DAY TREND DATA QUERY (Naka-cache na rin!)
  const { data: compareRows = [], isLoading: compareLoading } = useQuery({
    queryKey: ['collections-trend', selectedDate],
    queryFn: async () => {
      const data = await fetchCollectionsLast7DaysTotals(selectedDate)
      return data || []
    },
  })

  // I-reset ang pagination pag nagbago ang laman ng rows
  useEffect(() => {
    setCurrentPage(1)
  }, [rows.length])

  // 3. REALTIME SUBSCRIPTION (Background Refresh)
  useEffect(() => {
    const isToday = selectedDate === toPhilippinesDate(getPhilippinesNow())
    if (!isToday) return

    const channel = supabase
      .channel('collections-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'core1_boundary_payments' },
        () => {
          // Walang loading screen, palihim lang na ire-refresh ng React Query sa background
          queryClient.invalidateQueries({ queryKey: ['collections', selectedDate] })
          queryClient.invalidateQueries({ queryKey: ['collections-trend', selectedDate] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate, queryClient])


  // Paginations at Calculations
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage))
  const currentSafe = Math.min(currentPage, totalPages)
  
  const paginatedRows = useMemo(() => {
    const start = (currentSafe - 1) * rowsPerPage
    return rows.slice(start, start + rowsPerPage)
  }, [rows, currentSafe])

  const paidCount = useMemo(() => {
    const set = new Set(rows.map((r) => r?.driver_id).filter((x) => x != null))
    return set.size
  }, [rows])

  const unpaidCount = Math.max((totalDrivers || 0) - paidCount, 0)
  const paidPct = totalDrivers ? Math.round((paidCount / totalDrivers) * 100) : 0
  
  const minDate = toPhilippinesDate(new Date(getPhilippinesNow().getTime() - 29 * DAY_MS))
  const maxDate = toPhilippinesDate(getPhilippinesNow())

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 tracking-tight">Collections</h1>
            <p className="text-slate-600 text-sm">Payments received since 12:00 AM PHT.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-stretch">
          
          {/* LEFT: MAIN TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full lg:h-[640px] flex flex-col">
            <table className="w-full text-sm text-left flex-1">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase text-xs">Driver Name</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase text-xs">Reference</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase text-xs">Amount</th>
                  <th className="px-6 py-4 font-bold text-slate-600 uppercase text-xs text-right">Time Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  Array.from({ length: rowsPerPage }).map((_, idx) => (
                    <tr key={`loading-${idx}`} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-4 text-slate-300">
                        {"\u00A0"}
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <>
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-slate-600 font-semibold">
                        No collections found for this date.
                      </td>
                    </tr>
                    {Array.from({ length: rowsPerPage - 1 }).map((_, idx) => (
                      <tr key={`empty-${idx}`}>
                        <td colSpan={4} className="px-6 py-4 text-transparent select-none">
                          {"\u00A0"}
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <>
                    {paginatedRows.map((row) => (
                      <tr key={row?.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{maskName(row?.driver_name)}</td>
                        <td className="px-6 py-4 text-slate-600 font-mono text-[11px]">{row?.ar_id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{fmtCurrency(row?.amount_paid)}</td>
                        <td className="px-6 py-4 text-slate-600 text-right">
                          {row?.collected_at
                            ? new Date(row.collected_at).toLocaleTimeString('en-PH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Manila',
                              })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    {Array.from({
                      length: Math.max(0, rowsPerPage - paginatedRows.length),
                    }).map((_, idx) => (
                      <tr key={`pad-${idx}`}>
                        <td colSpan={4} className="px-6 py-4 text-transparent select-none">
                          {"\u00A0"}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>

            {!isLoading && rows.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-white shrink-0">
                <span>
                  Page <span className="font-semibold">{currentSafe}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentSafe === 1}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentSafe === totalPages}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: STATS & PROJECTIONS */}
          <div className="space-y-6 h-full lg:h-[640px] flex flex-col">
            
            {/* CARD 1: Total Boundary + 7-Day Trend */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white z-10 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Boundary</p>
                    <p className="text-3xl font-black text-slate-900 mt-1">{fmtCurrency(totalCollected)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-emerald-600 flex items-center justify-center border border-slate-100 shrink-0">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col bg-slate-50 relative min-h-0">
                <div className="flex items-center gap-2 mb-4 shrink-0">
                  <BarChart3 className="w-4 h-4 text-slate-400 shrink-0" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">7-Day Trend</p>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2.5 pb-6">
                  {compareLoading ? (
                    <div className="text-slate-400 text-xs animate-pulse">Loading trends...</div>
                  ) : compareRows.length === 0 ? (
                    <div className="text-slate-400 text-xs">No data available.</div>
                  ) : (
                    compareRows.map((d) => (
                      <div key={d?.date} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/60 shadow-sm hover:border-emerald-200 transition-colors">
                        <div className="text-xs font-medium text-slate-600">{d?.date}</div>
                        <div className="text-sm font-bold text-slate-900">{fmtCurrency(d?.total)}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none rounded-b-2xl" />
              </div>
            </div>

            {/* CARD 2: Live Payment Projection */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Live Payment Projection</p>
                  <p className="text-xs text-slate-500 mt-1">Drivers paid vs unpaid</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Paid</span>
                  <span className="text-emerald-600 font-bold">{paidPct}%</span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Paid</p>
                    <p className="text-lg font-bold text-slate-800">{paidCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Unpaid</p>
                    <p className="text-lg font-bold text-slate-800">{unpaidCount}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  Total drivers tracked: {totalDrivers || 0}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default Collections