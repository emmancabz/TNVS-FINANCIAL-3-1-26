import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import { supabase } from '../../database/supabase'
import { fetchUnifiedLedgerEntries } from '../services/generalLedgerService'

const DAY_MS = 24 * 60 * 60 * 1000

const pad2 = (n) => String(n).padStart(2, '0')

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

const toPhilippinesDate = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

const parsePhilippinesDate = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00+08:00`)

const startOfPhilippinesDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS)

const maskName = (fullName) => {
  const parts = String(fullName || '')
    .split(' ')
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length === 0) return '—'
  const first = parts[0]?.[0] ? `${parts[0][0].toUpperCase()}*` : '—'
  const last =
    parts.length > 1 && parts[parts.length - 1]?.[0]
      ? `${parts[parts.length - 1][0].toUpperCase()}*`
      : ''
  return last ? `${first} ${last}` : first
}

const fmtCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const isValidDateStr = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))

function GeneralLedger() {
  const now = getPhilippinesNow()
  const currentYear = now.getFullYear()
  const currentMonthIndex = now.getMonth()
  const todayStr = toPhilippinesDate(now)

  const [periodMode, setPeriodMode] = useState('year')
  const [periodYear, setPeriodYear] = useState(currentYear)
  const [periodMonthIndex, setPeriodMonthIndex] = useState(currentMonthIndex)
  const [periodOpen, setPeriodOpen] = useState(false)

  const [fromDate, setFromDate] = useState(() => `${currentYear}-01-01`)
  const [toDate, setToDate] = useState(() => todayStr)
  const [txnFilter, setTxnFilter] = useState('all')

  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)

  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 10

  const periodRange = useMemo(() => {
    const safeYear = Math.min(Number(periodYear || currentYear), currentYear)
    const safeMonth =
      safeYear === currentYear ? Math.min(Number(periodMonthIndex || 0), currentMonthIndex) : Number(periodMonthIndex || 0)

    if (periodMode === 'month') {
      const monthStart = new Date(`${safeYear}-${pad2(safeMonth + 1)}-01T00:00:00+08:00`)
      const nextMonthStart =
        safeYear === currentYear && safeMonth === currentMonthIndex
          ? addDays(startOfPhilippinesDay(now), 1)
          : new Date(`${safeYear}-${pad2(safeMonth + 2)}-01T00:00:00+08:00`)
      return { start: monthStart, endExclusive: nextMonthStart, label: `${monthStart.toLocaleString('en-PH', { month: 'long' })} ${safeYear}` }
    }

    const yearStart = new Date(`${safeYear}-01-01T00:00:00+08:00`)
    const yearEndExclusive =
      safeYear === currentYear ? addDays(startOfPhilippinesDay(now), 1) : new Date(`${safeYear + 1}-01-01T00:00:00+08:00`)
    return { start: yearStart, endExclusive: yearEndExclusive, label: String(safeYear) }
  }, [periodMode, periodYear, periodMonthIndex, currentYear, currentMonthIndex, now])

  const listRange = useMemo(() => {
    const safeFrom = isValidDateStr(fromDate) ? parsePhilippinesDate(fromDate) : periodRange.start
    const safeTo = isValidDateStr(toDate) ? parsePhilippinesDate(toDate) : addDays(periodRange.endExclusive, -1)
    const from = startOfPhilippinesDay(safeFrom)
    const toDay = startOfPhilippinesDay(safeTo)
    const maxTo = startOfPhilippinesDay(parsePhilippinesDate(todayStr))
    const clampedTo = toDay.getTime() > maxTo.getTime() ? maxTo : toDay
    const clampedFrom = from.getTime() > clampedTo.getTime() ? clampedTo : from
    return { start: clampedFrom, endExclusive: addDays(clampedTo, 1) }
  }, [fromDate, toDate, periodRange, todayStr])

  const queryRange = useMemo(() => {
    const start = new Date(Math.min(periodRange.start.getTime(), listRange.start.getTime()))
    const endExclusive = new Date(Math.max(periodRange.endExclusive.getTime(), listRange.endExclusive.getTime()))
    return { startISO: start.toISOString(), endISO: endExclusive.toISOString() }
  }, [periodRange, listRange])

  const load = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await fetchUnifiedLedgerEntries({ fromISO: queryRange.startISO, toISO: queryRange.endISO })
      setEntries(data || [])
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [queryRange.startISO, queryRange.endISO])

  useEffect(() => {
    const channel = supabase
      .channel('gl-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'core1_boundary_payments' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_disbursement' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryRange.startISO, queryRange.endISO])

  const summaryEntries = useMemo(() => {
    const start = periodRange.start.getTime()
    const end = periodRange.endExclusive.getTime()
    return (entries || []).filter((e) => {
      const t = new Date(e?.transaction_date).getTime()
      return Number.isFinite(t) && t >= start && t < end
    })
  }, [entries, periodRange])

  const revenue = useMemo(() => summaryEntries.reduce((s, e) => s + Number(e?.debit || 0), 0), [summaryEntries])
  const expenses = useMemo(() => summaryEntries.reduce((s, e) => s + Number(e?.credit || 0), 0), [summaryEntries])
  const netProfit = revenue - expenses

  const filtered = useMemo(() => {
    const start = listRange.start.getTime()
    const end = listRange.endExclusive.getTime()
    return (entries || []).filter((e) => {
      const t = new Date(e?.transaction_date).getTime()
      if (!Number.isFinite(t) || t < start || t >= end) return false
      if (txnFilter === 'debit') return Number(e?.debit || 0) > 0
      if (txnFilter === 'credit') return Number(e?.credit || 0) > 0
      return true
    })
  }, [entries, listRange, txnFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [filtered.length])

  const pageSafe = Math.min(currentPage, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (pageSafe - 1) * rowsPerPage
    return filtered.slice(start, start + rowsPerPage)
  }, [filtered, pageSafe])

  const monthOptions = useMemo(
    () =>
      [...Array(12)].map((_, i) => ({
        value: i,
        label: new Date(`2026-${pad2(i + 1)}-01T00:00:00+08:00`).toLocaleString('en-PH', { month: 'long' }),
        disabled: periodYear === currentYear && i > currentMonthIndex,
      })),
    [periodYear, currentYear, currentMonthIndex]
  )

  const yearOptions = useMemo(() => {
    const minYear = Math.max(2020, currentYear - 6)
    return [...Array(currentYear - minYear + 1)].map((_, i) => currentYear - i)
  }, [currentYear])

  const formatDateTime = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="w-full">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 tracking-tight">General Ledger</h1>
            <p className="text-slate-600 text-sm">Master records · Live revenue and expense history</p>
          </div>
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="px-4 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2"
          >
            Period: {periodRange.label}
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Revenue</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{fmtCurrency(revenue)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex items-center gap-3">
            <TrendingDown className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Expenses</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{fmtCurrency(expenses)}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Net Profit</p>
              <p className="text-xl font-black text-slate-900 tabular-nums">{fmtCurrency(netProfit)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-semibold text-slate-600">From</span>
              <input
                type="date"
                value={fromDate}
                max={todayStr}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-sm text-slate-900 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
              <span className="text-xs font-semibold text-slate-600">To</span>
              <input
                type="date"
                value={toDate}
                max={todayStr}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-sm text-slate-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {[
                { key: 'all', label: 'All Transactions' },
                { key: 'debit', label: 'Debit Only' },
                { key: 'credit', label: 'Credit Only' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTxnFilter(t.key)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                    txnFilter === t.key
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filtered.length}</span> transaction(s)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Counterparty</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Account</th>
                  <th className="px-5 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Reference</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-4 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && error && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}
                {!isLoading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-600 font-semibold">
                      No transactions found for this filter.
                    </td>
                  </tr>
                )}
                {!isLoading &&
                  !error &&
                  paginatedRows.map((row) => {
                    const isDebit = Number(row?.debit || 0) > 0
                    const amount = Number(row?.amount || 0)
                    return (
                      <tr
                        key={row?.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedEntry(row)}
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`text-xs font-bold ${
                              isDebit ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isDebit ? 'DEBIT' : 'CREDIT'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{maskName(row?.counterparty_name)}</td>
                        <td className="px-5 py-4 text-slate-700">{row?.description || '—'}</td>
                        <td className="px-5 py-4 text-slate-600 font-mono text-[11px]">{row?.account_code || '—'}</td>
                        <td className="px-5 py-4 text-slate-600 font-mono text-[11px]">{row?.reference_id || '—'}</td>
                        <td
                          className={`px-5 py-4 text-right font-black tabular-nums ${
                            isDebit ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isDebit ? `+${fmtCurrency(amount)}` : `-${fmtCurrency(amount)}`}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600">{formatDateTime(row?.transaction_date)}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {!isLoading && !error && filtered.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Page <span className="font-semibold">{pageSafe}</span> of{' '}
                <span className="font-semibold">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe === totalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {periodOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setPeriodOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
                <div className="text-sm font-semibold">Select Period</div>
                <button type="button" onClick={() => setPeriodOpen(false)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  {[
                    { key: 'year', label: 'Current / Year' },
                    { key: 'month', label: 'Specific Month' },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPeriodMode(m.key)}
                      className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold border ${
                        periodMode === m.key
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Year
                  </label>
                  <select
                    value={periodYear}
                    onChange={(e) => setPeriodYear(Math.min(Number(e.target.value), currentYear))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                {periodMode === 'month' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Month
                    </label>
                    <select
                      value={periodMonthIndex}
                      onChange={(e) => {
                        const next = Number(e.target.value)
                        const safe = periodYear === currentYear ? Math.min(next, currentMonthIndex) : next
                        setPeriodMonthIndex(safe)
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value} disabled={m.disabled}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPeriodOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const safeYear = Math.min(Number(periodYear || currentYear), currentYear)
                      const safeMonth =
                        safeYear === currentYear
                          ? Math.min(Number(periodMonthIndex || 0), currentMonthIndex)
                          : Number(periodMonthIndex || 0)
                      const startStr =
                        periodMode === 'month'
                          ? `${safeYear}-${pad2(safeMonth + 1)}-01`
                          : `${safeYear}-01-01`
                      let endStr = todayStr
                      if (periodMode === 'year' && safeYear !== currentYear) {
                        endStr = `${safeYear}-12-31`
                      }
                      if (periodMode === 'month' && !(safeYear === currentYear && safeMonth === currentMonthIndex)) {
                        const nextMonthStart = new Date(`${safeYear}-${pad2(safeMonth + 2)}-01T00:00:00+08:00`)
                        endStr = toPhilippinesDate(new Date(nextMonthStart.getTime() - DAY_MS))
                      }
                      setFromDate(startStr)
                      setToDate(endStr)
                      setPeriodOpen(false)
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    Apply to Filters
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
            >
              <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Transaction</p>
                  <p className="text-base font-semibold">{selectedEntry?.type}</p>
                </div>
                <button type="button" onClick={() => setSelectedEntry(null)} className="p-1 rounded-lg hover:bg-white/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Counterparty', value: maskName(selectedEntry?.counterparty_name) },
                  { label: 'Reference', value: selectedEntry?.reference_id || '—' },
                  { label: 'Account Code', value: selectedEntry?.account_code || '—' },
                  { label: 'Amount', value: fmtCurrency(selectedEntry?.amount || 0) },
                  { label: 'Date', value: formatDateTime(selectedEntry?.transaction_date) },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.label}</div>
                    <div className="text-sm font-semibold text-slate-900 text-right">{item.value}</div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">{selectedEntry?.description || '—'}</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default GeneralLedger
