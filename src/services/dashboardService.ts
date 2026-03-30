import { z } from 'zod'
import { supabase } from '../../database/supabase'
// 🚨 DAPAT NASA TAAS ITO, HINDI SA LOOB NG FUNCTION
import { logAudit } from './Auditlogservice'

// 🛡️ ZOD SCHEMAS
const BoundaryPaymentSchema = z.object({
  amount: z.coerce.number().min(0).default(0),
  payment_timestamp: z.string().nullable().optional(),
  status: z.string().nullable().optional()
}).passthrough();

const DisbursementSchema = z.object({
  disbursed_at: z.string().nullable().optional(),
  fin_accounts_payable: z.object({
    amount: z.coerce.number().min(0).default(0),
    category: z.string().nullable().optional()
  }).nullable().optional()
}).passthrough();

const LedgerSchema = z.object({
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  transaction_date: z.string().nullable().optional()
}).passthrough();

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
      .select('amount, payment_timestamp, status')
      .gte('payment_timestamp', fromISO)
      .lt('payment_timestamp', toISOExclusive)
      .ilike('status', 'paid'),
    supabase
      .from('fin_disbursement')
      .select('disbursed_at, fin_accounts_payable(amount, category)')
      .gte('disbursed_at', fromISO)
      .lt('disbursed_at', toISOExclusive)
      .ilike('status', 'released'),
  ])

  if (payErr) throw payErr
  if (disbErr) throw disbErr

  // 🛡️ DATA VALIDATION
  const parsedPayments = z.array(BoundaryPaymentSchema).safeParse(payments)
  const parsedDisbursements = z.array(DisbursementSchema).safeParse(disbursements)

  // 🚨 SECURITY WITNESS: I-log kung may "bad data" na pumasok sa financials
  if (!parsedPayments.success) {
    logAudit('DATA_INTEGRITY_VIOLATION', { 
      table: 'core1_boundary_payments', 
      error: parsedPayments.error.format() 
    }, 'SECURITY');
  }

  const validPayments = parsedPayments.success ? parsedPayments.data : []
  const validDisbursements = parsedDisbursements.success ? parsedDisbursements.data : []

  const revenue = validPayments.reduce((sum, r) => sum + r.amount, 0)
  const collections = revenue
  const expenses = validDisbursements.reduce((sum, r) => sum + (r.fin_accounts_payable?.amount || 0), 0)
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

const COLOR_PALETTE = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e']

export async function fetchDashboardCharts() {
  const now = getPhilippinesNow()

  const [
    { data: boundaryData },
    { data: disbursementData },
    { data: ledgerData },
    { data: driversData }
  ] = await Promise.all([
    supabase.from('core1_boundary_payments').select('amount, payment_timestamp, status').ilike('status', 'paid'),
    supabase.from('fin_disbursement').select('disbursed_at, fin_accounts_payable(amount, category)').ilike('status', 'released'),
    supabase.from('fin_general_ledger').select('debit, credit, transaction_date'),
    supabase.from('core1_drivers').select('id')
  ]);

  const validBoundary = z.array(BoundaryPaymentSchema).safeParse(boundaryData).success ? z.array(BoundaryPaymentSchema).parse(boundaryData) : [];
  const validDisbursements = z.array(DisbursementSchema).safeParse(disbursementData).success ? z.array(DisbursementSchema).parse(disbursementData) : [];
  const validLedger = z.array(LedgerSchema).safeParse(ledgerData).success ? z.array(LedgerSchema).parse(ledgerData) : [];

  const last7Days = [...Array(7)].map((_, i) => toDateKey(addDays(now, -(6 - i))))

  const bMap = new Map(last7Days.map(d => [d, 0]));
  validBoundary.forEach(r => {
    if (r.payment_timestamp) {
      const key = toDateKey(new Date(r.payment_timestamp));
      if (bMap.has(key)) bMap.set(key, bMap.get(key)! + r.amount);
    }
  });

  const last6Months = [...Array(6)].map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const eMap = new Map(last6Months.map(m => [m, 0]));
  validDisbursements.forEach(r => {
    if (r.disbursed_at) {
      const key = r.disbursed_at.slice(0, 7);
      if (key && eMap.has(key)) eMap.set(key, eMap.get(key)! + (r.fin_accounts_payable?.amount || 0));
    }
  });

  const catMap = new Map();
  validDisbursements.forEach(r => {
    const cat = r.fin_accounts_payable?.category || 'Other';
    catMap.set(cat, (catMap.get(cat) || 0) + (r.fin_accounts_payable?.amount || 0));
  });

  const cfMap = new Map(last7Days.map(d => [d, { in: 0, out: 0 }]));
  validBoundary.forEach(r => {
    if (r.payment_timestamp) {
      const key = toDateKey(new Date(r.payment_timestamp));
      if (cfMap.has(key)) cfMap.get(key)!.in += r.amount;
    }
  });
  validLedger.forEach(r => {
    if (r.transaction_date) {
      const key = toDateKey(new Date(r.transaction_date));
      if (cfMap.has(key)) {
        const entry = cfMap.get(key)!;
        entry.in += r.credit;
        entry.out += r.debit;
      }
    }
  });

  return {
    boundaryData: Array.from(bMap.entries()).map(([name, amount]) => ({ name, amount })),
    monthlyExpenses: Array.from(eMap.entries()).map(([month, amount]) => ({ month, amount })),
    categoryData: Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] })),
    cashFlowData: Array.from(cfMap.entries()).map(([day, val]) => ({ day, in: val.in, out: val.out })),
    totalDrivers: driversData?.length || 0
  };
}

export async function fetchDashboardChartsForRange(fromISO: string, toISOExclusive: string) {
  const [{ data: boundaryData }, { data: disbursementData }, { data: ledgerData }] = await Promise.all([
    supabase.from('core1_boundary_payments').select('amount, payment_timestamp, status').gte('payment_timestamp', fromISO).lt('payment_timestamp', toISOExclusive).ilike('status', 'paid'),
    supabase.from('fin_disbursement').select('disbursed_at, fin_accounts_payable(amount, category)').gte('disbursed_at', fromISO).lt('disbursed_at', toISOExclusive).ilike('status', 'released'),
    supabase.from('fin_general_ledger').select('debit, credit, transaction_date').gte('transaction_date', fromISO).lt('transaction_date', toISOExclusive),
  ])

  const validBoundary = z.array(BoundaryPaymentSchema).safeParse(boundaryData).success ? z.array(BoundaryPaymentSchema).parse(boundaryData) : [];
  const validDisbursements = z.array(DisbursementSchema).safeParse(disbursementData).success ? z.array(DisbursementSchema).parse(disbursementData) : [];
  const validLedger = z.array(LedgerSchema).safeParse(ledgerData).success ? z.array(LedgerSchema).parse(ledgerData) : [];

  const start = new Date(fromISO)
  const endExclusive = new Date(toISOExclusive)
  const dayCount = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / DAY_MS))
  const days = [...Array(dayCount)].map((_, i) => toDateKey(addDays(start, i)))

  const bMap = new Map(days.map((d) => [d, 0]))
  validBoundary.forEach(r => {
    if (r.payment_timestamp) {
      const key = toDateKey(new Date(r.payment_timestamp))
      if (bMap.has(key)) bMap.set(key, bMap.get(key)! + r.amount)
    }
  })

  const eDaily = new Map(days.map((d) => [d, 0]))
  validDisbursements.forEach(r => {
    const key = r.disbursed_at ? toDateKey(new Date(r.disbursed_at)) : null
    if (!key || !eDaily.has(key)) return
    eDaily.set(key, eDaily.get(key)! + (r.fin_accounts_payable?.amount || 0))
  })

  const catMap = new Map<string, number>()
  validDisbursements.forEach(r => {
    const cat = r.fin_accounts_payable?.category || 'Other'
    catMap.set(cat, (catMap.get(cat) || 0) + (r.fin_accounts_payable?.amount || 0))
  })

  const cfMap = new Map(days.map((d) => [d, { in: 0, out: 0 }]))
  validBoundary.forEach(r => {
    if (r.payment_timestamp) {
      const key = toDateKey(new Date(r.payment_timestamp))
      if (cfMap.has(key)) cfMap.get(key)!.in += r.amount
    }
  })
  
  validLedger.forEach(r => {
    if (r.transaction_date) {
      const key = toDateKey(new Date(r.transaction_date))
      if (!cfMap.has(key)) return
      const entry = cfMap.get(key)!
      entry.in += r.credit
      entry.out += r.debit
    }
  })

  return {
    boundaryData: Array.from(bMap.entries()).map(([name, amount]) => ({ name, amount })),
    expensesDaily: Array.from(eDaily.entries()).map(([day, amount]) => ({ day, amount })),
    categoryData: Array.from(catMap.entries()).map(([name, value], i) => ({ name, value, color: COLOR_PALETTE[i % COLOR_PALETTE.length] })),
    cashFlowData: Array.from(cfMap.entries()).map(([day, val]) => ({ day, in: val.in, out: val.out })),
  }
}

export async function fetchYearlyRevenue() {
  const yearly = await fetchDashboardKpisByInterval('yearly')
  return yearly.revenue
}