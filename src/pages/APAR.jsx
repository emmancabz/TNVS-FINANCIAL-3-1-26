import {
  CheckCircle,
  Calendar,
  FileText,
  User,
  Link2,
  Bell,
  History,
} from 'lucide-react'

function APAR() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Accounts Payable / Accounts Receivable</h1>
        <p className="text-gray-600">Manage vendor payables and customer receivables</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Accounts Payable</h2>

        {/* AP: Company payables only — Maintenance is driver-funded */}
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">AP by Type (Company only)</h3>
          <p className="text-sm text-gray-600 mb-3">Track company payables. Fuel purchases (e.g. EnviroCab) are company-paid. Maintenance is driver-funded — not in company AP.</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">Fuel Purchases (AP)</span>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            AP Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Due Date Calculator Section
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically calculates payment due dates based on invoice date and payment terms.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">Active</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2">Auto-aging Buckets</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically categorizes payables into aging buckets: Current, 1-30 days, 31-60 days, 61-90 days, Over 90 days.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">Current: ₱1.2M</span>
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">1-30: ₱800K</span>
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">31-60: ₱300K</span>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">Over 90: ₱200K</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Invoice → DV → Payment Linking
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Links invoices to Disbursement Vouchers and tracks payment status.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">12 invoices linked</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Vendor Profiles
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Manage vendor information, payment terms, and transaction history.
              </p>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                View Vendors
              </button>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200 md:col-span-2">
              <h4 className="font-semibold text-gray-900 mb-2">Partial/Full Payment UI</h4>
              <p className="text-sm text-gray-600 mb-3">
                Process partial or full payments with automatic allocation to invoices.
              </p>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                Process Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Accounts Receivable</h2>

        {/* AR: Boundary remittances */}
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Boundary Remittances (AR)</h3>
          <p className="text-sm text-gray-600 mb-3">Drivers remit boundary via Grab, Indrive, Joyride. Record boundary receivables here.</p>
          <span className="inline-block px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium">Boundary Remittances (AR)</span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            AR Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2">Auto-generate Billing</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically generates billings based on TNVS driver/partner transactions (trips, commissions, deductions).
              </p>
              <div className="mt-2">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Weekly billing active</span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded ml-2">Monthly billing active</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2">Auto-aging</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically calculates aging for receivables based on billing date.
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-600">Aging updated daily</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Overdue Reminder UI
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatically sends reminders for overdue receivables.
              </p>
              <div className="mt-2">
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">5 overdue accounts</span>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <h4 className="font-semibold text-gray-900 mb-2">OR Generator UI</h4>
              <p className="text-sm text-gray-600 mb-3">
                Generate Official Receipts for payments received.
              </p>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                Generate OR
              </button>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200 md:col-span-2">
              <h4 className="font-semibold text-gray-900 mb-2">Customer/Driver History Table</h4>
              <p className="text-sm text-gray-600 mb-3">
                View complete transaction history for each customer/driver.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Customer/Driver</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Due Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-900">Driver-001</td>
                      <td className="px-4 py-2 text-sm text-gray-900">₱5,000</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Feb 12, 2026</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Paid</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-900">Driver-002</td>
                      <td className="px-4 py-2 text-sm text-gray-900">₱3,500</td>
                      <td className="px-4 py-2 text-sm text-gray-600">Feb 15, 2026</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default APAR
