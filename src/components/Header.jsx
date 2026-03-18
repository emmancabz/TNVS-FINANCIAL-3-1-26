import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, X, LogOut, Settings, Plus, ReceiptText, Activity, Trash2 } from 'lucide-react'
import { supabase } from '../../database/supabase'
import {
  fetchNotifications,
  markAllNotificationsRead,
} from '../services/notificationsService'
import { fetchReceiptHistory, clearAllReceiptHistory } from '../services/receiptHistoryService'

function Notifications({ isOpen, onClose, onOpen }) {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchNotifications(20)
        setNotifications(data)
      } catch (err) {
        const message = err?.message || err
        console.error('Failed to load notifications', message)
      }
    }
    load()

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const hasUnread = unreadCount > 0

  const handleToggle = async () => {
    if (isOpen) {
      onClose()
    } else {
      onOpen()
      if (hasUnread) {
        try {
          await markAllNotificationsRead()
          setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        } catch (err) {
          const message = err?.message || err
          console.error('Failed to mark notifications read', message)
        }
      }
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200"
      >
        <Bell className="w-5 h-5" strokeWidth={1.6} />
        {hasUnread && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-card border border-gray-100 z-[100] overflow-hidden transition-all duration-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 cursor-pointer transition-colors duration-150"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notif.is_read ? 'bg-transparent' : 'bg-emerald-500'}`} />
                    <div>
                      <p className="text-sm text-gray-900 font-medium">{notif.content || notif.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">
                        {notif.type} · {new Date(notif.created_at).toLocaleString('en-PH')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReceiptHistory({ isOpen, onClose, onOpen }) {
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
      setClearProgress(prev => {
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
    <div className="relative">
      <button
        onClick={() => (isOpen ? onClose() : onOpen())}
        className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
        title="Receipt History"
      >
        <ReceiptText className="w-5 h-5" strokeWidth={1.6} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-card border border-gray-100 z-[100] overflow-hidden transition-all duration-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Receipt History</h3>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={isClearing ? cancelClear : startClear}
                  className={`p-1.5 rounded-lg transition-colors ${isClearing ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                  title={isClearing ? 'Cancel Clear' : 'Clear All'}
                >
                  {isClearing ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          </div>
          
          {isClearing && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Clearing History...</span>
                <span className="text-[10px] font-bold text-red-600">{Math.round(clearProgress)}%</span>
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
                    ₱{Number(item.details?.amount || 0).toLocaleString()} · {new Date(item.created_at).toLocaleString('en-PH')}
                  </p>
                </div>
              ))
            )}
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [activeSince] = useState(() => Date.now())
  const [activeTime, setActiveTime] = useState('0m')
  
  // Single Active Modal Logic
  const [activeModal, setActiveModal] = useState(null) // 'notifications', 'receipts', 'audit'

  const [auditItems, setAuditItems] = useState([])
  const [auditError, setAuditError] = useState('')
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const dropdownRef = useRef(null)

  // DYNAMIC MONTH LOGIC
  const currentMonth = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTime(formatActiveTime(Date.now() - activeSince))
    }, 1000)
    return () => clearInterval(interval)
  }, [activeSince])

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (activeModal !== 'audit') return
    const loadAudits = async () => {
      setIsAuditLoading(true)
      setAuditError('')
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data, error } = await supabase
          .from('fin_audit_logs')
          .select('id, action, created_at, user_id')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        setAuditItems(data || [])
      } catch (err) {
        const message = err?.message || err
        setAuditError(message)
      } finally {
        setIsAuditLoading(false)
      }
    }
    loadAudits()
  }, [activeModal])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      sessionStorage.removeItem('isLoggedIn')
      navigate('/')
    } catch (err) {
      console.error('Logout failed:', err)
      navigate('/')
    }
  }

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 md:px-6 py-3 flex-shrink-0 z-50">
      <div className="flex items-center w-full gap-4 min-w-0">
        <div className="flex-1 min-w-0 max-w-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={1.6} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-full pl-10 pr-4 py-2 bg-gray-50/80 border border-gray-100 rounded-full text-sm text-gray-900 placeholder:text-gray-500/70 focus:outline-none focus:border-gray-200 focus:bg-white transition-all duration-200 shadow-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0 ml-auto pl-4">
          <button
            type="button"
            onClick={() => navigate('/collections', { state: { openQuickCollect: true } })}
            className="p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-300 hover:scale-105"
            title="Quick Collect"
          >
            <Plus className="w-5 h-5" strokeWidth={1.6} />
          </button>
          
          <Notifications 
            isOpen={activeModal === 'notifications'} 
            onOpen={() => setActiveModal('notifications')}
            onClose={() => setActiveModal(null)}
          />

          <ReceiptHistory 
            isOpen={activeModal === 'receipts'}
            onOpen={() => setActiveModal('receipts')}
            onClose={() => setActiveModal(null)}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveModal(prev => prev === 'audit' ? null : 'audit')}
              className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-105 ${activeModal === 'audit' ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              title="Audit Trail"
            >
              <Activity className="w-5 h-5" strokeWidth={1.6} />
            </button>

            {activeModal === 'audit' && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-card border border-gray-100 z-[100] overflow-hidden transition-all duration-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Audit Trail ({currentMonth})
                  </h3>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {isAuditLoading && (
                    <div className="p-6 text-center text-gray-500 text-sm">Loading audit logs...</div>
                  )}
                  {!isAuditLoading && auditError && (
                    <div className="p-6 text-center text-red-600 text-sm">{auditError}</div>
                  )}
                  {!isAuditLoading && !auditError && auditItems.length === 0 && (
                    <div className="p-6 text-center text-gray-500 text-sm">No recent audit logs</div>
                  )}
                  {!isAuditLoading &&
                    !auditError &&
                    auditItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50/80 transition-colors"
                      >
                        <p className="text-sm text-gray-900 font-medium">{item.action}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">
                          {new Date(item.created_at).toLocaleString('en-PH')} · {item.user_id || 'System'}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-gray-100 flex-shrink-0" aria-hidden />
          <div className="relative flex items-center gap-3 flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              onMouseEnter={() => setProfileOpen(true)}
              className="flex items-center gap-3 outline-none rounded-xl focus:ring-2 focus:ring-gray-200 focus:ring-offset-2"
            >
              <div
                className="w-10 h-10 rounded-full bg-[#2ecc71] flex items-center justify-center text-white text-sm font-semibold border-2 border-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                aria-hidden
              >
                A
              </div>
              <span className="hidden md:inline text-sm text-gray-700 font-medium">Finance Admin</span>
            </button>
            {profileOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-100 z-50 overflow-hidden"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  animation: 'fadeSlide 0.2s ease-out',
                }}
              >
                <div className="p-5 space-y-4">
                  <div className="h-px bg-gray-100" />
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" strokeWidth={1.6} />
                    Profile Settings
                  </button>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className="text-sm text-gray-700">Dark Mode</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={darkMode}
                      onClick={() => setDarkMode(!darkMode)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${darkMode ? 'bg-[#2ecc71]' : 'bg-gray-200'}`}
                    >
                      <span
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 left-1"
                        style={{ transform: darkMode ? 'translateX(22px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                </div>
                <div className="p-3 pt-0">
                  <div className="h-px bg-gray-100 mb-3" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
