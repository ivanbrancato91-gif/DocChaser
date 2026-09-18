import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function context() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  const admin = getSupabaseAdmin()
  if (!admin) return { error: NextResponse.json({ error: 'Supabase server non configurato' }, { status: 500 }) }
  const { data: member } = await admin.from('organization_members').select('organization_id,role').eq('user_id', user.id).limit(1).maybeSingle()
  if (!member) return { error: NextResponse.json({ error: 'Organizzazione non configurata' }, { status: 400 }) }
  return { admin, orgId: member.organization_id }
}

export async function GET() {
  const ctx = await context(); if ('error' in ctx) return ctx.error
  const { admin, orgId } = ctx
  const { data: cases, error } = await admin.from('cases').select('id,title,status,due_date,created_at,updated_at,clients(name),case_items(id,name,required,status,documents(id,status,created_at))').eq('organization_id', orgId).order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: 'Impossibile generare il report' }, { status: 500 })
  const rows = cases || []
  const completed = rows.filter((c:any) => c.status === 'completed')
  const completionDays = completed.map((c:any) => (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000).filter((n:number) => Number.isFinite(n) && n >= 0)
  const avgCompletionDays = completionDays.length ? Math.round(completionDays.reduce((a:number,b:number)=>a+b,0) / completionDays.length * 10) / 10 : 0
  const missing = new Map<string, number>(), corrections = new Map<string, number>()
  rows.forEach((c:any) => (c.case_items || []).forEach((i:any) => {
    const has = (i.documents || []).some((d:any) => d.status !== 'rejected')
    if (i.required && !has) missing.set(i.name, (missing.get(i.name)||0)+1)
    if (i.status === 'needs_correction') corrections.set(i.name, (corrections.get(i.name)||0)+1)
  }))
  const monthMap = new Map<string, number>()
  rows.forEach((c:any) => { const key = new Date(c.created_at).toISOString().slice(0,7); monthMap.set(key,(monthMap.get(key)||0)+1) })
  const byMonth = [...monthMap.entries()].sort().slice(-12).map(([month,count])=>({month,count}))
  const status = ['open','review','completed','closed'].map(k=>({status:k,count:rows.filter((c:any)=>c.status===k).length}))
  const topMissing = [...missing.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}))
  const topCorrections = [...corrections.entries()].sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}))
  const docs = rows.flatMap((c:any)=>(c.case_items||[]).flatMap((i:any)=>i.documents||[]))
  const aiAnalyzed = docs.filter((d:any)=>d.ai_category || d.ai_confidence !== null).length
  return NextResponse.json({ overview:{cases:rows.length,completed:completed.length,open:rows.filter((c:any)=>['open','review'].includes(c.status)).length,avgCompletionDays,documents:docs.length,aiAnalyzed},status,byMonth,topMissing,topCorrections,exportRows:rows.map((c:any)=>({title:c.title,client:c.clients?.name||'',status:c.status,due_date:c.due_date||'',created_at:c.created_at,updated_at:c.updated_at,required:(c.case_items||[]).filter((i:any)=>i.required).length,verified:(c.case_items||[]).filter((i:any)=>i.required&&i.status==='verified').length}))})
}
