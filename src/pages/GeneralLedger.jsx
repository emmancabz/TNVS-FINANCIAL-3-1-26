import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, TrendingUp, TrendingDown, X, Info, Calendar, Hash, CreditCard } from 'lucide-react'
import { fetchGeneralLedgerEntries } from '../services/generalLedgerService'

function GeneralLedger() {
  const [entries, setEntries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState(null) // State para sa Modal
  const rowsPerPage = 10

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchGeneralLedgerEntries()
        setEntries(data)
      } catch (err) {
        console.error('Failed to load general ledger entries', err)
        setError('Failed to load general ledger entries')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const totalDebit = entries.reduce((sum, row) => sum + (row.debit || 0), 0)
  const totalCredit = entries.reduce((sum, row) => sum + (row.credit || 0), 0)
  const netBalance = totalDebit - totalCredit
  const isBalanced = totalDebit === totalCredit
  const totalPages = Math.max(1, Math.ceil(entries.length / rowsPerPage))

  useEffect(() => {
    setCurrentPage(1)
  }, [entries.length])

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage
    return entries.slice(start, start + rowsPerPage)
  }, [entries, currentPage, rowsPerPage])

  const formatDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 md:p-8 lg:p-10"
    >
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">General Ledger</h1>
        <p className="text-gray-500 text-sm">Auto Double-Entry Journaling · Automated Profit & Loss statements</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-[#2ecc71]" />
          <div>
            <p className="text-xs font-medium text-gray-500">Revenue</p>
            <p className="text-xl font-semibold text-gray-900">₱{totalDebit.toLocaleString()}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <TrendingDown className="w-8 h-8 text-amber-500" />
          <div>
            <p className="text-xs font-medium text-gray-500">Expenses</p>
            <p className="text-xl font-semibold text-gray-900">₱{totalCredit.toLocaleString()}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-[#2ecc71]/30 bg-[#2ecc71]/5 p-5 flex items-center gap-3">
          <FileText className="w-8 h-8 text-[#2ecc71]" />
          <div>
            <p className="text-xs font-medium text-gray-500">Net Profit</p>
            <p className="text-xl font-bold text-[#166534]">₱{netBalance.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>

      {/* Table Section */}
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <motion.div layout className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Debit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRows.map((row) => (
                    <motion.tr
                      key={row.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedEntry(row)} // Click event para sa modal
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3 font-medium text-[#166534]">₱{Number(row.debit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-medium text-amber-700">₱{Number(row.credit || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-[11px]">{row.account_code || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]">{row.reference_id || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{row.description}</td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(row.transaction_date)}</td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 font-bold text-gray-900 text-xs">Debit: ₱{totalDebit.toLocaleString()}</td>
                    <td className="px-4 py-3 font-bold text-gray-900 text-xs">Credit: ₱{totalCredit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500 italic text-[11px]" colSpan={2}>
                      Status: {isBalanced ? 'Balanced' : 'Unbalanced'}
                    </td>
                    <td className="px-4 py-3" colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500">
            <span className="uppercase tracking-widest text-[10px] font-semibold">Page {currentPage} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-xl border border-gray-200 font-semibold disabled:opacity-40 hover:bg-gray-50 transition-all">Previous</button>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-xl border border-gray-200 font-semibold disabled:opacity-40 hover:bg-gray-50 transition-all">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* --- DETAILED ENTRY MODAL (Same style as AP) --- */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntry(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* Dark Header Section */}
              <div className="bg-[#1e293b] p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#2ecc71] px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">Posted</span>
                    <button onClick={() => setSelectedEntry(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">GL REFERENCE</p>
                <h2 className="text-lg font-mono font-semibold break-all">{selectedEntry.reference_id}</h2>
              </div>

              {/* Body Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-50 bg-gray-50/50 p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Account Code</p>
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                      <Hash className="w-4 h-4 text-gray-400" />
                      {selectedEntry.account_code}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-50 bg-gray-50/50 p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date Created</p>
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatDate(selectedEntry.transaction_date)}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-50 bg-gray-50/50 p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedEntry.description}</p>
                </div>

                {/* Amount Section (Big Box) */}
                <div className="rounded-2xl bg-[#f0fdf4] border border-[#2ecc71]/20 p-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-[#166534] uppercase">Ledger Impact</p>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">Debit</p>
                          <p className="text-xl font-bold text-gray-900">₱{Number(selectedEntry.debit || 0).toLocaleString()}</p>
                        </div>
                        <div className="h-10 w-px bg-gray-200" />
                        <div>
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">Credit</p>
                          <p className="text-xl font-bold text-gray-900">₱{Number(selectedEntry.credit || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-full bg-white p-2.5 shadow-sm">
                      <CreditCard className="w-6 h-6 text-[#2ecc71]" />
                    </div>
                  </div>
                </div>

                {/* System Info Footnote */}
                <div className="bg-blue-50/50 rounded-2xl p-4 flex gap-3 items-start border border-blue-100">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold text-blue-800 uppercase">System Note</p>
                    <p className="text-[11px] text-blue-600 italic">This entry was automatically posted by the double-entry journaling service. Modifications require financial admin clearance.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default GeneralLedger