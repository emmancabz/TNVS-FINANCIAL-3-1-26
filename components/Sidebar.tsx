import { Link, useLocation } from "react-router-dom";
import {
  Wallet,
  BookOpen,
  FileText,
  DollarSign,
  CreditCard,
  LayoutDashboard,
  MessageSquare
} from "lucide-react";
const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/message", label: "Messages", icon: MessageSquare }, 
  { href: "/disbursement", label: "Disbursement", icon: Wallet },
  { href: "/general-ledger", label: "General Ledger", icon: BookOpen },
  { href: "/accounts-payable", label: "Accounts Payable", icon: FileText }, // Matched to App.jsx
  { href: "/accounts-receivable", label: "Accounts Receivable", icon: FileText }, // Matched to App.jsx
  { href: "/budget-management", label: "Budget Management", icon: DollarSign },
  { href: "/collections", label: "Collections", icon: CreditCard },
];
export default function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#2ecc71]">TNVS Finance</h1>
        <p className="text-sm text-gray-600 mt-1">Financial Management</p>
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto"> {}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-green-50 text-[#2ecc71] font-semibold" 
                  : "text-gray-700 hover:bg-gray-50"
              }`} >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
            </Link>
          );}
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          © 2026 TNVS Finance System
        </div>
      </div>
    </aside>
  );
}