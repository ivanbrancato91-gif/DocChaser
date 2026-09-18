import { NextResponse } from 'next/server'
import { randomBytes, createHash } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function ctx() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin(); if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { admin, orgId: member.organization_id, user }
}
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const c = await ctx(); if ('error' in c) return c.error
  const { data, error } = await c.admin.from('cases').select('id,title,status,due_date,created_at,updated_at,public_token_expires_at,clients(id,name,email),case_items(id,name,description,required,status,sort_order,documents(id,original_name,status,size_bytes,ai_category,ai_confidence,ai_metadata,created_at))').eq('id', id).eq('organization_id', c.orgId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
  return NextResponse.json({ case: data })
}


export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const c = await ctx(); if ('error' in c) return c.error
  const token = randomBytes(32).toString('base64url')
  const hash = createHash('sha256').update(token).digest('hex')
  const expires = new Date(Date.now() + 30*24*60*60*1000).toISOString()
  const { data: updated, error } = await c.admin.from('cases').update({ public_token_hash: hash, public_token_expires_at: expires, public_token_revoked_at: null }).eq('id', id).eq('organization_id', c.orgId).select('id,title').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!updated) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })
  await c.admin.from('audit_events').insert({ organization_id: c.orgId, actor_user_id: c.user.id, case_id: id, event_type: 'case.portal_regenerated', metadata: { expires_at: expires } })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  return NextResponse.json({ portalUrl: `${baseUrl.replace(/\/$/,'')}/portal/${token}`, expiresAt: expires })
}
