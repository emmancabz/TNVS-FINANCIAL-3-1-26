import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { fetchCollections, fetchCollectionsTotal } from '../services/collectionsService'

function Collections() {
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCollected, setTotalCollected] = useState(0)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const [data, total] = await Promise.all([
          fetchCollections(), 
          fetchCollectionsTotal()
        ])
        setRows(data)
        setTotalCollected(total)
      } catch (err) {
        console.error('Failed to load collections', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Collections</h1>
          <p className="text-gray-500">Payments received from drivers since 12:00 AM.</p>
        </div>
        <div className="px-5 py-3 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center gap-3">
          <Wallet className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Total Today</p>
            <p className="text-lg font-bold text-gray-900">₱{totalCollected.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase">Driver Name</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase">Reference</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase">Amount</th>
              <th className="px-6 py-4 font-bold text-gray-400 uppercase text-right">Time Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-green-50/30 transition-colors">
                <td className="px-6 py-4 font-bold text-gray-900">{row.driver_name}</td>
                <td className="px-6 py-4 text-gray-500 font-mono text-[11px]">{row.ar_id}</td>
                <td className="px-6 py-4 font-bold text-green-700">₱{Number(row.amount_paid).toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-500 text-right">
                  {new Date(row.collected_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

export default Collections