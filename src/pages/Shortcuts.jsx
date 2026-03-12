import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Shield, Download, History, Upload,
  Wallet, CreditCard, DollarSign, FileText, 
  Receipt, BookOpen, LayoutDashboard, MessageSquare 
} from 'lucide-react';

export default function Shortcuts() {
  const navigate = useNavigate();

  // Core Finance Actions - Base sa existing routes mo
  const quickActions = [
    { label: 'New Disbursement', path: '/disbursement', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Record Collection', path: '/collections', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Manage Payables', path: '/accounts-payable', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Process Receivables', path: '/accounts-receivable', icon: Receipt, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  // System Utilities - Flexing the Header icons
  const systemTools = [
    { label: 'Security Overview', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Check system permissions.' },
    { label: 'Export Documents', icon: Download, color: 'text-slate-600', bg: 'bg-slate-50', desc: 'Download PDF/Excel reports.' },
    { label: 'Audit Log History', icon: History, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'View recent system activities.' },
    { label: 'File Manager', icon: Upload, color: 'text-cyan-600', bg: 'bg-cyan-50', desc: 'Attach financial documents.' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Zap className="text-[#2ecc71] w-8 h-8 fill-[#2ecc71]/20" /> Financial Shortcuts
        </h1>
        <p className="text-gray-500 mt-2 text-lg">Quick access to essential financial tools and management modules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Section 1: Core Financial Tasks */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <div className="w-8 h-[1px] bg-gray-200"></div> Core Tasks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-4 p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-[#2ecc71]/30 transition-all group text-left"
              >
                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{item.label}</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Go to Module →</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Reporting & Utilities */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <div className="w-8 h-[1px] bg-gray-200"></div> System Utilities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {systemTools.map((tool) => (
              <div key={tool.label} className="flex flex-col p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:bg-gray-50 transition-colors">
                <div className={`${tool.color} mb-3`}><tool.icon size={20} /></div>
                <h3 className="font-bold text-gray-800 text-sm mb-1">{tool.label}</h3>
                <p className="text-[11px] text-gray-500 leading-tight">{tool.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Quick Navigation Footer */}
      <section className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">General Navigation</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
            { label: 'General Ledger', path: '/general-ledger', icon: BookOpen },
            { label: 'Budget Management', path: '/budget-management', icon: DollarSign },
            { label: 'Messages', path: '/message', icon: MessageSquare }
          ].map((nav) => (
            <button
              key={nav.label}
              onClick={() => navigate(nav.path)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-[#2ecc71]/10 hover:text-[#2ecc71] transition-all"
            >
              <nav.icon size={14} /> {nav.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}