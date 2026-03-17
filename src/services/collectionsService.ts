import { supabase } from '../../database/supabase'

export async function fetchCollections(): Promise<any[]> {
  // Kunin ang eksaktong simula ng araw (12:00 AM PHT)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('*, core1_drivers(driver_name)') // FIXED: driver_name dapat, hindi name
    .gte('payment_timestamp', startOfDay.toISOString())
    .eq('status', 'PAID')
    .order('payment_timestamp', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((b) => ({
    id: b.id,
    ar_id: b.reference_no || `REF-${b.id}`,
    amount_paid: b.amount,
    payment_method: 'App Payment',
    received_by_id: 'System Auto',
    collected_at: b.payment_timestamp,
    // FIXED: Mapping para sa driver_name
    driver_name: b.core1_drivers?.driver_name || `Driver #${b.driver_id}`,
    source: 'Core 1'
  }));
}

export async function fetchCollectionsTotal(): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data, error } = await supabase
    .from('core1_boundary_payments')
    .select('amount')
    .gte('payment_timestamp', startOfDay.toISOString())
    .eq('status', 'PAID');

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
}