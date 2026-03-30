import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../database/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();
const num = (v) => Number(v || 0);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
    Pending: "bg-amber-100 text-amber-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
};

// ─── Utilization bar ──────────────────────────────────────────────────────────
const UtilizationBar = ({ actual, committed, limit }) => {
  if (!limit) return <span className="text-xs text-gray-400">—</span>;
  const actualPct = Math.min((actual / limit) * 100, 100);
  const committedPct = Math.min(((actual + committed) / limit) * 100, 100);
  const isOver = actual + committed > limit;
  return (
    <div className="flex items-center gap-2 min-w-[130px]">
      <div className="relative flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-amber-300 rounded-full"
          style={{ width: `${committedPct}%` }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${isOver ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${actualPct}%` }}
        />
      </div>
      <span
        className={`text-[11px] font-semibold tabular-nums w-10 text-right ${isOver ? "text-red-600" : "text-gray-600"}`}
      >
        {Math.round(committedPct)}%
      </span>
    </div>
  );
};

// ─── SMART CALENDAR COMPONENT ────────────────────────────────────────────────
const EnterpriseCalendar = ({ requests, allocatedDates, depletedDates }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const toDateKey = (date) => {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  
  const mappedRequests = useMemo(() => {
    const data = {};
    (requests || []).forEach(r => {
      const dt = r?.createdAt ? new Date(r.createdAt) : null;
      const key = dt ? toDateKey(dt) : null;
      if (!key) return;
      if (!data[key]) data[key] = [];
      data[key].push(r);
    });
    return data;
  }, [requests]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <div>
            <h3 className="font-black text-slate-900 leading-tight text-lg">Budget Allocation Calendar</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Allocated · Depleted · Monthly Refresh</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-emerald-600 transition-colors">◄</button>
          <span className="text-xs font-black text-slate-900 px-3 min-w-[130px] text-center uppercase tracking-tighter">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
          <button onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-2 hover:bg-slate-50 rounded-xl text-emerald-600 transition-colors">►</button>
        </div>
      </div>
      
      <div className="p-6 grid grid-cols-7 gap-3 flex-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-[10px] font-black text-slate-400 uppercase text-center mb-2 tracking-widest">{d}</div>
        ))}
        {Array(firstDay).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
          const fullKey = toDateKey(cellDate);
          const dayReqs = (fullKey && mappedRequests[fullKey]) || [];
          const todayKey = toDateKey(new Date());
          const isToday = !!fullKey && !!todayKey && todayKey === fullKey;
          const isRefresh = d === 1;
          const isAllocated = !!fullKey && !!allocatedDates?.has?.(fullKey);
          const isDepleted = !!fullKey && !!depletedDates?.has?.(fullKey);

          return (
            <div key={d} className={`relative min-h-[60px] border border-slate-100 rounded-2xl p-2 transition-all hover:border-slate-300 hover:bg-slate-50 group cursor-default ${isToday ? 'bg-emerald-50/60 border-emerald-300 ring-4 ring-emerald-50' : ''}`}>
              <span className={`text-xs font-black ${isToday ? 'text-emerald-700' : 'text-gray-400'}`}>{d}</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {dayReqs.slice(0, 4).map((req, idx) => (
                  <div key={idx} className={`h-2 w-2 rounded-full shadow-sm ${req.status === 'Approved' ? 'bg-emerald-500' : req.status === 'Pending' ? 'bg-amber-400' : 'bg-red-400'}`} title={req.categoryName} />
                ))}
                {dayReqs.length > 4 && <span className="text-[8px] font-black text-slate-500">+{dayReqs.length - 4}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {isAllocated && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Allocated
                  </span>
                )}
                {isDepleted && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-100">
                    Depleted
                  </span>
                )}
                {isRefresh && (
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Refresh
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-6">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /><span className="text-[10px] font-black text-slate-700 uppercase">Approved</span></div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" /><span className="text-[10px] font-black text-slate-700 uppercase">Pending</span></div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm" /><span className="text-[10px] font-black text-slate-700 uppercase">Rejected</span></div>
      </div>
    </div>
  );
};

const YearlyRequestFrequencyGraph = ({ data, onOpenBreakdown }) => {
  const safe = Array.isArray(data) ? data : [];
  const max = safe.reduce((m, r) => Math.max(m, Number(r?.count || 0)), 0);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col h-full min-h-0">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            Yearly Request Frequency
          </p>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            Requests per Month (Last 12)
          </h3>
        </div>
        <button
          type="button"
          onClick={onOpenBreakdown}
          className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shrink-0"
        >
          View Breakdown
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpenBreakdown}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? onOpenBreakdown?.() : null)}
        className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={safe}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} domain={[0, Math.max(1, max)]} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[11px] text-slate-600">
        Click the graph to see department request frequency details.
      </p>
    </div>
  );
};

function BudgetManagement() {
  const queryClient = useQueryClient();

  // ── Which requests tab is visible: "operational" | "hr" ───────────────────
  const [requestsTab, setRequestsTab] = useState("operational");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [hrStatusFilter, setHrStatusFilter] = useState("Pending");

  // ── Review modal state ─────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Budget Setup Modal state ───────────────────────────────────────────────
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [setupDraft, setSetupDraft] = useState({});
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [freqModalOpen, setFreqModalOpen] = useState(false);

  // ── 1. REACT QUERY: Budget Overview ────────────────────────────────────────
  const { data: overviewData, isLoading, error: overviewErrorObj } = useQuery({
    queryKey: ['budgetOverview'],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
      const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1).toISOString();
      
      const { data: revMonth } = await supabase
        .from("core1_boundary_payments")
        .select("amount")
        .gte("payment_date", startOfMonth)
        .lt("payment_date", startOfNextMonth)
        .eq("status", "PAID");
        
      const { data: revYear } = await supabase
        .from("core1_boundary_payments")
        .select("amount")
        .gte("payment_date", startOfYear)
        .lt("payment_date", startOfNextYear)
        .eq("status", "PAID");

      const metrics = {
        monthlyRevenue: (revMonth || []).reduce((s, r) => s + Number(r?.amount || 0), 0),
        yearlyRevenue: (revYear || []).reduce((s, r) => s + Number(r?.amount || 0), 0)
      };

      const { data: allCats } = await supabase
        .from("fin_budget_categories")
        .select("id, code, name, department, description, is_active")
        .eq("is_active", true);

      const { data: budgets } = await supabase
        .from("fin_budget_management")
        .select(`id, budget_category_id, category, limit_amount, actual_spend, committed_amount, period_year, period_month, notes, updated_at, fin_budget_categories (id, code, name, department, description, is_active)`)
        .order("period_year", { ascending: false });

      const rows = (budgets || []).map((b) => ({
        budgetId: b.id,
        categoryId: b.budget_category_id,
        name: b.fin_budget_categories?.name ?? b.category ?? "—",
        code: b.fin_budget_categories?.code ?? "—",
        department: b.fin_budget_categories?.department ?? "General",
        limit: num(b.limit_amount),
        actual: num(b.actual_spend),
        committed: num(b.committed_amount),
        periodYear: b.period_year,
        periodMonth: b.period_month,
        notes: b.notes ?? "",
        updatedAt: b.updated_at ?? null,
      }));

      return { metrics, categories: allCats || [], rows };
    }
  });

  const metrics = overviewData?.metrics || { monthlyRevenue: 0, yearlyRevenue: 0 };
  const categories = overviewData?.categories || [];
  const rows = overviewData?.rows || [];
  const error = overviewErrorObj?.message || "";

  // ── 2. REACT QUERY: Operational Budget Requests ────────────────────────────
  const { data: budgetRequests = [], isLoading: requestsLoading, error: reqErrorObj } = useQuery({
    queryKey: ['budgetRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log1_budget_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((item) => ({
        id: item.id,
        budgetManagementId: item.budget_category_id,
        categoryName: item.budget_category_name ?? "—",
        poReference: item.po_reference,
        requestedBy: item.requested_by_name,
        requestedById: item.requested_by_id ?? null,
        amount: num(item.requested_amount),
        purpose: item.purpose ?? "—",
        status: item.status ?? "Pending",
        remarks: item.review_note ?? "",
        createdAt: item.created_at,
        reviewedBy: item.reviewed_by ?? null,
        reviewedAt: item.reviewed_at ?? null,
      }));
    }
  });
  const requestsError = reqErrorObj?.message || "";

  // ── 3. REACT QUERY: HR Budget Requests ─────────────────────────────────────
  const { data: hrRequests = [], isLoading: hrRequestsLoading, error: hrReqErrorObj } = useQuery({
    queryKey: ['hrRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_budget_requests")
        .select("id, training_id, training_name, amount, submitted_date, approval_status, response_date, notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((item) => ({
        id: item.id,
        _source: "hr",
        trainingId: item.training_id,
        trainingName: item.training_name || "—",
        department: "HR",
        amount: num(item.amount),
        status: item.approval_status ?? "Pending",
        notes: item.notes ?? "",
        submittedDate: item.submitted_date,
        responseDate: item.response_date,
        createdAt: item.created_at,
        categoryName: "HR Training",
        requestedBy: "HR Department",
        poReference: null,
        purpose: item.notes ?? "—",
        budgetManagementId: null,
        remarks: "",
      }));
    }
  });
  const hrRequestsError = hrReqErrorObj?.message || "";

  // ── 4. REALTIME SUBSCRIPTIONS ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase.channel('budget-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'log1_budget_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['budgetRequests'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hr_budget_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['hrRequests'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fin_budget_management' }, () => {
        queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCategoryById = useCallback((id) => categories.find((c) => c.id === id), [categories]);
  const getBudgetRowByManagementId = useCallback((budgetManagementId) => rows.find((r) => r.budgetId === budgetManagementId), [rows]);

  // ── Budget Setup Modal ─────────────────────────────────────────────────────
  const handleOpenBudgetSetup = () => {
    setSetupError("");
    setShowBudgetSetup(true);

    // Re-use cached categories instead of fetching again!
    setAllCategories(categories);

    const currentYear = new Date().getFullYear();
    const draft = {};
    (categories || []).forEach((cat) => {
      const existing = rows.find((r) => r.categoryId === cat.id);
      draft[cat.id] = {
        budgetRowId: existing?.budgetId ?? null,
        limitInput: existing?.limit != null ? String(existing.limit) : "",
        periodYear: existing?.periodYear ?? currentYear,
        periodMonth: existing?.periodMonth ?? new Date().getMonth() + 1,
        notes: existing?.notes ?? "",
      };
    });
    setSetupDraft(draft);
  };

  const handleCloseSetup = () => {
    setShowBudgetSetup(false);
    setSetupError("");
    setSetupSaving(false);
  };

  const updateDraft = (categoryId, field, value) => {
    setSetupDraft((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [field]: value },
    }));
  };

  const handleSaveBudgetLimits = async () => {
    setSetupSaving(true);
    setSetupError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const setBy = auth?.user?.email ?? "System";
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const nowIso = now.toISOString();

      const toUpdate = []; 
      const toInsert = []; 

      allCategories.forEach((cat) => {
        const draft = setupDraft[cat.id] ?? {};
        const limit = num(draft.limitInput);
        const year = num(draft.periodYear) || currentYear;
        const month = num(draft.periodMonth) || currentMonth;
        
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
            throw new Error(`Forbidden: You cannot set a budget for past dates (${cat.name}).`);
        }
        
        const safetyCap = year > currentYear ? num(metrics.yearlyRevenue) * 0.8 : num(metrics.monthlyRevenue) * 0.8;
        if (limit > 0 && safetyCap <= 0) {
            throw new Error(`Revenue Guard: Cannot set budget for ${cat.name} because revenue baseline is zero.`);
        }
        if (limit > safetyCap && limit > 0 && safetyCap > 0) {
            throw new Error(`Revenue Guard: Limit for ${cat.name} (₱${fmt(limit)}) exceeds 80% of current Revenue capacity (₱${fmt(safetyCap)}).`);
        }

        const existing = rows.find((r) => r.categoryId === cat.id);

        if (existing?.budgetId) {
          toUpdate.push({
            id: existing.budgetId,
            limit_amount: limit,
            period_year: year,
            period_month: month,
            notes: draft.notes ?? null,
            set_by: setBy,
            updated_at: nowIso,
          });
        } else {
          toInsert.push({
            budget_category_id: cat.id,
            category: cat.name,
            limit_amount: limit,
            actual_spend: 0,
            committed_amount: 0,
            period_year: year,
            period_month: month,
            notes: draft.notes ?? null,
            set_by: setBy,
            updated_at: nowIso,
          });
        }
      });

      for (const row of toUpdate) {
        const { id, ...fields } = row;
        const { error } = await supabase.from("fin_budget_management").update(fields).eq("id", id);
        if (error) throw error;
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from("fin_budget_management").insert(toInsert);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
      handleCloseSetup();
    } catch (err) {
      console.error("BUDGET SETUP ERROR:", err);
      setSetupError(err.message || "Failed to save budget limits.");
      setSetupSaving(false);
    }
  };

  // ── 5. Review modal ────────────────────────────────────────────────────────
  const handleOpenRequest = (request) => {
    setSelectedRequest(request);
    setDecision("approve");
    setRemarks("");
    setActionError("");
  };
  
  const handleCloseRequest = () => {
    setSelectedRequest(null);
    setDecision("approve");
    setRemarks("");
    setActionError("");
    setIsProcessing(false);
  };

  // ── 6. Approve ────────────────────────────────────────────────────────────
  const handleApproveRequest = async () => {
    if (!selectedRequest || isProcessing) return;
    setIsProcessing(true);
    setActionError("");

    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const { data: auth } = await supabase.auth.getUser();
      const approverEmail = auth?.user?.email ?? "System";
      const approverUserId = auth?.user?.id ?? null;

      let hrEmployeeId = 1;
      if (approverUserId) {
        const { data: hrRow } = await supabase
          .from("hr_proceedlist")
          .select("id")
          .eq("user_id", approverUserId)
          .maybeSingle();
        if (hrRow?.id) hrEmployeeId = hrRow.id;
      }

      if (selectedRequest._source === "hr") {
        const { data: fresh, error: freshErr } = await supabase
          .from("hr_budget_requests")
          .select("approval_status")
          .eq("id", selectedRequest.id)
          .single();
        if (freshErr) throw freshErr;
        if (fresh?.approval_status !== "Pending") {
          setActionError(`This request is already ${fresh?.approval_status}. Refresh to see the latest state.`);
          setIsProcessing(false);
          return;
        }

        const { error: hrUpdateErr } = await supabase
          .from("hr_budget_requests")
          .update({
            approval_status: "Approved",
            response_date: today,
            notes: remarks.trim() || selectedRequest.notes || null,
          })
          .eq("id", selectedRequest.id);
        if (hrUpdateErr) throw hrUpdateErr;

        const hrRef = `HR-${String(selectedRequest.id).padStart(5, "0")}-${today.replace(/-/g, "")}`;
        const { data: apData, error: apErr } = await supabase
          .from("fin_accounts_payable")
          .insert([{
            ref_no: hrRef,
            vendor_name: selectedRequest.trainingName,
            amount: selectedRequest.amount,
            description: `HR Training Budget: ${selectedRequest.trainingName}${selectedRequest.notes ? " — " + selectedRequest.notes : ""}`,
            status: "Pending",
            category: "HR Training",
            created_at: now,
            employee_id: hrEmployeeId,
          }])
          .select()
          .single();
        if (apErr) throw apErr;

        const { error: dvErr } = await supabase
          .from("fin_disbursement")
          .insert([{
            dv_no: `DV-${hrRef}`,
            ap_id: apData.id,
            status: "Pending Disbursement",
            payment_method: "Bank Transfer",
          }]);
        if (dvErr) throw dvErr;

        // Invalidate cache immediately instead of manual state updates
        queryClient.invalidateQueries({ queryKey: ['hrRequests'] });
        queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
        handleCloseRequest();
        return;
      }

      // Operational request flow
      const { data: fresh, error: freshErr } = await supabase
        .from("log1_budget_requests")
        .select("status")
        .eq("id", selectedRequest.id)
        .single();
      if (freshErr) throw freshErr;
      if (fresh?.status !== "Pending") {
        setActionError(`This request is already ${fresh?.status}. Refresh to see the latest state.`);
        setIsProcessing(false);
        return;
      }

      const { data: budgetRow, error: budgetFetchErr } = await supabase
        .from("fin_budget_management")
        .select("id, limit_amount, actual_spend, committed_amount, budget_category_id")
        .eq("id", selectedRequest.budgetManagementId)
        .maybeSingle();
      if (budgetFetchErr) throw budgetFetchErr;

      if (!budgetRow) {
        setActionError(`Fatal: No budget limit set for "${selectedRequest.categoryName}". Set budget limits first.`);
        setIsProcessing(false);
        return;
      }

      const currentLimit = num(budgetRow?.limit_amount);
      const currentActual = num(budgetRow?.actual_spend);
      const currentCommitted = num(budgetRow?.committed_amount);
      const available = currentLimit - currentActual - currentCommitted;

      if (currentLimit > 0 && selectedRequest.amount > available) {
        setActionError(`Approval would exceed the budget for "${selectedRequest.categoryName}". Available: ₱${fmt(available)} | Requested: ₱${fmt(selectedRequest.amount)}`);
        setIsProcessing(false);
        return;
      }

      const { error: updateErr } = await supabase
        .from("log1_budget_requests")
        .update({
          status: "Approved",
          review_note: remarks.trim() || null,
          reviewed_by: approverEmail,
          reviewed_at: now,
        })
        .eq("id", selectedRequest.id);
      if (updateErr) throw updateErr;

      const { data: apData, error: apErr } = await supabase
        .from("fin_accounts_payable")
        .insert([{
          ref_no: selectedRequest.poReference,
          vendor_name: selectedRequest.requestedBy,
          amount: selectedRequest.amount,
          description: selectedRequest.purpose,
          status: "Approved",
          category: selectedRequest.categoryName,
          created_at: now,
          employee_id: hrEmployeeId,
        }])
        .select()
        .single();
      if (apErr) throw apErr;

      const { error: disburseErr } = await supabase
        .from("fin_disbursement")
        .insert([{
          dv_no: `DV-${selectedRequest.poReference}`,
          ap_id: apData.id,
          status: "Pending Disbursement",
          payment_method: "Bank Transfer",
        }]);
      if (disburseErr) throw disburseErr;

      if (budgetRow) {
        const { error: budgetUpdateErr } = await supabase
          .from("fin_budget_management")
          .update({
            committed_amount: currentCommitted + selectedRequest.amount,
            updated_at: now,
          })
          .eq("id", budgetRow.id);
        if (budgetUpdateErr) throw budgetUpdateErr;
      }

      // Invalidate instead of manual updates
      queryClient.invalidateQueries({ queryKey: ['budgetRequests'] });
      queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
      handleCloseRequest();
    } catch (err) {
      console.error("APPROVAL ERROR:", err);
      setActionError(err.message || "An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  // ── 7. Reject ─────────────────────────────────────────────────────────────
  const handleRejectRequest = async () => {
    if (!remarks.trim() || isProcessing) return;
    setIsProcessing(true);
    setActionError("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const now = new Date().toISOString();
      const { data: auth } = await supabase.auth.getUser();

      if (selectedRequest._source === "hr") {
        const { error: hrUpdateErr } = await supabase
          .from("hr_budget_requests")
          .update({
            approval_status: "Rejected",
            response_date: today,
            notes: remarks.trim(),
          })
          .eq("id", selectedRequest.id);
        if (hrUpdateErr) throw hrUpdateErr;

        queryClient.invalidateQueries({ queryKey: ['hrRequests'] });
        queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
        handleCloseRequest();
        return;
      }

      const { error: updateErr } = await supabase
        .from("log1_budget_requests")
        .update({
          status: "Rejected",
          review_note: remarks.trim(),
          reviewed_by: auth?.user?.email ?? "System",
          reviewed_at: now,
        })
        .eq("id", selectedRequest.id);
      if (updateErr) throw updateErr;

      queryClient.invalidateQueries({ queryKey: ['budgetRequests'] });
      queryClient.invalidateQueries({ queryKey: ['budgetOverview'] });
      handleCloseRequest();
    } catch {
      setActionError("Failed to reject request. Please try again.");
      setIsProcessing(false);
    }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const statusCounts = (budgetRequests || []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 },
  );
  const filteredRequests =
    statusFilter === "All"
      ? (budgetRequests || [])
      : (budgetRequests || []).filter((r) => r.status === statusFilter);

  // ── HR derived counts ──────────────────────────────────────────────────────
  const hrStatusCounts = (hrRequests || []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 },
  );
  const filteredHrRequests =
    hrStatusFilter === "All"
      ? (hrRequests || [])
      : (hrRequests || []).filter((r) => r.status === hrStatusFilter);
      
  const totalAllocated = (rows || []).reduce((s, r) => s + num(r?.limit), 0);
  const totalSpent = (rows || []).reduce((s, r) => s + num(r?.actual), 0);
  const totalCommitted = (rows || []).reduce((s, r) => s + num(r?.committed), 0);
  const totalAvailable = totalAllocated - totalSpent - totalCommitted;

  const draftTotal = (allCategories || []).reduce(
    (s, cat) => s + num(setupDraft[cat.id]?.limitInput),
    0,
  );
  const calendarRequests = useMemo(
    () => [
      ...(budgetRequests || []).map((r) => ({
        id: `op-${r.id}`,
        createdAt: r.createdAt,
        status: r.status,
        categoryName: r.categoryName,
      })),
      ...(hrRequests || []).map((r) => ({
        id: `hr-${r.id}`,
        createdAt: r.createdAt,
        status: r.status,
        categoryName: r.trainingName || "HR Training",
      })),
    ],
    [budgetRequests, hrRequests],
  );

  const budgetDeptById = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => {
      if (!r?.budgetId) return;
      m.set(r.budgetId, r?.department || "General");
    });
    return m;
  }, [rows]);

  const allocatedDateKeys = useMemo(() => {
    const s = new Set();
    (rows || []).forEach((r) => {
      const dt = r?.updatedAt ? new Date(r.updatedAt) : null;
      if (!dt || !Number.isFinite(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      s.add(key);
    });
    return s;
  }, [rows]);

  const depletedDateKeys = useMemo(() => {
    const depleted = (rows || []).filter((r) => num(r?.limit) > 0 && num(r?.actual) + num(r?.committed) >= num(r?.limit));
    const latestByBudgetId = new Map();
    (budgetRequests || []).forEach((req) => {
      if (req?.status !== "Approved") return;
      const budgetId = req?.budgetManagementId;
      if (!budgetId) return;
      const dt = req?.createdAt ? new Date(req.createdAt) : null;
      const t = dt?.getTime?.();
      if (!Number.isFinite(t)) return;
      const prev = latestByBudgetId.get(budgetId);
      if (prev == null || t > prev) latestByBudgetId.set(budgetId, t);
    });
    const s = new Set();
    depleted.forEach((r) => {
      const t = latestByBudgetId.get(r?.budgetId);
      if (!Number.isFinite(t)) return;
      const dt = new Date(t);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      s.add(key);
    });
    return s;
  }, [rows, budgetRequests]);

  const monthSeed = new Date().toISOString().slice(0, 7);
  const frequencyData = useMemo(() => {
    const base = new Date();
    const start = new Date(base.getFullYear(), base.getMonth() - 11, 1).getTime();
    const endExclusive = new Date(base.getFullYear(), base.getMonth() + 1, 1).getTime();
    const months = [...Array(12)].map((_, i) => {
      const dt = new Date(base.getFullYear(), base.getMonth() - (11 - i), 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      const label = `${dt.toLocaleString("en-PH", { month: "short" })} ${String(dt.getFullYear()).slice(2)}`;
      return { key, label };
    });
    const m = new Map(months.map((x) => [x.key, 0]));

    const add = (createdAt) => {
      const dt = createdAt ? new Date(createdAt) : null;
      const t = dt?.getTime?.();
      if (!Number.isFinite(t) || t < start || t >= endExclusive) return;
      const mk = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      if (!m.has(mk)) return;
      m.set(mk, (m.get(mk) || 0) + 1);
    };

    (budgetRequests || []).forEach((r) => add(r?.createdAt));
    (hrRequests || []).forEach((r) => add(r?.createdAt));

    return months.map((x) => ({ ...x, count: m.get(x.key) || 0 }));
  }, [budgetRequests, hrRequests, monthSeed]);

  const departmentFrequency = useMemo(() => {
    const base = new Date();
    const start = new Date(base.getFullYear(), base.getMonth() - 11, 1).getTime();
    const endExclusive = new Date(base.getFullYear(), base.getMonth() + 1, 1).getTime();
    const m = new Map();
    const bump = (dept, source) => {
      const key = String(dept || "General");
      const prev = m.get(key) || { department: key, total: 0, operational: 0, hr: 0 };
      const next = {
        ...prev,
        total: prev.total + 1,
        operational: prev.operational + (source === "operational" ? 1 : 0),
        hr: prev.hr + (source === "hr" ? 1 : 0),
      };
      m.set(key, next);
    };

    (budgetRequests || []).forEach((r) => {
      const dt = r?.createdAt ? new Date(r.createdAt) : null;
      const t = dt?.getTime?.();
      if (!Number.isFinite(t) || t < start || t >= endExclusive) return;
      const dept = budgetDeptById.get(r?.budgetManagementId) || "General";
      bump(dept, "operational");
    });

    (hrRequests || []).forEach((r) => {
      const dt = r?.createdAt ? new Date(r.createdAt) : null;
      const t = dt?.getTime?.();
      if (!Number.isFinite(t) || t < start || t >= endExclusive) return;
      bump("HR", "hr");
    });

    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [budgetRequests, hrRequests, budgetDeptById, monthSeed]);
  

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 mb-1 tracking-tight">
            Budget Management
          </h1>
          <p className="text-slate-500 text-sm">
            TNVS Financial Budget Control · Committed vs Actual · Variance
            Analysis
          </p>
        </div>

        {/* ── Set Budget Limits button ── */}
        <button
          onClick={handleOpenBudgetSetup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shrink-0"
        >
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Set Budget Limits
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Allocated",
            value: `₱${fmt(totalAllocated)}`,
            sub: "Budget ceiling set by Finance",
            color: "text-gray-900",
          },
          {
            label: "Actual Spent",
            value: `₱${fmt(totalSpent)}`,
            sub: "Confirmed disbursements only",
            color: "text-red-600",
          },
          {
            label: "Committed",
            value: `₱${fmt(totalCommitted)}`,
            sub: "Approved, pending disbursement",
            color: "text-amber-600",
          },
          {
            label: "Available Balance",
            value: `${totalAvailable < 0 ? "−" : ""}₱${fmt(Math.abs(totalAvailable))}${totalAvailable < 0 ? " OVER" : ""}`,
            sub: "Allocated − Spent − Committed",
            color: totalAvailable < 0 ? "text-red-600" : "text-emerald-600",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
              {kpi.label}
            </p>
            <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>
              {kpi.value}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <div className="xl:col-span-2 h-[720px]">
          <EnterpriseCalendar
            requests={calendarRequests}
            allocatedDates={allocatedDateKeys}
            depletedDates={depletedDateKeys}
          />
        </div>
        <div className="h-[720px] flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col flex-1 min-h-0">
            <div className="mb-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Budget Guard Preview
              </p>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Revenue-linked Safety Cap
              </h3>
            </div>
            <div className="space-y-3 overflow-auto pr-1">
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Current Monthly Revenue</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">₱{fmt(metrics?.monthlyRevenue)}</p>
                <p className="text-[11px] text-slate-500 mt-1">Allowed budget max (80%): ₱{fmt(num(metrics?.monthlyRevenue) * 0.8)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Current Year Revenue</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">₱{fmt(metrics?.yearlyRevenue)}</p>
                <p className="text-[11px] text-slate-500 mt-1">Allowed yearly max (80%): ₱{fmt(num(metrics?.yearlyRevenue) * 0.8)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Current Available Budget</p>
                <p className={`text-xl font-black tabular-nums ${totalAvailable < 0 ? "text-red-600" : "text-slate-900"}`}>
                  {totalAvailable < 0 ? "−" : ""}₱{fmt(Math.abs(totalAvailable))}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Live Draft Total</p>
                <p className="text-xl font-black text-slate-900 tabular-nums">₱{fmt(draftTotal)}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <YearlyRequestFrequencyGraph data={frequencyData} onOpenBreakdown={() => setFreqModalOpen(true)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* ── Budget Requests ─────────────────────────────────────────────── */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {/* Section header + source tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Budget Requests
              </h2>
              {/* Operational | HR tab switcher */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {[
                  {
                    key: "operational",
                    label: "Operational",
                    pending: statusCounts.Pending,
                  },
                  {
                    key: "hr",
                    label: "HR Training",
                    pending: hrStatusCounts.Pending,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setRequestsTab(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                      requestsTab === tab.key
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                    {tab.pending > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-800">
                        {tab.pending}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {["Pending", "Approved", "Rejected", "All"].map((tab) => {
                const counts =
                  requestsTab === "hr" ? hrStatusCounts : statusCounts;
                const active =
                  requestsTab === "hr" ? hrStatusFilter : statusFilter;
                const setActive =
                  requestsTab === "hr" ? setHrStatusFilter : setStatusFilter;
                return (
                  <button
                    key={tab}
                    onClick={() => setActive(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${active === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {tab}
                    {tab !== "All" && counts[tab] > 0 && (
                      <span
                        className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          tab === "Pending"
                            ? "bg-amber-200 text-amber-800"
                            : tab === "Approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {counts[tab]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Operational requests ────────────────────────────────────────── */}
          {requestsTab === "operational" && (
            <>
              {requestsError && (
                <p className="text-sm text-red-500 mb-3">{requestsError}</p>
              )}
              {requestsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No {statusFilter === "All" ? "" : statusFilter.toLowerCase()}{" "}
                  operational requests found.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredRequests.map((request) => {
                    const budgetRow = getBudgetRowByManagementId(
                      request.budgetManagementId,
                    );
                    const cat = budgetRow
                      ? getCategoryById(budgetRow.categoryId)
                      : null;
                    const available = budgetRow
                      ? budgetRow.limit - budgetRow.actual - budgetRow.committed
                      : null;
                    const willExceed =
                      available !== null && request.amount > available;
                    return (
                      <div
                        key={request.id}
                        onClick={() =>
                          request.status === "Pending" &&
                          handleOpenRequest(request)
                        }
                        className={`rounded-xl border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all ${
                          request.status === "Pending"
                            ? willExceed
                              ? "cursor-pointer border-red-200 hover:border-red-300"
                              : "cursor-pointer border-gray-100 hover:border-emerald-300 hover:shadow-[0_4px_20px_rgba(16,185,129,0.12)]"
                            : "opacity-70 cursor-default border-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                            {request.poReference}
                          </p>
                          <StatusBadge status={request.status} />
                        </div>
                        <p className="text-[10px] text-gray-400 mb-0.5 truncate">
                          {cat?.department ?? "—"} ·{" "}
                          <span className="font-semibold">
                            {cat?.code ?? "—"}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-gray-500 truncate mb-1">
                          {cat?.name ?? request.categoryName}
                        </p>
                        <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                          {request.requestedBy}
                        </p>
                        <p className="text-lg font-bold text-gray-900 tabular-nums">
                          ₱{fmt(request.amount)}
                        </p>
                        {request.purpose !== "—" && (
                          <p className="text-[11px] text-gray-400 truncate mt-1">
                            {request.purpose}
                          </p>
                        )}
                        {willExceed && request.status === "Pending" && (
                          <p className="text-[10px] text-red-500 font-bold mt-2">
                            ⚠ Will exceed budget
                          </p>
                        )}
                        {!willExceed && request.status === "Pending" && (
                          <p className="text-[10px] text-emerald-500 mt-2 font-medium">
                            Click to review →
                          </p>
                        )}
                        {request.remarks && request.status !== "Pending" && (
                          <p className="text-[10px] text-gray-400 mt-1 truncate italic">
                            Note: {request.remarks}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── HR Training requests ────────────────────────────────────────── */}
          {requestsTab === "hr" && (
            <>
              {hrRequestsError && (
                <p className="text-sm text-red-500 mb-3">{hrRequestsError}</p>
              )}
              {hrRequestsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="h-24 rounded-xl bg-gray-100 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredHrRequests.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  No{" "}
                  {hrStatusFilter === "All" ? "" : hrStatusFilter.toLowerCase()}{" "}
                  HR training budget requests found.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredHrRequests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() =>
                        request.status === "Pending" &&
                        handleOpenRequest(request)
                      }
                      className={`rounded-xl border bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)] transition-all ${
                        request.status === "Pending"
                          ? "cursor-pointer border-emerald-100 hover:border-emerald-300 hover:shadow-[0_4px_20px_rgba(16,185,129,0.12)]"
                          : "opacity-70 cursor-default border-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide bg-emerald-50 px-2 py-0.5 rounded-full">
                          HR Training
                        </span>
                        <StatusBadge status={request.status} />
                      </div>
                      <p className="text-[10px] text-gray-400 mb-0.5">
                        {request.department}
                      </p>
                      <p className="text-sm font-semibold text-gray-800 truncate mb-1">
                        {request.trainingName}
                      </p>
                      <p className="text-lg font-bold text-gray-900 tabular-nums">
                        ₱{fmt(request.amount)}
                      </p>
                      {request.notes && (
                        <p className="text-[11px] text-gray-400 truncate mt-1">
                          {request.notes}
                        </p>
                      )}
                      {request.status === "Pending" && (
                        <p className="text-[10px] text-emerald-500 mt-2 font-medium">
                          Click to review →
                        </p>
                      )}
                      {request.status !== "Pending" && request.notes && (
                        <p className="text-[10px] text-gray-400 mt-1 truncate italic">
                          Note: {request.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Department Budget Overview ───────────────────────────────────── */}
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Department Budget Overview
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />{" "}
                Actual Spent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block" />{" "}
                Committed
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400 mb-3">
                No budget data available.
              </p>
              <button
                onClick={handleOpenBudgetSetup}
                className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
              >
                → Set Budget Limits to get started
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Department",
                      "Category",
                      "Code",
                      "Allocated",
                      "Actual Spent",
                      "Committed",
                      "Available",
                      "Utilization",
                    ].map((h) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase ${["Allocated", "Actual Spent", "Committed", "Available"].includes(h) ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => {
                    const available = row.limit - row.actual - row.committed;
                    const isOverBudget = available < 0;
                    return (
                      <tr
                        key={row.budgetId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          {row.department}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full uppercase">
                            {row.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          ₱{fmt(row.limit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                          ₱{fmt(row.actual)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-medium">
                          ₱{fmt(row.committed)}
                        </td>
                        <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${isOverBudget ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {isOverBudget ? "−" : ""}₱{fmt(Math.abs(available))}
                          {isOverBudget && (
                            <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-600 px-1 py-0.5 rounded">
                              OVER
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <UtilizationBar
                            actual={row.actual}
                            committed={row.committed}
                            limit={row.limit}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BUDGET SETUP MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showBudgetSetup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={handleCloseSetup}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Set Budget Limits
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Define the approved spending ceiling per department for the
                    selected period. Actual spend and committed amounts are not
                    affected.
                  </p>
                </div>
                <button
                  onClick={handleCloseSetup}
                  className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 p-6">
                {setupError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                    {setupError}
                  </div>
                )}

                {allCategories.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">Loading categories…</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allCategories.map((cat) => {
                      const draft = setupDraft[cat.id] ?? {};
                      const existing = rows.find(
                        (r) => r.categoryId === cat.id,
                      );
                      const hasExisting = !!existing;
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth() + 1;

                      return (
                        <div
                          key={cat.id}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="flex items-start gap-4">
                            {/* Category info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                                  {cat.code}
                                </span>
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {cat.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-gray-400">
                                {cat.department}
                              </p>

                              {/* Show current actual + committed if row exists */}
                              {hasExisting && (
                                <p className="text-[11px] text-gray-400 mt-1">
                                  Spent ₱{fmt(existing.actual)} · Committed ₱
                                  {fmt(existing.committed)}
                                </p>
                              )}
                            </div>

                            {/* Period year input */}
                            <div className="w-24 shrink-0">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Year
                              </label>
                              <input
                                type="number"
                                value={
                                  draft.periodYear ?? new Date().getFullYear()
                                }
                                onChange={(e) =>
                                  updateDraft(
                                    cat.id,
                                    "periodYear",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                                min={currentYear}
                                max={2099}
                              />
                            </div>

                            <div className="w-20 shrink-0">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Month
                              </label>
                              <input
                                type="number"
                                value={draft.periodMonth ?? currentMonth}
                                onChange={(e) =>
                                  updateDraft(
                                    cat.id,
                                    "periodMonth",
                                    e.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                                min={1}
                                max={12}
                              />
                            </div>

                            {/* Limit amount input */}
                            <div className="w-40 shrink-0">
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                                Budget Limit (₱)
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                  ₱
                                </span>
                                <input
                                  type="number"
                                  value={draft.limitInput ?? ""}
                                  onChange={(e) =>
                                    updateDraft(
                                      cat.id,
                                      "limitInput",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                                  min={0}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Optional notes */}
                          <div className="mt-3">
                            <input
                              type="text"
                              value={draft.notes ?? ""}
                              onChange={(e) =>
                                updateDraft(cat.id, "notes", e.target.value)
                              }
                              placeholder="Optional note (e.g. Q1 allocation, board-approved)"
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-emerald-100 bg-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal footer — live total + save */}
              <div className="p-6 pt-4 border-t border-gray-100">
                {/* Live total preview */}
                <div className="flex items-center justify-between mb-4 p-3 bg-emerald-50 rounded-xl">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-emerald-500">
                      Total Budget Being Set
                    </p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">
                      ₱{fmt(draftTotal)}
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-500 text-right max-w-[200px]">
                    This is the combined ceiling across all{" "}
                    {allCategories.length} departments.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCloseSetup}
                    disabled={setupSaving}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBudgetLimits}
                    disabled={setupSaving || allCategories.length === 0}
                    className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                  >
                    {setupSaving ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                        Saving…
                      </>
                    ) : (
                      "Save Budget Limits"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {freqModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setFreqModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Department Request Breakdown
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Total request frequency per department (last 12 months).
                  </p>
                </div>
                <button
                  onClick={() => setFreqModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 ml-4 mt-0.5"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6">
                {departmentFrequency.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">No requests found.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Operational
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">
                            HR
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {departmentFrequency.map((r) => (
                          <tr key={r.department} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {r.department}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                              {fmt(r.total)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {fmt(r.operational)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                              {fmt(r.hr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="p-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setFreqModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════════════
          REVIEW MODAL  (approve / reject budget requests)
      ════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={handleCloseRequest}
          >
            <motion.div
              initial={{ scale: 0.96, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 mx-4"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Review Budget Request
                  </h2>
                  {selectedRequest._source === "hr" ? (
                    <p className="text-xs text-emerald-600 font-bold mt-0.5 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      HR Training Request
                    </p>
                  ) : (
                    <p className="text-xs text-emerald-600 font-bold mt-0.5 uppercase tracking-wide">
                      {selectedRequest.poReference}
                    </p>
                  )}
                </div>
                <StatusBadge status={selectedRequest.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    {selectedRequest._source === "hr"
                      ? "Training Program"
                      : "Requested By"}
                  </p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {selectedRequest._source === "hr"
                      ? selectedRequest.trainingName
                      : selectedRequest.requestedBy}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Amount
                  </p>
                  <p className="text-sm font-bold text-gray-900 tabular-nums">
                    ₱{fmt(selectedRequest.amount)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    {selectedRequest._source === "hr"
                      ? "Department"
                      : "Category"}
                  </p>
                  {selectedRequest._source === "hr" ? (
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRequest.department}
                    </p>
                  ) : (
                    (() => {
                      const bRow = getBudgetRowByManagementId(
                        selectedRequest.budgetManagementId,
                      );
                      const cat = bRow
                        ? getCategoryById(bRow.categoryId)
                        : null;
                      return (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedRequest.categoryName !== "—"
                              ? selectedRequest.categoryName
                              : (cat?.name ?? "—")}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {cat?.department ?? "—"} · {cat?.code ?? "—"}
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    Budget Status
                  </p>
                  {selectedRequest._source === "hr" ? (
                    <p className="text-sm text-emerald-600 font-medium">
                      HR Training — no budget limit set
                    </p>
                  ) : (
                    (() => {
                      const budgetRow = getBudgetRowByManagementId(
                        selectedRequest.budgetManagementId,
                      );
                      if (!budgetRow)
                        return <p className="text-sm text-gray-400">—</p>;
                      const available =
                        budgetRow.limit -
                        budgetRow.actual -
                        budgetRow.committed;
                      const willExceed = selectedRequest.amount > available;
                      return (
                        <div>
                          <p
                            className={`text-sm font-semibold tabular-nums ${willExceed ? "text-red-600" : "text-emerald-600"}`}
                          >
                            ₱{fmt(available)} available
                            {willExceed && (
                              <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 py-0.5 rounded font-bold">
                                WILL EXCEED
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Limit ₱{fmt(budgetRow.limit)} · Spent ₱
                            {fmt(budgetRow.actual)} · Committed ₱
                            {fmt(budgetRow.committed)}
                          </p>
                        </div>
                      );
                    })()
                  )}
                </div>
                <div className="bg-gray-50 p-3 rounded-xl col-span-2">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">
                    {selectedRequest._source === "hr" ? "Notes" : "Purpose"}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedRequest._source === "hr"
                      ? selectedRequest.notes || "—"
                      : selectedRequest.purpose}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {decision === "reject"
                    ? "Rejection Reason *"
                    : "Approval Note (optional)"}
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full rounded-xl border p-3 text-sm min-h-[80px] outline-none transition-all resize-none ${decision === "reject" ? "border-red-200 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:ring-2 focus:ring-emerald-100"}`}
                  placeholder={
                    decision === "reject"
                      ? "Required: reason for rejection…"
                      : "Optional: note for this approval…"
                  }
                />
              </div>

              {actionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCloseRequest}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                >
                  Cancel
                </button>
                {decision === "approve" ? (
                  <>
                    <button
                      onClick={() => setDecision("reject")}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleApproveRequest}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                          Processing…
                        </>
                      ) : (
                        "Approve Request"
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setDecision("approve")}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleRejectRequest}
                      disabled={!remarks.trim() || isProcessing}
                      className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />{" "}
                          Processing…
                        </>
                      ) : (
                        "Confirm Rejection"
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
  
}

export default BudgetManagement;