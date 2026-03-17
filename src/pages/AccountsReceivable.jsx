import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchAccountsReceivable } from '../services/accountsReceivableService'

function AccountsReceivable() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        // Ang service na ang bahala sa filtering logic
        const data = await fetchAccountsReceivable()
        setRows(data)
      } catch (err) {
        console.error('Failed to load AR', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accounts Receivable</h1>
        <p className="text-gray-500 italic">Drivers who haven't paid since 12:00 AM today.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Driver Info</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">License</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Phone</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Boundary Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {rows.map((r) => (
                  <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{r.driver_name}</span>
                        <span className="text-[10px] text-gray-400">ID: #{r.external_driver_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{r.license_number}</td>
                    <td className="px-6 py-4 text-gray-600">{r.phone}</td>
                    <td className="px-6 py-4 text-gray-500">{r.email}</td>
                    <td className="px-6 py-4 font-bold text-red-600 text-right">
                      ₱{Number(r.outstanding_balance).toLocaleString()}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-green-600 font-medium">
                    🎉 All drivers have paid for today!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}

export default AccountsReceivable