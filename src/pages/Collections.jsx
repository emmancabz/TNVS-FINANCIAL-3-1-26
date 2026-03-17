import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Users, Wallet } from 'lucide-react'
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
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCollected, setTotalCollected] = useState(0)
  const [selectedDate, setSelectedDate] = useState(() => toPhilippinesDate(getPhilippinesNow()))
  const [totalDrivers, setTotalDrivers] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [showCompare, setShowCompare] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)
  const [compareRows, setCompareRows] = useState([])
  const rowsPerPage = 10

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [data, total, drivers] = await Promise.all([
          fetchCollectionsByDate(selectedDate),
          fetchCollectionsTotalByDate(selectedDate),
          fetchTotalDrivers(),
        ])
        setRows(data || [])
        setTotalCollected(total || 0)
        setTotalDrivers(drivers || 0)
      } catch (err) {
        console.error('Failed to load collections', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [selectedDate])

  useEffect(() => {
    setCurrentPage(1)
  }, [rows.length])

  useEffect(() => {
    const isToday = selectedDate === toPhilippinesDate(getPhilippinesNow())
    if (!isToday) return
    const channel = supabase
      .channel('collections-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'core1_boundary_payments' },
        () => {
          Promise.all([
            fetchCollectionsByDate(selectedDate),
            fetchCollectionsTotalByDate(selectedDate),
          ]).then(([data, total]) => {
            setRows(data || [])
            setTotalCollected(total || 0)
          })
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate])

  const totalPages = Math.max(1, Math.ceil((rows || []).length / rowsPerPage))
  const currentSafe = Math.min(currentPage, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (currentSafe - 1) * rowsPerPage
    return (rows || []).slice(start, start + rowsPerPage)
  }, [rows, currentSafe])

  const paidCount = useMemo(() => {
    const set = new Set((rows || []).map((r) => r?.driver_id).filter((x) => x != null))
    return set.size
  }, [rows])

  const unpaidCount = Math.max((totalDrivers || 0) - paidCount, 0)
  const paidPct = totalDrivers ? Math.round((paidCount / totalDrivers) * 100) : 0
  const minDate = toPhilippinesDate(new Date(getPhilippinesNow().getTime() - 29 * DAY_MS))
  const maxDate = toPhilippinesDate(getPhilippinesNow())

  const loadCompare = async () => {
    setShowCompare(true)
    setCompareLoading(true)
    try {
      const data = await fetchCollectionsLast7DaysTotals(selectedDate)
      setCompareRows(data || [])
    } finally {
      setCompareLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 lg:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-1 tracking-tight">Collections</h1>
            <p className="text-emerald-700 text-sm">Payments received since 12:00 AM PHT.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <input
              type="date"
              value={selectedDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-emerald-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <div className="bg-white rounded-2xl border border-emerald-100 shadow-[0_8px_24px_rgba(16,185,129,0.08)] overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-emerald-50 border-b border-emerald-100">
                <tr>
                  <th className="px-6 py-4 font-bold text-emerald-700 uppercase text-xs">Driver Name</th>
                  <th className="px-6 py-4 font-bold text-emerald-700 uppercase text-xs">Reference</th>
                  <th className="px-6 py-4 font-bold text-emerald-700 uppercase text-xs">Amount</th>
                  <th className="px-6 py-4 font-bold text-emerald-700 uppercase text-xs text-right">Time Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-emerald-500">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && (rows || []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-emerald-700 font-semibold">
                      No collections found for this date.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  paginatedRows.map((row) => (
                    <tr key={row?.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-emerald-900">{maskName(row?.driver_name)}</td>
                      <td className="px-6 py-4 text-emerald-700 font-mono text-[11px]">{row?.ar_id}</td>
                      <td className="px-6 py-4 font-bold text-emerald-700">{fmtCurrency(row?.amount_paid)}</td>
                      <td className="px-6 py-4 text-emerald-700 text-right">
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
              </tbody>
            </table>

            {!isLoading && (rows || []).length > 0 && (
              <div className="px-6 py-4 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-700">
                <span>
                  Page <span className="font-semibold">{currentSafe}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentSafe === 1}
                    className="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentSafe === totalPages}
                    className="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={loadCompare}
              className="w-full text-left rounded-2xl border border-emerald-100 bg-white shadow-[0_6px_18px_rgba(16,185,129,0.1)] p-4 hover:bg-emerald-50/50 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Today</p>
                  <p className="text-2xl font-black text-emerald-700">{fmtCurrency(totalCollected)}</p>
                  <p className="text-[11px] text-emerald-500 mt-1">Tap to compare last 7 days</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </button>

            <div className="rounded-2xl border border-emerald-100 bg-white shadow-[0_6px_18px_rgba(16,185,129,0.1)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Live Payment Projection</p>
                  <p className="text-sm text-emerald-700 mt-1">Drivers paid vs unpaid</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
                  <span>Paid</span>
                  <span>{paidPct}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-emerald-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${paidPct}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Paid</p>
                    <p className="text-sm font-semibold text-emerald-800">{paidCount}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Unpaid</p>
                    <p className="text-sm font-semibold text-emerald-800">{unpaidCount}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-500">
                  <Users className="w-4 h-4" />
                  Total drivers tracked: {totalDrivers || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showCompare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowCompare(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-emerald-100 w-full max-w-lg overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">7-Day Comparison</p>
                  <p className="text-lg font-bold text-emerald-900">Collections Trend</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompare(false)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50"
                >
                  Close
                </button>
              </div>
              <div className="p-6 space-y-3">
                {compareLoading && <div className="text-emerald-500 text-sm">Loading…</div>}
                {!compareLoading &&
                  (compareRows || []).map((d) => (
                    <div key={d?.date} className="flex items-center justify-between">
                      <div className="text-sm text-emerald-700">{d?.date}</div>
                      <div className="text-sm font-semibold text-emerald-900">{fmtCurrency(d?.total)}</div>
                    </div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Collections
