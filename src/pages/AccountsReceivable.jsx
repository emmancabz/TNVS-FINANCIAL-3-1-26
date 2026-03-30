import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Bell, ChevronLeft, ChevronRight, Phone, Mail, MessageCircle } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAccountsReceivable } from '../services/accountsReceivableService'
import { fetchTodayBoundaryPayments } from '../services/boundaryService'
import { supabase } from '../../database/supabase'

const getInitials = (name) =>
  name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : 'DR'

const fmtCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`

const clamp = (val, min, max) => Math.max(min, Math.min(max, val))

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

function AccountsReceivable() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // UI States
  const [activeRemindId, setActiveRemindId] = useState(null)
  const [todayPage, setTodayPage] = useState(1)
  const rowsPerPage = 10

  // 1. REACT QUERY: Load Accounts Receivable & Today's Payments
  const { data: arData, isLoading, error: queryError } = useQuery({
    queryKey: ['accountsReceivable'],
    queryFn: async () => {
      const [data, todayPayments] = await Promise.all([
        fetchAccountsReceivable(), 
        fetchTodayBoundaryPayments()
      ])
      
      const ids = Array.from(
        new Set((todayPayments || []).map((p) => Number(p?.driver_id)).filter((x) => Number.isFinite(x)))
      )
      
      return { rows: data || [], paidTodayIds: ids }
    }
  })

  const rows = arData?.rows || []
  const paidTodayIds = arData?.paidTodayIds || []
  const arError = queryError?.message || ''

  // 2. REALTIME SUBSCRIPTION
  useEffect(() => {
    const channel = supabase.channel('ar-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core1_boundary_payments' }, () => {
        // May bagong bayad, i-refresh palihim ang Accounts Receivable table!
        queryClient.invalidateQueries({ queryKey: ['accountsReceivable'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'core1_accounts_receivable' }, () => {
        // Nagbago ang mismong AR records
        queryClient.invalidateQueries({ queryKey: ['accountsReceivable'] })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [queryClient])

  // 3. Data Processing
  const paidTodaySet = useMemo(() => new Set(paidTodayIds), [paidTodayIds])

  const lateRows = useMemo(
    () => (rows || []).filter((r) => Number(r.days_late || 0) > 0),
    [rows]
  )

  const todayUnpaidRows = useMemo(() => {
    return (rows || [])
      .filter((r) => Number(r.days_late || 0) === 0)
      .filter((r) => !paidTodaySet.has(Number(r.external_driver_id)))
  }, [rows, paidTodaySet])

  useEffect(() => {
    setTodayPage(1)
  }, [todayUnpaidRows.length])

  // Pagination Logic
  const todayTotalPages = Math.max(1, Math.ceil(todayUnpaidRows.length / rowsPerPage))
  const todayPageSafe = clamp(todayPage, 1, todayTotalPages)
  const todayStart = (todayPageSafe - 1) * rowsPerPage
  const todayPageRows = todayUnpaidRows.slice(todayStart, todayStart + rowsPerPage)

  const reminderDate = new Date().toLocaleDateString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })

  // Reporting Logic (Naka-connect sa Message module)
  const handleReportToAdmin = (row) => {
    const msg = [
      'Accounts Receivable:',
      row.days_late_text || '2+ days late',
      `Driver: ${maskName(row?.driver_name)}`,
      `License: ${row.license_number ?? '—'}`,
      `Phone: ${row.phone ?? '—'}`,
      `Total Due: ${fmtCurrency(row.outstanding_balance)}`,
    ].join('\n')

    navigate('/message', { state: { prefill: msg } })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className="w-full">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 tracking-tight">Accounts Receivable</h1>
            <p className="text-slate-600 text-sm">
              Drivers stay here until a payment is recorded. Late status updates after each midnight.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Allocated',
              value: fmtCurrency((rows || []).reduce((s, r) => s + Number(r?.daily_boundary_amount || 0), 0)),
              accent: 'text-slate-900',
            },
            {
              label: 'Actual Spent',
              value: fmtCurrency(lateRows.reduce((s, r) => s + Number(r?.outstanding_balance || 0), 0)),
              accent: 'text-slate-900',
            },
            {
              label: 'Committed',
              value: fmtCurrency(todayUnpaidRows.reduce((s, r) => s + Number(r?.daily_boundary_amount || 0), 0)),
              accent: 'text-slate-900',
            },
            {
              label: 'Available Balance',
              value: fmtCurrency(
                (rows || []).reduce((s, r) => s + Number(r?.daily_boundary_amount || 0), 0) -
                  lateRows.reduce((s, r) => s + Number(r?.outstanding_balance || 0), 0) -
                  todayUnpaidRows.reduce((s, r) => s + Number(r?.daily_boundary_amount || 0), 0)
              ),
              accent: 'text-slate-900',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{kpi.label}</p>
              <p className={`text-xl font-black tabular-nums ${kpi.accent}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Late Boundaries</p>
              <p className="text-sm text-gray-600 mt-0.5">Drivers with missed midnights (days late &gt; 0)</p>
            </div>
            <div className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
              {isLoading ? 'Loading…' : `${lateRows.length} driver(s)`}
            </div>
          </div>

          <div className="p-6">
            {isLoading && (
              <div className="h-[760px] overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div key={idx} className="rounded-2xl border border-gray-100 bg-gray-50 h-[92px] animate-pulse" />
                ))}
              </div>
            )}

            {!isLoading && arError && (
              <div className="h-[200px] flex items-center justify-center text-sm text-red-600">{arError}</div>
            )}

            {!isLoading && !arError && lateRows.length === 0 && (
              <div className="h-[200px] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold">
                  ✓
                </div>
                <p className="mt-4 text-base font-bold text-slate-900">No late boundaries</p>
                <p className="mt-1 text-sm text-slate-500">All late accounts are currently cleared.</p>
              </div>
            )}

            {!isLoading && !arError && lateRows.length > 0 && (
              <div className="h-[760px] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lateRows.map((r) => {
                    const isHigh = Number(r.days_late || 0) >= 2
                    return (
                      <div
                        key={r.id}
                        className={`rounded-2xl border bg-white p-4 shadow-sm ${
                          isHigh ? 'border-red-200' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-bold shrink-0 ${
                              isHigh ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {getInitials(r.driver_name)}
                            </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{maskName(r?.driver_name)}</p>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                                ID #{r.external_driver_id} · {r.license_number || '—'}
                              </p>
                            </div>
                          </div>
                          <div className={`text-xs font-bold ${isHigh ? 'text-red-700' : 'text-gray-700'}`}>
                            {r.days_late_text}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</p>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5">{r.phone || '—'}</p>
                          </div>
                          <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Daily Boundary</p>
                            <p className="text-xs font-semibold text-gray-800 mt-0.5 tabular-nums">{fmtCurrency(r.daily_boundary_amount)}</p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700">Balance Due</p>
                          <p className={`text-base font-extrabold tabular-nums ${isHigh ? 'text-red-700' : 'text-slate-900'}`}>
                            {fmtCurrency(r.outstanding_balance)}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => handleReportToAdmin(r)}
                            className="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 flex items-center gap-1.5"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            Report
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveRemindId((prev) => (prev === r.id ? null : r.id))}
                            className="px-3 py-2 rounded-xl border border-emerald-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-emerald-50 flex items-center gap-1.5"
                          >
                            <Bell className="w-4 h-4" />
                            Remind
                          </button>
                        </div>
                        {activeRemindId === r.id && (
                          <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">
                              Quick Reminder
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {r?.phone ? (
                                <a
                                  href={`tel:${r.phone}`}
                                  className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-50"
                                >
                                  <Phone className="w-4 h-4" />
                                  Call
                                </a>
                              ) : (
                                <span className="px-3 py-2 rounded-xl bg-white border border-emerald-100 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 opacity-60">
                                  <Phone className="w-4 h-4" />
                                  Call
                                </span>
                              )}
                              {r?.phone ? (
                                <a
                                  href={`sms:${r.phone}?body=${encodeURIComponent(
                                    `Good day, this is a reminder to settle your outstanding boundary of ${fmtCurrency(
                                      r.outstanding_balance
                                    )} for ${reminderDate}. Thank you!`
                                  )}`}
                                  className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-50"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                  Message
                                </a>
                              ) : (
                                <span className="px-3 py-2 rounded-xl bg-white border border-emerald-100 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 opacity-60">
                                  <MessageCircle className="w-4 h-4" />
                                  Message
                                </span>
                              )}
                              {r?.email ? (
                                <a
                                  href={`mailto:${r.email}?subject=${encodeURIComponent(
                                    'Boundary Payment Reminder'
                                  )}&body=${encodeURIComponent(
                                    `Good day, this is a reminder to settle your outstanding boundary of ${fmtCurrency(
                                      r.outstanding_balance
                                    )} for ${reminderDate}. Thank you!`
                                  )}`}
                                  className="px-3 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-50"
                                >
                                  <Mail className="w-4 h-4" />
                                  Email
                                </a>
                              ) : (
                                <span className="px-3 py-2 rounded-xl bg-white border border-emerald-100 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 opacity-60">
                                  <Mail className="w-4 h-4" />
                                  Email
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Today’s Monitoring</p>
              <p className="text-sm text-gray-600 mt-0.5">Unpaid since 12:00 AM (monitoring only)</p>
            </div>
            <div className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
              {isLoading ? 'Loading…' : `${todayUnpaidRows.length} unpaid`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Driver</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">License</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Phone</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Boundary Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                )}

                {!isLoading && arError && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-red-600">
                      {arError}
                    </td>
                  </tr>
                )}

                {!isLoading && !arError && todayUnpaidRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-700 font-semibold">
                      All drivers have paid for today.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  !arError &&
                  todayPageRows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-bold shrink-0">
                            {getInitials(r.driver_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{maskName(r?.driver_name)}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                              ID #{r.external_driver_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.license_number || '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{r.phone || '—'}</td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900 tabular-nums">
                        {fmtCurrency(r.outstanding_balance)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {!isLoading && !arError && todayUnpaidRows.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Page <span className="font-semibold text-slate-800">{todayPageSafe}</span> of{' '}
                <span className="font-semibold text-slate-800">{todayTotalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTodayPage((p) => Math.max(1, p - 1))}
                  disabled={todayPageSafe === 1}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  type="button"
                  onClick={() => setTodayPage((p) => Math.min(todayTotalPages, p + 1))}
                  disabled={todayPageSafe === todayTotalPages}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-emerald-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default AccountsReceivable