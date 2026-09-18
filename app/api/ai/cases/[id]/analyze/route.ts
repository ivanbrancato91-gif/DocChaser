import { NextResponse } from 'next/server'
import { rateLimit, requireSameOrigin } from '@/lib/security'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { analyzeStoredDocument } from '@/lib/ai-document'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = requireSameOrigin(request); if (originError) return originError
  const limited = rateLimit(request, 'ai-case-analyze', 6, 60 * 60 * 1000); if (limited) return limited
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ ok: false, error: 'AI non configurata' }, { status: 503 })
  const server = await createSupabaseServerClient(); const { data: { user } } = await server.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Autenticazione richiesta' }, { status: 401 })
  const admin = getSupabaseAdmin(); if (!admin) return NextResponse.json({ ok: false, error: 'Supabase server non configurato' }, { status: 503 })
  const { id } = await params
  const { data: member } = await admin.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return NextResponse.json({ ok: false, error: 'Organizzazione non configurata' }, { status: 400 })
  const { data: itemRows, error } = await admin.from('case_items').select('id,documents(id,organization_id,storage_path,original_name,mime_type,status,size_bytes,ai_metadata)').eq('case_id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const documents = (itemRows || []).flatMap((i: any) => i.documents || []).filter((d: any) => d.organization_id === member.organization_id)
  const targets = documents.filter((d: any) => d.status !== 'verified' && !d.ai_metadata).slice(0, 5)
  const results: any[] = []; const failures: any[] = []
  for (const document of targets) {
    try { results.push({ documentId: document.id, analysis: await analyzeStoredDocument(admin, document) }) }
    catch { failures.push({ documentId: document.id }) }
  }
  return NextResponse.json({ ok: true, analyzed: results.length, failed: failures.length, skipped: documents.length - targets.length, results, failures, limit: 5 })
}
