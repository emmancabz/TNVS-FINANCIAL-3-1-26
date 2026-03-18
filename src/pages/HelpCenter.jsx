import React, { useState } from 'react';
import { 
  LifeBuoy, Search, BookOpen, Mail, 
  ChevronRight, Shield, Download, History, 
  Upload, Wallet, CreditCard, DollarSign, 
  FileText, Receipt, LayoutDashboard, MessageSquare,
  AlertCircle, ExternalLink
} from 'lucide-react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleEmailSupport = () => {
    const email = "findepartment0@gmail.com";
    const subject = encodeURIComponent("Technical Support Request - TNVS Finance");
    const body = encodeURIComponent("Hi Support Team,\n\nI encountered an issue with...\n\nRegards,\nAdmin User");
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`, '_blank');
  };

  // Documentation Data - Based on your specific modules and services
  const sections = [
    {
      id: 'dashboard',
      title: 'Dashboard & Analytics',
      icon: LayoutDashboard,
      color: 'text-emerald-600',
      content: 'The Dashboard provides a real-time overview of the organization’s financial health. It aggregates data from the Collections and Disbursement services to display Total Revenue, Total Expenses, and Net Profit. Key performance indicators (KPIs) help administrators visualize cash flow trends and identify budget variances at a glance.'
    },
    {
      id: 'disbursement',
      title: 'Disbursement Management',
      icon: Wallet,
      color: 'text-rose-600',
      content: 'The Disbursement module handles all outgoing payments. Users can create Disbursement Vouchers (DV), categorize expenses (e.g., fuel, maintenance, salaries), and track approval statuses. It integrates with the Audit Log Service to ensure every payout is authorized and documented for compliance.'
    },
    {
      id: 'ledger',
      title: 'General Ledger (GL)',
      icon: BookOpen,
      color: 'text-slate-700',
      content: 'The General Ledger acts as the master record of all financial transactions. Every entry made in the Collections or Disbursement modules is automatically posted here. It organizes data into specific accounts (Assets, Liabilities, Equity, Revenue, Expenses) to facilitate the generation of Trial Balances and Financial Statements.'
    },
    {
      id: 'collections',
      title: 'Collections & Revenue',
      icon: CreditCard,
      color: 'text-emerald-600',
      content: 'This module records all incoming funds from TNVS operations. Users must input Official Receipt (OR) numbers, payer details, and payment methods. The Collections Service ensures that revenue data is synchronized with the Dashboard to provide accurate cash-inflow metrics.'
    },
    {
      id: 'ap-ar',
      title: 'Accounts Payable & Receivable',
      icon: Receipt,
      color: 'text-orange-600',
      content: 'The AP module tracks money owed to external vendors and service providers, while the AR module manages funds owed to the organization by partners. These modules use aging reports to help management prioritize payments and follow up on delinquent collections to maintain liquidity.'
    },
    {
      id: 'budget',
      title: 'Budgeting & Allocation',
      icon: DollarSign,
      color: 'text-emerald-600',
      content: 'Budget Management allows administrators to set financial ceilings for different departments or projects. The Budget Requests Service handles the workflow for requesting additional funds, ensuring that all spending remains within the approved fiscal framework.'
    },
    {
      id: 'messages',
      title: 'Internal Communications',
      icon: MessageSquare,
      color: 'text-cyan-600',
      content: 'The Messaging module facilitates secure communication between the Finance Department and other organizational units. It is primarily used for clarifying transaction details, requesting document re-submissions, and notifying staff of budget approvals.'
    },
    {
      id: 'security',
      title: 'Security & Audit Trail',
      icon: Shield,
      color: 'text-emerald-600',
      content: 'Accessed via the Header, Security Settings manage user permissions. The Audit Trail Service records every login, data modification, and deletion. This ensures "Zero-Trust" accountability, allowing admins to track who made a specific change and when.'
    },
    {
      id: 'reporting',
      title: 'Exporting & Document Management',
      icon: Download,
      color: 'text-slate-500',
      content: 'The Export feature (Download icon) allows users to generate PDF or Excel reports for external auditing. The Document Attachment feature (Upload icon) enables the digital storage of physical receipts, invoices, and contracts directly linked to financial records.'
    }
  ];

  // Smart Search Logic
  const filteredSections = sections.filter(section => 
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    section.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-700 pb-24">
      {/* Portal Header */}
      <div className="text-center mb-16 pt-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#2ecc71]/10 rounded-3xl mb-6 shadow-sm border border-[#2ecc71]/20">
          <LifeBuoy className="text-[#2ecc71] w-10 h-10" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Financial Help Center</h1>
        <p className="text-gray-500 text-lg max-w-2xl mx-auto">Complete technical guides for every financial module and utility.</p>
        
        {/* Smart Search Bar */}
        <div className="mt-10 relative max-w-2xl mx-auto">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a module or feature (e.g. 'how to export')..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-[#2ecc71] focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* Dynamic Results Section */}
      <div className="space-y-10">
        {filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <section key={section.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 bg-gray-50 rounded-xl ${section.color}`}>
                  <section.icon size={28} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{section.title}</h2>
              </div>
              <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed text-base">
                <p>{section.content}</p>
              </div>
            </section>
          ))
        ) : (
          /* Smart "No Results" State with Google Integration */
          <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
            <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800">No matching documentation found.</h3>
            <p className="text-gray-500 mt-2 mb-8">Try searching for different keywords or use Google Search below.</p>
            <a 
              href={`https://www.google.com/search?q=${encodeURIComponent("Financial System Guide " + searchQuery)}`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-gray-700 font-bold rounded-xl border border-gray-300 hover:bg-gray-100 transition-all shadow-sm"
            >
              Search "{searchQuery}" on Google <ExternalLink size={16} />
            </a>
          </div>
        )}
      </div>

      {/* Contact Footer - Professional Branding */}
      <div className="mt-24 bg-gray-900 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#2ecc71]/10 rounded-full -mr-40 -mt-40 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">Technical Assistance</h2>
          <p className="text-gray-400 max-w-md text-lg leading-snug">
            Can't find what you're looking for? Email our finance IT support team for direct help.
          </p>
        </div>
        <div className="relative z-10 w-full md:w-auto">
          <button 
            onClick={handleEmailSupport}
            className="w-full flex items-center justify-center gap-3 px-10 py-5 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all active:scale-95 shadow-lg group"
          >
            <Mail size={22} className="group-hover:animate-bounce" /> 
            Email findepartment0@gmail.com
          </button>
        </div>
      </div>

      <div className="text-center mt-12 text-gray-400 text-xs font-bold tracking-widest uppercase">
        <p>© 2026 TNVS Financial System Help Center • © 2026 Envirocab</p>
      </div>
    </div>
  );
}
