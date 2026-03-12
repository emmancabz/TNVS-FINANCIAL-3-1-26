// services/disbursementService.ts
import { supabase } from '../database/supabase'; 

export interface AccountsPayable {
  vendor_name: string;
  amount: number;
  description: string;
}

export interface Disbursement {
  id: string;
  dv_no: string;
  ap_id: string;
  status: string;
  disbursed_at: string;
  fin_accounts_payable?: AccountsPayable;
}

/**
 * Fetch all disbursements with joined accounts payable data
 */
export async function fetchDisbursements() {
  const { data, error } = await supabase
    .from('fin_disbursement')
    .select(`
      id,
      dv_no,
      status,
      disbursed_at,
      fin_accounts_payable (
        vendor_name,
        description,
        amount
      )
    `)
    .order('disbursed_at', { ascending: false });

  if (error) {
    console.error('Fetch error:', error.message);
    throw error;
  }
  
  return data;
}

/**
 * Update the status of a disbursement (e.g., to 'Settled')
 */
export async function updateDisbursementStatus(id: string, newStatus: string) {
  const updatePayload: any = { status: newStatus };
  
  // Kung i-sesettle na, i-update ang timestamp
  if (newStatus === 'Settled') {
    updatePayload['disbursed_at'] = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('fin_disbursement')
    .update(updatePayload)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Update error:', error.message);
    throw error;
  }
  
  return data;
}