import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/security'

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin()
  if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { admin, orgId: member.organization_id }
}

export async function GET(req: Request) {
  const limited = rateLimit(req, 'global-search', 60, 60_000)
  if (limited) return limited
  const c = await context(); if ('error' in c) return c.error
  const q = new URL(req.url).searchParams.get('q')?.trim().replace(/[%_]/g, '') || ''
  if (q.length < 2) return NextResponse.json({ results: [] })
  const pattern = `%${q}%`
  const { admin, orgId } = c

  const [{ data: clients }, { data: cases }, { data: documents }] = await Promise.all([
    admin.from('clients').select('id,name,email').eq('organization_id', orgId).is('deleted_at', null).or(`name.ilike.${pattern},email.ilike.${pattern}`).order('name').limit(8),
    admin.from('cases').select('id,title,status,due_date,client_id,clients(name)').eq('organization_id', orgId).ilike('title', pattern).order('updated_at', { ascending: false }).limit(8),
    admin.from('documents').select('id,original_name,status,case_item_id,case_items(name,cases!inner(id,title,organization_id))').eq('organization_id', orgId).ilike('original_name', pattern).order('created_at', { ascending: false }).limit(8),
  ])

  const results = [
    ...(clients || []).map((x: any) => ({ type: 'client', id: x.id, title: x.name, subtitle: x.email || 'Cliente', href: `/clients/${x.id}` })),
    ...(cases || []).map((x: any) => ({ type: 'case', id: x.id, title: x.title, subtitle: `${x.clients?.name || 'Cliente'} · ${x.status || 'aperta'}`, href: `/cases/${x.id}` })),
    ...(documents || []).map((x: any) => ({ type: 'document', id: x.id, title: x.original_name, subtitle: `${x.case_items?.cases?.title || 'Pratica'} · ${x.status || 'uploaded'}`, href: `/cases/${x.case_items?.cases?.id}` })),
  ].slice(0, 20)

  return NextResponse.json({ results })
}
