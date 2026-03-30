import { supabase } from '../../database/supabase'
import type {
  FinBudgetRequest,
  FinBudgetRequestInsert,
  FinBudgetRequestUpdate,
} from '../types/database'
import { logAudit } from './Auditlogservice'

export async function fetchBudgetRequests(): Promise<FinBudgetRequest[]> {
  const { data, error } = await supabase
    .from('budget_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinBudgetRequest[]
}

export async function insertBudgetRequest(
  payload: FinBudgetRequestInsert
): Promise<FinBudgetRequest[]> {
  const { data, error } = await supabase.from('budget_requests').insert(payload).select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Created budget_requests record', { id: data[0].id })
  }
  return (data ?? []) as FinBudgetRequest[]
}

export async function updateBudgetRequest(
  id: string,
  payload: FinBudgetRequestUpdate
): Promise<FinBudgetRequest[]> {
  const { data, error } = await supabase.from('budget_requests').update(payload).eq('id', id).select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Updated budget_requests record', { id: data[0].id })
  }
  return (data ?? []) as FinBudgetRequest[]
}
