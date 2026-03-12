import { supabase } from '../../database/supabase'

export async function fetchDashboardMetrics() {
  const [
    { data: boundaryData, error: boundaryError },
    { data: ledgerData, error: ledgerError }
  ] = await Promise.all([
    supabase.from('core1_boundary_payments').select('amount'),
    supabase.from('fin_general_ledger').select('debit, credit'),
  ])

  if (boundaryError) throw boundaryError
  if (ledgerError) throw ledgerError

  const totalCollected = (boundaryData ?? []).reduce(
    (sum, row) => sum + Number(row.amount || 0),
    0
  )
  
  const totalDebits = (ledgerData ?? []).reduce((sum, row) => sum + Number(row.debit || 0), 0)
  const totalCredits = (ledgerData ?? []).reduce((sum, row) => sum + Number(row.credit || 0), 0)
  
  const netBalance = totalCredits - totalDebits
  const totalAssets = totalCollected + netBalance

  return {
    totalCollected,
    totalDebits,
    totalCredits,
    netBalance,
    totalAssets,
  }
}

export async function fetchDashboardCharts() {
  const [
    { data: boundaryData, error: boundaryError },
    { data: disbursementData, error: disbursementError },
    { data: ledgerData, error: ledgerError },
    { data: driversData, error: driversError },
    { data: todayPayments, error: paymentsError },
  ] = await Promise.all([
    supabase.from('core1_boundary_payments').select('amount, payment_date'),
    supabase
      .from('fin_disbursement')
      .select(
        `
        disbursed_at,
        fin_accounts_payable (
          amount,
          category
        )
      `
      ),
    supabase.from('fin_general_ledger').select('debit, credit, transaction_date'),
    supabase.from('core1_drivers').select('id'),
    supabase.from('core1_boundary_payments').select('driver_id, payment_date'),
  ])

  if (boundaryError) throw boundaryError
  if (disbursementError) throw disbursementError
  if (ledgerError) throw ledgerError
  if (driversError) throw driversError
  if (paymentsError) throw paymentsError

  const toDateKey = (value) => new Date(value).toLocaleDateString('en-CA')
  const todayKey = toDateKey(new Date())

  const lastNDays = (count) => {
    const days = []
    for (let i = count - 1; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(toDateKey(d))
    }
    return days
  }

  const lastNMonths = (count) => {
    const months = []
    const d = new Date()
    d.setDate(1)
    for (let i = count - 1; i >= 0; i -= 1) {
      const m = new Date(d)
      m.setMonth(d.getMonth() - i)
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`
      months.push(key)
    }
    return months
  }

  const boundaryMap = new Map()
  for (const key of lastNDays(7)) {
    boundaryMap.set(key, 0)
  }
  for (const row of boundaryData ?? []) {
    const dateKey = toDateKey(row.payment_date)
    if (boundaryMap.has(dateKey)) {
      boundaryMap.set(dateKey, boundaryMap.get(dateKey) + Number(row.amount || 0))
    }
  }
  const boundaryChartData = Array.from(boundaryMap.entries())
    .map(([name, amount]) => ({ name, amount }))

  const expensesMap = new Map()
  for (const key of lastNMonths(6)) {
    expensesMap.set(key, 0)
  }
  for (const row of disbursementData ?? []) {
    const dateKey = row.disbursed_at ? toDateKey(row.disbursed_at).slice(0, 7) : null
    if (!dateKey || !expensesMap.has(dateKey)) continue
    const amount = Number(row.fin_accounts_payable?.amount || 0)
    expensesMap.set(dateKey, expensesMap.get(dateKey) + amount)
  }
  const monthlyExpenses = Array.from(expensesMap.entries()).map(([month, amount]) => ({
    month,
    amount,
  }))

  const cashflowMap = new Map()
  for (const key of lastNDays(5)) {
    cashflowMap.set(key, { in: 0, out: 0 })
  }
  for (const row of ledgerData ?? []) {
    const dateKey = toDateKey(row.transaction_date)
    if (!cashflowMap.has(dateKey)) continue
    const entry = cashflowMap.get(dateKey)
    entry.in += Number(row.credit || 0)
    entry.out += Number(row.debit || 0)
    cashflowMap.set(dateKey, entry)
  }
  const cashFlowData = Array.from(cashflowMap.entries()).map(([day, values]) => ({
    day,
    in: values.in,
    out: values.out,
  }))

  const categoryMap = new Map()
  for (const row of disbursementData ?? []) {
    const key = row.fin_accounts_payable?.category || 'Other'
    categoryMap.set(key, (categoryMap.get(key) || 0) + Number(row.fin_accounts_payable?.amount || 0))
  }
  const palette = ['#22c55e', '#3b82f6', '#eab308', '#6b7280', '#ef4444', '#8b5cf6']
  const categoryData = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))

  const driverCount = driversData?.length || 0
  const paidSet = new Set(
    (todayPayments ?? [])
      .filter((p) => toDateKey(p.payment_date) === todayKey)
      .map((p) => p.driver_id)
  )
  const paidCount = paidSet.size
  const paidPct = driverCount ? Math.round((paidCount / driverCount) * 100) : 0
  const healthCheck = {
    paidPct,
    unpaidPct: 100 - paidPct,
    paidCount,
    totalCount: driverCount,
  }

  return {
    boundaryData: boundaryChartData,
    monthlyExpenses,
    cashFlowData,
    categoryData,
    healthCheck,
  }
}
