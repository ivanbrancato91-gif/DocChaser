import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, requireSameOrigin } from '@/lib/security'
const schema = z.object({ fullName: z.string().min(2).max(120), email: z.string().email(), studioName: z.string().min(2).max(160), password: z.string().min(12).max(100) })
export async function POST(req: Request) {
  const originError = requireSameOrigin(req); if (originError) return originError
  const limited = rateLimit(req, 'auth-register', 5, 60 * 60 * 1000); if (limited) return limited
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Servizio temporaneamente non disponibile' }, { status: 503 })
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Dati non validi. La password deve avere almeno 12 caratteri.' }, { status: 400 })
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.fullName, studio_name: parsed.data.studioName } } })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data.user) return NextResponse.json({ error: 'Account non creato' }, { status: 500 })
  if (admin) {
    const slug = `${parsed.data.studioName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'studio'}-${data.user.id.slice(0,8)}`
    const { data: org } = await admin.from('organizations').insert({ name: parsed.data.studioName, slug, retention_days: 365, ai_enabled: true }).select('id').single()
    if (org) await admin.from('organization_members').insert({ organization_id: org.id, user_id: data.user.id, role: 'owner' })
    await admin.from('profiles').upsert({ id: data.user.id, full_name: parsed.data.fullName, email: parsed.data.email })
  }
  return NextResponse.json({ requiresEmailConfirmation: !data.session })
}
