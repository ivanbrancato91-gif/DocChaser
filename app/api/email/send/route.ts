import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, requireSameOrigin } from '@/lib/security'

const bodySchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  html: z.string().min(1).max(100_000),
  text: z.string().max(100_000).optional(),
})

export async function POST(request: Request) {
  const originError=requireSameOrigin(request); if(originError)return originError
  const limited=rateLimit(request,'email-send',20,60*60*1000); if(limited)return limited
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Autenticazione richiesta' }, { status: 401 })
  const { getSupabaseAdmin } = await import('@/lib/supabase-admin')
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase server non configurato' }, { status: 503 })
  const { data: membership } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!membership) return NextResponse.json({ ok: false, error: 'Organizzazione non configurata' }, { status: 403 })
  if (!['owner','admin'].includes(membership.role)) return NextResponse.json({ ok: false, error: 'Permesso insufficiente' }, { status: 403 })
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return NextResponse.json({ ok: false, error: 'Email non configurata' }, { status: 503 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Dati email non validi' }, { status: 400 })
  const { data: client } = await admin.from('clients').select('id').eq('organization_id', membership.organization_id).eq('email', parsed.data.to).is('deleted_at', null).maybeSingle()
  if (!client) return NextResponse.json({ ok: false, error: 'Il destinatario non appartiene ai clienti dello studio' }, { status: 403 })

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [parsed.data.to],
      subject: parsed.data.subject,
      html: parsed.data.html,
      ...(parsed.data.text ? { text: parsed.data.text } : {}),
    }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ ok: false, error: 'Invio email non riuscito' }, { status: 502 })
  return NextResponse.json({ ok: true, id: payload.id })
}
