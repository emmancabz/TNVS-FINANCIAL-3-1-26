import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { fetchAccountsReceivable, fetchDriverBalances } from '../services/accountsReceivableService'
import { fetchCollections } from '../services/collectionsService'

function AccountsReceivable() {
  const [rows, setRows] = useState([])
  const [balances, setBalances] = useState([])
  const [collections, setCollections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [agingFilter, setAgingFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [arData, collectionsData, balanceData] = await Promise.all([
          fetchAccountsReceivable(),
          fetchCollections(),
          fetchDriverBalances(),
        ])
        setRows(arData)
        setCollections(collectionsData)
        setBalances(balanceData)
      } catch (err) {
        console.error('Failed to load accounts receivable', err)
        setError('Failed to load accounts receivable')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const formatDriverName = (row) => {
    return row?.driver_name || row?.name || `Driver #${row?.external_driver_id || row?.driver_id}`
  }

  const getAgingBadge = (status, days) => {
    if (days >= 1) {
      return <span className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700">{days} day(s) late</span>
    }
    return <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-700">Due Today</span>
  }

  const filteredRows = rows.filter((r) => {
    if (agingFilter === '1') return r.days_late === 1
    if (agingFilter === '3') return r.days_late >= 3
    return true
  })

  const totalOutstanding = rows.reduce((sum, r) => sum + (r.outstanding_balance || 0), 0)
  const totalUnpaidDrivers = rows.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 md:p-8 lg:p-10"
    >
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">Accounts Receivable</h1>
        <p className="text-gray-500">Real-time Unpaid Boundary Monitoring · 12:00 AM Daily Aging Reset</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">₱{totalOutstanding.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 font-medium">{totalUnpaidDrivers} driver(s) currently unpaid</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 }}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Aging Status Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-2 rounded-xl bg-blue-50">
              <p className="text-lg font-bold text-blue-700">{rows.filter(r => r.days_late === 0).length}</p>
              <p className="text-[10px] text-blue-600 font-semibold uppercase">Due Today</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-50">
              <p className="text-lg font-bold text-amber-700">{rows.filter(r => r.days_late === 1).length}</p>
              <p className="text-[10px] text-amber-600 font-semibold uppercase">1 Day Late</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-orange-50">
              <p className="text-lg font-bold text-orange-700">{rows.filter(r => r.days_late === 2).length}</p>
              <p className="text-[10px] text-orange-600 font-semibold uppercase">2 Days Late</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-red-50">
              <p className="text-lg font-bold text-red-700">{rows.filter(r => r.days_late >= 3).length}</p>
              <p className="text-[10px] text-red-600 font-semibold uppercase">3+ Days Late</p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAgingFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  agingFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Unpaid
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter('1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  agingFilter === '1' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                1 Day Late
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter('3')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  agingFilter === '3' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                3+ Days Late
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Showing {filteredRows.length} Unpaid Drivers</span>
          </div>

          <motion.div
            layout
            className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Driver</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Outstanding</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Aging Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {filteredRows.map((r) => (
                      <motion.tr
                        key={r.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{formatDriverName(r)}</span>
                            <span className="text-[10px] text-gray-400 font-medium">Driver ID: #{r.external_driver_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-red-600">
                            ₱{Number(r.outstanding_balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {getAgingBadge(r.status, r.days_late)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase bg-gray-100 text-gray-500">
                            {r.status}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                    {!isLoading && filteredRows.length === 0 && (
                      <tr>
                        <td className="px-6 py-10 text-center text-sm text-gray-400 font-medium" colSpan={4}>
                          No drivers found matching current filter
                        </td>
                      </tr>
                    )}
                    {isLoading && (
                      <tr>
                        <td className="px-6 py-10 text-center text-sm text-gray-400 font-medium" colSpan={4}>
                          Refreshing aging data...
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}


export default AccountsReceivable
