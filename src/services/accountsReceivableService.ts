import { supabase } from '../../database/supabase'

export async function fetchAccountsReceivable(): Promise<any[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [
    { data: drivers, error: driversError },
    { data: payments, error: paymentsError }
  ] = await Promise.all([
    // Kinuha ang lahat ng fields na kailangan para sa table
    supabase.from('core1_drivers').select('id, driver_name, license_number, phone, email, boundary_amount'),
    // Hanapin ang mga nagbayad na simula 12:00 AM
    supabase.from('core1_boundary_payments')
      .select('driver_id')
      .gte('payment_timestamp', startOfDay.toISOString())
      .eq('status', 'PAID')
  ])

  if (driversError) throw driversError;
  if (paymentsError) throw paymentsError;

  const paidDriverIds = new Set((payments ?? []).map(p => p.driver_id));
  
  // Return lang ang mga HINDI pa nagbabayad ngayong araw
  return (drivers ?? [])
    .filter(d => !paidDriverIds.has(d.id))
    .map(d => ({
      id: `ar-${d.id}`,
      external_driver_id: d.id,
      driver_name: d.driver_name, // Ginamit ang driver_name
      license_number: d.license_number,
      phone: d.phone || 'N/A',
      email: d.email,
      outstanding_balance: d.boundary_amount || 500
    }))
}