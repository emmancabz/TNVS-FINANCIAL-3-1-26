// src/components/AuditTrail.jsx
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, User, Activity, Shield, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../database/supabase'

function AuditTrail() {
  const [logEntries, setLogEntries] = useState([])
  const [selectedLog, setSelectedLog] = useState(null)

  useEffect(() => {
    const loadLogs = async () => {
      const { data } = await supabase
        .from('fin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setLogEntries(data)
    }
    loadLogs()

    // Realtime update
    const channel = supabase.channel('system-feed').on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'fin_audit_logs' }, 
      (p) => setLogEntries(prev => [p.new, ...prev].slice(0, 20))
    ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">System Activity Feed</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[350px] overflow-y-auto">
        {logEntries.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedLog(log)}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-all group flex items-start justify-between"
          >
            <div className="flex gap-3">
              <div className="mt-1 w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-snug">
                  {log.action}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                  <span className="font-bold text-emerald-500 uppercase">
                    {log.user_email?.split('@')[0] || 'Administrator'}
                  </span>
                  <span>•</span>
                  <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition-colors" />
          </motion.div>
        ))}
      </div>
      
      {/* Modal view para sa detailed action */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Activity Details</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Action</p>
                  <p className="text-xs font-semibold text-gray-800">{selectedLog.action}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                  <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Performed By</p>
                  <p className="text-xs font-semibold text-gray-800">{selectedLog.user_email || 'System Operation'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="w-full mt-6 py-3 bg-gray-900 text-white rounded-2xl text-xs font-bold">Done</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AuditTrail
