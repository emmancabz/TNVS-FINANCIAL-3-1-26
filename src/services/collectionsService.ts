import { supabase } from '../../database/supabase'

const DAY_MS = 24 * 60 * 60 * 1000

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

const startOfPhilippinesDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())

const parsePhilippinesDate = (dateStr: string) => new Date(`${dateStr}T00:00:00+08:00`)

const buildRange = (dateStr?: string) => {
  const base = dateStr ? parsePhilippinesDate(dateStr) : getPhilippinesNow()
  const start = startOfPhilippinesDay(base)
  const end = new Date(start.getTime() + DAY_MS)
  return { start, end }
}

const mapCollectionRow = (b: any) => ({
  id: b?.id,
  ar_id: b?.reference_no || `REF-${b?.id}`,
  amount_paid: b?.amount,
  payment_method: 'App Payment',
  received_by_id: 'System Auto',
  collected_at: b?.payment_timestamp,
  driver_name: b?.core1_drivers?.driver_name || `Driver #${b?.driver_id}`,
  driver_id: b?.driver_id ?? null,
  source: 'Core 1',
})

export async function fetchCollectionsByDate(dateStr?: string): Promise<any[]> {
  const { start, end } = buildRange(dateStr)

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('id, reference_no, amount, payment_timestamp, driver_id, core1_drivers(driver_name)')
    .gte('payment_timestamp', start.toISOString())
    .lt('payment_timestamp', end.toISOString())
    .eq('status', 'PAID')
    .order('payment_timestamp', { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapCollectionRow)
}

export async function fetchCollectionsTotalByDate(dateStr?: string): Promise<number> {
  const { start, end } = buildRange(dateStr)

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('amount')
    .gte('payment_timestamp', start.toISOString())
    .lt('payment_timestamp', end.toISOString())
    .eq('status', 'PAID')

  if (error) throw error
  return (data ?? []).reduce((sum, row) => sum + Number(row?.amount || 0), 0)
}

export async function fetchCollections(): Promise<any[]> {
  return fetchCollectionsByDate()
}

export async function fetchCollectionsTotal(): Promise<number> {
  return fetchCollectionsTotalByDate()
}

export async function fetchCollectionsLast7DaysTotals(dateStr?: string): Promise<{ date: string; total: number }[]> {
  const { start } = buildRange(dateStr)
  const rangeStart = new Date(start.getTime() - 6 * DAY_MS)
  const rangeEnd = new Date(start.getTime() + DAY_MS)
  const keys = [...Array(7)].map((_, i) => {
    const d = new Date(rangeStart.getTime() + i * DAY_MS)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
  })

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('amount, payment_timestamp')
    .gte('payment_timestamp', rangeStart.toISOString())
    .lt('payment_timestamp', rangeEnd.toISOString())
    .eq('status', 'PAID')

  if (error) throw error

  const map = new Map(keys.map((k) => [k, 0]))
  ;(data ?? []).forEach((row) => {
    const key = new Date(row?.payment_timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    if (!map.has(key)) return
    map.set(key, map.get(key) + Number(row?.amount || 0))
  })

  return keys.map((k) => ({ date: k, total: map.get(k) || 0 }))
}

export async function fetchTotalDrivers(): Promise<number> {
  const { count, error } = await supabase.from('core1_drivers').select('id', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}
