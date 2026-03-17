import { supabase } from '../../database/supabase'
import type {
  FinGeneralLedger,
  FinGeneralLedgerInsert,
  FinGeneralLedgerUpdate,
} from '../types/database'
import { logAudit } from './auditLogService'

export type UnifiedLedgerEntry = {
  id: string
  transaction_date: string
  type: 'DEBIT' | 'CREDIT'
  debit: number
  credit: number
  amount: number
  reference_id: string | null
  account_code: string | null
  description: string
  counterparty_name: string | null
  source_table: 'core1_boundary_payments' | 'fin_disbursement'
}

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function fetchGeneralLedgerEntries(): Promise<FinGeneralLedger[]> {
  const { data, error } = await supabase
    .from('fin_general_ledger')
    .select('*')
    .order('transaction_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as FinGeneralLedger[]
}

export async function fetchUnifiedLedgerEntries(params: {
  fromISO: string
  toISO: string
}): Promise<UnifiedLedgerEntry[]> {
  const [{ data: payments, error: payErr }, { data: disb, error: disbErr }] = await Promise.all([
    supabase
      .from('core1_boundary_payments')
      .select('id, amount, payment_timestamp, reference_no, driver_id, core1_drivers(driver_name)')
      .gte('payment_timestamp', params.fromISO)
      .lt('payment_timestamp', params.toISO)
      .eq('status', 'PAID')
      .order('payment_timestamp', { ascending: false }),
    supabase
      .from('fin_disbursement')
      .select(
        `
          id,
          dv_no,
          status,
          disbursed_at,
          ap_id,
          fin_accounts_payable (
            id,
            ref_no,
            vendor_name,
            amount,
            description,
            category
          )
        `
      )
      .gte('disbursed_at', params.fromISO)
      .lt('disbursed_at', params.toISO)
      .eq('status', 'RELEASED')
      .order('disbursed_at', { ascending: false }),
  ])

  if (payErr) throw payErr
  if (disbErr) throw disbErr

  const debitEntries: UnifiedLedgerEntry[] = (payments ?? []).map((p: any) => {
    const amt = num(p?.amount, 0)
    const name = p?.core1_drivers?.driver_name ?? null
    const ref = p?.reference_no ?? p?.id ?? null
    const ts = p?.payment_timestamp ?? new Date().toISOString()
    return {
      id: `bp-${p?.id ?? ref}`,
      transaction_date: ts,
      type: 'DEBIT',
      debit: amt,
      credit: 0,
      amount: amt,
      reference_id: ref ? String(ref) : null,
      account_code: '4000-REV',
      description: `Boundary Payment | ${ref ? `Ref ${ref}` : 'Ref —'}`,
      counterparty_name: name,
      source_table: 'core1_boundary_payments',
    }
  })

  const creditEntries: UnifiedLedgerEntry[] = (disb ?? []).map((d: any) => {
    const ap = d?.fin_accounts_payable
    const amt = num(ap?.amount, 0)
    const payee = ap?.vendor_name ?? null
    const dvNo = d?.dv_no ?? d?.id ?? null
    const ts = d?.disbursed_at ?? new Date().toISOString()
    const cat = ap?.category ?? '—'
    const desc = ap?.description ?? '—'
    return {
      id: `dv-${d?.id ?? dvNo}`,
      transaction_date: ts,
      type: 'CREDIT',
      debit: 0,
      credit: amt,
      amount: amt,
      reference_id: dvNo ? String(dvNo) : null,
      account_code: '5000-EXP',
      description: `Disbursement | ${dvNo ? `DV ${dvNo}` : 'DV —'} | ${cat} | ${desc}`,
      counterparty_name: payee,
      source_table: 'fin_disbursement',
    }
  })

  return [...debitEntries, ...creditEntries].sort(
    (a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
  )
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
