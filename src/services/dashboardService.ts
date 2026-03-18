import { supabase } from '../../database/supabase'

const DAY_MS = 24 * 60 * 60 * 1000

export type DashboardInterval = 'weekly' | 'monthly' | 'yearly'

type DashboardKpis = {
  revenue: number
  collections: number
  expenses: number
  netProfit: number
}

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

const startOfPhilippinesDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * DAY_MS)

const toDateKey = (date: Date) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

const parsePhilippinesDate = (dateStr: string) => new Date(`${dateStr}T00:00:00+08:00`)

const isValidDateStr = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))

export function getRangeForInterval(interval: DashboardInterval, now = getPhilippinesNow()) {
  const endExclusive = addDays(startOfPhilippinesDay(now), 1)
  if (interval === 'weekly') {
    const start = addDays(startOfPhilippinesDay(now), -6)
    return { fromISO: start.toISOString(), toISOExclusive: endExclusive.toISOString() }
  }
  if (interval === 'yearly') {
    const start = new Date(now.getFullYear(), 0, 1)
    return { fromISO: start.toISOString(), toISOExclusive: endExclusive.toISOString() }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return { fromISO: start.toISOString(), toISOExclusive: endExclusive.toISOString() }
}

export function normalizeDateRange(fromDateStr: string, toDateStr: string) {
  const now = getPhilippinesNow()
  const todayKey = toDateKey(now)
  const fallbackFrom = addDays(startOfPhilippinesDay(now), -6)

  const from = isValidDateStr(fromDateStr) ? parsePhilippinesDate(fromDateStr) : fallbackFrom
  const to = isValidDateStr(toDateStr) ? parsePhilippinesDate(toDateStr) : parsePhilippinesDate(todayKey)

  const start = startOfPhilippinesDay(from)
  const endDay = startOfPhilippinesDay(to)
  const safeStart = start.getTime() <= endDay.getTime() ? start : endDay
  const safeEndDay = start.getTime() <= endDay.getTime() ? endDay : start
  const endExclusive = addDays(safeEndDay, 1)

  return { fromISO: safeStart.toISOString(), toISOExclusive: endExclusive.toISOString() }
}

export async function fetchDashboardKpisForRange(fromISO: string, toISOExclusive: string): Promise<DashboardKpis> {
  const [{ data: payments, error: payErr }, { data: disbursements, error: disbErr }] = await Promise.all([
    supabase
      .from('core1_boundary_payments')
      .select('amount')
      .gte('payment_timestamp', fromISO)
      .lt('payment_timestamp', toISOExclusive)
      .eq('status', 'PAID'),
    supabase
      .from('fin_disbursement')
      .select('fin_accounts_payable(amount)')
      .gte('disbursed_at', fromISO)
      .lt('disbursed_at', toISOExclusive)
      .eq('status', 'RELEASED'),
  ])

  if (payErr) throw payErr
  if (disbErr) throw disbErr

  const revenue = (payments ?? []).reduce((sum: number, r: any) => sum + Number(r?.amount || 0), 0)
  const collections = revenue
  const expenses = (disbursements ?? []).reduce((sum: number, r: any) => sum + Number(r?.fin_accounts_payable?.amount || 0), 0)
  const netProfit = revenue - expenses

  return { revenue, collections, expenses, netProfit }
}

export async function fetchDashboardKpisByInterval(interval: DashboardInterval): Promise<DashboardKpis> {
  const { fromISO, toISOExclusive } = getRangeForInterval(interval)
  return fetchDashboardKpisForRange(fromISO, toISOExclusive)
}

export async function fetchDashboardMetrics() {
  const [monthly, weekly, yearly] = await Promise.all([
    fetchDashboardKpisByInterval('monthly'),
    fetchDashboardKpisByInterval('weekly'),
    fetchDashboardKpisByInterval('yearly'),
  ])

  return {
    monthlyRevenue: monthly.revenue,
    dailyCollection: weekly.collections,
    yearlyRevenue: yearly.revenue,
    monthlyExpenses: monthly.expenses,
    netProfit: monthly.netProfit,
  }
}

/**
 * Kukuha ng data para sa apat (4) na charts sa Dashboard.
 * Tinitiyak na ang Revenue ay kasama sa Cash Flow "In".
 */
export async function fetchDashboardCharts() {
  const now = getPhilippinesNow()
  const startOf6Months = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

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

  const last7Days = [...Array(7)].map((_, i) => {
    const d = addDays(now, -(6 - i))
    return toDateKey(d)
  })

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

  const palette = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#064e3b', '#6b7280']

  return {
    boundaryData: Array.from(bMap.entries()).map(([name, amount]) => ({ name, amount })),
    monthlyExpenses: Array.from(eMap.entries()).map(([month, amount]) => ({ month, amount })),
    categoryData: Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] })),
    cashFlowData: Array.from(cfMap.entries()).map(([day, val]) => ({ day, in: val.in, out: val.out })),
    totalDrivers: driversData?.length || 0
  };
}

export async function fetchDashboardChartsForRange(fromISO: string, toISOExclusive: string) {
  const [{ data: boundaryData }, { data: disbursementData }, { data: ledgerData }] = await Promise.all([
    supabase
      .from('core1_boundary_payments')
      .select('amount, payment_timestamp')
      .gte('payment_timestamp', fromISO)
      .lt('payment_timestamp', toISOExclusive)
      .eq('status', 'PAID'),
    supabase
      .from('fin_disbursement')
      .select('disbursed_at, fin_accounts_payable(amount, category)')
      .gte('disbursed_at', fromISO)
      .lt('disbursed_at', toISOExclusive)
      .eq('status', 'RELEASED'),
    supabase
      .from('fin_general_ledger')
      .select('debit, credit, transaction_date')
      .gte('transaction_date', fromISO)
      .lt('transaction_date', toISOExclusive),
  ])

  const start = new Date(fromISO)
  const endExclusive = new Date(toISOExclusive)
  const dayCount = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS))
  const days = [...Array(dayCount)].map((_, i) => toDateKey(addDays(start, i)))

  const bMap = new Map(days.map((d) => [d, 0]))
  boundaryData?.forEach((r: any) => {
    const key = toDateKey(new Date(r?.payment_timestamp))
    if (bMap.has(key)) bMap.set(key, bMap.get(key)! + Number(r?.amount || 0))
  })

  const eDaily = new Map(days.map((d) => [d, 0]))
  disbursementData?.forEach((r: any) => {
    const key = r?.disbursed_at ? toDateKey(new Date(r.disbursed_at)) : null
    if (!key || !eDaily.has(key)) return
    eDaily.set(key, eDaily.get(key)! + Number(r?.fin_accounts_payable?.amount || 0))
  })

  const catMap = new Map<string, number>()
  disbursementData?.forEach((r: any) => {
    const cat = r?.fin_accounts_payable?.category || 'Other'
    catMap.set(cat, (catMap.get(cat) || 0) + Number(r?.fin_accounts_payable?.amount || 0))
  })

  const cfMap = new Map(days.map((d) => [d, { in: 0, out: 0 }]))
  boundaryData?.forEach((r: any) => {
    const key = toDateKey(new Date(r?.payment_timestamp))
    if (cfMap.has(key)) cfMap.get(key)!.in += Number(r?.amount || 0)
  })
  ledgerData?.forEach((r: any) => {
    const key = toDateKey(new Date(r?.transaction_date))
    if (!cfMap.has(key)) return
    const entry = cfMap.get(key)!
    entry.in += Number(r?.credit || 0)
    entry.out += Number(r?.debit || 0)
  })

  const palette = ['#10b981', '#059669', '#34d399', '#6ee7b7', '#064e3b', '#6b7280']

  return {
    boundaryData: Array.from(bMap.entries()).map(([name, amount]) => ({ name, amount })),
    expensesDaily: Array.from(eDaily.entries()).map(([day, amount]) => ({ day, amount })),
    categoryData: Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: palette[i % palette.length] })),
    cashFlowData: Array.from(cfMap.entries()).map(([day, val]) => ({ day, in: val.in, out: val.out })),
  }
}

/**
 * Karagdagang helper para sa Budget Management validation.
 */
export async function fetchYearlyRevenue() {
  const yearly = await fetchDashboardKpisByInterval('yearly')
  return yearly.revenue
}
