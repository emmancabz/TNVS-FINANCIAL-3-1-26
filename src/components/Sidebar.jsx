import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import {
  LayoutDashboard,
  MessageSquare,
  Wallet,
  BookOpen,
  CreditCard,
  DollarSign,
  FileText,
  Receipt,
  BrainCircuit,
  ShieldCheck,
} from 'lucide-react'

let logoUrl
try {
  logoUrl = new URL('../assets/images/Sidebar.png', import.meta.url).href
} catch {
  logoUrl = '/image/Sidebar.png'
}

const SIDEBAR_WIDTH_EXPANDED = 260
const SIDEBAR_WIDTH_COLLAPSED = 72

// Dinagdag natin ang AI Agent category sa dulo
const categories = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/message', label: 'Message', icon: MessageSquare },
      { href: '/audit-trail', label: 'Audit Trail', icon: ShieldCheck },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/disbursement', label: 'Disbursement', icon: Wallet },
      { href: '/general-ledger', label: 'General Ledger', icon: BookOpen },
      { href: '/collections', label: 'Collections', icon: CreditCard },
      { href: '/budget-management', label: 'Budget', icon: DollarSign },
    ],
  },
  {
    label: 'Cashflow',
    items: [
      { href: '/accounts-payable', label: 'Accounts Payable', icon: FileText },
      { href: '/accounts-receivable', label: 'Accounts Receivable', icon: Receipt },
    ],
  },
  {
    label: 'AI Agent',
    items: [
      { href: '/financial-ai', label: 'Cabwise', icon: BrainCircuit },
    ],
  },
]

function Sidebar({ isExpanded, toggleSidebar }) {
  const w = isExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED

  return (
    <aside
      className="bg-white flex flex-col h-screen fixed left-0 top-0 z-10 overflow-hidden"
      style={{
        width: w,
        boxShadow: '2px 0 24px rgba(0,0,0,0.06)',
        transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Top row: X/Menu only - minimal spacing above */}
      <div className="flex-shrink-0 pt-2 px-2 pb-0">
        <div className={`flex ${isExpanded ? 'justify-end' : 'justify-center'}`}>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all duration-200"
            aria-label="Toggle sidebar"
          >
            {isExpanded ? <X className="w-5 h-5" strokeWidth={1.8} /> : <Menu className="w-5 h-5" strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {/* Logo block: centered with generous padding above and below */}
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center px-3 py-6 min-h-[120px] border-b border-gray-100"
        style={{ transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="flex flex-col items-center justify-center w-full overflow-hidden">
          <div className="flex items-center justify-center w-full min-h-[56px] py-2">
            <img
              src={logoUrl}
              alt="Logo"
              className="object-contain object-center transition-all duration-300"
              style={{
                maxHeight: isExpanded ? 56 : 44,
                maxWidth: isExpanded ? 180 : 44,
                width: 'auto',
                height: 'auto',
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                const next = e.target.nextElementSibling
                if (next) next.classList.remove('hidden')
              }}
            />
            <div className="hidden w-11 h-11 rounded-xl bg-[#2ecc71]/20 items-center justify-center text-[#2ecc71] font-semibold text-sm shrink-0">
              FS
            </div>
          </div>
          {isExpanded && (
            <span
              className="mt-2 text-[11px] font-bold uppercase text-[#2ecc71] whitespace-nowrap overflow-hidden transition-opacity duration-300 text-center w-full"
              style={{ letterSpacing: '0.28em' }}
            >
              Financial System
            </span>
          )}
        </div>
      </div>

      {/* Navigation by category */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-6">
        {categories.map((cat) => (
          <div key={cat.label}>
            {isExpanded ? (
              <div className="px-3 mb-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {cat.label}
                </span>
              </div>
            ) : (
              <div className="h-px bg-gray-100 mx-2 my-2" aria-hidden />
            )}
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-[#2ecc71]/12 text-[#166534] font-medium'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } ${!isExpanded ? 'justify-center px-0' : ''}`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 opacity-90" strokeWidth={1.6} />
                    {isExpanded && (
                      <span className="whitespace-nowrap text-sm truncate transition-opacity duration-300">
                        {item.label}
                      </span>
                    )}
                    {!isExpanded && (
                      <div
                        className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg"
                        style={{ transition: 'opacity 200ms, visibility 200ms' }}
                      >
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-gray-900" />
                      </div>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: separator + Shortcuts, Help Center */}
      <div className="flex-shrink-0 border-t border-gray-100">
        <div className={`px-3 py-4 pb-5 flex gap-4 ${isExpanded ? 'justify-center' : 'flex-col items-center gap-2'}`}>
          <Link to="/shortcuts" className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            Shortcuts
          </Link>
          <Link to="/help-center" className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            Help Center
          </Link>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar