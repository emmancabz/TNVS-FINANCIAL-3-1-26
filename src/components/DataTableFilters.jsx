import { Filter } from 'lucide-react'

const DEFAULT_FILTER_OPTIONS = {
  plateNumber: { label: 'Plate Number', placeholder: 'e.g. ABC 1234' },
  driver: { label: 'Driver', placeholder: 'Driver name' },
  vendor: { label: 'Vendor', placeholder: 'Vendor name' },
  dateFrom: { label: 'From Date', type: 'date' },
  dateTo: { label: 'To Date', type: 'date' },
}

function DataTableFilters({ onChange, onClear, options }) {
  const activeFilters = options || DEFAULT_FILTER_OPTIONS
  const filterEntries = Object.entries(activeFilters)

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {filterEntries.map(([key, { label, placeholder, type }]) => (
        <input
          key={key}
          type={type || 'text'}
          placeholder={placeholder || label}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm w-32 md:w-36 focus:outline-none focus:ring-2 focus:ring-[#2ecc71]/30"
          onChange={(e) => onChange?.({ [key]: e.target.value })}
        />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Clear
      </button>
    </div>
  )
}

export default DataTableFilters
