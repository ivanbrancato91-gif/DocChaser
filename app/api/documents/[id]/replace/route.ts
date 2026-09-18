import { NextResponse } from 'next/server'
import { requireContentLength, requireSameOrigin, rateLimit } from '@/lib/security'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'

const MAX = 20 * 1024 * 1024
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const schema = z.object({ documentId: z.string().uuid() })
function safeName(name: string) { const base = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120); return base || 'document' }

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const limited = rateLimit(request, 'document-replace', 30, 60 * 60 * 1000); if (limited) return limited
  const sizeError = requireContentLength(request, MAX + 1024 * 1024); if (sizeError) return sizeError
  const { id } = await params
  const parsed = schema.safeParse({ documentId: id }); if (!parsed.success) return NextResponse.json({ error: 'Documento non valido' }, { status: 400 })
  const form = await request.formData(); const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'File mancante' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'Il file supera il limite di 20 MB' }, { status: 413 })
  if (!allowed.has(file.type)) return NextResponse.json({ error: 'Formato non supportato' }, { status: 415 })
  const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ error: 'Supabase server non configurato' }, { status: 503 })
  const { data: doc } = await admin.from('documents').select('id,organization_id,case_item_id,storage_path,original_name,mime_type,size_bytes').eq('id', id).maybeSingle()
  if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('organization_id', doc.organization_id).eq('user_id', user.id).maybeSingle()
  if (!member) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (!isPdf && !isPng && !isJpeg) return NextResponse.json({ error: 'Contenuto file non valido' }, { status: 415 })
  const extension = isPdf ? 'pdf' : isPng ? 'png' : 'jpg'
  const safe = safeName(file.name).replace(/\.(pdf|png|jpe?g)$/i, '')
  const objectPath = `${doc.storage_path.split('/')[0]}/${crypto.randomUUID()}-${safe}.${extension}`
  const { error: uploadError } = await admin.storage.from('documents').upload(objectPath, file, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Upload non riuscito' }, { status: 502 })
  const { data: priorVersions } = await admin.from('document_versions').select('version').eq('document_id', id).order('version', { ascending: false }).limit(1)
  const nextVersion = (priorVersions?.[0]?.version || 1) + 1
  const { error: versionError } = await admin.from('document_versions').insert({ document_id: id, organization_id: doc.organization_id, version: nextVersion, storage_path: doc.storage_path, original_name: doc.original_name, mime_type: doc.mime_type, size_bytes: doc.size_bytes, created_by: user.id })
  if (versionError) { await admin.storage.from('documents').remove([objectPath]); return NextResponse.json({ error: 'Storico documento non aggiornato' }, { status: 500 }) }
  const { error: updateError } = await admin.from('documents').update({ storage_path: objectPath, original_name: file.name, safe_name: safe, mime_type: file.type, size_bytes: file.size, status: 'uploaded', ai_category: null, ai_confidence: null, ai_metadata: null, updated_at: new Date().toISOString() }).eq('id', id)
  if (updateError) { await admin.storage.from('documents').remove([objectPath]); return NextResponse.json({ error: 'Documento non aggiornato' }, { status: 500 }) }
  await admin.from('case_items').update({ status: 'uploaded' }).eq('id', doc.case_item_id)
  const { data: item } = await admin.from('case_items').select('case_id').eq('id', doc.case_item_id).maybeSingle()
  if (item) await admin.from('cases').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', item.case_id).eq('organization_id', doc.organization_id)
  await admin.from('audit_events').insert({ organization_id: doc.organization_id, actor_user_id: user.id, document_id: id, case_id: item?.case_id || null, event_type: 'document.replaced', metadata: { previous_version: nextVersion - 1, new_version: nextVersion, previous_name: doc.original_name } })
  return NextResponse.json({ ok: true, version: nextVersion })
}
