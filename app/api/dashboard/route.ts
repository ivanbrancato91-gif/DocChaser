import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin()
  if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { admin, orgId: member.organization_id }
}

export async function GET() {
  const ctx = await context(); if ('error' in ctx) return ctx.error
  const { admin, orgId } = ctx
  const [{ data: cases }, { data: audits }, { data: notifications }, { data: reminders }, { count: clientCount }] = await Promise.all([
    admin.from('cases').select('id,title,status,due_date,updated_at,clients(name),case_items(id,name,required,status,documents(id,status,created_at))').eq('organization_id', orgId).order('updated_at', { ascending: false }),
    admin.from('audit_events').select('id,event_type,case_id,document_id,metadata,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(12),
    admin.from('notifications').select('id,type,message,case_id,created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(10),
    admin.from('reminders').select('id,case_id,first_at,last_sent_at,sends_count,max_sends,paused,cases!inner(title,organization_id)').eq('cases.organization_id', orgId).order('first_at').limit(50),
    admin.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).is('deleted_at', null),
  ])
  const rows = cases || []
  const requiredItems = rows.flatMap((c: any) => (c.case_items || []).filter((i: any) => i.required))
  const verified = requiredItems.filter((i: any) => i.status === 'verified').length
  const uploaded = requiredItems.filter((i: any) => (i.documents || []).some((d: any) => !['rejected'].includes(d.status))).length
  const needsReview = requiredItems.filter((i: any) => i.status === 'pending' && (i.documents || []).length > 0).length
  const corrections = requiredItems.filter((i: any) => i.status === 'needs_correction').length
  const today = new Date(); today.setHours(23,59,59,999)
  const soon = new Date(); soon.setDate(soon.getDate()+7); soon.setHours(23,59,59,999)
  const dueSoon = rows.filter((c: any) => c.status !== 'completed' && c.due_date && new Date(c.due_date) <= soon).length
  const overdue = rows.filter((c: any) => c.status !== 'completed' && c.due_date && new Date(c.due_date) < new Date()).length
  const riskCases = rows.map((c: any) => {
    const items = c.case_items || []
    const missing = items.filter((i:any) => i.required && !(i.documents || []).some((d:any) => !['rejected'].includes(d.status))).length
    const review = items.filter((i:any) => i.required && i.status === 'pending' && (i.documents || []).length > 0).length
    const correction = items.filter((i:any) => i.status === 'needs_correction').length
    const overdueCase = c.status !== 'completed' && c.due_date && new Date(c.due_date) < new Date()
    const dueSoonCase = c.status !== 'completed' && c.due_date && new Date(c.due_date) <= soon
    const reasons = [overdueCase ? 'Scaduta' : dueSoonCase ? 'Scadenza entro 7 giorni' : '', correction ? `${correction} da correggere` : '', review ? `${review} da verificare` : '', missing ? `${missing} documenti mancanti` : ''].filter(Boolean)
    return reasons.length ? { id:c.id, title:c.title, status:c.status, due_date:c.due_date, client:c.clients, reason:reasons.slice(0,2).join(' · '), priority: overdueCase ? 4 : correction ? 3 : review ? 2 : 1 } : null
  }).filter(Boolean).sort((a:any,b:any)=>b.priority-a.priority)
  return NextResponse.json({
    stats: { clients: clientCount || 0, cases: rows.length, required: requiredItems.length, uploaded, verified, needsReview, corrections, dueSoon, overdue, complete: rows.filter((c: any) => c.status === 'completed').length },
    riskCases,
    cases: rows.slice(0, 8).map((c: any) => ({ id: c.id, title: c.title, status: c.status, due_date: c.due_date, client: c.clients, items: c.case_items || [] })),
    audits: audits || [], notifications: notifications || [], reminders: reminders || []
  })
}
