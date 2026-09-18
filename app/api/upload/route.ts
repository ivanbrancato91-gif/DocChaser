import { NextResponse } from 'next/server'
import { rateLimit, requireContentLength, requireSameOrigin } from '@/lib/security'
import { timingSafeEqual } from 'crypto'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const MAX = 20 * 1024 * 1024
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png'])
const bodySchema = z.object({ caseId: z.string().uuid(), itemId: z.string().uuid(), portalToken: z.string().min(20).max(200).optional() })
function safeName(name: string) { const base = name.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 120); return base || 'document' }
async function sha256(value: string) { const data = new TextEncoder().encode(value); const hash = await crypto.subtle.digest('SHA-256', data); return Buffer.from(hash) }
function hashesEqual(aHex: string, b: Buffer) { const a = Buffer.from(aHex, 'hex'); return a.length === b.length && timingSafeEqual(a, b) }

export async function POST(request: Request) {
  const originError=requireSameOrigin(request); if(originError)return originError
  const limited=rateLimit(request,'document-upload',30,60*60*1000); if(limited)return limited
  const sizeError=requireContentLength(request, MAX + 1024 * 1024); if(sizeError)return sizeError
  const admin = getSupabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Storage server non configurato' }, { status: 503 })
  const form = await request.formData()
  const parsed = bodySchema.safeParse({ caseId: form.get('caseId'), itemId: form.get('itemId'), portalToken: form.get('portalToken') || undefined })
  const file = form.get('file')
  const consent = form.get('consent') === 'true'
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'Il file supera il limite di 20 MB' }, { status: 413 })
  if (!allowed.has(file.type)) return NextResponse.json({ error: 'Formato non supportato' }, { status: 415 })

  const { data: caseRow } = await admin.from('cases').select('id, organization_id, public_token_hash, public_token_expires_at, public_token_revoked_at').eq('id', parsed.data.caseId).maybeSingle()
  if (!caseRow) return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 })

  const server = await createSupabaseServerClient()
  const { data: { user } } = await server.auth.getUser()
  if (!user) {
    if (!consent) return NextResponse.json({ error: 'Consenso privacy richiesto' }, { status: 400 })
    if (!parsed.data.portalToken || !caseRow.public_token_hash || caseRow.public_token_revoked_at || (caseRow.public_token_expires_at && new Date(caseRow.public_token_expires_at) <= new Date())) return NextResponse.json({ error: 'Link pratica non valido o scaduto' }, { status: 401 })
    if (!hashesEqual(caseRow.public_token_hash, await sha256(parsed.data.portalToken))) return NextResponse.json({ error: 'Link pratica non valido' }, { status: 401 })
  } else {
    const { data: membership } = await server.from('organization_members').select('organization_id').eq('organization_id', caseRow.organization_id).eq('user_id', user.id).maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  const { data: item } = await admin.from('case_items').select('id,status').eq('id', parsed.data.itemId).eq('case_id', caseRow.id).maybeSingle()
  if (!item) return NextResponse.json({ error: 'Documento richiesto non valido' }, { status: 400 })

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (!isPdf && !isPng && !isJpeg) return NextResponse.json({ error: 'Contenuto file non valido' }, { status: 415 })

  const extension = isPdf ? 'pdf' : isPng ? 'png' : 'jpg'
  const safe = safeName(file.name).replace(/\.(pdf|png|jpe?g)$/i, '')
  const objectPath = `${caseRow.id}/${crypto.randomUUID()}-${safe}.${extension}`
  const { error: uploadError } = await admin.storage.from('documents').upload(objectPath, file, { contentType: file.type, upsert: false })
  if (uploadError) return NextResponse.json({ error: 'Upload non riuscito' }, { status: 502 })

  const { data: document, error: documentError } = await admin.from('documents').insert({
    case_item_id: parsed.data.itemId,
    organization_id: caseRow.organization_id,
    original_name: file.name,
    safe_name: safe,
    storage_path: objectPath,
    mime_type: file.type,
    size_bytes: file.size,
    status: 'uploaded',
  }).select('id').single()
  if (documentError || !document) {
    await admin.storage.from('documents').remove([objectPath])
    return NextResponse.json({ error: 'Registrazione documento non riuscita' }, { status: 500 })
  }

  await admin.from('case_items').update({ status: 'uploaded' }).eq('id', item.id)
  await admin.from('cases').update({ status: 'open', updated_at: new Date().toISOString() }).eq('id', caseRow.id)
  await admin.from('audit_events').insert({ organization_id: caseRow.organization_id, case_id: caseRow.id, document_id: document.id, actor_user_id: user?.id || null, event_type: 'document_uploaded', metadata: { via: user ? 'dashboard' : 'portal' } })
  return NextResponse.json({ ok: true, documentId: document.id, path: objectPath })
}
