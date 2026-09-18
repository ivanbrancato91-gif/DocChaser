import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

function verifySignature(payload: string, signature: string, secret: string) {
  const parts = signature.split(',').reduce<Record<string, string[]>>((acc, part) => {
    const [key, value] = part.split('=', 2)
    if (key && value) (acc[key] ||= []).push(value)
    return acc
  }, {})
  const timestamp = parts.t?.[0]
  const signatures = parts.v1 || []
  if (!timestamp || signatures.length === 0) return false
  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  return signatures.some((value) => {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(value, 'utf8')
    return a.length === b.length && timingSafeEqual(a, b)
  })
}

const subscriptionEvents = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
])

function validOrganizationId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: 'Webhook secret non configurato' }, { status: 503 })

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')
  if (!signature || !verifySignature(payload, signature, secret)) {
    return NextResponse.json({ ok: false, error: 'Firma webhook non valida' }, { status: 400 })
  }

  let event: any
  try { event = JSON.parse(payload) } catch { return NextResponse.json({ ok: false, error: 'Payload non valido' }, { status: 400 }) }
  if (!event?.id || !event?.type || !event?.data?.object) {
    return NextResponse.json({ ok: false, error: 'Evento Stripe non valido' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ ok: false, error: 'Supabase server non configurato' }, { status: 503 })

  // Claim the event before processing. Failed events remain retryable instead of being
  // permanently swallowed by the idempotency ledger.
  const { data: existing } = await admin
    .from('stripe_webhook_events')
    .select('stripe_event_id,status,received_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing?.status === 'processed') {
    return NextResponse.json({ received: true, duplicate: true })
  }

  if (!existing) {
    const { error: insertError } = await admin.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      status: 'processing',
      last_error: null,
    })
    if (insertError && insertError.code !== '23505') {
      return NextResponse.json({ ok: false, error: 'Impossibile registrare l\'evento webhook' }, { status: 500 })
    }
    if (insertError?.code === '23505') {
      const { data: raced } = await admin.from('stripe_webhook_events').select('status,received_at').eq('stripe_event_id', event.id).maybeSingle()
      if (raced?.status === 'processed') return NextResponse.json({ received: true, duplicate: true })
      if (raced?.status === 'processing' && Date.now() - new Date(raced.received_at).getTime() < 10 * 60 * 1000) {
        return NextResponse.json({ ok: false, error: 'Evento già in elaborazione' }, { status: 409 })
      }
    }
  } else {
    if (existing.status === 'processing') {
      const ageMs = Date.now() - new Date(existing.received_at).getTime()
      if (Number.isFinite(ageMs) && ageMs < 10 * 60 * 1000) {
        return NextResponse.json({ ok: false, error: 'Evento già in elaborazione' }, { status: 409 })
      }
    }
    const { data: claimed } = await admin.from('stripe_webhook_events')
      .update({ status: 'processing', last_error: null, received_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id)
      .in('status', ['failed', 'processing'])
      .select('stripe_event_id')
      .maybeSingle()
    if (!claimed) return NextResponse.json({ ok: false, error: 'Evento già in elaborazione' }, { status: 409 })
  }

  try {
    if (subscriptionEvents.has(event.type)) {
      const subscription = event.data.object
      const organizationId = subscription.metadata?.organization_id
      if (validOrganizationId(organizationId)) {
        const { error } = await admin.from('subscriptions').upsert({
          organization_id: organizationId,
          stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null,
          stripe_subscription_id: subscription.id,
          plan: subscription.metadata?.plan || 'unknown',
          status: subscription.status,
          current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
        }, { onConflict: 'organization_id' })
        if (error) throw new Error('Sincronizzazione abbonamento non riuscita')
      }
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const organizationId = session.metadata?.organization_id || session.client_reference_id
      if (validOrganizationId(organizationId) && session.subscription) {
        const { error } = await admin.from('subscriptions').upsert({
          organization_id: organizationId,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id,
          plan: session.metadata?.plan || 'unknown',
          status: 'active',
        }, { onConflict: 'organization_id' })
        if (error) throw new Error('Sincronizzazione checkout non riuscita')
      }
    }

    if (['invoice.paid', 'invoice.payment_failed'].includes(event.type)) {
      const invoice = event.data.object
      const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
      if (subscriptionId) {
        const status = event.type === 'invoice.paid' ? 'active' : 'past_due'
        const { error } = await admin.from('subscriptions').update({ status }).eq('stripe_subscription_id', subscriptionId)
        if (error) throw new Error('Aggiornamento stato pagamento non riuscito')
      }
    }

    await admin.from('stripe_webhook_events').update({ status: 'processed', last_error: null }).eq('stripe_event_id', event.id)
    return NextResponse.json({ received: true, duplicate: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed'
    await admin.from('stripe_webhook_events').update({ status: 'failed', last_error: message }).eq('stripe_event_id', event.id)
    return NextResponse.json({ ok: false, error: 'Elaborazione webhook non riuscita' }, { status: 500 })
  }
}
