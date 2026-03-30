import { supabase } from '../../database/supabase'
import type {
  FinNotification,
  FinNotificationInsert,
  FinNotificationUpdate,
} from '../types/database'
import { logAudit } from './Auditlogservice'

export async function fetchNotifications(limit = 20): Promise<FinNotification[]> {
  const { data, error } = await supabase
    .from('fin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as FinNotification[]
}

export async function insertNotification(
  payload: FinNotificationInsert
): Promise<FinNotification[]> {
  const { data, error } = await supabase
    .from('fin_notifications')
    .insert(payload)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Created fin_notifications record', { id: data[0].id })
  }
  return (data ?? []) as FinNotification[]
}

export async function updateNotification(
  id: string,
  payload: FinNotificationUpdate
): Promise<FinNotification[]> {
  const { data, error } = await supabase
    .from('fin_notifications')
    .update(payload)
    .eq('id', id)
    .select()

  if (error) throw error
  if (data?.[0]) {
    logAudit('Updated fin_notifications record', { id: data[0].id })
  }
  return (data ?? []) as FinNotification[]
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.from('fin_notifications').update({ is_read: true }).eq('is_read', false)
  if (error) throw error
}

export async function ensureNotification(content: string, type: 'budget' | 'message' | 'error' | 'info' | 'success' | 'reset' | 'payment') {
  const { data, error } = await supabase
    .from('fin_notifications')
    .select('id, created_at')
    .eq('content', content)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  const latest = data?.[0]?.created_at ? new Date(data[0].created_at) : null
  const withinDay = latest ? Date.now() - latest.getTime() < 24 * 60 * 60 * 1000 : false
  if (!withinDay) {
    await insertNotification({
      user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
      content,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    })
  }
}