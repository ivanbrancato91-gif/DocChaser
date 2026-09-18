import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const schema = z.object({ clientId: z.string().uuid(), templateId: z.string().uuid(), dueDate: z.string().date().optional().nullable() })
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;')

async function getOrgUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin()
  if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { user, admin, orgId: member.organization_id }
}

export async function GET() {
  const ctx = await getOrgUser(); if ('error' in ctx) return ctx.error
  const { admin, orgId } = ctx
  const { data, error } = await admin.from('cases').select('id,title,status,due_date,created_at,updated_at,clients(id,name,email),case_items(id,name,required,status,documents(id,status,original_name))').eq('organization_id', orgId).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const cases = (data || []).map((c: any) => {
    const items = c.case_items || []
    const required = items.filter((i: any) => i.required)
    const received = required.filter((i: any) => (i.documents || []).some((d: any) => d.status !== 'rejected')).length
    const pending = required.filter((i: any) => !(i.documents || []).length).length
    return { ...c, client: c.clients, items, progress: { received, total: required.length, pending } }
  })
  return NextResponse.json({ cases })
}

export async function POST(req: Request) {
  const originError=requireSameOrigin(req); if(originError)return originError
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dati pratica non validi' }, { status: 400 })
  const ctx = await getOrgUser(); if ('error' in ctx) return ctx.error
  const { user, admin, orgId } = ctx
  const { data: client } = await admin.from('clients').select('id,name,email').eq('id', parsed.data.clientId).eq('organization_id', orgId).is('deleted_at', null).single()
  if (!client) return NextResponse.json({ error: 'Cliente non trovato' }, { status: 404 })
  const { data: template } = await admin.from('templates').select('id,name').eq('id', parsed.data.templateId).eq('organization_id', orgId).single()
  if (!template) return NextResponse.json({ error: 'Modello non trovato' }, { status: 404 })
  const { data: items } = await admin.from('template_items').select('id,name,description,required,sort_order').eq('template_id', template.id).order('sort_order')
  const token = randomBytes(32).toString('base64url')
  const { data: created, error } = await admin.from('cases').insert({ organization_id: orgId, client_id: client.id, template_id: template.id, title: `${template.name} — ${client.name}`, due_date: parsed.data.dueDate || null, status: 'open', public_token_hash: hashToken(token), public_token_expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(), created_by: user.id }).select('id,title,due_date,status').single()
  if (error || !created) return NextResponse.json({ error: error?.message || 'Impossibile creare la pratica' }, { status: 500 })
  if (items?.length) {
    const { error: itemError } = await admin.from('case_items').insert(items.map((item, index) => ({ case_id: created.id, template_item_id: item.id, name: item.name, description: item.description, required: item.required, status: 'pending', sort_order: item.sort_order ?? index })))
    if (itemError) { await admin.from('cases').delete().eq('id', created.id); return NextResponse.json({ error: itemError.message }, { status: 500 }) }
  }
  await admin.from('audit_events').insert({ organization_id: orgId, actor_user_id: user.id, case_id: created.id, event_type: 'case.created', metadata: { client_id: client.id, template_id: template.id } })
  await admin.from('reminders').insert({ case_id: created.id, first_at: new Date(Date.now()+24*60*60*1000).toISOString(), frequency_hours: 48, send_hour: 9, stop_at: new Date(Date.now()+30*24*60*60*1000).toISOString(), max_sends: 3, sends_count: 0, paused: false })
  let emailSent = false; let emailError: string | null = null
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const portalUrl = `${baseUrl.replace(/\/$/,'')}/portal/${token}`
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [client.email], subject: `Documenti richiesti — ${template.name}`, html: `<p>Ciao ${escapeHtml(client.name)},</p><p>Lo studio ti ha richiesto alcuni documenti per la pratica <strong>${escapeHtml(template.name)}</strong>.</p><p><a href="${portalUrl}">Apri il portale sicuro e carica i documenti</a></p><p>Il link è valido 30 giorni.</p>`, text: `Ciao ${client.name}, apri il portale sicuro: ${portalUrl}` }) })
    emailSent = response.ok; if (!response.ok) emailError = await response.text()
  } else emailError = 'Resend non configurato'
  await admin.from('audit_events').insert({ organization_id: orgId, actor_user_id: user.id, case_id: created.id, event_type: emailSent ? 'case.portal_sent' : 'case.portal_not_sent', metadata: { email: client.email, error: emailError } })
  return NextResponse.json({ case: created, portalUrl, emailSent, emailError })
}
