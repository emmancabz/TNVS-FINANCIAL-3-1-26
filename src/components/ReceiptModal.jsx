import { X } from 'lucide-react'

const logoUrl = new URL('../assets/images/logo.jpg', import.meta.url).href

function ReceiptModal({ isOpen, onClose, data }) {
  if (!isOpen) return null
  const refNo = data?.refNo || 'RCP-' + Math.floor(10000 + Math.random() * 90000)
  const driverName = data?.driverName || '—'
  const amountVal = data?.boundaryAmount ?? data?.amount
  const amount = amountVal != null && amountVal !== '' ? `₱${Number(amountVal).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'
  const date = data?.date || new Date().toISOString().slice(0, 10)
  const paymentMethod = data?.modeOfPayment || data?.paymentMethod || '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Receipt Preview</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg print:hidden"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 print:p-4" id="receipt-content">
          <div className="flex justify-center mb-6">
            <img
              src={logoUrl}
              alt="Company Logo"
              className="h-16 w-auto object-contain"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
          <div className="text-center border-b border-gray-200 pb-4 mb-4">
            <p className="text-sm font-semibold text-gray-700">OFFICIAL RECEIPT</p>
            <p className="text-xs text-gray-500 mt-1">Boundary Collection</p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-2 text-gray-600">Reference No.</td>
                <td className="py-2 text-right font-medium text-gray-900">{refNo}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Date</td>
                <td className="py-2 text-right font-medium text-gray-900">{date}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Driver Name</td>
                <td className="py-2 text-right font-medium text-gray-900">{driverName}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Amount</td>
                <td className="py-2 text-right font-semibold text-primary-600 text-lg">{amount}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">Mode of Payment</td>
                <td className="py-2 text-right font-medium text-gray-900">{paymentMethod}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            TNVS Finance System · Thank you for your payment
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
          >
            Print
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReceiptModal
