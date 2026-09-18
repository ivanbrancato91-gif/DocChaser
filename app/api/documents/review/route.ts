import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const schema = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(['approved', 'revision_requested']),
  note: z.string().max(2000).optional().default(''),
})

export async function POST(request: Request) {
  const originError=requireSameOrigin(request); if(originError)return originError
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 503 })

  const { data: document } = await admin.from('documents').select('id,organization_id,case_item_id,original_name,status').eq('id', parsed.data.documentId).maybeSingle()
  if (!document) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('organization_id', document.organization_id).eq('user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })

  const status = parsed.data.decision === 'approved' ? 'verified' : 'revision_requested'
  const { error: updateError } = await admin.from('documents').update({ status, updated_at: new Date().toISOString() }).eq('id', document.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  await admin.from('case_items').update({ status: parsed.data.decision === 'approved' ? 'verified' : 'needs_correction' }).eq('id', document.case_item_id)

  const { data: item } = await admin.from('case_items').select('case_id').eq('id', document.case_item_id).maybeSingle()
  if (item) {
    const { data: items } = await admin.from('case_items').select('status,required').eq('case_id', item.case_id)
    const complete = (items || []).filter((x: any) => x.required).every((x: any) => x.status === 'verified')
    await admin.from('cases').update({ status: complete ? 'completed' : 'open', updated_at: new Date().toISOString() }).eq('id', item.case_id).eq('organization_id', document.organization_id)
    await admin.from('audit_events').insert({ organization_id: document.organization_id, actor_user_id: user.id, case_id: item.case_id, document_id: document.id, event_type: parsed.data.decision === 'approved' ? 'document.approved' : 'document.revision_requested', metadata: { note: parsed.data.note, previous_status: document.status, role: member.role } })
    if (parsed.data.decision === 'revision_requested' && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
      const { data: caseRow } = await admin.from('cases').select('title,clients(name,email)').eq('id', item.case_id).maybeSingle()
      const client = Array.isArray((caseRow as any)?.clients) ? (caseRow as any).clients[0] : (caseRow as any)?.clients
      if (client?.email) {
        const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [client.email], subject: `DocChaser: correzione richiesta — ${caseRow?.title || 'pratica'}`, html: `<p>Ciao ${client.name || ''},</p><p>È stata richiesta una correzione per il documento <b>${document.original_name}</b>.</p>${parsed.data.note ? `<p><b>Nota:</b> ${parsed.data.note.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>` : ''}<p>Apri il portale per caricare il documento corretto.</p><p>${base}</p>` }) }).catch(() => null)
      }
    }
  }
  return NextResponse.json({ ok: true, status })
}
