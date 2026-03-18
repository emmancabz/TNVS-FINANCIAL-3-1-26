import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Wrench,
  Users,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../database/supabase";

// ─── Source module config ─────────────────────────────────────────────────────
const SOURCE_MODULES = {
  procurement: {
    label: "Procurement",
    icon: Package,
    color: "bg-emerald-100 text-emerald-800",
  },
  "asset-maintenance": {
    label: "Asset Maintenance",
    icon: Wrench,
    color: "bg-amber-100 text-amber-700",
  },
  "hr-payroll": {
    label: "HR Payroll",
    icon: Users,
    color: "bg-emerald-50 text-emerald-800",
  },
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending: { color: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  "Manager Approved": {
    color: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  Approved: {
    color: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "Posted to GL": {
    color: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
  Paid: { color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Rejected: { color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 });

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
};

const maskName = (fullName) => {
  const parts = String(fullName || "")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0]?.[0] ? `${parts[0][0].toUpperCase()}*` : "—";
  const last =
    parts.length > 1 && parts[parts.length - 1]?.[0]
      ? `${parts[parts.length - 1][0].toUpperCase()}*`
      : "";
  return last ? `${first} ${last}` : first;
};

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    color: "bg-gray-100 text-gray-600",
    dot: "bg-gray-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ row, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
            <X className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Reject AP Entry
            </h2>
            <p className="text-xs text-gray-500">
              {row?.ref} · {maskName(row?.vendor)}
            </p>
          </div>
        </div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Reason for rejection <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 mb-4"
          rows={3}
          placeholder="Enter rejection reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(row, reason.trim())}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            Confirm Reject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({
  row,
  onClose,
  onApprove,
  onReject,
  onPostGL,
  actionLoading,
}) {
  if (!row) return null;
  const src =
    SOURCE_MODULES[row.category?.toLowerCase()] || SOURCE_MODULES[row.category];
  const Icon = src?.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
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
              AP Reference
            </p>
            <h2 className="text-white text-lg font-bold font-mono">
              {row.ref}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={row.status} />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Vendor / Payee", value: maskName(row?.vendor) },
              {
                label: "Category",
                value: src ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium ${src.color}`}
                  >
                    {Icon && <Icon className="w-3 h-3" />} {src.label}
                  </span>
                ) : (
                  row.category
                ),
              },
              { label: "Created", value: fmtDate(row.created_at) },
              { label: "Due Date", value: fmtDate(row.due_date) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
                  {label}
                </p>
                <div className="text-sm font-medium text-gray-800">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5 tracking-wider">
              Description
            </p>
            <p className="text-sm text-gray-800">{row.description}</p>
          </div>

          <div
            className={`rounded-xl p-4 flex items-center justify-between border ${
              row.agingBucket === "Overdue" &&
              row.status !== "Paid" &&
              row.status !== "Rejected"
                ? "bg-red-50 border-red-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-0.5 tracking-wider">
                Amount
              </p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {fmt(row.amount)}
              </p>
            </div>
            {row.agingBucket === "Overdue" &&
              row.status !== "Paid" &&
              row.status !== "Rejected" && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-white border border-red-200 px-3 py-1.5 rounded-xl">
                  <AlertTriangle className="w-3.5 h-3.5" /> Overdue{" "}
                  {row.agingDays}d
                </span>
              )}
          </div>

          {/* Approval info */}
          {row.approved_by && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 space-y-0.5">
              <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-600">
                Approval Info
              </p>
              <p>
                Approved by:{" "}
                <span className="font-semibold">{row.approved_by}</span>
              </p>
              {row.approved_at && <p>Date: {fmtDate(row.approved_at)}</p>}
            </div>
          )}

          {/* GL Entry Preview */}
          {row.status === "Manager Approved" && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                GL Entry Preview
              </p>
              <div className="space-y-1">
                {[
                  {
                    type: "DR",
                    account: "5000-EXP",
                    label: `Expense — ${src?.label ?? row.category}`,
                    color: "text-red-600",
                  },
                  {
                    type: "CR",
                    account: "2000-AP",
                    label: "Accounts Payable Liability",
                    color: "text-emerald-700",
                  },
                ].map((line) => (
                  <div
                    key={line.type}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-100"
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
                        <p className="text-xs text-gray-700">{line.label}</p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold tabular-nums ${line.color}`}
                    >
                      {fmt(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-emerald-500 mt-2 italic">
                Posting will also auto-create a Disbursement Voucher.
              </p>
            </div>
          )}

          {/* Action buttons */}
          {(row.status === "Pending" || row.status === "Manager Approved") && (
            <div className="flex gap-2 pt-1">
              {row.status === "Pending" && (
                <>
                  <button
                    onClick={() => onApprove(row)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Check Budget & Approve
                  </button>
                  <button
                    onClick={() => onReject(row)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </>
              )}
              {row.status === "Manager Approved" && (
                <button
                  onClick={() => onPostGL(row)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  Post to GL & Create DV
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
function AccountsPayable() {
  const [rows, setRows] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category: "" });
  const [budgetWarning, setBudgetWarning] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const approvedStatuses = useMemo(() => new Set(["Approved"]), []);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const today = new Date();

  // ── Load AP records ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const { data: apData, error: apErr } = await supabase
          .from("fin_accounts_payable")
          .select(
            `id, ref_no, vendor_name, amount, description, status, category,
             created_at, due_date, approved_by, approved_at, employee_id,
             hr_proceedlist ( firstname, lastname )`,
          )
          .order("created_at", { ascending: false });
        if (apErr) throw apErr;

        const apIds = (apData || [])
          .map((r) => r?.id)
          .filter(Boolean);
        let releasedMap = new Set();
        if (apIds.length > 0) {
          const { data: disbursements, error: disbErr } = await supabase
            .from("fin_disbursement")
            .select("ap_id, status")
            .in("ap_id", apIds)
            .eq("status", "RELEASED");
          if (disbErr) throw disbErr;
          (disbursements || []).forEach((d) => {
            if (d?.ap_id) releasedMap.add(d.ap_id);
          });
        }

        const { data: budgetData, error: budgetErr } = await supabase
          .from("fin_budget_management")
          .select("id, category, limit_amount, actual_spend");
        if (budgetErr) throw budgetErr;

        setRows(
          (apData || []).map((item) => ({
            ...item,
            _released: releasedMap.has(item?.id),
          })),
        );
        setBudgets(Array.isArray(budgetData) ? budgetData : []);
      } catch (err) {
        setError("Failed to load accounts payable: " + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const mappedRows = useMemo(
    () =>
      rows.map((item) => {
        const first = item?.hr_proceedlist?.firstname;
        const last = item?.hr_proceedlist?.lastname;
        const employeeName = [first, last].filter(Boolean).join(" ");
        const isPayroll = String(item?.category || "").toLowerCase().includes("payroll");
        const vendorName = item?.vendor_name ?? "Unknown";
        const vendor = isPayroll && employeeName ? employeeName : vendorName;
        const createdAt = item?.created_at ?? null;
        const createdDate = createdAt ? new Date(createdAt) : null;
        const createdTime = createdDate?.getTime?.();
        const safeCreatedTime = Number.isFinite(createdTime) ? createdTime : today.getTime();
        const agingDays = Math.max(0, Math.floor((today.getTime() - safeCreatedTime) / 86400000));
        return {
          id: item?.id,
          ref: item?.ref_no ?? "",
          description: item?.description ?? "—",
          amount: Number(item?.amount || 0),
          category: item?.category ?? "uncategorized",
          vendor,
          status: item?.status ?? "Pending",
          created_at: item?.created_at ?? new Date().toISOString(),
          due_date: item?.due_date ?? null,
          approved_by: item?.approved_by ?? null,
          approved_at: item?.approved_at ?? null,
          agingDays,
          agingBucket: agingDays > 30 ? "Overdue" : "Current",
          isReleased: !!item?._released,
        };
      }),
    [rows, today],
  );

  const approvedRows = useMemo(
    () => mappedRows.filter((r) => approvedStatuses.has(r.status) && !r.isReleased),
    [mappedRows, approvedStatuses],
  );
  const categoryOptions = [
    ...new Set(approvedRows.map((r) => r.category).filter(Boolean)),
  ];

  const filteredRows = useMemo(
    () =>
      approvedRows.filter((row) => {
        if (row.isReleased) return false;

        if (filters.category && row.category !== filters.category) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            row.vendor?.toLowerCase?.().includes(q) ||
            row.ref?.toLowerCase?.().includes(q) ||
            row.description?.toLowerCase?.().includes(q)
          );
        }
        return true;
      }),
    [approvedRows, filters, search],
  );

  const kpis = useMemo(() => {
    const visible = filteredRows;
    const now = today.getTime();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthStartTime = monthStart.getTime();
    const nextMonthStartTime = nextMonthStart.getTime();
    const monthRows = visible.filter((r) => {
      const d = r?.created_at ? new Date(r.created_at) : null;
      const t = d?.getTime?.();
      if (!Number.isFinite(t)) return false;
      return t >= monthStartTime && t < nextMonthStartTime;
    });
    const overdueRows = visible.filter((r) => {
      const d = r?.created_at ? new Date(r.created_at) : null;
      const t = d?.getTime?.();
      if (!Number.isFinite(t)) return false;
      return now - t > 30 * 86400000;
    });
    return {
      totalUnpaid: visible.reduce((a, r) => a + Number(r?.amount || 0), 0),
      monthTotal: monthRows.reduce((a, r) => a + Number(r?.amount || 0), 0),
      overdueCount: overdueRows.length,
      approvedCount: visible.length,
    };
  }, [filteredRows, today]);

  const vendorBalances = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      map.set(r.vendor, (map.get(r.vendor) || 0) + Number(r?.amount || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRows]);

  // Logic for Paginated Rows
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const handleApprove = async (row) => {
    const budgetRow = budgets.find((b) => b.category === row.category);
    const available = budgetRow ? budgetRow.limit_amount - budgetRow.actual_spend : null;
    if (available != null && row.amount > available) {
      setBudgetWarning({ ref: row.ref, amount: row.amount, vendor: row.vendor });
      setDetailRow(null);
      return;
    }
    setActionLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const approvedBy = userData?.user?.email ?? userData?.user?.id ?? null;
      const approvedAt = new Date().toISOString();
      const { error: upErr } = await supabase.from("fin_accounts_payable").update({
        status: "Manager Approved",
        approved_by: approvedBy,
        approved_at: approvedAt,
      }).eq("id", row.id);
      if (upErr) throw upErr;
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "Manager Approved", approved_by: approvedBy, approved_at: approvedAt } : r));
      setDetailRow(null);
    } catch (err) {
      setError("Failed to approve: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = (row) => {
    setDetailRow(null);
    setRejectTarget(row);
  };

  const handleConfirmReject = async (row, reason) => {
    setActionLoading(true);
    try {
      const { error: upErr } = await supabase.from("fin_accounts_payable").update({
        status: "Rejected",
        description: `${row.description} [Rejected: ${reason}]`,
      }).eq("id", row.id);
      if (upErr) throw upErr;
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: "Rejected" } : r)));
      setRejectTarget(null);
    } catch (err) {
      setError("Failed to reject: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePostToGL = async (row) => {
    setActionLoading(true);
    try {
      const now = new Date().toISOString();
      const desc = `AP Posted | ${row.ref} | ${row.vendor} | ${row.category}`;

      await supabase.from("fin_general_ledger").insert({ description: desc, debit: row.amount, credit: 0, reference_id: row.id, transaction_date: now, account_code: "5000-EXP" });
      await supabase.from("fin_general_ledger").insert({ description: desc, debit: 0, credit: row.amount, reference_id: row.id, transaction_date: now, account_code: "2000-AP" });

      const dvNo = `DV-${Date.now()}`;
      await supabase.from("fin_disbursement").insert({
        dv_no: dvNo,
        ap_id: row.id,
        status: "Pending Disbursement",
        payment_method: "Check",
      });

      await supabase.from("fin_accounts_payable").update({ status: "Posted to GL" }).eq("id", row.id);
      setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, status: "Posted to GL" } : r));
      setDetailRow(null);
    } catch (err) {
      setError("Failed to post to GL: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="p-6 md:p-8 lg:p-10">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 tracking-tight">Accounts Payable</h1>
        <p className="text-slate-600 text-sm">Manages approved payments from Procurement, Asset Maintenance, and HR Payroll.</p>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{error}</span>
            <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Unpaid", value: fmt(kpis.totalUnpaid), color: "border-slate-200", icon: <FileText className="w-4 h-4 text-slate-400" /> },
          { label: `${today.toLocaleString("en-PH", { month: "long" })} Payables`, value: fmt(kpis.monthTotal), color: "border-emerald-200", icon: <Clock className="w-4 h-4 text-emerald-600" /> },
          { label: "Overdue (31+d)", value: kpis.overdueCount, color: kpis.overdueCount > 0 ? "border-red-300" : "border-slate-200", icon: <AlertTriangle className={`w-4 h-4 ${kpis.overdueCount > 0 ? "text-red-500" : "text-slate-400"}`} /> },
          { label: "Approved for Payment", value: kpis.approvedCount, color: "border-emerald-200", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border ${k.color} p-4 shadow-sm`}>
            <div className="mb-2">{k.icon}</div>
            <p className="text-lg font-bold text-slate-900 tabular-nums">{k.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Top Unpaid Vendor Balances Section */}
      {vendorBalances.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Unpaid Vendor Balances</p>
          <div className="flex flex-wrap gap-2">
            {vendorBalances.map(([vendor, amount]) => (
              <div key={vendor} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">{maskName(vendor)}</span>
                <span className="text-xs font-bold text-emerald-700">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input className="bg-transparent outline-none placeholder-slate-400 flex-1 text-sm" placeholder="Search vendor, ref, description..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
        <select value={filters.category} onChange={(e) => { setFilters((p) => ({ ...p, category: e.target.value })); setCurrentPage(1); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100">
          <option value="">All Categories</option>
          {categoryOptions.map((c) => (<option key={c} value={c}>{SOURCE_MODULES[c]?.label ?? c}</option>))}
        </select>
        <span className="ml-auto text-xs text-slate-400">{filteredRows.length} total records</span>
      </div>

      <motion.div layout className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Ref No.", "Vendor / Payee", "Category", "Description", "Amount", "Due Date", "Aging"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <AnimatePresence>
                {isLoading ? (
                  <tr key="loading"><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Loading...</td></tr>
                ) : paginatedRows.length === 0 ? (
                  <tr key="empty"><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No approved payables found.</td></tr>
                ) : (
                  paginatedRows.map((row, i) => {
                    const src = SOURCE_MODULES[row.category?.toLowerCase()] || SOURCE_MODULES[row.category];
                    const Icon = src?.icon;
                    const isOverdueActive = row.agingBucket === "Overdue" && row.status !== "Paid" && row.status !== "Rejected";
                    return (
                      <motion.tr
                        key={row.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setDetailRow(row)}
                        className={`cursor-pointer transition-colors ${isOverdueActive ? "bg-red-50/30 hover:bg-red-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{row?.ref}</td>
                        <td className="px-4 py-3"><p className="font-semibold text-slate-900">{maskName(row?.vendor)}</p></td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${src?.color || "bg-gray-100 text-gray-600"}`}>{Icon && <Icon className="w-3 h-3" />}{src?.label ?? row.category}</span></td>
                        <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{row?.description}</td>
                        <td className="px-4 py-3 font-bold text-slate-900 tabular-nums whitespace-nowrap">{fmt(row?.amount)}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">{fmtDate(row?.due_date)}</td>
                        <td className="px-4 py-3">{row.status !== "Paid" && row.status !== "Rejected" ? (<span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${isOverdueActive ? "bg-red-100 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{isOverdueActive ? `Overdue ${row.agingDays}d` : `${row.agingDays}d`}</span>) : (<span className="text-slate-300 text-xs">—</span>)}</td>
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs text-slate-400 font-medium">Page {currentPage} of {totalPages || 1}</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-50 transition-all text-emerald-700">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 hover:bg-slate-50 transition-all text-emerald-700">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>{budgetWarning && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setBudgetWarning(null)}><motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl border border-red-100 max-w-md w-full p-6"><div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600"><AlertTriangle className="w-5 h-5" /></div><h2 className="text-base font-bold text-red-700">Insufficient Budget</h2></div><p className="text-sm text-gray-700 mb-4">Cannot approve AP entry <span className="font-semibold">{budgetWarning.ref}</span>. Amount exceeds available budget. Please review Budget Allocation.</p><div className="flex justify-end"><button onClick={() => setBudgetWarning(null)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Close</button></div></motion.div></motion.div>)}</AnimatePresence>
      <AnimatePresence>{rejectTarget && (<RejectModal row={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={handleConfirmReject} loading={actionLoading} />)}</AnimatePresence>
      <AnimatePresence>{detailRow && (<DetailModal row={detailRow} onClose={() => setDetailRow(null)} onApprove={handleApprove} onReject={handleReject} onPostGL={handlePostToGL} actionLoading={actionLoading} />)}</AnimatePresence>
    </motion.div>
  );
}

export default AccountsPayable;
