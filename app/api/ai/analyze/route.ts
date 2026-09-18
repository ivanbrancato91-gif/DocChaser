import { NextResponse } from 'next/server'
import { rateLimit, requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { analyzeStoredDocument } from '@/lib/ai-document'

const bodySchema = z.object({ documentId: z.string().uuid() })

export async function POST(request: Request) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const limited = rateLimit(request, 'ai-analyze', 12, 60 * 60 * 1000); if (limited) return limited
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: 'AI non configurata' }, { status: 503 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'documentId non valido' }, { status: 400 })
  const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ ok: false, error: 'Storage server non configurato' }, { status: 503 })
  const { data: document } = await admin.from('documents').select('id,organization_id,storage_path,original_name,mime_type,status,size_bytes').eq('id', parsed.data.documentId).maybeSingle()
  if (!document) return NextResponse.json({ ok: false, error: 'Documento non trovato' }, { status: 404 })
  const { data: membership } = await server.from('organization_members').select('organization_id').eq('organization_id', document.organization_id).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ ok: false, error: 'Non autorizzato' }, { status: 403 })
  try { const analysis = await analyzeStoredDocument(admin, document); return NextResponse.json({ ok: true, documentId: document.id, analysis }) }
  catch { return NextResponse.json({ ok: false, error: 'Analisi AI non riuscita' }, { status: 502 }) }
}
