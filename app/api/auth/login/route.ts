import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, requireSameOrigin } from '@/lib/security'
const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
export async function POST(req: Request) {
  const originError = requireSameOrigin(req); if (originError) return originError
  const limited = rateLimit(req, 'auth-login', 8, 10 * 60 * 1000); if (limited) return limited
  const parsed = schema.safeParse(await req.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: 'Email o password non validi' }, { status: 400 })
  const supabase = await createSupabaseServerClient(); const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return NextResponse.json({ error: error.message }, { status: 401 })
  return NextResponse.json({ ok: true })
}
