import { supabase } from '../../database/supabase'
import type {
  FinAccountsPayable,
  FinAccountsPayableInsert,
  FinAccountsPayableUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export async function fetchAccountsPayable(): Promise<FinAccountsPayable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_payable')
    .select('*, hr_proceedlist!employee_id(firstname, lastname)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('AP Fetch Error:', error.message)
    throw error
  }
  return (data ?? []) as FinAccountsPayable[]
}

export async function insertAccountsPayable(
  payload: FinAccountsPayableInsert
): Promise<FinAccountsPayable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_payable')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('CREATE_FIN_ACCOUNTS_PAYABLE', { new_value: data[0] })
  }
  return (data ?? []) as FinAccountsPayable[]
}

export async function updateAccountsPayable(
  id: string,
  payload: FinAccountsPayableUpdate
): Promise<FinAccountsPayable[]> {
  const { data, error } = await supabase
    .from('fin_accounts_payable')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('UPDATE_FIN_ACCOUNTS_PAYABLE', { new_value: data[0] })
  }
  return (data ?? []) as FinAccountsPayable[]
}
