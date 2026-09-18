import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request) {
  const originError=requireSameOrigin(req); if(originError)return originError
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return NextResponse.json({ error: 'Stripe non configurato' }, { status: 503 })
  if (!key.startsWith('sk_live_')) return NextResponse.json({ error: 'DocChaser richiede una chiave Stripe live per il billing in produzione' }, { status: 403 })
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 })
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member || member.role !== 'owner') return NextResponse.json({ error: 'Solo il proprietario può gestire la fatturazione' }, { status: 403 })
  const { data: subscription } = await admin.from('subscriptions').select('stripe_customer_id').eq('organization_id', member.organization_id).maybeSingle()
  if (!subscription?.stripe_customer_id) return NextResponse.json({ error: 'Nessun cliente Stripe associato. Completa prima un checkout.' }, { status: 400 })
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const params = new URLSearchParams({ customer: subscription.stripe_customer_id, return_url: `${origin}/billing` })
  const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: params })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ error: payload?.error?.message || 'Portale Stripe non disponibile' }, { status: 502 })
  await admin.from('audit_events').insert({ organization_id: member.organization_id, actor_user_id: user.id, event_type: 'stripe_billing_portal_opened', metadata: {} })
  return NextResponse.json({ url: payload.url })
}
