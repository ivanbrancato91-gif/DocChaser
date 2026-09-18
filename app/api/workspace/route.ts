import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const DEFAULT_TEMPLATES = [
  { name: 'Dichiarazione dei redditi', description: 'Documenti per la dichiarazione dei redditi', items: ['Carta d’identità','Codice fiscale','Ultime 3 buste paga','Modello 730','Certificazione unica'] },
  { name: 'Assunzione dipendente', description: 'Checklist per nuova assunzione', items: ['Documento d’identità','Codice fiscale','IBAN','Certificato di residenza'] },
  { name: 'Richiesta mutuo', description: 'Documentazione per pratica mutuo', items: ['Documento d’identità','Codice fiscale','Ultime 3 buste paga','Ultima dichiarazione dei redditi','Estratto conto'] },
  { name: 'Locazione immobiliare', description: 'Documenti per contratto di locazione', items: ['Documento d’identità','Codice fiscale','Ultime 2 buste paga','Certificazione unica'] },
  { name: 'Pratica condominiale', description: 'Checklist per pratiche condominiali', items: ['Documento d’identità','Codice fiscale','Titolo di proprietà','Ultimo verbale assembleare'] },
]

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 })

  let { data: membership } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!membership) {
    const base = (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Studio').trim()
    const slug = `${base.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'studio'}-${user.id.slice(0,8)}`
    const { data: org, error: orgError } = await admin.from('organizations').insert({ name: base, slug, retention_days: 365, ai_enabled: true }).select('id,name,slug').single()
    if (orgError) return NextResponse.json({ error: orgError.message }, { status: 500 })
    const { error: memberError } = await admin.from('organization_members').insert({ organization_id: org.id, user_id: user.id, role: 'owner' })
    if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })
    membership = { organization_id: org.id, role: 'owner' }
  }

  const orgId = membership.organization_id
  const { data: organization } = await admin.from('organizations').select('id,name,slug').eq('id', orgId).single()
  let { data: templates } = await admin.from('templates').select('id,name,description').eq('organization_id', orgId).order('created_at')
  if (!templates?.length) {
    for (const t of DEFAULT_TEMPLATES) {
      const { data: created } = await admin.from('templates').insert({ organization_id: orgId, name: t.name, description: t.description }).select('id,name,description').single()
      if (created) {
        await admin.from('template_items').insert(t.items.map((name, index) => ({ template_id: created.id, name, description: null, required: true, allowed_formats: ['application/pdf','image/jpeg','image/png'], max_files: 1, due_date: null, sort_order: index })))
      }
    }
    const result = await admin.from('templates').select('id,name,description').eq('organization_id', orgId).order('created_at')
    templates = result.data || []
  }
  const { data: clients } = await admin.from('clients').select('id,name,email,phone').eq('organization_id', orgId).is('deleted_at', null).order('name')
  return NextResponse.json({ organization, clients: clients || [], templates: templates || [] })
}
