import { supabase } from '../../database/supabase'
import type {
  FinGeneralLedger,
  FinGeneralLedgerInsert,
  FinGeneralLedgerUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export async function fetchGeneralLedgerEntries(): Promise<FinGeneralLedger[]> {
  const { data, error } = await supabase
    .from('fin_general_ledger')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinGeneralLedger[]
}

export async function insertGeneralLedgerEntry(
  payload: FinGeneralLedgerInsert
): Promise<FinGeneralLedger[]> {
  const { data, error } = await supabase
    .from('fin_general_ledger')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('CREATE_FIN_GENERAL_LEDGER', { new_value: data[0] })
  }
  return (data ?? []) as FinGeneralLedger[]
}

export async function updateGeneralLedgerEntry(
  id: string,
  payload: FinGeneralLedgerUpdate
): Promise<FinGeneralLedger[]> {
  const { data, error } = await supabase
    .from('fin_general_ledger')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('UPDATE_FIN_GENERAL_LEDGER', { new_value: data[0] })
  }
  return (data ?? []) as FinGeneralLedger[]
}
