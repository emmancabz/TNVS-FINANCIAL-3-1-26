import { supabase } from '../../database/supabase'
import type {
  FinBudgetManagement,
  FinBudgetManagementInsert,
  FinBudgetManagementUpdate,
} from '../types/database'
import { logAudit } from './Auditlogservice'

export type BudgetCategory = {
  id: string
  name?: string
  category_name?: string
  label?: string
  title?: string
  department?: string
  department_name?: string
  allocated_budget?: number
  allocated_amount?: number
}

const FALLBACK_BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    id: 'fallback-fuel',
    name: 'Fuel',
    department_name: 'Operations',
    allocated_budget: 0,
  },
  {
    id: 'fallback-maintenance',
    name: 'Maintenance',
    department_name: 'Fleet',
    allocated_budget: 0,
  },
  {
    id: 'fallback-payroll',
    name: 'Payroll',
    department_name: 'HR',
    allocated_budget: 0,
  },
  {
    id: 'fallback-office-supplies',
    name: 'Office Supplies',
    department_name: 'Admin',
    allocated_budget: 0,
  },
]

export async function fetchBudgetCategories(): Promise<BudgetCategory[]> {
  try {
    const { data, error } = await supabase.from('budget_categories').select('*').order('name')
    if (error) throw error
    const list = (data ?? []) as BudgetCategory[]
    return list.length ? list : FALLBACK_BUDGET_CATEGORIES
  } catch {
    return FALLBACK_BUDGET_CATEGORIES
  }
}

export async function fetchBudgetManagement(): Promise<FinBudgetManagement[]> {
  const { data, error } = await supabase
    .from('fin_budget_management')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinBudgetManagement[]
}

export async function insertBudgetManagement(
  payload: FinBudgetManagementInsert
): Promise<FinBudgetManagement[]> {
  const { data, error } = await supabase
    .from('fin_budget_management')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Created fin_budget_management record', { id: data[0].id })
  }
  return (data ?? []) as FinBudgetManagement[]
}

export async function updateBudgetManagement(
  id: string,
  payload: FinBudgetManagementUpdate
): Promise<FinBudgetManagement[]> {
  const { data, error } = await supabase
    .from('fin_budget_management')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Updated fin_budget_management record', { id: data[0].id })
  }
  return (data ?? []) as FinBudgetManagement[]
}

export async function applyBudgetSpendByCategory(
  category: string,
  amount: number,
  limitAmount = 0
): Promise<FinBudgetManagement[]> {
  const { data, error } = await supabase
    .from('fin_budget_management')
    .select('*')
    .eq('category', category)
    .maybeSingle()

  if (error) throw error

  const now = new Date().toISOString()

  if (data?.id) {
    const updated = Number(data.actual_spend ?? 0) + Number(amount ?? 0)
    const { data: updatedRows, error: updateError } = await supabase
      .from('fin_budget_management')
      .update({ actual_spend: updated, updated_at: now })
      .eq('id', data.id)
      .select()

    if (updateError) throw updateError
    return (updatedRows ?? []) as FinBudgetManagement[]
  }

  const payload: FinBudgetManagementInsert = {
    category,
    limit_amount: Number(limitAmount ?? 0) || 0,
    actual_spend: Number(amount ?? 0) || 0,
    updated_at: now,
  }
  const { data: insertedRows, error: insertError } = await supabase
    .from('fin_budget_management')
    .insert(payload)
    .select()

  if (insertError) throw insertError
  return (insertedRows ?? []) as FinBudgetManagement[]
}
