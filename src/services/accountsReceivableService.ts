import { supabase } from '../../database/supabase'
import type {
  FinAccountsReceivable,
  FinAccountsReceivableInsert,
  FinAccountsReceivableUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export async function fetchAccountsReceivable(): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const [
    { data: drivers, error: driversError },
    { data: payments, error: paymentsError },
    { data: balances, error: balancesError }
  ] = await Promise.all([
    supabase.from('core1_drivers').select('id, name'),
    supabase.from('core1_boundary_payments').select('driver_id').eq('payment_date', today),
    supabase.from('fin_driver_balances').select('*')
  ])

  if (driversError) throw driversError
  if (paymentsError) throw paymentsError
  if (balancesError) throw balancesError

  const paidDriverIds = new Set((payments ?? []).map(p => p.driver_id))
  
  // Return drivers who have NOT paid today
  return (drivers ?? [])
    .filter(d => !paidDriverIds.has(d.id))
    .map(d => {
      const balance = (balances ?? []).find(b => b.driver_id === d.id)
      return {
        id: `ar-${d.id}`,
        external_driver_id: d.id,
        driver_name: d.name,
        status: balance?.status || 'Pending',
        days_late: balance?.days_late || 0,
        outstanding_balance: balance?.outstanding_balance || 700, // Default to 1 day boundary if no balance record
        updated_at: balance?.updated_at || new Date().toISOString()
      }
    })
}

export async function fetchDriverBalances(): Promise<any[]> {
  const { data, error } = await supabase
    .from('fin_driver_balances')
    .select('*, core1_drivers(name)')
    .order('days_late', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchLatePaymentLogs(): Promise<any[]> {
  const { data, error } = await supabase
    .from('fin_late_payment_logs')
    .select('*, core1_drivers(name)')
    .order('payment_date', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}

export async function fetchAccountsReceivableByDriver(
  externalDriverId: number
): Promise<FinAccountsReceivable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_receivable')
    .select('*, hr_proceedlist!external_driver_id(firstname, lastname, position)')
    .eq('external_driver_id', externalDriverId)

  if (error) throw error
  return (data ?? []) as FinAccountsReceivable[]
}

export async function insertAccountsReceivable(
  payload: FinAccountsReceivableInsert
): Promise<FinAccountsReceivable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_receivable')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Created fin_accounts_receivable record', { id: data[0].id })
  }
  return (data ?? []) as FinAccountsReceivable[]
}

export async function updateAccountsReceivable(
  id: string,
  payload: FinAccountsReceivableUpdate
): Promise<FinAccountsReceivable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_receivable')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Updated fin_accounts_receivable record', { id: data[0].id })
  }
  return (data ?? []) as FinAccountsReceivable[]
}
