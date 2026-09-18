import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Server non configurato' }, { status: 500 })
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 })
  const { data, error } = await admin.from('notifications').select('id,type,message,case_id,client_id,created_at').eq('organization_id', member.organization_id).order('created_at', { ascending: false }).limit(30)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data || [] })
}
