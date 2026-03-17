import { supabase } from '../../database/supabase'

/**
 * Kukuha ng mga pangunahing numero (KPIs) para sa Dashboard.
 * Naka-focus ito sa LIVE data ng kasalukuyang buwan (March 2026).
 */
export async function fetchDashboardMetrics() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [
    { data: mRevenue, error: mRevErr },
    { data: dRevenue, error: dRevErr },
    { data: yRevenue, error: yRevErr },
    { data: mExpenses, error: mExpErr }
  ] = await Promise.all([
    // LIVE MONTHLY REVENUE: Boundary payments ngayong buwan lang
    supabase.from('core1_boundary_payments')
      .select('amount')
      .gte('payment_timestamp', startOfMonth)
      .eq('status', 'PAID'),
    // DAILY COLLECTION: Boundary payments simula 12:00 AM kanina
    supabase.from('core1_boundary_payments')
      .select('amount')
      .gte('payment_timestamp', startOfDay)
      .eq('status', 'PAID'),
    // YEARLY REVENUE: Para sa Budget Management guardrails
    supabase.from('core1_boundary_payments')
      .select('amount')
      .gte('payment_timestamp', startOfYear)
      .eq('status', 'PAID'),
    // MONTHLY EXPENSES: Lahat ng nilabas na pera ngayong buwan
    supabase.from('fin_disbursement')
      .select('fin_accounts_payable(amount)')
      .gte('disbursed_at', startOfMonth)
      .eq('status', 'RELEASED')
  ]);

  if (mRevErr || dRevErr || yRevErr || mExpErr) throw new Error('Dashboard Metrics Sync Failed');

  const monthlyRevenue = (mRevenue ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const dailyCollection = (dRevenue ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const yearlyRevenue = (yRevenue ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const monthlyExpenses = (mExpenses ?? []).reduce((sum, r: any) => sum + Number(r.fin_accounts_payable?.amount || 0), 0);

  return {
    monthlyRevenue,
    dailyCollection,
    yearlyRevenue,
    monthlyExpenses,
    netProfit: monthlyRevenue - monthlyExpenses // Live Monthly Profit
  }
}

/**
 * Kukuha ng data para sa apat (4) na charts sa Dashboard.
 * Tinitiyak na ang Revenue ay kasama sa Cash Flow "In".
 */
export async function fetchDashboardCharts() {
  const now = new Date();
  const startOf6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

  const [
    { data: boundaryData },
    { data: disbursementData },
    { data: ledgerData },
    { data: driversData }
  ] = await Promise.all([
    // Para sa Revenue Trend at Cash Flow In
    supabase.from('core1_boundary_payments').select('amount, payment_timestamp').eq('status', 'PAID'),
    // Para sa Expenses Trend (last 6 months) at Category Pie
    supabase.from('fin_disbursement').select('disbursed_at, fin_accounts_payable(amount, category)').eq('status', 'RELEASED'),
    // Para sa Manual Ledger In/Out
    supabase.from('fin_general_ledger').select('debit, credit, transaction_date'),
    // Para sa Health Check
    supabase.from('core1_drivers').select('id')
  ]);

  const toDateKey = (val: string) => new Date(val).toLocaleDateString('en-CA');
  
  // Helper para sa huling 7 araw
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return toDateKey(d.toISOString());
  });

  // 1. BOUNDARY COLLECTIONS TREND (Area Chart)
  const bMap = new Map(last7Days.map(d => [d, 0]));
  boundaryData?.forEach(r => {
    const key = toDateKey(r.payment_timestamp);
    if (bMap.has(key)) bMap.set(key, bMap.get(key)! + Number(r.amount));
  });

  // 2. MONTHLY EXPENSES TREND (Bar Chart - last 6 months)
  const last6Months = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const eMap = new Map(last6Months.map(m => [m, 0]));
  disbursementData?.forEach(r => {
    const key = r.disbursed_at?.slice(0, 7);
    if (key && eMap.has(key)) eMap.set(key, eMap.get(key)! + Number(r.fin_accounts_payable?.amount));
  });

  // 3. CATEGORY BREAKDOWN (Pie Chart)
  const catMap = new Map();
  disbursementData?.forEach(r => {
    const cat = r.fin_accounts_payable?.category || 'Other';
    catMap.set(cat, (catMap.get(cat) || 0) + Number(r.fin_accounts_payable?.amount));
  });

  // 4. CASH FLOW (Line Chart: Revenue In vs Expenses Out)
  const cfMap = new Map(last7Days.map(d => [d, { in: 0, out: 0 }]));
  // Isama ang Boundary bilang "In"
  boundaryData?.forEach(r => {
    const key = toDateKey(r.payment_timestamp);
    if (cfMap.has(key)) cfMap.get(key)!.in += Number(r.amount);
  });
  // Isama ang Ledger records
  ledgerData?.forEach(r => {
    const key = toDateKey(r.transaction_date);
    if (cfMap.has(key)) {
      const entry = cfMap.get(key)!;
      entry.in += Number(r.credit || 0);
      entry.out += Number(r.debit || 0);
    }
  });

  const palette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  return {
    boundaryData: Array.from(bMap.entries()).map(([name, amount]) => ({ name, amount })),
    monthlyExpenses: Array.from(eMap.entries()).map(([month, amount]) => ({ month, amount })),
    categoryData: Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] })),
    cashFlowData: Array.from(cfMap.entries()).map(([day, val]) => ({ day, in: val.in, out: val.out })),
    totalDrivers: driversData?.length || 0
  };
}

/**
 * Karagdagang helper para sa Budget Management validation.
 */
export async function fetchYearlyRevenue() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
  
  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('amount')
    .gte('payment_timestamp', startOfYear)
    .eq('status', 'PAID');

  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + Number(r.amount || 0), 0);
}