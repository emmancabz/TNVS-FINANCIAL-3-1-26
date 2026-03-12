import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// ─── Main Component ───────────────────────────────────────────────────────────
function BudgetManagement() {
  // ── Budget overview state ──────────────────────────────────────────────────
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Budget requests state — Operational (log1_budget_requests) ───────────
  const [budgetRequests, setBudgetRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");

  // ── Budget requests state — HR Training (hr_budget_requests) ──────────────
  const [hrRequests, setHrRequests] = useState([]);
  const [hrRequestsLoading, setHrRequestsLoading] = useState(true);
  const [hrRequestsError, setHrRequestsError] = useState("");
  const [hrStatusFilter, setHrStatusFilter] = useState("Pending");

  // ── Which requests tab is visible: "operational" | "hr" ───────────────────
  const [requestsTab, setRequestsTab] = useState("operational");

  // ── Review modal state ─────────────────────────────────────────────────────
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState("approve");
  const [remarks, setRemarks] = useState("");
  const [actionError, setActionError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Budget Setup Modal state ───────────────────────────────────────────────
  // showBudgetSetup  = controls modal visibility
  // allCategories    = all fin_budget_categories rows (including those with no budget row yet)
  // setupDraft       = categoryId → { limitInput, periodYear, notes, budgetRowId | null }
  // setupSaving      = loading state while upserting
  // setupError       = error message inside the modal
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [setupDraft, setSetupDraft] = useState({});
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Look up a fin_budget_categories record by its UUID id.
  // (Used by the budget setup modal, not by request cards/modal.)
  const getCategoryById = useCallback(
    (id) => categories.find((c) => c.id === id),
    [categories],
  );

  // KEY INSIGHT — FK chain in the database:
  //   log1_budget_requests.budget_category_id  →  fin_budget_management.id  (PK)
  //   fin_budget_management.budget_category_id  →  fin_budget_categories.id  (PK)
  //
  // So a request's budgetManagementId IS the fin_budget_management PK (budgetId).
  // We find the budget row directly by matching row.budgetId.
  const getBudgetRowByManagementId = useCallback(
    (budgetManagementId) => rows.find((r) => r.budgetId === budgetManagementId),
    [rows],
  );

  // ── 1. Load Budget Overview ────────────────────────────────────────────────
  const loadBudgetOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // FIX: Always fetch ALL fin_budget_categories independently so that
      // getCategoryById() works even when fin_budget_management is empty
      // or a request references a category with no budget row yet.
      const { data: allCats, error: catsErr } = await supabase
        .from("fin_budget_categories")
        .select("id, code, name, department, description, is_active")
        .eq("is_active", true);
      if (catsErr) throw catsErr;
      setCategories(allCats || []);

      const { data: budgets, error: budgetErr } = await supabase
        .from("fin_budget_management")
        .select(
          `
          id,
          budget_category_id,
          category,
          limit_amount,
          actual_spend,
          committed_amount,
          period_year,
          period_month,
          notes,
          updated_at,
          fin_budget_categories (
            id, code, name, department, description, is_active
          )
        `,
        )
        .order("period_year", { ascending: false });

      if (budgetErr) throw budgetErr;

      setRows(
        (budgets || []).map((b) => ({
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
        })),
      );
    } catch (err) {
      console.error("BUDGET OVERVIEW ERROR:", err);
      setError("Failed to load budget overview.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgetOverview();
  }, [loadBudgetOverview]);

  // ── 2. Load Budget Requests ────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const { data, error } = await supabase
        .from("log1_budget_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBudgetRequests(
        (data || []).map((item) => ({
          id: item.id,
          // budgetManagementId = FK → fin_budget_management.id (NOT fin_budget_categories)
          budgetManagementId: item.budget_category_id,
          // categoryName is already stored on the request row — use it directly
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
        })),
      );
    } catch {
      setRequestsError("Failed to load budget requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ── 2b. Load HR Budget Requests ───────────────────────────────────────────
  // Reads hr_budget_requests directly — no join needed because training_name
  // is stored directly on the table (NOT NULL). The training_id FK to
  // hr_training_programs is nullable and its column names are unknown, so
  // we avoid the join entirely to prevent fetch failures.
  const loadHrRequests = useCallback(async () => {
    setHrRequestsLoading(true);
    setHrRequestsError("");
    try {
      const { data, error } = await supabase
        .from("hr_budget_requests")
        .select(
          "id, training_id, training_name, amount, submitted_date, approval_status, response_date, notes, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHrRequests(
        (data || []).map((item) => ({
          id: item.id,
          _source: "hr", // used by modal handlers to route approve/reject correctly
          trainingId: item.training_id,
          trainingName: item.training_name || "—",
          department: "HR",
          amount: num(item.amount),
          // Normalize to "status" so StatusBadge and filter tabs work identically
          status: item.approval_status ?? "Pending",
          notes: item.notes ?? "",
          submittedDate: item.submitted_date,
          responseDate: item.response_date,
          createdAt: item.created_at,
          // Fields expected by the shared review modal
          categoryName: "HR Training",
          requestedBy: "HR Department",
          poReference: null, // generated at approve time
          purpose: item.notes ?? "—",
          budgetManagementId: null, // HR requests are not linked to fin_budget_management
          remarks: "",
        })),
      );
    } catch (err) {
      setHrRequestsError("Failed to load HR budget requests: " + err.message);
    } finally {
      setHrRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHrRequests();
  }, [loadHrRequests]);

  // ── 3. Budget Setup Modal — open ───────────────────────────────────────────
  // Fetches ALL fin_budget_categories (not just those with a budget row),
  // then pre-fills existing limit values into the draft so the admin sees
  // everything in one place — including categories with no row yet.
  const handleOpenBudgetSetup = async () => {
    setSetupError("");
    setShowBudgetSetup(true);

    try {
      // Fetch all categories from fin_budget_categories
      const { data: cats, error: catsErr } = await supabase
        .from("fin_budget_categories")
        .select("id, code, name, department")
        .eq("is_active", true)
        .order("department");

      if (catsErr) throw catsErr;
      setAllCategories(cats || []);

      // Build draft: one entry per category
      // Pre-fill from existing fin_budget_management rows if they exist
      const currentYear = new Date().getFullYear();
      const draft = {};
      (cats || []).forEach((cat) => {
        const existing = rows.find((r) => r.categoryId === cat.id);
        draft[cat.id] = {
          budgetRowId: existing?.budgetId ?? null,
          limitInput: existing?.limit != null ? String(existing.limit) : "",
          periodYear: existing?.periodYear ?? currentYear,
          notes: existing?.notes ?? "",
        };
      });
      setSetupDraft(draft);
    } catch (err) {
      setSetupError("Failed to load categories: " + err.message);
    }
  };

  const handleCloseSetup = () => {
    setShowBudgetSetup(false);
    setSetupError("");
    setSetupSaving(false);
  };

  // Update a single field in the draft for one category
  const updateDraft = (categoryId, field, value) => {
    setSetupDraft((prev) => ({
      ...prev,
      [categoryId]: { ...prev[categoryId], [field]: value },
    }));
  };

  // ── 4. Budget Setup Modal — save ───────────────────────────────────────────
  // For each category in the draft:
  //   • Row already exists (budgetRowId is set) → UPDATE using PK (id)
  //   • No row yet                              → INSERT fresh row
  //
  // Does NOT rely on any unique constraint — safe even before the constraint
  // is added to the database.
  // actual_spend and committed_amount are NEVER modified here.
  const handleSaveBudgetLimits = async () => {
    setSetupSaving(true);
    setSetupError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const setBy = auth?.user?.email ?? "System";
      const now = new Date().toISOString();

      const toUpdate = []; // categories that already have a fin_budget_management row
      const toInsert = []; // categories that don't have one yet

      allCategories.forEach((cat) => {
        const draft = setupDraft[cat.id] ?? {};
        const limit = num(draft.limitInput);
        const year = num(draft.periodYear) || new Date().getFullYear();
        const existing = rows.find((r) => r.categoryId === cat.id);

        if (existing?.budgetId) {
          // UPDATE — only change limit_amount, period_year, notes, set_by, updated_at.
          // actual_spend and committed_amount are untouched.
          toUpdate.push({
            id: existing.budgetId, // PK — identifies exact row
            limit_amount: limit,
            period_year: year,
            notes: draft.notes ?? null,
            set_by: setBy,
            updated_at: now,
          });
        } else {
          // INSERT — brand-new row; actual_spend + committed_amount start at 0
          toInsert.push({
            budget_category_id: cat.id,
            category: cat.name,
            limit_amount: limit,
            actual_spend: 0,
            committed_amount: 0,
            period_year: year,
            notes: draft.notes ?? null,
            set_by: setBy,
            updated_at: now,
          });
        }
      });

      // Run UPDATEs — one per existing row (keyed by PK)
      for (const row of toUpdate) {
        const { id, ...fields } = row;
        const { error } = await supabase
          .from("fin_budget_management")
          .update(fields)
          .eq("id", id);
        if (error) throw error;
      }

      // Run INSERTs — batch all new rows in one call
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from("fin_budget_management")
          .insert(toInsert);
        if (error) throw error;
      }

      // Refresh overview so new limits appear immediately
      await loadBudgetOverview();
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
  //
  //  Branches on selectedRequest._source:
  //    "operational" → existing log1_budget_requests flow (AP + committed_amount)
  //    "hr"          → hr_budget_requests flow (AP only, no budget tracking)
  //
  const handleApproveRequest = async () => {
    if (!selectedRequest || isProcessing) return;
    setIsProcessing(true);
    setActionError("");

    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const { data: auth } = await supabase.auth.getUser();
      const approverEmail = auth?.user?.email ?? "System";
      const approverUserId = auth?.user?.id ?? null;

      // ── Resolve hr_proceedlist employee id for fin_accounts_payable ─────────
      let hrEmployeeId = 1;
      if (approverUserId) {
        const { data: hrRow } = await supabase
          .from("hr_proceedlist")
          .select("id")
          .eq("user_id", approverUserId)
          .maybeSingle();
        if (hrRow?.id) hrEmployeeId = hrRow.id;
      }

      // ════════════════════════════════════════════════════════════════════════
      if (selectedRequest._source === "hr") {
        // ── HR Training Budget Request ───────────────────────────────────────

        // Guard: concurrent session check
        const { data: fresh, error: freshErr } = await supabase
          .from("hr_budget_requests")
          .select("approval_status")
          .eq("id", selectedRequest.id)
          .single();
        if (freshErr) throw freshErr;
        if (fresh?.approval_status !== "Pending") {
          setActionError(
            `This request is already ${fresh?.approval_status}. Refresh to see the latest state.`,
          );
          setIsProcessing(false);
          return;
        }

        // Step 1 — Mark HR request as Approved
        const { error: hrUpdateErr } = await supabase
          .from("hr_budget_requests")
          .update({
            approval_status: "Approved",
            response_date: today,
            notes: remarks.trim() || selectedRequest.notes || null,
          })
          .eq("id", selectedRequest.id);
        if (hrUpdateErr) throw hrUpdateErr;

        // Step 2 — Create fin_accounts_payable for Finance to disburse
        // Generate a ref_no since HR requests have no po_reference
        const hrRef = `HR-${String(selectedRequest.id).padStart(5, "0")}-${today.replace(/-/g, "")}`;
        const { data: apData, error: apErr } = await supabase
          .from("fin_accounts_payable")
          .insert([
            {
              ref_no: hrRef,
              vendor_name: selectedRequest.trainingName,
              amount: selectedRequest.amount,
              description: `HR Training Budget: ${selectedRequest.trainingName}${selectedRequest.notes ? " — " + selectedRequest.notes : ""}`,
              status: "Pending",
              category: "HR Training",
              created_at: now,
              employee_id: hrEmployeeId,
            },
          ])
          .select()
          .single();
        if (apErr) throw apErr;

        // Step 3 — Create fin_disbursement voucher
        const { error: dvErr } = await supabase
          .from("fin_disbursement")
          .insert([
            {
              dv_no: `DV-${hrRef}`,
              ap_id: apData.id,
              status: "Pending Disbursement",
              payment_method: "Bank Transfer",
            },
          ]);
        if (dvErr) throw dvErr;

        // Optimistic update + reload
        setHrRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? { ...r, status: "Approved", remarks: remarks.trim() }
              : r,
          ),
        );
        handleCloseRequest();
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // ── Operational Budget Request (log1_budget_requests) ───────────────────

      // Guard: concurrent session check
      const { data: fresh, error: freshErr } = await supabase
        .from("log1_budget_requests")
        .select("status")
        .eq("id", selectedRequest.id)
        .single();
      if (freshErr) throw freshErr;
      if (fresh?.status !== "Pending") {
        setActionError(
          `This request is already ${fresh?.status}. Refresh to see the latest state.`,
        );
        setIsProcessing(false);
        return;
      }

      // Guard: over-budget check
      const { data: budgetRow, error: budgetFetchErr } = await supabase
        .from("fin_budget_management")
        .select(
          "id, limit_amount, actual_spend, committed_amount, budget_category_id",
        )
        .eq("id", selectedRequest.budgetManagementId)
        .maybeSingle();
      if (budgetFetchErr) throw budgetFetchErr;

      const currentLimit = num(budgetRow?.limit_amount);
      const currentActual = num(budgetRow?.actual_spend);
      const currentCommitted = num(budgetRow?.committed_amount);
      const available = currentLimit - currentActual - currentCommitted;

      if (budgetRow && currentLimit > 0 && selectedRequest.amount > available) {
        setActionError(
          `Approval would exceed the budget for "${selectedRequest.categoryName}". ` +
            `Available: ₱${fmt(available)} | Requested: ₱${fmt(selectedRequest.amount)}`,
        );
        setIsProcessing(false);
        return;
      }

      // Step 1 — Update log1_budget_requests
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

      // Step 2 — Insert fin_accounts_payable
      const { data: apData, error: apErr } = await supabase
        .from("fin_accounts_payable")
        .insert([
          {
            ref_no: selectedRequest.poReference,
            vendor_name: selectedRequest.requestedBy,
            amount: selectedRequest.amount,
            description: selectedRequest.purpose,
            status: "Approved",
            category: selectedRequest.categoryName,
            created_at: now,
            employee_id: hrEmployeeId,
          },
        ])
        .select()
        .single();
      if (apErr) throw apErr;

      // Step 3 — Insert fin_disbursement
      const { error: disburseErr } = await supabase
        .from("fin_disbursement")
        .insert([
          {
            dv_no: `DV-${selectedRequest.poReference}`,
            ap_id: apData.id,
            status: "Pending Disbursement",
            payment_method: "Bank Transfer",
          },
        ]);
      if (disburseErr) throw disburseErr;

      // Step 4 — Increment committed_amount (NOT actual_spend)
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

      setBudgetRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: "Approved", remarks: remarks.trim() }
            : r,
        ),
      );
      await loadBudgetOverview();
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
        // ── HR Training rejection ──────────────────────────────────────────
        const { error: hrUpdateErr } = await supabase
          .from("hr_budget_requests")
          .update({
            approval_status: "Rejected",
            response_date: today,
            notes: remarks.trim(),
          })
          .eq("id", selectedRequest.id);
        if (hrUpdateErr) throw hrUpdateErr;

        setHrRequests((prev) =>
          prev.map((r) =>
            r.id === selectedRequest.id
              ? { ...r, status: "Rejected", remarks: remarks.trim() }
              : r,
          ),
        );
        handleCloseRequest();
        return;
      }

      // ── Operational rejection ──────────────────────────────────────────────
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
      setBudgetRequests((prev) =>
        prev.map((r) =>
          r.id === selectedRequest.id
            ? { ...r, status: "Rejected", remarks: remarks.trim() }
            : r,
        ),
      );
      handleCloseRequest();
    } catch {
      setActionError("Failed to reject request. Please try again.");
      setIsProcessing(false);
    }
  };

  // ── Derived totals ─────────────────────────────────────────────────────────
  const statusCounts = budgetRequests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 },
  );
  const filteredRequests =
    statusFilter === "All"
      ? budgetRequests
      : budgetRequests.filter((r) => r.status === statusFilter);

  // ── HR derived counts ──────────────────────────────────────────────────────
  const hrStatusCounts = hrRequests.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    { Pending: 0, Approved: 0, Rejected: 0 },
  );
  const filteredHrRequests =
    hrStatusFilter === "All"
      ? hrRequests
      : hrRequests.filter((r) => r.status === hrStatusFilter);
  const totalAllocated = rows.reduce((s, r) => s + r.limit, 0);
  const totalSpent = rows.reduce((s, r) => s + r.actual, 0);
  const totalCommitted = rows.reduce((s, r) => s + r.committed, 0);
  const totalAvailable = totalAllocated - totalSpent - totalCommitted;

  // ── Total of draft limits (live preview inside the setup modal) ────────────
  const draftTotal = allCategories.reduce(
    (s, cat) => s + num(setupDraft[cat.id]?.limitInput),
    0,
  );
  

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
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-1 tracking-tight">
            Budget Management
          </h1>
          <p className="text-gray-500 text-sm">
            TNVS Financial Budget Control · Committed vs Actual · Variance
            Analysis
          </p>
        </div>

        {/* ── Set Budget Limits button ── */}
        <button
          onClick={handleOpenBudgetSetup}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm shrink-0"
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
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
          >
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">
              {kpi.label}
            </p>
            <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>
              {kpi.value}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-8">
        {/* ── Budget Requests ─────────────────────────────────────────────── */}
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          {/* Section header + source tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Budget Requests
              </h2>
              {/* Operational | HR tab switcher */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
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
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
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

            {/* Status filter tabs — change based on active source tab */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
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
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${active === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                              : "cursor-pointer border-gray-100 hover:border-blue-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.12)]"
                            : "opacity-70 cursor-default border-gray-100"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
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
                          <p className="text-[10px] text-blue-500 mt-2 font-medium">
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
                          ? "cursor-pointer border-purple-100 hover:border-purple-300 hover:shadow-[0_4px_20px_rgba(168,85,247,0.12)]"
                          : "opacity-70 cursor-default border-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide bg-purple-50 px-2 py-0.5 rounded-full">
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
                        <p className="text-[10px] text-purple-500 mt-2 font-medium">
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
        <div className="w-full rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Department Budget Overview
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
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
                <div
                  key={i}
                  className="h-10 rounded bg-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400 mb-3">
                No budget data available.
              </p>
              <button
                onClick={handleOpenBudgetSetup}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                → Set Budget Limits to get started
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
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
                        className={`px-4 py-3 text-xs font-semibold text-gray-600 uppercase ${["Allocated", "Actual Spent", "Committed", "Available"].includes(h) ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const available = row.limit - row.actual - row.committed;
                    const isOverBudget = available < 0;
                    return (
                      <tr
                        key={row.budgetId}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {row.department}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full uppercase">
                            {row.code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                          ₱{fmt(row.limit)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">
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
          Finance Admin sets limit_amount per category for a given year.
          Uses upsert on (budget_category_id, period_year) unique constraint.
          actual_spend and committed_amount are NEVER modified here.
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
              <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Set Budget Limits
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
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
                                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                                min={2020}
                                max={2099}
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
                                  className="w-full rounded-lg border border-gray-200 pl-6 pr-2 py-1.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-blue-100 bg-white"
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
                              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
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
                <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-xl">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-blue-400">
                      Total Budget Being Set
                    </p>
                    <p className="text-lg font-bold text-blue-700 tabular-nums">
                      ₱{fmt(draftTotal)}
                    </p>
                  </div>
                  <p className="text-[11px] text-blue-400 text-right max-w-[200px]">
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
                    className="px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
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
                    <p className="text-xs text-purple-600 font-bold mt-0.5 uppercase tracking-wide flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block" />
                      HR Training Request
                    </p>
                  ) : (
                    <p className="text-xs text-blue-600 font-bold mt-0.5 uppercase tracking-wide">
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
                    <p className="text-sm text-purple-600 font-medium">
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
                  className={`w-full rounded-xl border p-3 text-sm min-h-[80px] outline-none transition-all resize-none ${decision === "reject" ? "border-red-200 focus:ring-2 focus:ring-red-100" : "border-gray-200 focus:ring-2 focus:ring-blue-100"}`}
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
