import { supabase } from '../../database/supabase'
import type {
  FinDisbursement,
  FinDisbursementInsert,
  FinDisbursementUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export async function fetchDisbursements(): Promise<FinDisbursement[]> {
  const { data, error } = await supabase
    .from('fin_disbursement')
    .select('*')
    .order('disbursed_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinDisbursement[]
}

export type DisbursementWithPayable = FinDisbursement & {
  fin_accounts_payable: null | {
    id: string
    ref_no: string
    vendor_name: string
    amount: number
    description: string
    category: string
    status: string
    created_at: string
  }
}

export async function fetchDisbursementsWithPayable(): Promise<DisbursementWithPayable[]> {
  const { data, error } = await supabase
    .from('fin_disbursement')
    .select(
      `
        id,
        dv_no,
        ap_id,
        status,
        disbursed_at,
        payout_request_id,
        payment_method,
        fin_accounts_payable (
          id,
          ref_no,
          vendor_name,
          amount,
          description,
          category,
          status,
          created_at
        )
      `
    )
    .order('disbursed_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as DisbursementWithPayable[]
}

export async function insertDisbursement(
  payload: FinDisbursementInsert
): Promise<FinDisbursement[]> {
  const { data, error } = await supabase
    .from('fin_disbursement')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('CREATE_FIN_DISBURSEMENT', { new_value: data[0] })
  }
  return (data ?? []) as FinDisbursement[]
}

export async function updateDisbursement(
  id: string,
  payload: FinDisbursementUpdate
): Promise<FinDisbursement[]> {
  const { data, error } = await supabase
    .from('fin_disbursement')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('UPDATE_FIN_DISBURSEMENT', { new_value: data[0] })
  }
  return (data ?? []) as FinDisbursement[]
}
