import {
  CheckCircle,
  FileText,
  AlertTriangle,
  Download,
  RotateCcw,
  Calendar,
  TrendingUp,
} from "lucide-react";

export default function GeneralLedgerPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">General Ledger</h1>
        <p className="text-gray-600">Central accounting ledger with auto-posting and validation</p>
      </div>

      {/* Core Automations Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary-600" />
          Core Automations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Auto-posting from All Modules</h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically posts transactions from Disbursement, AP/AR, Budget, and Collections modules.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Last post: 5 mins ago</span>
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2">Debit = Credit Validation</h3>
            <p className="text-sm text-gray-600 mb-3">
              Ensures all journal entries balance (Total Debits = Total Credits) before posting.
            </p>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">All entries balanced</span>
            </div>
          </div>

          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Mismatch Detection: SL vs GL
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Automatically detects discrepancies between Subsidiary Ledgers and General Ledger.
            </p>
            <div className="mt-2">
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">No mismatches</span>
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
              <Calendar className="w-4 h-4" />
              Period Closing Controls
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Lock accounting periods to prevent modifications after closing. Current period: February 2026
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Unlocked</span>
              <button className="text-xs text-primary-600 hover:text-primary-700">Lock Period</button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Auto-generate Financial Reports
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Generate Trial Balance, Balance Sheet, Income Statement, and Cash Flow automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Trial Balance
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Balance Sheet
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Income Statement
              </button>
              <button className="px-3 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700">
                Cash Flow
              </button>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Entry Reversal
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Reverse incorrect journal entries with automatic audit trail creation.
            </p>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">
              Reverse Entry
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recurring Monthly Journal Entries
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Set up automatic monthly journal entries (e.g., depreciation, accruals).
            </p>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
              Manage Recurring Entries
            </button>
          </div>
        </div>
      </div>

      {/* GL Entries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Journal Entries</h2>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Create Manual Entry
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Entry No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Debit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Credit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">JE-2026-123</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 10, 2026</td>
                <td className="px-4 py-3 text-sm text-gray-600">Payment to ABC Supplies</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱25,000.00</td>
                <td className="px-4 py-3 text-sm text-gray-900">-</td>
                <td className="px-4 py-3 text-sm text-gray-600">Disbursement</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Posted</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">JE-2026-122</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 10, 2026</td>
                <td className="px-4 py-3 text-sm text-gray-600">Cash - Payment</td>
                <td className="px-4 py-3 text-sm text-gray-900">-</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱25,000.00</td>
                <td className="px-4 py-3 text-sm text-gray-600">Disbursement</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Posted</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">JE-2026-121</td>
                <td className="px-4 py-3 text-sm text-gray-600">Feb 9, 2026</td>
                <td className="px-4 py-3 text-sm text-gray-600">Collection from Driver</td>
                <td className="px-4 py-3 text-sm text-gray-900">₱5,000.00</td>
                <td className="px-4 py-3 text-sm text-gray-900">-</td>
                <td className="px-4 py-3 text-sm text-gray-600">Collections</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Posted</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
