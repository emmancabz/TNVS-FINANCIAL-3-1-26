import { supabase } from '../../database/supabase'

/**
 * Kukuha ng payments simula 12:00 AM ng kasalukuyang araw (PHT)
 */
const getPhilippinesNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))

const startOfPhilippinesDay = () => {
  const now = getPhilippinesNow()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export const fetchTodayBoundaryPayments = async () => {
  const startOfDay = startOfPhilippinesDay()

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('*, core1_drivers(driver_name)') // FIXED: driver_name
    .gte('payment_timestamp', startOfDay.toISOString())
    .eq('status', 'PAID')

  if (error) throw error
  return data
}

/**
 * Historical payments
 */
export const fetchAllBoundaryPayments = async () => {
  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('*, core1_drivers(driver_name)') // FIXED: driver_name
    .eq('status', 'PAID')
    .order('payment_timestamp', { ascending: false })

  if (error) throw error
  return data
}
