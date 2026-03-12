import { supabase } from '../../database/supabase'
import type {
  FinCollections,
  FinCollectionsInsert,
  FinCollectionsUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export async function fetchCollections(): Promise<any[]> {
  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('*, core1_drivers(name)')
    .order('payment_date', { ascending: false })

  if (error) throw error

  // Map core1_boundary_payments to the UI structure
  return (data ?? []).map((b) => ({
    id: b.id,
    ar_id: b.reference_no || `BR-${b.id}`,
    amount_paid: b.amount,
    payment_method: b.reference_no ? 'Digital/E-Wallet' : 'Cash',
    received_by_id: 'Core 1 System',
    collected_at: `${b.payment_date.split('T')[0]}T${b.time_paid}`,
    driver_name: b.core1_drivers?.name || `Driver #${b.driver_id}`,
    source: 'Core 1'
  }))
}

export async function fetchCollectionsTotal(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('amount')
    .gte('payment_date', today)

  if (error) throw error

  return (data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0)
}

export async function insertCollection(
  payload: FinCollectionsInsert
): Promise<FinCollections[]> {
  const { data, error } = await supabase
    .from('fin_collections')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('CREATE_FIN_COLLECTIONS', { new_value: data[0] })
  }
  return (data ?? []) as FinCollections[]
}

export async function updateCollection(
  id: string,
  payload: FinCollectionsUpdate
): Promise<FinCollections[]> {
  const { data, error } = await supabase
    .from('fin_collections')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('UPDATE_FIN_COLLECTIONS', { new_value: data[0] })
  }
  return (data ?? []) as FinCollections[]
}
