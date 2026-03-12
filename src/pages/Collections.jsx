
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard, Banknote, Link2 } from 'lucide-react'
import { fetchCollections, fetchCollectionsTotal, insertCollection } from '../services/collectionsService'
import {
  fetchAccountsReceivable,
  updateAccountsReceivable,
} from '../services/accountsReceivableService'
import { insertGeneralLedgerEntry } from '../services/generalLedgerService'
import { useLocation, useNavigate } from 'react-router-dom'
import { insertNotification } from '../services/notificationsService'

function Collections() {
  const location = useLocation()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [totalCollected, setTotalCollected] = useState(0)
  const [driverOptions, setDriverOptions] = useState([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptData, setReceiptData] = useState(null)
  const [formState, setFormState] = useState({
    arId: '',
    driverQuery: '',
    amountPaid: '',
    paymentMethod: 'Cash',
  })

  const formatPersonName = (record, fallback = 'Unknown') => {
    const first = record?.hr_proceedlist?.firstname
    const last = record?.hr_proceedlist?.lastname
    const fullName = [first, last].filter(Boolean).join(' ')
    return fullName || fallback
  }

  const normalizeDriverId = (record) => {
    const value = Number(record?.external_driver_id)
    return Number.isFinite(value) ? value : null
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const [data, total] = await Promise.all([fetchCollections(), fetchCollectionsTotal()])
        setRows(data)
        setTotalCollected(total)
      } catch (err) {
        console.error('Failed to load collections', err)
        setLoadError('Failed to load collections')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (location.state?.openQuickCollect) {
      setFormError('')
      setFormState({ arId: '', driverQuery: '', amountPaid: '700', paymentMethod: 'Cash' })
      setIsFormOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location, navigate])

  useEffect(() => {
    const loadDrivers = async () => {
      setDriversLoading(true)
      try {
        const data = await fetchAccountsReceivable()
        const drivers = data
          .filter((d) => normalizeDriverId(d) && d.hr_proceedlist?.position === 'Driver')
          .map((d) => ({
            id: d.id,
            label: formatPersonName(d, `Driver #${normalizeDriverId(d)}`),
            driverId: normalizeDriverId(d),
            arAmount: d.ar_amount,
            status: d.status,
          }))
        setDriverOptions(drivers)
      } catch (err) {
        const message = err?.message || err
        console.error('Failed to load drivers', message)
      } finally {
        setDriversLoading(false)
      }
    }
    loadDrivers()
  }, [])

  const collectionTypes = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      const key = row.payment_method || 'Unknown'
      map.set(key, (map.get(key) || 0) + (row.amount_paid || 0))
    }
    return Array.from(map.entries()).map(([label, amount]) => ({
      id: label,
      label,
      amount,
      icon: label.toLowerCase().includes('cash') ? Banknote : CreditCard,
    }))
  }, [rows])

  const formatDate = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString('en-PH', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const selectedDriver = driverOptions.find((d) => d.id === formState.arId) || null
  const filteredDrivers = formState.driverQuery
    ? driverOptions.filter((d) =>
        d.label.toLowerCase().includes(formState.driverQuery.toLowerCase())
      )
    : driverOptions
  const showDriverOptions =
    formState.driverQuery && (!selectedDriver || formState.driverQuery !== selectedDriver.label)

  const handleSelectDriver = (driver) => {
    setFormState((prev) => ({
      ...prev,
      arId: driver.id,
      driverQuery: driver.label,
    }))
  }

  const handleQuickAmount = (value) => {
    if (value === 'clear') {
      if (selectedDriver) {
        setFormState((prev) => ({
          ...prev,
          amountPaid: String(selectedDriver.arAmount || 0),
        }))
      }
      return
    }
    setFormState((prev) => ({ ...prev, amountPaid: String(value) }))
  }

  const handleFormChange = (field, value) => {
    if (field === 'driverQuery') {
      setFormState((prev) => ({ ...prev, driverQuery: value, arId: '' }))
      return
    }
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenForm = () => {
    setFormError('')
    setFormState({ arId: '', driverQuery: '', amountPaid: '700', paymentMethod: 'Cash' })
    setIsFormOpen(true)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    if (!formState.arId) {
      setFormError('Driver is required')
      return
    }
    const amount = Number(formState.amountPaid)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Amount paid must be a valid number')
      return
    }

    setIsSubmitting(true)
    setFormError('')
    const collectedAt = new Date().toISOString()

    try {
      const targetAr = driverOptions.find((d) => d.id === formState.arId)
      if (!targetAr) {
        setFormError('No AR record found for this driver')
        setIsSubmitting(false)
        return
      }
      const previousBalance = Number(targetAr.arAmount || 0)
      const newBalance = Math.max(0, previousBalance - amount)
      const newStatus =
        newBalance === 0 ? 'Paid' : newBalance < previousBalance ? 'Partially Paid' : 'Pending'

      const inserted = await insertCollection({
        ar_id: formState.arId,
        amount_paid: amount,
        payment_method: formState.paymentMethod,
        received_by_id: 'system',
        collected_at: collectedAt,
      })
      const saved = inserted[0]
      if (!saved) {
        throw new Error('Collection insert failed')
      }

      await updateAccountsReceivable(formState.arId, { ar_amount: newBalance, status: newStatus })

      await insertGeneralLedgerEntry({
        description: `Collection for ${targetAr.label}`,
        debit: amount,
        credit: amount,
        reference_id: saved?.id ?? null,
        transaction_date: collectedAt,
        account_code: 'COLLECTION',
        approved_by: null,
        approved_at: null,
      })
      await insertNotification({
        message: `New collection recorded for ${targetAr.label}`,
        type: 'success',
        is_read: false,
        created_at: new Date().toISOString(),
      })
      setRows((prev) => [saved, ...prev])
      setReceiptData({
        transactionId: saved.id,
        driverName: targetAr.label,
        amountPaid: amount,
        paymentMethod: formState.paymentMethod,
        collectedAt,
      })
      setIsFormOpen(false)
      setFormState({ arId: '', driverQuery: '', amountPaid: '700', paymentMethod: 'Cash' })
      setTimeout(() => {
        window.print()
      }, 100)
    } catch (err) {
      const message = err?.message || err
      console.error('Failed to record payment', message, err)
      setFormError('Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {receiptData && (
        <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8">
          <div className="max-w-sm mx-auto text-gray-900">
            <div className="text-center mb-4">
              <p className="text-lg font-semibold">TNVS Financial System</p>
              <p className="text-xs">Official Receipt</p>
            </div>
            <div className="border-t border-b border-gray-300 py-3 text-xs space-y-1">
              <p>
                <span className="font-semibold">Transaction ID:</span> {receiptData.transactionId}
              </p>
              <p>
                <span className="font-semibold">Driver:</span> {receiptData.driverName}
              </p>
              <p>
                <span className="font-semibold">Amount:</span> ₱{Number(receiptData.amountPaid).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Payment Method:</span> {receiptData.paymentMethod}
              </p>
              <p>
                <span className="font-semibold">Date:</span> {formatDate(receiptData.collectedAt)}
              </p>
            </div>
            <p className="text-center text-[10px] text-gray-500 mt-4">Thank you</p>
          </div>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto print:hidden"
      >
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2 tracking-tight">Collections</h1>
            <p className="text-gray-500">Automated Daily Boundary Remittances · Real-time Core 1 Integration</p>
          </div>
        </div>

      {/* Compact payment boxes */}
      <div className="flex flex-wrap gap-4 mb-6">
        {collectionTypes.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-gray-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            <div className="w-9 h-9 rounded-lg bg-[#2ecc71]/10 flex items-center justify-center">
              <c.icon className="w-5 h-5 text-[#2ecc71]" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">{c.label}</p>
              <p className="text-lg font-semibold text-gray-900">₱{c.amount.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-dashed border-[#2ecc71]/30 bg-[#2ecc71]/5"
        >
          <Link2 className="w-5 h-5 text-[#2ecc71]" />
          <div>
            <p className="text-xs font-medium text-gray-600">Total Collected</p>
            <p className="text-lg font-bold text-[#166534]">₱{totalCollected.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <motion.div
            layout
            className="rounded-2xl border border-gray-100 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      AR ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Received By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Collected At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.ar_id}</td>
                      <td className="px-4 py-3 text-gray-600">₱{Number(row.amount_paid || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{row.payment_method}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatPersonName(row, row.received_by_id || 'Unknown')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(row.collected_at || row.created_at)}</td>
                    </tr>
                  ))}
                  {!isLoading && rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                        No collections found
                      </td>
                    </tr>
                  )}
                  {isLoading && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                        Loading collections...
                      </td>
                    </tr>
                  )}
                  {!isLoading && loadError && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-red-600" colSpan={5}>
                        {loadError}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>
      </motion.div>
    </>
  )
}

export default Collections
