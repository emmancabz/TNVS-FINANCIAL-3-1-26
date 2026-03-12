export type Timestamptz = string

export interface FinDisbursement {
  id: string
  dv_no: string
  ap_id: string | null
  status: string
  disbursed_at: Timestamptz | null
  payout_request_id: string | null
  payment_method: string | null
}

export interface FinAuditLog {
  id: string
  user_id: string | null
  user_email: string | null 
  action: string
  details: Record<string, unknown> | null
  created_at: Timestamptz
}

export type FinDisbursementInsert = Omit<FinDisbursement, 'id'>
export type FinDisbursementUpdate = Partial<Omit<FinDisbursement, 'id'>>

export interface FinGeneralLedger {
  id: string
  description: string
  debit: number
  credit: number
  reference_id: string | null
  transaction_date: Timestamptz
  account_code: string | null
  approved_by: string | null
  approved_at: Timestamptz | null
}

export type FinGeneralLedgerInsert = Omit<FinGeneralLedger, 'id'>
export type FinGeneralLedgerUpdate = Partial<Omit<FinGeneralLedger, 'id'>>

export interface FinAccountsPayable {
  id: string
  ref_no: string
  vendor_name: string
  amount: number
  description: string
  status: string
  category: string
  created_at: Timestamptz
  due_date: Timestamptz | null
  approved_by: string | null
  approved_at: Timestamptz | null
  hr_proceedlist?: {
    firstname: string
    lastname: string
    position?: string
  }
}

export type FinAccountsPayableInsert = Omit<FinAccountsPayable, 'id'>
export type FinAccountsPayableUpdate = Partial<Omit<FinAccountsPayable, 'id'>>

export interface FinAccountsReceivable {
  id: string
  external_driver_id: number
  external_vehicle_id: string
  trip_id: string
  ar_amount: number
  status: string
  created_at: Timestamptz
  hr_proceedlist?: {
    firstname: string
    lastname: string
    position?: string
  }
}

export type FinAccountsReceivableInsert = Omit<FinAccountsReceivable, 'id'>
export type FinAccountsReceivableUpdate = Partial<Omit<FinAccountsReceivable, 'id'>>

export interface FinCollections {
  id: string
  created_at: Timestamptz
  ar_id: string
  amount_paid: number
  payment_method: string
  received_by_id: string
  collected_at: Timestamptz | null
  hr_proceedlist?: {
    firstname: string
    lastname: string
    position?: string
  }
}

export type FinCollectionsInsert = Omit<FinCollections, 'id'>
export type FinCollectionsUpdate = Partial<Omit<FinCollections, 'id'>>

export interface FinBudgetManagement {
  id: string
  category: string
  limit_amount: number
  actual_spend: number
  updated_at: Timestamptz | null
}

export type FinBudgetManagementInsert = Omit<FinBudgetManagement, 'id'>
export type FinBudgetManagementUpdate = Partial<Omit<FinBudgetManagement, 'id'>>

export interface FinBudgetRequest {
  id: string
  category_id: string
  requesting_dept: string
  amount: number
  purpose: string
  status: string
  remarks: string | null
  created_at: Timestamptz
}

export type FinBudgetRequestInsert = Omit<FinBudgetRequest, 'id'>
export type FinBudgetRequestUpdate = Partial<Omit<FinBudgetRequest, 'id'>>

export interface FinAuditLog {
  id: string
  user_id: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: Timestamptz
}

export type FinAuditLogInsert = Omit<FinAuditLog, 'id'>

export interface FinNotification {
  id: string
  user_id: string | null
  type: 'budget' | 'message' | 'error' | 'info' | 'success'
  content: string
  is_read: boolean
  created_at: Timestamptz
}

export type FinNotificationInsert = Omit<FinNotification, 'id'>
export type FinNotificationUpdate = Partial<Omit<FinNotification, 'id'>>

export interface FinReceiptHistory {
  id: string
  disbursement_id: string
  details: Record<string, any>
  created_at: Timestamptz
}

export type FinReceiptHistoryInsert = Omit<FinReceiptHistory, 'id'>

export interface FinLatePaymentLog {
  id: string
  driver_id: number
  days_late: number
  amount_paid: number
  payment_date: Timestamptz
}

export interface FinDriverBalance {
  driver_id: number
  outstanding_balance: number
  last_payment_date: Timestamptz | null
  days_late: number
  status: 'Current' | '1 Day Late' | '2 Days Late' | '3+ Days Late'
  updated_at: Timestamptz
}

export interface FinAuditLog {
  id: string
  user_id: string | null
  user_email: string | null
  action: string
  details: Record<string, unknown> | null
  created_at: Timestamptz
}
