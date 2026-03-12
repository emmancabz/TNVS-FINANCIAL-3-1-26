import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { supabase } from "../../database/supabase";
import { insertReceiptHistory } from "../services/receiptHistoryService";

// ─── Constants ────────────────────────────────────────────────────────────────
const FLOW_LABELS = {
  "Pending Disbursement": {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  Released: {
    label: "Released",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  "AP Approved": {
    label: "AP Approved",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  Settled: {
    label: "Settled",
    color: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
};

// Account codes used for double-entry journaling
// Debit:  5000-XXXX  → Expense account (increases expense)
// Credit: 1010-CASH  → Cash/Bank account (decreases asset)
const GL_EXPENSE_ACCOUNT = "5000-EXP";
const GL_CASH_ACCOUNT = "1010-CASH";

const STATUS_FILTERS = [
  "All",
  "Pending Disbursement",
  "Released",
  "AP Approved",
  "Settled",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
};

const formatTimestamp = (d) =>
  d
    .toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(",", " -");

const formatCurrency = (n) =>
  "₱" +
  Number(n || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = {
  Search: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  ),
  Download: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a1 1 0 001 1h16a1 1 0 001-1v-3"
      />
    </svg>
  ),
  Refresh: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  Check: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  Warning: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  Eye: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  Send: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  ),
  Wallet: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  ),
  Clock: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l4 2" />
    </svg>
  ),
  TrendingUp: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  Ledger: () => (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  ),
  List: () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
};

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon: IconComp,
  colorClass,
  iconBg,
  sub,
}) {
  return (
    <div
      className={`bg-white rounded-2xl border p-5 flex items-start gap-4 shadow-sm ${colorClass}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}
      >
        <IconComp />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 tabular-nums truncate">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── GL Preview Badge ─────────────────────────────────────────────────────────
function GLPreviewBadge({ dvNo, amount, category }) {
  return (
    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon.Ledger />
        <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
          Auto General Ledger Entry Preview
        </p>
      </div>
      <div className="space-y-1.5">
        {[
          {
            type: "DR",
            account: GL_EXPENSE_ACCOUNT,
            label: `Expense — ${category}`,
            amount,
            side: "debit",
            color: "text-red-600",
          },
          {
            type: "CR",
            account: GL_CASH_ACCOUNT,
            label: "Cash / Bank Account",
            amount,
            side: "credit",
            color: "text-emerald-700",
          },
        ].map((line) => (
          <div
            key={line.type}
            className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100"
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black w-5 ${line.color}`}>
                {line.type}
              </span>
              <div>
                <p className="text-[10px] font-mono font-bold text-gray-500">
                  {line.account}
                </p>
                <p className="text-xs text-gray-700 font-medium">
                  {line.label}
                </p>
              </div>
            </div>
            <span className={`text-xs font-bold tabular-nums ${line.color}`}>
              {formatCurrency(amount)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-indigo-500 mt-2 italic">
        These 2 entries will be written to{" "}
        <span className="font-bold">fin_general_ledger</span> automatically on
        release.
      </p>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ row, onClose, onRelease }) {
  if (!row) return null;
  const flow = FLOW_LABELS[row.status];
  const canRelease = row.status === "Pending Disbursement";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-start justify-between sticky top-0 z-10">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">
              Disbursement Voucher
            </p>
            <h2 className="text-white text-lg font-bold font-mono">
              {row.dvNo}
            </h2>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${flow?.color ?? "bg-gray-100 text-gray-600"}`}
          >
            {flow?.label ?? row.status}
          </span>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Payee", value: row.payee },
              { label: "Payment Method", value: row.paymentMethod },
              { label: "Category", value: row.category },
              { label: "Date", value: row.dateFormatted },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                  {label}
                </p>
                <p className="text-sm font-medium text-gray-800 truncate">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
              Description
            </p>
            <p className="text-sm text-gray-800">{row.description}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5 tracking-wider">
                Total Amount
              </p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                {formatCurrency(row.amount)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Icon.Wallet />
            </div>
          </div>

          {/* Workflow timeline */}
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-wider">
              Workflow Progress
            </p>
            <div className="relative flex items-start gap-0">
              {[
                "Budget Approved",
                "Pending Disbursement",
                "Finance Releases",
                "Released & GL Posted",
              ].map((step, i) => {
                const isActive =
                  (step === "Pending Disbursement" &&
                    row.status === "Pending Disbursement") ||
                  (step === "Released & GL Posted" &&
                    row.status === "Released");
                const isPast =
                  step === "Budget Approved" ||
                  (step === "Pending Disbursement" &&
                    row.status === "Released") ||
                  (step === "Finance Releases" && row.status === "Released");
                return (
                  <div key={step} className="flex items-center gap-0 flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border-2 text-[8px] font-black shrink-0
                        ${
                          isActive
                            ? "border-amber-500 bg-amber-100 text-amber-700"
                            : isPast
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-gray-200 bg-white text-gray-300"
                        }`}
                      >
                        {isPast ? "✓" : i + 1}
                      </div>
                      <p
                        className={`text-[9px] font-semibold mt-1 text-center leading-tight max-w-[60px]
                        ${isActive ? "text-amber-700" : isPast ? "text-emerald-700" : "text-gray-300"}`}
                      >
                        {step}
                      </p>
                    </div>
                    {i < 3 && (
                      <div
                        className={`h-px flex-1 mb-4 -mx-1 ${isPast || isActive ? "bg-emerald-300" : "bg-gray-100"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Driver payout badge */}
          {row.payoutRequestId && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 text-base leading-none">
                🏧
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-700 mb-0.5">
                  Driver Payout Request
                </p>
                <p className="text-[11px] text-indigo-600 leading-relaxed">
                  Payout Ref:{" "}
                  <span className="font-mono font-semibold">
                    {row.payoutReferenceNo ?? "—"}
                  </span>{" "}
                  · Method:{" "}
                  <span className="font-semibold">
                    {row.payoutMethod ?? row.paymentMethod}
                  </span>{" "}
                  · Net:{" "}
                  <span className="font-semibold text-indigo-800">
                    {formatCurrency(row.payoutNetAmount)}
                  </span>
                </p>
                {row.payoutAccountNumber && (
                  <p className="text-[11px] text-indigo-500 mt-0.5">
                    Account: {row.payoutAccountNumber}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* GL preview for pending */}
          {canRelease && (
            <GLPreviewBadge
              dvNo={row.dvNo}
              amount={row.amount}
              category={row.category}
            />
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2 border-t border-gray-50 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
          >
            Close
          </button>
          {canRelease && (
            <button
              onClick={() => {
                onClose();
                onRelease(row);
              }}
              className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Icon.Send /> Release & Post to GL
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function Disbursement() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(""); // granular step label
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "date", dir: "desc" });

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchDisbursements = async () => {
    setIsLoading(true);
    setError("");
    try {
      const { data, error } = await supabase
        .from("fin_disbursement")
        .select(
          `
          id, dv_no, status, payment_method, disbursed_at, ap_id,
          payout_request_id,
          fin_accounts_payable (
            id, vendor_name, amount, ref_no, description, category, status,
            approved_by, approved_at
          ),
          core1_payout_requests (
            id, driver_id, amount, fee, net_amount, method,
            account_number, reference_no, status
          )
        `,
        )
        .order("disbursed_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setRows(
        (data || []).map((item) => {
          const pr = item.core1_payout_requests;
          return {
            id: item.id,
            dvNo: item.dv_no,
            apId: item.ap_id,
            apRecordId: item.fin_accounts_payable?.id ?? null,
            payee: item.fin_accounts_payable?.vendor_name ?? "N/A",
            amount: Number(item.fin_accounts_payable?.amount ?? 0),
            refNo: item.fin_accounts_payable?.ref_no ?? null,
            description: item.fin_accounts_payable?.description ?? "—",
            category: item.fin_accounts_payable?.category ?? "—",
            apStatus: item.fin_accounts_payable?.status ?? "—",
            status: item.status ?? "Pending Disbursement",
            paymentMethod: item.payment_method ?? "—",
            date: item.disbursed_at,
            dateFormatted: formatDate(item.disbursed_at),
            // ── Driver payout fields ─────────────────────────────────────────
            payoutRequestId: item.payout_request_id ?? null,
            payoutDriverId: pr?.driver_id ?? null,
            payoutNetAmount: Number(pr?.net_amount ?? 0),
            payoutFee: Number(pr?.fee ?? 0),
            payoutMethod: pr?.method ?? null,
            payoutAccountNumber: pr?.account_number ?? null,
            payoutReferenceNo: pr?.reference_no ?? null,
            payoutRequestStatus: pr?.status ?? null,
          };
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisbursements();
  }, []);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "Pending Disbursement");
    const released = rows.filter((r) => r.status === "Released");
    const totalReleased = released.reduce((s, r) => s + r.amount, 0);
    const totalPending = pending.reduce((s, r) => s + r.amount, 0);
    return {
      pending: pending.length,
      released: released.length,
      totalReleased,
      totalPending,
      total: rows.length,
    };
  }, [rows]);

  // ── Filtered + Sorted rows ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "All")
      list = list.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.dvNo?.toLowerCase().includes(q) ||
          r.payee?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const va = a[sortConfig.key],
        vb = b[sortConfig.key];
      if (sortConfig.key === "amount")
        return sortConfig.dir === "asc" ? va - vb : vb - va;
      if (sortConfig.key === "date")
        return sortConfig.dir === "asc"
          ? new Date(va || 0) - new Date(vb || 0)
          : new Date(vb || 0) - new Date(va || 0);
      return sortConfig.dir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [rows, statusFilter, searchQuery, sortConfig]);

  const toggleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  // ── Release flow ────────────────────────────────────────────────────────────
  const handleReleaseClick = (row) => {
    setSelected(row);
    setConfirmOpen(true);
    setError("");
  };

  const handleConfirmRelease = async () => {
    if (!selected || isProcessing) return;

    // ── Guard: prevent double-release ─────────────────────────────────────────
    if (selected.status !== "Pending Disbursement") {
      setError("This disbursement has already been released.");
      return;
    }

    setIsProcessing(true);
    setProcessingStep("Updating disbursement status…");
    setError("");

    try {
      const now = new Date();
      const nowISO = now.toISOString();
      const { data: authData } = await supabase.auth.getUser();
      const authorizedBy = authData?.user?.email ?? "Finance Admin";

      // ── 1. Update disbursement → Released ─────────────────────────────────
      const { error: disbErr } = await supabase
        .from("fin_disbursement")
        .update({ status: "Released", disbursed_at: nowISO })
        .eq("id", selected.id)
        .eq("status", "Pending Disbursement"); // idempotency guard at DB level
      if (disbErr) throw disbErr;

      // ── 2. Mark AP record as Paid, stamp approver ─────────────────────────
      setProcessingStep("Marking accounts payable as Paid…");
      if (selected.apRecordId) {
        const { error: apErr } = await supabase
          .from("fin_accounts_payable")
          .update({
            status: "Paid",
            approved_by: authorizedBy,
            approved_at: nowISO,
          })
          .eq("id", selected.apRecordId);
        if (apErr) throw apErr;
      }

      // ── 3. Budget deduction (dual-path lookup) ─────────────────────────────
      //   Path A: match via log1_budget_requests.po_reference → fin_budget_management.id
      //   Path B: fallback — match fin_budget_categories.name → fin_budget_management
      setProcessingStep("Deducting from budget…");
      let budgetRow = null;

      if (selected.refNo) {
        const { data: req } = await supabase
          .from("log1_budget_requests")
          .select("budget_category_id")
          .eq("po_reference", selected.refNo)
          .eq("status", "Approved")
          .maybeSingle();
        if (req?.budget_category_id) {
          const { data: bRow } = await supabase
            .from("fin_budget_management")
            .select("id, actual_spend, committed_amount")
            .eq("id", req.budget_category_id)
            .maybeSingle();
          budgetRow = bRow ?? null;
        }
      }

      if (!budgetRow && selected.category && selected.category !== "—") {
        const { data: catRecord } = await supabase
          .from("fin_budget_categories")
          .select("id")
          .ilike("name", selected.category.trim())
          .maybeSingle();
        if (catRecord?.id) {
          const { data: bRow } = await supabase
            .from("fin_budget_management")
            .select("id, actual_spend, committed_amount")
            .eq("budget_category_id", catRecord.id)
            .order("period_year", { ascending: false })
            .limit(1)
            .maybeSingle();
          budgetRow = bRow ?? null;
        }
      }

      if (budgetRow) {
        const { error: budgetErr } = await supabase
          .from("fin_budget_management")
          .update({
            actual_spend: Number(budgetRow.actual_spend || 0) + selected.amount,
            committed_amount: Math.max(
              0,
              Number(budgetRow.committed_amount || 0) - selected.amount,
            ),
            updated_at: nowISO,
          })
          .eq("id", budgetRow.id);
        if (budgetErr) console.warn("Budget deduction warning:", budgetErr);
      }

      // ── 4. Update linked procurement record ────────────────────────────────
      //   fin_accounts_payable.ref_no IS the log1_procurement.id (text PK)
      //   log1_procurement has no po_number column — match on id directly
      if (selected.refNo) {
        const { error: procErr, count } = await supabase
          .from("log1_procurement")
          .update({ status: "For Receiving" })
          .eq("id", selected.refNo);    // ← was .eq("po_number") — column doesn't exist
        if (procErr) console.warn("Procurement status update warning:", procErr.message);
        else console.log(`[Release] log1_procurement id=${selected.refNo} → For Receiving (${count} row updated)`);
      }

      // ── 5. Post DOUBLE-ENTRY to General Ledger ─────────────────────────────
      //
      //   DR  5000-EXP  (Expense account)   → debit = amount,  credit = 0
      //   CR  1010-CASH (Cash/Bank account)  → debit = 0,       credit = amount
      //
      //   Both legs share the same reference_id (fin_disbursement.id) so they
      //   can be paired and traced back to this disbursement.
      //
      setProcessingStep("Posting double-entry to General Ledger…");
      const glDescription = `Disbursement | ${selected.dvNo} | ${selected.payee} | ${selected.category}`;

      const { error: glDebitErr } = await supabase
        .from("fin_general_ledger")
        .insert({
          description: glDescription,
          debit: selected.amount,
          credit: 0,
          account_code: GL_EXPENSE_ACCOUNT,
          reference_id: selected.id, // UUID of fin_disbursement row
          transaction_date: nowISO,
        });
      if (glDebitErr) throw glDebitErr;

      const { error: glCreditErr } = await supabase
        .from("fin_general_ledger")
        .insert({
          description: glDescription,
          debit: 0,
          credit: selected.amount,
          account_code: GL_CASH_ACCOUNT,
          reference_id: selected.id,
          transaction_date: nowISO,
        });
      if (glCreditErr) throw glCreditErr;

      // ── 6. Driver payout — stamp DV reference, NO wallet transaction ──────────
      //
      //  The Core1 PHP handler already:
      //    a) Deducted wallet_balance when the driver SUBMITTED the request
      //    b) Inserted a PAYOUT wallet transaction when APPROVING the request
      //    c) Set payout_request.status = 'APPROVED'
      //
      //  So here we ONLY stamp the DV number onto admin_notes for traceability.
      //  Inserting another wallet transaction here would be a DOUBLE DEDUCTION.
      //
      if (selected.payoutRequestId) {
        setProcessingStep("Stamping payout reference…");
        // Just update admin_notes to record which DV released this payout.
        // Do NOT change status (already APPROVED by Core1) and do NOT
        // insert a wallet transaction (Core1 already did that on approval).
        await supabase
          .from("core1_payout_requests")
          .update({
            admin_notes: `Released via DV ${selected.dvNo} by ${authorizedBy} on ${nowISO}`,
          })
          .eq("id", selected.payoutRequestId);
        // Non-fatal: if this fails, the release still succeeded — just no note
      }

      // ── 7. Generate receipt PDF ────────────────────────────────────────────
      // Note: authorizedBy already resolved at step 1 above
      setProcessingStep("Generating payment voucher PDF…");
      const referenceNumber = `PYMT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const displayTimestamp = formatTimestamp(now);

      const doc = new jsPDF();
      // ── PDF Layout ──────────────────────────────────────────────────────────
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("DISBURSEMENT VOUCHER", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text("Financial System – EnviroCab Electric", 14, 26);
      doc.text(`Reference: ${referenceNumber}`, 14, 33);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Payment Details", 14, 54);
      doc.setLineWidth(0.3);
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 57, 196, 57);

      const rows_pdf = [
        ["DV Number", selected.dvNo],
        ["Payee", selected.payee],
        ["Category", selected.category],
        ["Description", selected.description],
        ["Payment Method", selected.paymentMethod],
        ["Date Released", displayTimestamp],
        ["Authorized By", authorizedBy],
      ];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      let y = 65;
      rows_pdf.forEach(([label, val]) => {
        doc.setTextColor(107, 114, 128);
        doc.text(label, 14, y);
        doc.setTextColor(30, 41, 59);
        doc.text(String(val ?? "—"), 70, y);
        y += 9;
      });

      // Amount box
      doc.setFillColor(236, 253, 245);
      doc.roundedRect(14, y + 4, 182, 22, 3, 3, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(5, 150, 105);
      doc.text("Total Amount Released", 20, y + 14);
      doc.setFontSize(16);
      doc.text(formatCurrency(selected.amount), 140, y + 16);

      // GL section
      y += 36;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("General Ledger Entries (Double-Entry)", 14, y + 4);
      doc.line(14, y + 7, 196, y + 7);

      const glRows = [
        [
          "DR",
          GL_EXPENSE_ACCOUNT,
          `Expense — ${selected.category}`,
          formatCurrency(selected.amount),
          "—",
        ],
        [
          "CR",
          GL_CASH_ACCOUNT,
          "Cash / Bank Account",
          "—",
          formatCurrency(selected.amount),
        ],
      ];
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(107, 114, 128);
      let gy = y + 14;
      ["Type", "Account", "Description", "Debit", "Credit"].forEach((h, i) => {
        doc.text(h, [14, 30, 60, 150, 175][i], gy);
      });
      gy += 6;
      doc.setFont("helvetica", "normal");
      glRows.forEach(([type, acc, desc, dr, cr]) => {
        doc.setTextColor(
          type === "DR" ? 220 : 5,
          type === "DR" ? 38 : 150,
          type === "DR" ? 38 : 105,
        );
        doc.text(type, 14, gy);
        doc.setTextColor(30, 41, 59);
        doc.text(acc, 30, gy);
        doc.text(desc, 60, gy);
        doc.text(dr, 150, gy);
        doc.text(cr, 175, gy);
        gy += 7;
      });

      const pdfUrl = URL.createObjectURL(doc.output("blob"));

      // Log to Receipt History
      await insertReceiptHistory({
        disbursement_id: selected.id,
        details: {
          dvNo: selected.dvNo,
          payee: selected.payee,
          amount: selected.amount,
          referenceNumber,
          authorizedBy,
          timestamp: nowISO,
        },
        created_at: nowISO,
      });

      // ── 8. Update local state (optimistic) ────────────────────────────────
      setRows((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                status: "Released",
                apStatus: "Paid",
                payoutRequestStatus: r.payoutRequestId
                  ? "APPROVED"
                  : r.payoutRequestStatus,
                date: nowISO,
                dateFormatted: formatDate(nowISO),
              }
            : r,
        ),
      );
      setReceiptData({
        pdfUrl,
        referenceNumber,
        displayTimestamp,
        authorizedBy,
        isDriverPayout: !!selected.payoutRequestId,
        payoutDriverId: selected.payoutDriverId,
        payoutNetAmount: selected.payoutNetAmount,
      });
      setConfirmOpen(false);
      setReceiptOpen(true);
    } catch (err) {
      setError("Release failed: " + err.message);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleCloseReceipt = () => {
    if (receiptData?.pdfUrl) URL.revokeObjectURL(receiptData.pdfUrl);
    setReceiptData(null);
    setSelected(null);
    setReceiptOpen(false);
  };

  const SortIcon = ({ k }) =>
    sortConfig.key !== k ? (
      <span className="text-gray-300 ml-1">↕</span>
    ) : (
      <span className="text-slate-600 ml-1">
        {sortConfig.dir === "asc" ? "↑" : "↓"}
      </span>
    );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white">
              <Icon.List />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Disbursement
            </h1>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {[
              { label: "Budget Approved", done: true },
              { label: "Pending Disbursement", active: true },
              { label: "Finance Releases Payment" },
              { label: "Released + GL Posted" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-gray-300 text-xs">→</span>}
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full
                  ${
                    step.done
                      ? "bg-emerald-100 text-emerald-700"
                      : step.active
                        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-300"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={fetchDisbursements}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors font-medium self-start sm:self-auto"
        >
          <Icon.Refresh /> Refresh
        </button>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Records"
          value={stats.total}
          icon={Icon.List}
          colorClass="border-gray-200"
          iconBg="bg-gray-100 text-gray-600"
          sub="All disbursements"
        />
        <SummaryCard
          label="Pending Release"
          value={stats.pending}
          icon={Icon.Clock}
          colorClass="border-amber-200"
          iconBg="bg-amber-100 text-amber-600"
          sub={formatCurrency(stats.totalPending) + " to release"}
        />
        <SummaryCard
          label="Released"
          value={stats.released}
          icon={Icon.Check}
          colorClass="border-emerald-200"
          iconBg="bg-emerald-100 text-emerald-600"
          sub={formatCurrency(stats.totalReleased) + " disbursed"}
        />
        <SummaryCard
          label="Total Released"
          value={formatCurrency(stats.totalReleased)}
          icon={Icon.Ledger}
          colorClass="border-indigo-200"
          iconBg="bg-indigo-100 text-indigo-600"
          sub="GL auto double-entry posted"
        />
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <Icon.Warning /> {error}
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon.Search />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search DV No., payee, description, category…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 bg-gray-50"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap
                  ${statusFilter === f ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {f === "All" ? "All" : (FLOW_LABELS[f]?.label ?? f)}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 pl-1">
          Showing{" "}
          <span className="font-semibold text-gray-600">{filtered.length}</span>{" "}
          of {rows.length} records
        </p>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {[
                  { label: "DV No.", key: "dvNo" },
                  { label: "Payee", key: "payee" },
                  { label: "Category", key: "category" },
                  { label: "Description", key: "description" },
                  { label: "Amount", key: "amount" },
                  { label: "Method", key: "paymentMethod" },
                  { label: "Status", key: "status" },
                  { label: "Date", key: "date" },
                  { label: "Actions", key: null },
                ].map(({ label, key }) => (
                  <th
                    key={label}
                    onClick={() => key && toggleSort(key)}
                    className={`px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap
                      ${key ? "cursor-pointer select-none hover:text-gray-700" : ""}`}
                  >
                    {label}
                    {key && <SortIcon k={key} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <AnimatePresence>
                {filtered.map((row, idx) => {
                  const flow = FLOW_LABELS[row.status];
                  const canRelease = row.status === "Pending Disbursement";
                  return (
                    <motion.tr
                      key={row.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.015 }}
                      className={`group transition-colors ${canRelease ? "hover:bg-amber-50/40" : "hover:bg-gray-50/60"}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {row.dvNo}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                            {row.payee?.charAt(0) ?? "?"}
                          </div>
                          <span className="text-gray-800 font-medium max-w-[130px] truncate">
                            {row.payee}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 max-w-[160px]">
                        <span
                          className="truncate block text-xs"
                          title={row.description}
                        >
                          {row.description}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-gray-900 tabular-nums whitespace-nowrap text-sm">
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-gray-500 text-xs font-medium whitespace-nowrap">
                          {row.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${flow?.color ?? "bg-gray-100 text-gray-600"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${flow?.dot ?? "bg-gray-400"}`}
                          />
                          {flow?.label ?? row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {row.dateFormatted}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelected(row);
                              setDetailOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-gray-100 transition-colors"
                            title="View details"
                          >
                            <Icon.Eye />
                          </button>
                          {canRelease && (
                            <button
                              onClick={() => handleReleaseClick(row)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shadow-sm whitespace-nowrap"
                            >
                              <Icon.Send /> Release
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td className="px-4 py-16 text-center" colSpan={9}>
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg
                        className="w-10 h-10 opacity-30"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium">
                        No disbursements found
                      </p>
                      <p className="text-xs">
                        Try adjusting your search or filter
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-4 py-4">
                    <div className="space-y-2.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          {[...Array(10)].map((_, j) => (
                            <div
                              key={j}
                              className={`h-7 rounded-lg bg-gray-100 animate-pulse ${j === 0 ? "w-28" : j === 4 ? "w-20" : "flex-1"}`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs font-semibold text-gray-600">
              Filtered Total:{" "}
              {formatCurrency(filtered.reduce((s, r) => s + r.amount, 0))}
            </p>
          </div>
        )}
      </div>

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && detailOpen && (
          <DetailModal
            row={selected}
            onClose={() => {
              setDetailOpen(false);
              setSelected(null);
            }}
            onRelease={(row) => {
              setSelected(row);
              setConfirmOpen(true);
              setError("");
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Confirm Release Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => !isProcessing && setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-amber-50 border-b border-amber-100 px-6 py-4 flex items-center gap-3 sticky top-0">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <Icon.Warning />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Confirm Fund Release
                  </h2>
                  <p className="text-xs text-amber-700">
                    This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="p-6">
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Releasing will update the disbursement to{" "}
                  <strong>Released</strong>, mark AP as <strong>Paid</strong>,
                  deduct from budget, and automatically post a{" "}
                  <strong>double-entry</strong> to the General Ledger.
                  {selected.payoutRequestId && (
                    <span className="block mt-1.5 text-indigo-600 font-medium">
                      🏧 This is a driver payout — the payout request will be
                      marked <strong>Approved</strong> and the driver's wallet
                      balance will be updated.
                    </span>
                  )}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "DV No.", value: selected.dvNo },
                      {
                        label: "Payment Method",
                        value: selected.paymentMethod,
                      },
                      { label: "Payee", value: selected.payee },
                      { label: "Category", value: selected.category },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                          {label}
                        </p>
                        <p className="text-xs font-semibold text-gray-800 truncate">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                      Description
                    </p>
                    <p className="text-xs font-semibold text-gray-800">
                      {selected.description}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-emerald-600 mb-0.5 tracking-wider">
                      Amount to Release
                    </p>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(selected.amount)}
                    </p>
                  </div>
                  <GLPreviewBadge
                    dvNo={selected.dvNo}
                    amount={selected.amount}
                    category={selected.category}
                  />
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <Icon.Warning /> {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmRelease}
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 disabled:opacity-60 flex items-center gap-2 transition-colors shadow-sm min-w-[160px] justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                        <span className="text-xs truncate">
                          {processingStep || "Processing…"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Icon.Send /> Confirm Release
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Receipt / Success Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {receiptData && receiptOpen && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={handleCloseReceipt}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                  <Icon.Check />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">
                    Funds Released Successfully
                  </h2>
                  <p className="text-emerald-100 text-xs mt-0.5">
                    Budget deducted · GL entry posted · Voucher ready
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                    Receipt Details
                  </p>
                  {[
                    {
                      label: "Reference No.",
                      value: receiptData.referenceNumber,
                    },
                    { label: "Timestamp", value: receiptData.displayTimestamp },
                    { label: "Authorized by", value: receiptData.authorizedBy },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between text-xs gap-4"
                    >
                      <span className="text-gray-500 font-medium">{label}</span>
                      <span className="text-gray-800 font-semibold text-right truncate">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">
                    Payment Details
                  </p>
                  {[
                    { label: "Payee", value: selected.payee },
                    { label: "DV No.", value: selected.dvNo },
                    { label: "Category", value: selected.category },
                    { label: "Description", value: selected.description },
                    { label: "Payment Method", value: selected.paymentMethod },
                    ...(selected.payoutRequestId
                      ? [
                          {
                            label: "Payout Ref No.",
                            value: selected.payoutReferenceNo ?? "—",
                          },
                          {
                            label: "Driver Account",
                            value: selected.payoutAccountNumber ?? "—",
                          },
                        ]
                      : []),
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between text-xs gap-4"
                    >
                      <span className="text-gray-500 font-medium">{label}</span>
                      <span className="text-gray-800 font-semibold text-right truncate">
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600">
                      Amount Released
                    </span>
                    <span className="text-base font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(selected.amount)}
                    </span>
                  </div>
                </div>

                {/* GL confirmation */}
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon.Ledger />
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                      General Ledger Posted
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      {
                        type: "DR",
                        account: GL_EXPENSE_ACCOUNT,
                        label: `Expense — ${selected.category}`,
                        amount: selected.amount,
                        color: "text-red-600",
                      },
                      {
                        type: "CR",
                        account: GL_CASH_ACCOUNT,
                        label: "Cash / Bank Account",
                        amount: selected.amount,
                        color: "text-emerald-700",
                      },
                    ].map((line) => (
                      <div
                        key={line.type}
                        className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-black w-5 ${line.color}`}
                          >
                            {line.type}
                          </span>
                          <div>
                            <p className="text-[10px] font-mono font-bold text-gray-500">
                              {line.account}
                            </p>
                            <p className="text-xs text-gray-700">
                              {line.label}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold tabular-nums ${line.color}`}
                        >
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={handleCloseReceipt}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() =>
                      receiptData.pdfUrl &&
                      window.open(receiptData.pdfUrl, "_blank")
                    }
                    className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 flex items-center gap-2 transition-colors shadow-sm"
                  >
                    <Icon.Download /> Download Voucher PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Disbursement;
