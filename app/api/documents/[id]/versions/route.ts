import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 503 })
  const { data: doc } = await admin.from('documents').select('organization_id').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('organization_id', doc.organization_id).eq('user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const { data, error } = await admin.from('document_versions').select('id,version,original_name,mime_type,size_bytes,created_at').eq('document_id', id).order('version', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ versions: data || [] })
}
