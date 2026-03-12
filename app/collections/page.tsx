import {
  CheckCircle,
  FileText,
  DollarSign,
  Calendar,
  AlertTriangle,
  History,
  Download,
  TrendingUp,
} from "lucide-react";

export default function CollectionsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Collections</h1>
        <p className="text-gray-600">Manage collections from drivers and partners</p>
      </div>

      {/* Core Automations Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary-600" />
          Core Automations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Auto-generate Billing based on Trips, Commissions, Deductions</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically generates billings for drivers/partners based on trip data, commission calculations, and applicable deductions.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Last billing: Today 08:00 AM</span>
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Penalty Calculations</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically calculates penalties for late payments, violations, or contract breaches.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Penalty rules active</span>
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Payment-to-Invoice Auto-matching</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically matches payments received to outstanding invoices/billings.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Auto-matching active</span>
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Auto-post to AR SL, GL, Cash</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically posts collections to AR Subsidiary Ledger, General Ledger, and Cash accounts.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Last post: 1 hour ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Actions Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          System Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              OR Creation Section
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate Official Receipts for collections received with automatic numbering.
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
              Create OR
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Collection Summary (Daily/Weekly/Monthly)
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              View collection summaries by period with breakdowns by driver, payment method, and category.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Daily
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Weekly
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Monthly
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Overdue Tagging
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically tags overdue collections and generates reminders.
            </p>
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">8 overdue items</span>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <History className="w-4 h-4" />
              Payment History Table
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Complete payment history with search and filter capabilities.
            </p>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
              View History
            </button>
          </div>
        </div>
      </div>

      {/* Collection Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Today's Collections</h3>
          <p className="text-3xl font-bold text-primary-600">₱125,000</p>
          <p className="text-sm text-gray-500 mt-1">45 transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">This Week</h3>
          <p className="text-3xl font-bold text-gray-900">₱850,000</p>
          <p className="text-sm text-gray-500 mt-1">312 transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">This Month</h3>
          <p className="text-3xl font-bold text-gray-900">₱3,200,000</p>
          <p className="text-sm text-gray-500 mt-1">1,245 transactions</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Outstanding</h3>
          <p className="text-3xl font-bold text-yellow-600">₱450,000</p>
          <p className="text-sm text-gray-500 mt-1">28 pending</p>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Collections</h2>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              Record Collection
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">OR No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Driver/Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">OR-2026-045</td>
                <td className="px-4 py-3 text-sm text-gray-600">Driver-001</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱5,000.00</td>
                <td className="px-4 py-3 text-sm text-gray-600">Cash</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 10, 2026</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Posted</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-primary-600 hover:text-primary-700 text-sm">View</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">OR-2026-044</td>
                <td className="px-4 py-3 text-sm text-gray-600">Driver-002</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱3,500.00</td>
                <td className="px-4 py-3 text-sm text-gray-600">Bank Transfer</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 10, 2026</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Posted</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-primary-600 hover:text-primary-700 text-sm">View</button>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">OR-2026-043</td>
                <td className="px-4 py-3 text-sm text-gray-600">Partner-001</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱25,000.00</td>
                <td className="px-4 py-3 text-sm text-gray-600">Check</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 9, 2026</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Pending</span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-primary-600 hover:text-primary-700 text-sm">View</button>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  <button className="text-primary-600 hover:text-primary-700">Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
