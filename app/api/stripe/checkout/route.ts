import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const bodySchema = z.object({
  plan: z.enum(['starter', 'studio', 'team']),
  organizationId: z.string().uuid().optional(),
  email: z.string().email().optional(),
})

const priceEnv: Record<string, string | undefined> = {
  starter: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  studio: process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,
  team: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID,
}

export async function POST(request: Request) {
  const originError=requireSameOrigin(request); if(originError)return originError
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return NextResponse.json({ ok: false, error: 'Stripe non configurato' }, { status: 503 })
  if (!key.startsWith('sk_live_')) return NextResponse.json({ ok: false, error: 'DocChaser richiede una chiave Stripe live per il pagamento in produzione' }, { status: 403 })

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Dati checkout non validi' }, { status: 400 })

  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Autenticazione richiesta' }, { status: 401 })
  const { data: member } = await server.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return NextResponse.json({ ok: false, error: 'Organizzazione non configurata' }, { status: 403 })
  if (parsed.data.organizationId && parsed.data.organizationId !== member.organization_id) return NextResponse.json({ ok: false, error: 'Organizzazione non autorizzata' }, { status: 403 })
  const organizationId = member.organization_id

  const price = priceEnv[parsed.data.plan]
  if (!price) return NextResponse.json({ ok: false, error: 'Price ID non configurato' }, { status: 503 })

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase server non configurato' }, { status: 503 })
  const { data: existingSubscription } = await admin
    .from('subscriptions')
    .select('status,stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle()
  if (existingSubscription && ['active', 'trialing', 'past_due', 'unpaid', 'paused'].includes(existingSubscription.status)) {
    return NextResponse.json({ ok: false, error: 'Esiste già un abbonamento. Usa Gestisci abbonamento per cambiare piano o metodo di pagamento.' }, { status: 409 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('line_items[0][price]', price)
  params.set('line_items[0][quantity]', '1')
  params.set('success_url', `${appUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${appUrl}/billing?checkout=cancelled`)
  params.set('client_reference_id', organizationId)
  params.set('metadata[organization_id]', organizationId)
  params.set('metadata[plan]', parsed.data.plan)
  params.set('subscription_data[metadata][organization_id]', organizationId)
  params.set('subscription_data[metadata][plan]', parsed.data.plan)
  params.set('subscription_data[metadata][app]', 'docchaser')
  params.set('customer_creation', 'always')
  if (parsed.data.email) params.set('customer_email', parsed.data.email)

  // Prevent rapid double-clicks from creating multiple Checkout Sessions while
  // still allowing a fresh attempt after the short Stripe idempotency window.
  const idempotencyBucket = Math.floor(Date.now() / 60_000)
  const idempotencyKey = `docchaser-checkout-${organizationId}-${parsed.data.plan}-${idempotencyBucket}`
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': idempotencyKey },
    body: params,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) return NextResponse.json({ ok: false, error: 'Creazione checkout non riuscita' }, { status: 502 })

  if (admin) {
    await admin.from('audit_events').insert({
      organization_id: organizationId,
      actor_user_id: user.id,
      event_type: 'stripe_checkout_created',
      metadata: { session_id: payload.id, plan: parsed.data.plan },
    })
  }

  return NextResponse.json({ ok: true, url: payload.url, sessionId: payload.id })
}
