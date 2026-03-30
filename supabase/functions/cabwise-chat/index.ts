import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const maskName = (name: string) => {
  if (!name) return 'Unknown'
  const parts = name.trim().split(' ')
  return parts.map((part: string) => {
    if (part.length <= 1) return part
    return part[0] + '*'.repeat(part.length - 1)
  }).join(' ')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { messages } = await req.json()
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!groqApiKey) throw new Error("Missing GROQ_API_KEY")
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials")
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const getPhNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    const phNow = getPhNow()
    const startOfToday = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate())
    const startOfMonth = new Date(phNow.getFullYear(), phNow.getMonth(), 1)
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000)
    const [
      { data: todayCollections },
      { data: weekCollections },
      { data: monthCollections },
      { data: pendingPayables },
      { data: recentDisbursements },
      { data: budgets },
      { data: drivers },
      { data: recentLedger },
    ] = await Promise.all([
      supabase.from('core1_boundary_payments').select('amount, payment_timestamp, driver_id, reference_no, core1_drivers(driver_name)').gte('payment_timestamp', startOfToday.toISOString()).ilike('status', 'paid').order('payment_timestamp', { ascending: false }),
      supabase.from('core1_boundary_payments').select('amount').gte('payment_timestamp', startOfWeek.toISOString()).ilike('status', 'paid'),
      supabase.from('core1_boundary_payments').select('amount').gte('payment_timestamp', startOfMonth.toISOString()).ilike('status', 'paid'),
      supabase.from('fin_accounts_payable').select('ref_no, vendor_name, amount, category, status, due_date, description').eq('status', 'pending').order('due_date', { ascending: true }).limit(10),
      supabase.from('fin_disbursement').select('dv_no, status, disbursed_at, payment_method, fin_accounts_payable(ref_no, vendor_name, amount, category, description)').order('disbursed_at', { ascending: false }).limit(10),
      supabase.from('fin_budget_management').select('category, limit_amount, actual_spend'),
      supabase.from('core1_drivers').select('id, driver_name, boundary_amount'),
      supabase.from('fin_general_ledger').select('debit, credit, transaction_date, description, account_code').order('transaction_date', { ascending: false }).limit(10),
    ])
    const todayTotal = (todayCollections ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const weekTotal = (weekCollections ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const monthTotal = (monthCollections ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const totalPendingAP = (pendingPayables ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const totalDrivers = (drivers ?? []).length
    const paidTodayIds = new Set((todayCollections ?? []).map((r: any) => r.driver_id))
    const unpaidDrivers = (drivers ?? []).filter((d: any) => !paidTodayIds.has(d.id))
    const budgetSummary = (budgets ?? []).map((b: any) => ({ category: b.category, limit: Number(b.limit_amount || 0), spent: Number(b.actual_spend || 0), remaining: Number(b.limit_amount || 0) - Number(b.actual_spend || 0), pct: b.limit_amount > 0 ? Math.round((b.actual_spend / b.limit_amount) * 100) : 0 }))
    const systemData = {
      as_of: phNow.toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
      collections: { today_total: todayTotal, today_count: (todayCollections ?? []).length, week_total: weekTotal, month_total: monthTotal, today_transactions: (todayCollections ?? []).slice(0, 8).map((r: any) => ({ driver: maskName(r.core1_drivers?.driver_name ?? 'Driver #' + r.driver_id), amount: r.amount, time: r.payment_timestamp })) },
      accounts_payable: { pending_count: (pendingPayables ?? []).length, pending_total: totalPendingAP, pending_items: pendingPayables ?? [] },
      disbursements: { recent: (recentDisbursements ?? []).map((d: any) => ({ dv_no: d.dv_no, status: d.status, date: d.disbursed_at, vendor: d.fin_accounts_payable?.vendor_name, amount: d.fin_accounts_payable?.amount, category: d.fin_accounts_payable?.category })) },
      budget: { summary: budgetSummary, over_budget: budgetSummary.filter((b: any) => b.pct > 100) },
      drivers: { total: totalDrivers, paid_today: totalDrivers - unpaidDrivers.length, unpaid_today: unpaidDrivers.length, unpaid_list: unpaidDrivers.slice(0, 10).map((d: any) => ({ name: maskName(d.driver_name), boundary: d.boundary_amount })) },
      ledger: { recent: (recentLedger ?? []).slice(0, 10) }
    }
    const filtered = messages.filter((m: any) => m.role === 'user' || m.role === 'assistant')
    const systemPrompt = `You are Cabwise, the expert Financial AI Agent for Envirocab, a TNVS company in the Philippines.

REAL-TIME FINANCIAL DATA (as of ${systemData.as_of} PHT):
${JSON.stringify(systemData, null, 2)}

PERSONALITY & CONVERSATION RULES:
- You are friendly, professional, and conversational.
- For casual messages like "okay", "thanks", "hello", "hi", "sure", "got it" — respond naturally and warmly in 1 sentence. Do NOT ask for more info or say you cannot process it.
- For greetings, introduce yourself briefly and offer to help.
- Only dive into financial data when the user asks a financial question.
- Match the user's language: English by default, Taglish if they write in Filipino.

DATA RULES:
1. NEVER mention field names, variable names, table names, or JSON keys.
2. Driver names are privacy-masked (e.g. "C* C*"). Present them exactly as given.
3. Base all financial answers strictly on the real-time data. Never invent numbers.
4. Always format amounts in Philippine Peso (e.g. P1,500.00).

FORMATTING RULES:
- Plain text only. No asterisks, hashtags, underscores, or backticks.
- Use numbers (1. 2.) or dashes (-) for lists.
- Keep responses concise and clear.`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqApiKey}` },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: systemPrompt }, ...filtered.map((m: any) => ({ role: m.role, content: m.content }))], max_tokens: 1500, temperature: 0.3 })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error?.message || 'Groq API error')
    let reply = data.choices?.[0]?.message?.content ?? 'Walang sagot.'
    reply = reply.replace(/\*+/g, '').replace(/#+/g, '').replace(/`+/g, '').replace(/__/g, '')
    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('[Cabwise Error]', error)
    return new Response(JSON.stringify({ error: error?.message ?? 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
