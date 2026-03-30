import { supabase } from '../../database/supabase'
import type { FinReceiptHistory, FinReceiptHistoryInsert } from '../types/database'
import { logAudit } from './Auditlogservice'

export async function fetchReceiptHistory(): Promise<FinReceiptHistory[]> {
  const { data, error } = await supabase
    .from('fin_receipt_history')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinReceiptHistory[]
}

export async function insertReceiptHistory(payload: FinReceiptHistoryInsert): Promise<FinReceiptHistory> {
  const { data, error } = await supabase
    .from('fin_receipt_history')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  if (data) {
    logAudit('CREATE_FIN_RECEIPT_HISTORY', { new_value: data })
  }
  return data as FinReceiptHistory
}

export async function clearAllReceiptHistory(): Promise<void> {
  const { error } = await supabase
    .from('fin_receipt_history')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (error) throw error
  logAudit('CLEAR_ALL_FIN_RECEIPT_HISTORY', { details: 'User cleared all receipt history' })
}
