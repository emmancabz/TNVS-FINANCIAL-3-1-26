import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../database/supabase'
import { fetchAuditLogs } from '../services/Auditlogservice'
import {
  Shield, Search, Filter, X, ChevronRight, ChevronLeft,
  AlertCircle, CheckCircle, AlertTriangle, Clock, User,
  Monitor, Globe, Hash, Database, Activity, Download,
  Eye, Lock
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────
const CATEGORIES = ['ALL', 'AUTH', 'SECURITY', 'TRANSACTION', 'SYSTEM', 'BUDGET', 'MESSAGE', 'COLLECTIONS', 'DISBURSEMENT']
const MODULES    = ['ALL', 'Authentication', 'Collections', 'Disbursement', 'Budget Management', 'Messages']
const STATUSES   = ['ALL', 'SUCCESS', 'FAILED', 'WARNING']

const categoryColors = {
  AUTH:         'bg-blue-50 text-blue-700 border-blue-200',
  SECURITY:     'bg-red-50 text-red-700 border-red-200',
  TRANSACTION:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  SYSTEM:       'bg-gray-100 text-gray-700 border-gray-200',
  BUDGET:       'bg-amber-50 text-amber-700 border-amber-200',
  MESSAGE:      'bg-indigo-50 text-indigo-700 border-indigo-200',
  COLLECTIONS:  'bg-teal-50 text-teal-700 border-teal-200',
  DISBURSEMENT: 'bg-purple-50 text-purple-700 border-purple-200',
}

const statusConfig = {
  SUCCESS: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> },
  FAILED:  { color: 'text-red-600 bg-red-50 border-red-200',             icon: <AlertCircle className="w-3 h-3" /> },
  WARNING: { color: 'text-amber-600 bg-amber-50 border-amber-200',        icon: <AlertTriangle className="w-3 h-3" /> },
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  })
}

// Converts any raw value into a clean, human-readable string (no JSON quotes/braces)
function formatValue(val) {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return val.toLocaleString()
  if (typeof val === 'string') {
    // ISO date/datetime
    if (/^\d{4}-\d{2}-\d{2}(T[\d:.+Z]+)?$/.test(val)) {
      const d = new Date(val)
      if (!isNaN(d)) return d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
    }
    return val === '' ? '—' : val
  }
  if (Array.isArray(val)) return val.length === 0 ? '(empty)' : val.map(formatValue).join(', ')
  if (typeof val === 'object') {
    // Flat single-level objects — show as "key: value" pairs
    const entries = Object.entries(val)
    if (entries.length === 0) return '(empty)'
    return entries.map(([k, v]) => `${k.replace(/_/g, ' ')}: ${formatValue(v)}`).join(' · ')
  }
  return String(val)
}

// Human-friendly key label
function formatKey(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function JsonDiff({ oldValue, newValue }) {
  if (!oldValue && !newValue) return null

  const allKeys = [...new Set([
    ...Object.keys(oldValue || {}),
    ...Object.keys(newValue || {})
  ])]

  const changed   = allKeys.filter(k => JSON.stringify((oldValue || {})[k]) !== JSON.stringify((newValue || {})[k]))
  const unchanged = allKeys.filter(k => JSON.stringify((oldValue || {})[k]) === JSON.stringify((newValue || {})[k]))

  return (
    <div className="space-y-2">
      {changed.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Changed Fields</p>
          <div className="space-y-1.5">
            {changed.map(key => (
              <div key={key} className="rounded-xl overflow-hidden border border-gray-100">
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{formatKey(key)}</span>
                </div>
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="px-3 py-2 bg-red-50/60">
                    <p className="text-[9px] font-bold uppercase text-red-400 mb-1">Before</p>
                    <p className="text-xs font-semibold text-red-700 break-all leading-relaxed">
                      {(oldValue || {})[key] !== undefined ? formatValue((oldValue || {})[key]) : '—'}
                    </p>
                  </div>
                  <div className="px-3 py-2 bg-emerald-50/60">
                    <p className="text-[9px] font-bold uppercase text-emerald-400 mb-1">After</p>
                    <p className="text-xs font-semibold text-emerald-700 break-all leading-relaxed">
                      {(newValue || {})[key] !== undefined ? formatValue((newValue || {})[key]) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {unchanged.length > 0 && (
        <details className="group">
          <summary className="text-[10px] font-bold text-gray-400 cursor-pointer hover:text-gray-600 select-none">
            {unchanged.length} unchanged field{unchanged.length !== 1 ? 's' : ''} ▸
          </summary>
          <div className="mt-1.5 space-y-1">
            {unchanged.map(key => (
              <div key={key} className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{formatKey(key)}</span>
                <span className="text-xs font-semibold text-gray-600 break-all text-right">
                  {formatValue((oldValue || {})[key])}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function DetailModal({ log, onClose }) {
  if (!log) return null

  const sc = statusConfig[log.status] || statusConfig.SUCCESS
  const cc = categoryColors[log.category] || categoryColors.SYSTEM

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        style={{ animation: 'auditModalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes auditModalIn {
            from { opacity: 0; transform: scale(0.94) translateY(8px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Audit Record</h3>
              <p className="text-[10px] text-gray-400 font-mono">{log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status + Category row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${sc.color}`}>
              {sc.icon} {log.status || 'SUCCESS'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${cc}`}>
              {log.category || 'SYSTEM'}
            </span>
            {log.module && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                {log.module}
              </span>
            )}
          </div>

          {/* Action */}
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Action</p>
            <p className="text-sm font-black text-white font-mono">{log.action}</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<User className="w-3.5 h-3.5" />} label="User" value={log.user_email || '—'} mono />
            <InfoCard icon={<Clock className="w-3.5 h-3.5" />} label="Timestamp" value={formatDate(log.created_at)} />
            <InfoCard icon={<Globe className="w-3.5 h-3.5" />} label="IP Address" value={log.ip_address || '—'} mono />
            {log.record_id && <InfoCard icon={<Hash className="w-3.5 h-3.5" />} label="Record ID" value={log.record_id} mono />}
          </div>

          {/* Old / New Value Diff */}
          {(log.old_value || log.new_value) && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Data Changes</p>
              <JsonDiff oldValue={log.old_value} newValue={log.new_value} />
            </div>
          )}

          {/* Details — human readable */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Additional Details</p>
              <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {Object.entries(log.details).map(([key, val]) => (
                  <div key={key} className="flex items-start justify-between gap-4 px-4 py-2.5 bg-white hover:bg-gray-50/60 transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap pt-0.5 shrink-0">{formatKey(key)}</span>
                    <span className="text-xs font-semibold text-gray-700 text-right break-all leading-relaxed">{formatValue(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Agent */}
          {log.user_agent && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Browser / Device</p>
              <p className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 break-all">
                {log.user_agent}
              </p>
            </div>
          )}

          {/* Read-only notice */}
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-[10px] font-bold text-amber-700">This record is immutable — read-only audit log</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl text-sm font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value, mono = false }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-gray-400">
        {icon}
        <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-xs font-semibold text-gray-800 break-all ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

// ── Main AuditTrail Page ───────────────────────────────────────
function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [liveMode, setLiveMode] = useState(true)
  const searchRef = useRef(null)

  const PER_PAGE = 50

  const [filters, setFilters] = useState({
    search: '',
    category: 'ALL',
    module: 'ALL',
    status: 'ALL',
    dateFrom: '',
    dateTo: '',
  })

  const load = useCallback(async (f = filters, p = page) => {
    setLoading(true)
    try {
      const { data, count } = await fetchAuditLogs({
        ...f,
        limit: PER_PAGE,
        offset: p * PER_PAGE,
      })
      setLogs(data)
      setTotal(count)
    } catch (err) {
      console.error('Failed to load audit logs', err)
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(filters, 0), 350)
    return () => clearTimeout(t)
  }, [filters])

  useEffect(() => {
    load(filters, page)
  }, [page])

  // Realtime live feed
  useEffect(() => {
    if (!liveMode) return
    const channel = supabase
      .channel('audit-trail-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fin_audit_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, PER_PAGE))
        setTotal(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [liveMode])

  const updateFilter = (key, val) => {
    setPage(0)
    setFilters(prev => ({ ...prev, [key]: val }))
  }

  const clearFilters = () => {
    setPage(0)
    setFilters({ search: '', category: 'ALL', module: 'ALL', status: 'ALL', dateFrom: '', dateTo: '' })
  }

  const activeFilterCount = [
    filters.category !== 'ALL',
    filters.module !== 'ALL',
    filters.status !== 'ALL',
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length

  const totalPages = Math.ceil(total / PER_PAGE)

  // CSV Export
  const handleExport = () => {
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Category', 'Module', 'Record ID', 'Status', 'IP Address']
    const rows = logs.map(l => [
      l.id, formatDate(l.created_at), l.user_email, l.action,
      l.category, l.module || '', l.record_id || '', l.status || 'SUCCESS', l.ip_address || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-5 max-w-full">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Audit Trail</h1>
            <p className="text-xs text-gray-500 font-medium">
              {total.toLocaleString()} total records · Read-only system log
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live toggle */}
          <button
            onClick={() => setLiveMode(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              liveMode
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-500 border-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${liveMode ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {liveMode ? 'Live' : 'Paused'}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={searchRef}
          type="text"
          value={filters.search}
          onChange={e => updateFilter('search', e.target.value)}
          placeholder="Search by action, user, module, record ID..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 focus:shadow-sm transition-all"
        />
        {filters.search && (
          <button onClick={() => updateFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <X className="w-3 h-3 text-gray-500" />
          </button>
        )}
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4" style={{ animation: 'auditFadeIn 0.2s ease-out' }}>
          <style>{`@keyframes auditFadeIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FilterSelect label="Category" value={filters.category} options={CATEGORIES} onChange={v => updateFilter('category', v)} />
            <FilterSelect label="Module" value={filters.module} options={MODULES} onChange={v => updateFilter('module', v)} />
            <FilterSelect label="Status" value={filters.status} options={STATUSES} onChange={v => updateFilter('status', v)} />
            <div />
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-gray-300" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-gray-300" />
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
          {['Timestamp', 'Action', 'User', 'Module', 'Category', 'Status'].map(h => (
            <p key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</p>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-3 bg-gray-100 rounded-full" />
                ))}
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
              <Database className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold">No audit logs found</p>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs font-bold text-emerald-600 hover:text-emerald-700">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            logs.map((log) => {
              const sc = statusConfig[log.status] || statusConfig.SUCCESS
              const cc = categoryColors[log.category] || categoryColors.SYSTEM
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors group items-center"
                >
                  <div>
                    <p className="text-xs font-mono font-semibold text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900 font-mono truncate">{log.action}</p>
                    {log.record_id && (
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">#{log.record_id}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 truncate">{log.user_email?.split('@')[0] || '—'}</p>
                    {log.ip_address && (
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">{log.ip_address}</p>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-600 truncate">{log.module || '—'}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase border w-fit ${cc}`}>
                    {log.category || 'SYSTEM'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${sc.color}`}>
                      {sc.icon} {log.status || 'SUCCESS'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500">
            Showing {page * PER_PAGE + 1}–{Math.min((page + 1) * PER_PAGE, total)} of {total.toLocaleString()} records
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const p = page < 3 ? i : page - 2 + i
                if (p >= totalPages) return null
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-colors ${
                      p === page ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedLog && <DetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  )
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none focus:border-gray-300 cursor-pointer"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

export default AuditTrail