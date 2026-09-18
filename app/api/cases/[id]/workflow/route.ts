import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireSameOrigin, rateLimit } from '@/lib/security'
import { analyzeStoredDocument } from '@/lib/ai-document'

const schema = z.object({ dryRun: z.boolean().optional().default(false) })
const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')

async function ctx(){
  const server=await createSupabaseServerClient(); const {data:{user}}=await server.auth.getUser()
  if(!user)return{error:NextResponse.json({error:'Autenticazione richiesta'},{status:401})}
  const admin=getSupabaseAdmin(); if(!admin)return{error:NextResponse.json({error:'Supabase server non configurato'},{status:503})}
  const {data:member}=await admin.from('organization_members').select('organization_id,role').eq('user_id',user.id).limit(1).maybeSingle()
  if(!member)return{error:NextResponse.json({error:'Organizzazione non configurata'},{status:403})}
  if(!['owner','admin'].includes(member.role))return{error:NextResponse.json({error:'Permesso insufficiente'},{status:403})}
  return{admin,orgId:member.organization_id,user}
}

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const originError=requireSameOrigin(req);if(originError)return originError
  const limited=rateLimit(req,'case-workflow',10,60*60*1000);if(limited)return limited
  const parsed=schema.safeParse(await req.json().catch(()=>({})));if(!parsed.success)return NextResponse.json({error:'Richiesta non valida'},{status:400})
  const c=await ctx();if('error'in c)return c.error;const{id}=await params;const{admin,orgId,user}=c
  const {data:row,error}=await admin.from('cases').select('id,title,status,due_date,client_id,template_id,templates(workflow_config),clients(id,name,email),case_items(id,name,required,status,documents(id,organization_id,storage_path,original_name,mime_type,size_bytes,status,ai_metadata))').eq('id',id).eq('organization_id',orgId).maybeSingle()
  if(error)return NextResponse.json({error:error.message},{status:500});if(!row)return NextResponse.json({error:'Pratica non trovata'},{status:404})
  const {data:last}=await admin.from('workflow_runs').select('created_at').eq('case_id',id).eq('organization_id',orgId).order('created_at',{ascending:false}).limit(1).maybeSingle()
  if(last && Date.now()-new Date(last.created_at).getTime()<60*60*1000 && !parsed.data.dryRun)return NextResponse.json({error:'Workflow già eseguito nell’ultima ora. Usa “Anteprima workflow” per ricalcolare il piano.'},{status:429})
  const config=((Array.isArray((row as any).templates)?(row as any).templates[0]:(row as any).templates)?.workflow_config)||{auto_ai:true,missing_email:true,correction_email:true,completion_email:true,reminder_days:3}; const items=(row as any).case_items||[]; const docs=items.flatMap((i:any)=>i.documents||[])
  const pendingAI=config.auto_ai ? docs.filter((d:any)=>d.status!=='verified'&&!d.ai_metadata).slice(0,5) : []
  const missing=items.filter((i:any)=>i.required&&!(i.documents||[]).some((d:any)=>!['rejected'].includes(d.status)))
  const corrections=items.filter((i:any)=>i.status==='needs_correction'||(i.documents||[]).some((d:any)=>d.status==='revision_requested'))
  const required=items.filter((i:any)=>i.required); const complete=required.length>0&&required.every((i:any)=>i.status==='verified')
  const actions:any[]=[]
  if(pendingAI.length)actions.push({type:'ai_review',count:pendingAI.length,label:`Analizza ${pendingAI.length} documenti con AI`})
  if(config.correction_email&&corrections.length)actions.push({type:'correction_email',count:corrections.length,label:`Richiedi correzione per ${corrections.length} documenti`})
  if(!corrections.length&&config.missing_email&&missing.length)actions.push({type:'missing_email',count:missing.length,label:`Sollecita ${missing.length} documenti mancanti`})
  if(!pendingAI.length&&!corrections.length&&!missing.length&&complete&&config.completion_email)actions.push({type:'complete_email',label:'Comunica il completamento al cliente'})
  if(!actions.length)actions.push({type:'manual_review',label:'Nessuna automazione necessaria: pratica in attesa di revisione'})
  if(parsed.data.dryRun)return NextResponse.json({ok:true,dryRun:true,actions,summary:{missing:missing.length,corrections:corrections.length,pendingAI:pendingAI.length,complete}})

  const {data:run,error:runError}=await admin.from('workflow_runs').insert({organization_id:orgId,case_id:id,actor_user_id:user.id,status:'running',actions:actions.map(a=>a.type)}).select('id').single()
  if(runError)return NextResponse.json({error:runError.message},{status:500})
  const results:any[]=[]
  try{
    for(const d of pendingAI){try{await analyzeStoredDocument(admin,d);results.push({type:'ai_review',documentId:d.id,ok:true})}catch{results.push({type:'ai_review',documentId:d.id,ok:false})}}
    const client=Array.isArray((row as any).clients)?(row as any).clients[0]:(row as any).clients
    if((corrections.length||(!pendingAI.length&&missing.length))&&client?.email&&process.env.RESEND_API_KEY&&process.env.RESEND_FROM_EMAIL){
      const action=corrections.length?'correction':'missing'; const list=(corrections.length?corrections:missing).map((x:any)=>`<li>${esc(x.name)}</li>`).join('')
      const base=(process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin).replace(/\/$/,''); const {randomBytes,createHash}=await import('crypto'); const token=randomBytes(32).toString('base64url'); const hash=createHash('sha256').update(token).digest('hex'); const expires=new Date(Date.now()+30*86400000).toISOString()
      await admin.from('cases').update({public_token_hash:hash,public_token_expires_at:expires,public_token_revoked_at:null,updated_at:new Date().toISOString()}).eq('id',id).eq('organization_id',orgId)
      const subject=action==='correction'?`Correzione documenti richiesta — ${row.title}`:`Documenti mancanti — ${row.title}`
      const html=`<p>Ciao ${esc(client.name||'')},</p><p>${action==='correction'?'Lo studio ha richiesto una correzione o un nuovo caricamento.':'Ti ricordiamo che alcuni documenti risultano ancora mancanti.'}</p><ul>${list}</ul><p><a href="${base}/portal/${token}">Apri il portale sicuro</a></p><p>Il link è valido 30 giorni.</p>`
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[client.email],subject,html})})
      if(response.ok){results.push({type:action==='correction'?'correction_email':'missing_email',ok:true,to:client.email});await admin.from('notifications').insert({organization_id:orgId,case_id:id,client_id:row.client_id,type:`workflow.${action}`,message:`Workflow: ${subject} inviato a ${client.email}`});await admin.from('audit_events').insert({organization_id:orgId,actor_user_id:user.id,case_id:id,event_type:`workflow.${action}`,metadata:{to:client.email}})}else results.push({type:action==='correction'?'correction_email':'missing_email',ok:false})
    }
    const {error:updateError}=await admin.from('workflow_runs').update({status:'completed',completed_at:new Date().toISOString()}).eq('id',run.id);if(updateError)throw updateError
    return NextResponse.json({ok:true,actions,results})
  }catch(e){await admin.from('workflow_runs').update({status:'failed',completed_at:new Date().toISOString()}).eq('id',run.id);return NextResponse.json({error:'Workflow interrotto',details:e instanceof Error?e.message:'Errore'}, {status:500})}
}
