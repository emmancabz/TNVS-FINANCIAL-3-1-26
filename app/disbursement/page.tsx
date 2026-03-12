"use client";

import { useState, useEffect } from "react";
import { Loader2, History, User } from "lucide-react";
import { fetchDisbursements, updateDisbursementStatus } from "@/services/disbursementService";

export default function DisbursementPage() {
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDisbursements();
      setDisbursements(data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReleaseFunds = async (id: string) => {
    try {
      await updateDisbursementStatus(id, 'Settled');
      loadData(); // Refresh table
    } catch (error) {
      alert("Error updating status.");
    }
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Disbursement</h1>
        <p className="text-sm text-gray-500 font-medium">
          AP (Approved) → Disbursement (Pending) → Bank API / Manual Release → Settled
        </p>
      </div>

      <div className="flex gap-6">
        {/* Main Content: Table Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">DV NO.</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">DESCRIPTION</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">AMOUNT</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">STATUS</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">DATE</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
                      <p className="text-xs text-gray-400 mt-2 font-medium">Loading records...</p>
                    </td>
                  </tr>
                ) : (
                  disbursements.map((dv) => (
                    <tr key={dv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-gray-900">{dv.dv_no}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {dv.fin_accounts_payable?.description || "No description"}
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-gray-900">
                        ₱{dv.fin_accounts_payable?.amount?.toLocaleString() || "0"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-semibold ${
                          dv.status === 'Settled' ? 'bg-gray-100 text-gray-500' :
                          dv.status === 'Disbursement (Pending)' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {dv.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 font-medium">
                        {new Date(dv.disbursed_at || Date.now()).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        {dv.status !== 'Settled' && (
                          <button 
                            onClick={() => handleReleaseFunds(dv.id)}
                            className="text-[#2ecc71] hover:underline text-[10px] font-bold"
                          >
                            Release Funds
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Audit Trail (Tugma sa Screenshot mo) */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-4 h-4 text-gray-400" />
            <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">Audit Trail</h3>
          </div>
          <div className="space-y-6">
            {/* Sample Audit Entry 1 */}
            <div className="relative pl-6 border-l border-gray-100">
              <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] bg-green-500 rounded-full border-2 border-white"></div>
              <div className="text-[10px] text-gray-400 mb-1">2026-02-22 14:32:00</div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-700 mb-1">
                <User className="w-3 h-3" /> FIN-001
              </div>
              <div className="text-[10px] text-gray-500">Created AR entry #4521</div>
            </div>

            {/* Sample Audit Entry 2 */}
            <div className="relative pl-6 border-l border-gray-100">
              <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] bg-green-500 rounded-full border-2 border-white"></div>
              <div className="text-[10px] text-gray-400 mb-1">2026-02-22 14:30:15</div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-gray-700 mb-1">
                <User className="w-3 h-3" /> MGR-002
              </div>
              <div className="text-[10px] text-gray-500">Approved DV-2026-044</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}