import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const schema = z.object({
  name: z.string().min(2).max(160), phone: z.string().max(40).optional().default(''),
  address: z.string().max(240).optional().default(''), website: z.string().url().or(z.literal('')).optional().default(''),
  contactEmail: z.string().email().or(z.literal('')).optional().default(''),
  retentionDays: z.coerce.number().int().min(30).max(3650), aiEnabled: z.boolean(),
  defaultDueDays: z.coerce.number().int().min(1).max(365), remindersEnabled: z.boolean(),
  onboardingCompleted: z.boolean().optional().default(false),
  profileName: z.string().min(2).max(120).optional(),
})

async function context() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin(); if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { user, admin, member }
}

export async function GET() {
  const ctx = await context(); if ('error' in ctx) return ctx.error
  const { admin, member, user } = ctx
  const [{ data: organization }, { data: profile }] = await Promise.all([
    admin.from('organizations').select('id,name,slug,logo_url,phone,address,website,contact_email,retention_days,ai_enabled,default_due_days,reminders_enabled,onboarding_completed_at').eq('id', member.organization_id).single(),
    admin.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle(),
  ])
  return NextResponse.json({ organization, profile, role: member.role })
}

export async function PATCH(req: Request) {
  const originError = requireSameOrigin(req); if (originError) return originError
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Impostazioni non valide' }, { status: 400 })
  const ctx = await context(); if ('error' in ctx) return ctx.error
  const { admin, member, user } = ctx
  if (member.role !== 'owner') return NextResponse.json({ error: 'Solo il proprietario può modificare le impostazioni' }, { status: 403 })
  const p = parsed.data
  const { data, error } = await admin.from('organizations').update({
    name:p.name, phone:p.phone||null, address:p.address||null, website:p.website||null, contact_email:p.contactEmail||null,
    retention_days:p.retentionDays, ai_enabled:p.aiEnabled, default_due_days:p.defaultDueDays,
    reminders_enabled:p.remindersEnabled, onboarding_completed_at:p.onboardingCompleted ? new Date().toISOString() : null,
    updated_at:new Date().toISOString()
  }).eq('id', member.organization_id).select('id,name,slug,logo_url,phone,address,website,contact_email,retention_days,ai_enabled,default_due_days,reminders_enabled,onboarding_completed_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (p.profileName) await admin.from('profiles').update({ full_name:p.profileName }).eq('id', user.id)
  await admin.from('audit_events').insert({ organization_id:member.organization_id, actor_user_id:user.id, event_type:'organization.settings_updated', metadata:{onboarding:p.onboardingCompleted,default_due_days:p.defaultDueDays,reminders_enabled:p.remindersEnabled} })
  return NextResponse.json({ organization:data })
}
