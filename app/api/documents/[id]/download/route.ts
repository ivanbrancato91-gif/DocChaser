import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 503 })
  const { data: doc } = await admin.from('documents').select('id,organization_id,storage_path,original_name').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('organization_id', doc.organization_id).eq('user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const { data, error } = await admin.storage.from('documents').createSignedUrl(doc.storage_path, 60 * 10, { download: doc.original_name })
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'File non disponibile' }, { status: 502 })
  return NextResponse.json({ url: data.signedUrl, expiresIn: 600 })
}
