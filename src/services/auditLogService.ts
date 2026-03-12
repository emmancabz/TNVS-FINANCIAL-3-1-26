import { supabase } from '../../database/supabase'
import type { FinAuditLogInsert } from '../types/database'

export interface AuditLogDetails {
  old_value?: any;
  new_value?: any;
  [key: string]: any;
}

export async function logAudit(action: string, details?: AuditLogDetails) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    
    const payload: FinAuditLogInsert = {
      user_id: userData?.user?.id ?? null,
      user_email: userData?.user?.email ?? 'System', 
      action,
      details: details ?? null,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('fin_audit_logs').insert(payload)
    if (error) console.error('Audit log failed:', error.message)
  } catch (err) {
    console.error('Audit log error:', err)
  }
}