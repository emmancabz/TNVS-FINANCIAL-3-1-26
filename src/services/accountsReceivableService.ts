import { z } from 'zod'
import { supabase } from '../../database/supabase'

// 🛡️ ZOD SCHEMAS PARA SA DATA INTEGRITY
const DriverSchema = z.object({
  id: z.coerce.number(),
  driver_name: z.string().default('Unknown Driver'),
  license_number: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  boundary_amount: z.coerce.number().min(0).default(500), // Default if missing
}).passthrough();

const DAY_MS = 24 * 60 * 60 * 1000

const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
const startOfLocalDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate())
const startOfPhilippinesDay = () => startOfLocalDay(getPhilippinesNow())

const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const buildDaysLate = (startOfToday: Date, lastPaidAtISO: string | null) => {
  if (!lastPaidAtISO) return { daysLate: 2, label: '2+ Days Late' as const }
  const lastPaidAt = new Date(lastPaidAtISO)
  if (Number.isNaN(lastPaidAt.getTime())) return { daysLate: 2, label: '2+ Days Late' as const }
  
  const lastPaidDay = startOfLocalDay(lastPaidAt)
  const daysSince = Math.floor((startOfToday.getTime() - lastPaidDay.getTime()) / DAY_MS)
  
  // Isang araw na palugit (grace period)
  const daysLate = Math.max(0, daysSince - 1)
  
  if (daysLate <= 0) return { daysLate: 0, label: 'Due today' as const }
  if (daysLate === 1) return { daysLate: 1, label: '1 Day Late' as const }
  return { daysLate, label: '2+ Days Late' as const }
}

export type AccountsReceivableRow = {
  id: string
  external_driver_id: number
  driver_name: string
  license_number: string | null
  phone: string | null
  email: string | null
  daily_boundary_amount: number
  outstanding_balance: number
  days_late: number
  days_late_text: 'Due today' | '1 Day Late' | '2+ Days Late'
  last_paid_at: string | null
}

export async function fetchAccountsReceivable(): Promise<AccountsReceivableRow[]> {
  const startOfToday = startOfPhilippinesDay()
  const lookback = new Date(startOfToday.getTime() - 30 * DAY_MS)

  const [{ data: drivers, error: driversError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      supabase
        .from('core1_drivers')
        .select('id, driver_name, license_number, phone, email, boundary_amount'),
      supabase
        .from('core1_boundary_payments')
        .select('driver_id, payment_timestamp')
        .gte('payment_timestamp', lookback.toISOString())
        .eq('status', 'PAID')
        .order('payment_timestamp', { ascending: false }),
    ])

  if (driversError) throw driversError
  if (paymentsError) throw paymentsError

  const paidToday = new Set<number>()
  const latestPaidAtByDriver = new Map<number, string>()

  ;(payments ?? []).forEach((p: any) => {
    const driverId = num(p?.driver_id, NaN)
    if (!Number.isFinite(driverId)) return
    const ts = typeof p?.payment_timestamp === 'string' ? p.payment_timestamp : null
    if (!ts) return
    if (!latestPaidAtByDriver.has(driverId)) latestPaidAtByDriver.set(driverId, ts)
    const paidAt = new Date(ts)
    if (!Number.isNaN(paidAt.getTime()) && paidAt.getTime() >= startOfToday.getTime()) paidToday.add(driverId)
  })

  return (drivers ?? [])
    .filter((d: any) => !paidToday.has(num(d?.id, NaN)))
    .map((d: any): AccountsReceivableRow => {
      // 🛡️ I-VALIDATE ANG DRIVER DATA
      const validatedDriver = DriverSchema.parse(d);
      const driverId = validatedDriver.id;
      const lastPaidAt = latestPaidAtByDriver.get(driverId) ?? null
      
      const { daysLate, label } = buildDaysLate(startOfToday, lastPaidAt)
      const dailyBoundary = validatedDriver.boundary_amount
      
      // Kwenta: Daily amount * (bilang ng araw na lumipas)
      const totalDue = dailyBoundary * (daysLate + 1)

      return {
        id: `ar-${driverId}`,
        external_driver_id: driverId,
        driver_name: validatedDriver.driver_name,
        license_number: validatedDriver.license_number,
        phone: validatedDriver.phone,
        email: validatedDriver.email,
        daily_boundary_amount: dailyBoundary,
        outstanding_balance: totalDue,
        days_late: daysLate,
        days_late_text: label,
        last_paid_at: lastPaidAt,
      }
    })
}

// ... rest of your functions (fetchDriverBoundaryHistory, recordBoundaryPayment)