import { supabase } from '../../database/supabase'

export type LogCategory = 'SECURITY' | 'TRANSACTION' | 'SYSTEM' | 'AUTH' | 'BUDGET' | 'MESSAGE' | 'COLLECTIONS' | 'DISBURSEMENT'
export type LogStatus = 'SUCCESS' | 'FAILED' | 'WARNING'

export interface AuditPayload {
  action: string
  category?: LogCategory
  module?: string
  recordId?: string
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
  details?: Record<string, any>
  status?: LogStatus
}

// ── Get client IP (best-effort, works on most setups) ──────────
async function getClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) })
    const data = await res.json()
    return data.ip || 'UNKNOWN'
  } catch {
    return 'UNKNOWN'
  }
}

// ── Main audit logger ──────────────────────────────────────────
export async function logAudit(
  action: string,
  details: any = {},
  category: LogCategory = 'SYSTEM',
  options?: {
    module?: string
    recordId?: string
    oldValue?: Record<string, any>
    newValue?: Record<string, any>
    status?: LogStatus
  }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const ip = await getClientIP()

    const logEntry = {
      user_id:    user?.id || 'ANONYMOUS',
      user_email: user?.email || details?.attempted_email || 'UNKNOWN',
      action:     action.toUpperCase(),
      category,
      module:     options?.module || null,
      record_id:  options?.recordId ? String(options.recordId) : null,
      old_value:  options?.oldValue || null,
      new_value:  options?.newValue || null,
      details:    typeof details === 'object' ? details : { message: details },
      status:     options?.status || 'SUCCESS',
      ip_address: ip,
      user_agent: navigator.userAgent,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('fin_audit_logs').insert(logEntry)
    if (error) console.error('Audit Log Error:', error.message)
  } catch (err: any) {
    console.error('Audit Log Error:', err?.message)
  }
}

// ── Convenience wrappers per module ───────────────────────────

export async function logAuth(action: string, details?: any, status: LogStatus = 'SUCCESS') {
  return logAudit(action, details || {}, 'AUTH', { module: 'Authentication', status })
}

export async function logCollection(action: string, recordId?: string, oldValue?: any, newValue?: any) {
  return logAudit(action, {}, 'COLLECTIONS', { module: 'Collections', recordId, oldValue, newValue })
}

export async function logDisbursement(action: string, recordId?: string, oldValue?: any, newValue?: any) {
  return logAudit(action, {}, 'DISBURSEMENT', { module: 'Disbursement', recordId, oldValue, newValue })
}

export async function logBudget(action: string, recordId?: string, oldValue?: any, newValue?: any) {
  return logAudit(action, {}, 'BUDGET', { module: 'Budget Management', recordId, oldValue, newValue })
}

export async function logMessage(action: string, details?: any) {
  return logAudit(action, details || {}, 'MESSAGE', { module: 'Messages' })
}

// ── Fetch with filters ────────────────────────────────────────
export interface AuditFilters {
  search?: string
  category?: string
  module?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export async function fetchAuditLogs(filters: AuditFilters = {}) {
  let query = supabase
    .from('fin_audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.search) {
    query = query.or(
      `action.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,module.ilike.%${filters.search}%,record_id.ilike.%${filters.search}%`
    )
  }
  if (filters.category && filters.category !== 'ALL') {
    query = query.eq('category', filters.category)
  }
  if (filters.module && filters.module !== 'ALL') {
    query = query.eq('module', filters.module)
  }
  if (filters.status && filters.status !== 'ALL') {
    query = query.eq('status', filters.status)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo + 'T23:59:59')
  }

  query = query.range(
    filters.offset || 0,
    (filters.offset || 0) + (filters.limit || 50) - 1
  )

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}