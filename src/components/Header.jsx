import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, LogOut, Wallet, ReceiptText, Activity, Trash2, X, MessageSquare, DollarSign, AlertCircle, CheckCircle, Info, CreditCard } from 'lucide-react'
import { supabase } from '../../database/supabase'
import {
  fetchNotifications,
  markAllNotificationsRead,
  insertNotification,
  ensureNotification
} from '../services/notificationsService'
import { fetchReceiptHistory, clearAllReceiptHistory } from '../services/receiptHistoryService'
import { 
  fetchCollectionsTotalByDate, 
  fetchCollectionsByDate, 
  fetchTotalDrivers 
} from '../services/collectionsService'

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
const toPhilippinesDate = (date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

function CollectionsHover() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [totalToday, setTotalToday] = useState(0)
  const [paidPct, setPaidPct] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      const todayStr = toPhilippinesDate(getPhilippinesNow())
      
      Promise.all([
        fetchCollectionsTotalByDate(todayStr),
        fetchCollectionsByDate(todayStr),
        fetchTotalDrivers()
      ])
        .then(([total, rows, totalDrivers]) => {
          setTotalToday(total || 0)
          
          const paidCount = new Set((rows || []).map((r) => r?.driver_id).filter((x) => x != null)).size
          const pct = totalDrivers ? Math.round((paidCount / totalDrivers) * 100) : 0
          setPaidPct(pct)

          setIsLoading(false)
        })
        .catch((err) => {
          console.error('Failed to fetch collections data', err)
          setIsLoading(false)
        })
    }
  }, [isOpen])

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        onClick={() => navigate('/collections')}
        className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
        title="Collections"
      >
        <Wallet className="w-5 h-5" strokeWidth={1.6} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-2 w-64 z-[100] transition-all duration-200">
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Collections Overview</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                  Total Today
                </p>
                <p className="text-xl font-bold text-emerald-600">
                  {isLoading ? '...' : `₱${totalToday.toLocaleString()}`}
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                    Live Payment Projection
                  </p>
                  <span className="text-[11px] font-bold text-blue-600">
                    {isLoading ? '...' : `${paidPct}%`}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-blue-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-500 ease-out"
                    style={{ width: `${isLoading ? 0 : paidPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TOAST NOTIFICATION SYSTEM ─────────────────────────────────
function ToastNotification({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  const toastColors = {
    budget:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-400' },
    message: { bg: 'bg-blue-50',     border: 'border-blue-200',    icon: 'bg-blue-100',    text: 'text-blue-700',    bar: 'bg-blue-400'    },
    success: { bg: 'bg-emerald-50',  border: 'border-emerald-200', icon: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-400' },
    error:   { bg: 'bg-red-50',      border: 'border-red-200',     icon: 'bg-red-100',     text: 'text-red-700',     bar: 'bg-red-400'     },
    info:    { bg: 'bg-gray-50',     border: 'border-gray-200',    icon: 'bg-gray-100',    text: 'text-gray-700',    bar: 'bg-gray-400'    },
    reset:   { bg: 'bg-orange-50',   border: 'border-orange-200',  icon: 'bg-orange-100',  text: 'text-orange-700',  bar: 'bg-orange-400'  },
    payment: { bg: 'bg-purple-50',   border: 'border-purple-200',  icon: 'bg-purple-100',  text: 'text-purple-700',  bar: 'bg-purple-400'  },
  }

  const getToastIcon = (type) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />
      case 'budget':  return <DollarSign className="w-4 h-4 text-emerald-500" />
      case 'error':   return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'reset':   return <Activity className="w-4 h-4 text-orange-500" />
      case 'payment': return <CreditCard className="w-4 h-4 text-purple-500" />
      default:        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(110%); }
        }
        @keyframes toastBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .toast-enter { animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .toast-exit  { animation: toastOut 0.3s ease-in forwards; }
        .toast-bar   { animation: toastBar 4s linear forwards; }
      `}</style>
      {toasts.map((toast) => {
        const c = toastColors[toast.type] || toastColors.info
        return (
          <div
            key={toast.id}
            className={`toast-enter pointer-events-auto w-80 rounded-2xl border ${c.bg} ${c.border} shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden`}
          >
            <div className="p-4 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full ${c.icon} flex items-center justify-center flex-shrink-0`}>
                {getToastIcon(toast.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-black uppercase tracking-widest ${c.text} mb-0.5`}>
                  {toast.type === 'reset' ? 'Daily Reset' : toast.type === 'payment' ? 'Disbursement' : toast.type}
                </p>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{toast.content}</p>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors ml-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="h-1 bg-white/50">
              <div className={`h-full ${c.bar} toast-bar`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Notifications() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const lastResetCheckRef = useRef(null)

  // ── Add a toast popup ──────────────────────────────────────
  const addToast = useCallback((content, type) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev.slice(-3), { id, content, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Notification icon for bell dropdown ───────────────────
  const getNotifIcon = (type) => {
    switch (type) {
      case 'message': return <MessageSquare className="w-4 h-4 text-blue-500" />
      case 'budget':  return <DollarSign className="w-4 h-4 text-emerald-500" />
      case 'error':   return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'reset':   return <Activity className="w-4 h-4 text-orange-500" />
      case 'payment': return <CreditCard className="w-4 h-4 text-purple-500" />
      default:        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  // ── 12AM Daily Reset Checker (Philippine Time) ────────────
  useEffect(() => {
    const checkMidnightReset = async () => {
      const now = getPhilippinesNow()
      const todayStr = toPhilippinesDate(now)

      // Only fire once per calendar day
      if (lastResetCheckRef.current === todayStr) return
      lastResetCheckRef.current = todayStr

      // Only trigger between 12:00AM - 12:05AM to avoid false fires
      if (now.getHours() !== 0 || now.getMinutes() > 5) return

      const content = `Collections reset for ${new Date(todayStr).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} — new day started.`
      try {
        await ensureNotification(content, 'reset')
        addToast(content, 'reset')
      } catch(e) { console.error(e) }
    }

    checkMidnightReset()
    const resetTimer = setInterval(checkMidnightReset, 60 * 1000) // check every minute
    return () => clearInterval(resetTimer)
  }, [addToast])

  // ── Main realtime subscriptions ───────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchNotifications(20)
        setNotifications(data)
      } catch (err) {
        console.error('Failed to load notifications', err)
      }
    }
    load()

    // 1. New notification inserted → update bell list
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fin_notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    // 2. Budget Requests
    const budgetChannel = supabase
      .channel('budget_notif_system')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fin_budget_requests' },
        (payload) => {
          setTimeout(async () => {
            try {
              const content = `Budget Request: ${payload.new.purpose || 'No description'} — ₱${Number(payload.new.amount || 0).toLocaleString()}`
              await ensureNotification(content, 'budget')
              addToast(content, 'budget')
            } catch(e) { console.error(e) }
          }, Math.random() * 1000)
        }
      )
      .subscribe()

    // 3. Messages — notify ALL admins (insert once, read by everyone)
    const msgChannel = supabase
      .channel('msg_notif_system')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_messages' },
        async (payload) => {
          try {
            const { data: authData } = await supabase.auth.getUser()
            // Only the sender inserts the notification (prevents duplicates)
            if (authData?.user?.id === payload.new.sender_id) {
              const content = `New message from ${payload.new.sender_name || 'Admin'}: ${(payload.new.message || '').slice(0, 60)}${(payload.new.message || '').length > 60 ? '…' : ''}`
              await insertNotification({
                user_id: null,
                type: 'message',
                content,
                is_read: false,
                created_at: new Date().toISOString()
              })
              addToast(content, 'message')
            } else {
              // Other admins see toast from realtime but don't re-insert
              const content = `New message from ${payload.new.sender_name || 'Admin'}`
              addToast(content, 'message')
            }
          } catch(e) { console.error(e) }
        }
      )
      .subscribe()

    // 4. Disbursement — pag na-approve/released ang payment
    const disbChannel = supabase
      .channel('disbursement_notif_system')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fin_disbursements' },
        async (payload) => {
          try {
            const newStatus = (payload.new.status || '').toLowerCase()
            const oldStatus = (payload.old.status || '').toLowerCase()
            const isReleased = ['approved', 'released', 'paid'].includes(newStatus)
            const wasNotReleased = !['approved', 'released', 'paid'].includes(oldStatus)

            if (isReleased && wasNotReleased) {
              const content = `Payment Released: DV ${payload.new.dv_no || '—'} — ₱${Number(payload.new.amount || 0).toLocaleString()} to ${payload.new.payee || 'Payee'}`
              await ensureNotification(content, 'payment')
              addToast(content, 'payment')
            }
          } catch(e) { console.error(e) }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      supabase.removeChannel(budgetChannel)
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(disbChannel)
    }
  }, [addToast])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const hasUnread = unreadCount > 0

  useEffect(() => {
    if (isOpen && hasUnread) {
      markAllNotificationsRead()
        .then(() => setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))))
        .catch((err) => console.error('Failed to mark notifications read', err))
    }
  }, [isOpen, hasUnread])

  return (
    <>
      {/* ── TOAST LAYER ── */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* ── BELL BUTTON + DROPDOWN ── */}
      <div
        className="relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <button className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
          <Bell className="w-5 h-5" strokeWidth={1.6} />
          {hasUnread && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full pt-2 w-80 z-[100] transition-all duration-200">
            <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {hasUnread && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 flex flex-col items-center gap-2 text-gray-400">
                    <Bell className="w-8 h-8 opacity-30" />
                    <p className="text-sm font-medium">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-gray-50 last:border-0 transition-colors duration-150 flex gap-3 ${notif.is_read ? 'hover:bg-gray-50/80' : 'bg-blue-50/30 hover:bg-blue-50/50'}`}
                    >
                      <div className="mt-0.5 w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${notif.is_read ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>
                          {notif.content || notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
                            {notif.type} · {new Date(notif.created_at).toLocaleString('en-PH')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function ReceiptHistory() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [clearProgress, setClearProgress] = useState(0)
  const clearTimerRef = useRef(null)
  const progressIntervalRef = useRef(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await fetchReceiptHistory()
      setItems(data)
    } catch (err) {
      console.error('Failed to load receipts', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  const startClear = () => {
    setIsClearing(true)
    setClearProgress(0)

    const duration = 5000
    const interval = 50
    const step = (interval / duration) * 100

    progressIntervalRef.current = setInterval(() => {
      setClearProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressIntervalRef.current)
          return 100
        }
        return prev + step
      })
    }, interval)

    clearTimerRef.current = setTimeout(async () => {
      try {
        await clearAllReceiptHistory()
        setItems([])
        setIsClearing(false)
        setClearProgress(0)
      } catch (err) {
        console.error('Failed to clear receipts', err)
        setIsClearing(false)
      }
    }, duration)
  }

  const cancelClear = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current)
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    setIsClearing(false)
    setClearProgress(0)
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
        title="Receipt History"
      >
        <ReceiptText className="w-5 h-5" strokeWidth={1.6} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full pt-2 w-80 z-[100] transition-all duration-200">
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">Receipt History</h3>
              {items.length > 0 && (
                <button
                  onClick={isClearing ? cancelClear : startClear}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isClearing
                      ? 'bg-red-100 text-red-600'
                      : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                  title={isClearing ? 'Cancel Clear' : 'Clear All'}
                >
                  {isClearing ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {isClearing && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">
                    Clearing History...
                  </span>
                  <span className="text-[10px] font-bold text-red-600">
                    {Math.round(clearProgress)}%
                  </span>
                </div>
                <div className="h-1 w-full bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-100 ease-linear"
                    style={{ width: `${clearProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-6 text-center text-gray-500 text-sm">Loading receipts...</div>
              ) : items.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No recent receipts</div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors"
                  >
                    <p className="text-sm text-gray-900 font-medium">
                      DV {item.details?.dvNo || '—'} · {item.details?.payee || '—'}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">
                      ₱{Number(item.details?.amount || 0).toLocaleString()} ·{' '}
                      {new Date(item.created_at).toLocaleString('en-PH')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditTrailHover() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [auditItems, setAuditItems] = useState([])
  const [isAuditLoading, setIsAuditLoading] = useState(false)

  const categoryColors = {
    AUTH:         'text-blue-600 bg-blue-50',
    SECURITY:     'text-red-600 bg-red-50',
    TRANSACTION:  'text-emerald-600 bg-emerald-50',
    SYSTEM:       'text-gray-600 bg-gray-100',
    BUDGET:       'text-amber-600 bg-amber-50',
    MESSAGE:      'text-indigo-600 bg-indigo-50',
    COLLECTIONS:  'text-teal-600 bg-teal-50',
    DISBURSEMENT: 'text-purple-600 bg-purple-50',
  }

  useEffect(() => {
    if (!isOpen) return
    const loadAudits = async () => {
      setIsAuditLoading(true)
      try {
        const { data } = await supabase
          .from('fin_audit_logs')
          .select('id, action, created_at, user_email, category, status, module')
          .order('created_at', { ascending: false })
          .limit(8)
        setAuditItems(data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsAuditLoading(false)
      }
    }
    loadAudits()
  }, [isOpen])

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 ${
          isOpen ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
        }`}
        title="Audit Trail"
      >
        <Activity className="w-5 h-5" strokeWidth={1.6} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-2 w-80 z-[100]">
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-semibold text-gray-900 text-sm">Live Audit Feed</h3>
              </div>
              <button
                onClick={() => navigate('/audit-trail')}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {isAuditLoading ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded-full w-3/4" />
                      <div className="h-2.5 bg-gray-50 rounded-full w-1/2" />
                    </div>
                  ))}
                </div>
              ) : auditItems.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">No recent activity</div>
              ) : (
                auditItems.map((item) => {
                  const cc = categoryColors[item.category] || categoryColors.SYSTEM
                  const isSuccess = !item.status || item.status === 'SUCCESS'
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate('/audit-trail')}
                      className="px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-gray-900 font-mono truncate flex-1">{item.action}</p>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          isSuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {item.status || 'SUCCESS'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.category && (
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${cc}`}>
                            {item.category}
                          </span>
                        )}
                        <p className="text-[10px] text-gray-400 font-semibold">
                          {item.user_email?.split('@')[0] || 'System'} ·{' '}
                          {new Date(item.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => navigate('/audit-trail')}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Activity className="w-3.5 h-3.5" />
                Open Full Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatActiveTime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function Header() {
  const navigate = useNavigate()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchContainerRef = useRef(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [activeSince] = useState(() => Date.now())
  const [activeTime, setActiveTime] = useState('0m')

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTime(formatActiveTime(Date.now() - activeSince))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSince])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      setShowSearchDropdown(false)
      return
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true)
      setShowSearchDropdown(true)
      try {
        const q = `%${searchQuery}%`
        
        const [ap, ar, br, gl, col, disb] = await Promise.all([
          supabase.from('fin_accounts_payable').select('id, ref_no, vendor_name, description').or(`vendor_name.ilike.${q},ref_no.ilike.${q},description.ilike.${q}`).limit(3),
          supabase.from('fin_accounts_receivable').select('id, trip_id, external_vehicle_id').or(`trip_id.ilike.${q},external_vehicle_id.ilike.${q}`).limit(3),
          supabase.from('fin_budget_requests').select('id, requesting_dept, purpose').or(`purpose.ilike.${q},requesting_dept.ilike.${q}`).limit(3),
          supabase.from('fin_general_ledger').select('id, description, account_code').or(`description.ilike.${q},account_code.ilike.${q}`).limit(3),
          supabase.from('core1_boundary_payments').select('id, reference_no').ilike('reference_no', q).limit(3),
          supabase.from('fin_disbursement').select('id, dv_no, status').ilike('dv_no', q).limit(3)
        ])

        let results = []
        
        if (ap.data) ap.data.forEach(item => results.push({ id: `ap-${item.id}`, title: item.vendor_name || 'Vendor', subtitle: item.ref_no, module: 'Accounts Payable', path: '/accounts-payable' }))
        if (ar.data) ar.data.forEach(item => results.push({ id: `ar-${item.id}`, title: `Trip ${item.trip_id || ''}`, subtitle: `Vehicle: ${item.external_vehicle_id || ''}`, module: 'Accounts Receivable', path: '/accounts-receivable' }))
        if (br.data) br.data.forEach(item => results.push({ id: `br-${item.id}`, title: item.purpose, subtitle: item.requesting_dept, module: 'Budget Management', path: '/budget-management' }))
        if (gl.data) gl.data.forEach(item => results.push({ id: `gl-${item.id}`, title: item.description, subtitle: `Account: ${item.account_code || ''}`, module: 'General Ledger', path: '/general-ledger' }))
        if (col.data) col.data.forEach(item => results.push({ id: `col-${item.id}`, title: item.reference_no, subtitle: 'Payment Reference', module: 'Collections', path: '/collections' }))
        if (disb.data) disb.data.forEach(item => results.push({ id: `disb-${item.id}`, title: `DV ${item.dv_no}`, subtitle: `Status: ${item.status}`, module: 'Disbursement', path: '/disbursement' }))

        setSearchResults(results)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }, 400) 

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  const performLogout = async () => {
    try {
      await supabase.auth.signOut()
      sessionStorage.removeItem('isLoggedIn')
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
      navigate('/')
    }
  }

  const handleResultClick = (path) => {
    navigate(path)
    setShowSearchDropdown(false)
    setSearchQuery('')
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl backdrop-saturate-150 border-b border-gray-200/50 shadow-sm px-4 md:px-6 py-3 flex-shrink-0 transition-all duration-300">
        <div className="flex items-center w-full gap-4 min-w-0">
          
          <div className="flex-1 min-w-0 max-w-sm" ref={searchContainerRef}>
            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                strokeWidth={1.6}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setShowSearchDropdown(true)}
                placeholder="Search across modules..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-full text-sm text-gray-900 placeholder:text-gray-500/70 focus:outline-none focus:border-gray-200 focus:bg-white transition-all duration-200 shadow-sm"
              />

              {showSearchDropdown && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden z-[100] max-h-96 flex flex-col">
                  <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider">Search Results</h3>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                      <div className="p-6 text-center text-gray-500 text-sm">Searching records...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((res) => (
                          <div
                            key={res.id}
                            onClick={() => handleResultClick(res.path)}
                            className="px-4 py-3 hover:bg-emerald-50/80 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                          >
                            <p className="text-sm font-semibold text-gray-900 truncate">{res.title}</p>
                            <div className="flex items-center justify-between mt-1 gap-2">
                              <p className="text-xs text-gray-500 truncate">{res.subtitle}</p>
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                                {res.module}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">No results found for "{searchQuery}"</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 flex-shrink-0 ml-auto pl-4">
            <CollectionsHover />
            <Notifications />
            <ReceiptHistory />
            <AuditTrailHover />

            <div className="w-px h-6 bg-gray-200/50 flex-shrink-0" aria-hidden />

            <div
              className="relative flex items-center gap-3 flex-shrink-0"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <button className="flex items-center gap-3 outline-none rounded-xl focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 transition-transform active:scale-95">
                <div
                  className="w-10 h-10 rounded-full bg-[#2ecc71] flex items-center justify-center text-white text-sm font-semibold border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  aria-hidden
                >
                  A
                </div>
                <span className="hidden md:inline text-sm text-gray-700 font-medium">
                  Finance Admin
                </span>
              </button>
              
              {profileOpen && (
                <div
                  className="absolute right-0 top-full pt-2 w-72 z-50 transition-all duration-200"
                  style={{ animation: 'fadeSlide 0.2s ease-out' }}
                >
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden">
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/50 rounded-xl border border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Active Time</span>
                        <span className="text-sm font-bold text-emerald-600">{activeTime}</span>
                      </div>
                    </div>
                    <div className="p-3 pt-0">
                      <div className="h-px bg-gray-100 mb-3" />
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          setShowLogoutModal(true)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" strokeWidth={1.8} />
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* CUSTOM LOGOUT MODAL */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden" 
            style={{ animation: 'fadeSlide 0.2s ease-out' }}
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-5 border border-red-100">
                <LogOut className="w-6 h-6 text-red-600" strokeWidth={1.8} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to log out? 
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowLogoutModal(false)} 
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={performLogout} 
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Header