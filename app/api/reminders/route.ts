import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

async function ctx(){
  const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser()
  if(!user) return {error:NextResponse.json({error:'Non autenticato'},{status:401})}
  const admin=getSupabaseAdmin(); if(!admin) return {error:NextResponse.json({error:'Supabase server non configurato'},{status:500})}
  const {data:member}=await admin.from('organization_members').select('organization_id,role').eq('user_id',user.id).limit(1).maybeSingle()
  if(!member) return {error:NextResponse.json({error:'Organizzazione non configurata'},{status:400})}
  return {user,admin,orgId:member.organization_id,role:member.role}
}
export async function GET(){
  const c=await ctx(); if('error' in c)return c.error
  const {admin,orgId}=c
  const {data,error}=await admin.from('reminders').select('id,case_id,first_at,frequency_hours,send_hour,stop_at,max_sends,sends_count,paused,last_sent_at,cases(title,clients(name,email))').eq('cases.organization_id',orgId).order('first_at')
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({reminders:data||[]})
}
export async function PATCH(req:Request){
  const originError=requireSameOrigin(req); if(originError)return originError
  const c=await ctx(); if('error' in c)return c.error
  const {admin,orgId}=c; const body=await req.json().catch(()=>null)
  if(!body?.id || typeof body.paused!=='boolean') return NextResponse.json({error:'Dati non validi'},{status:400})
  const {data:rem}=await admin.from('reminders').select('id,case_id').eq('id',body.id).single()
  if(!rem)return NextResponse.json({error:'Reminder non trovato'},{status:404})
  const {data:owned}=await admin.from('cases').select('id').eq('id',rem.case_id).eq('organization_id',orgId).maybeSingle()
  if(!owned)return NextResponse.json({error:'Reminder non autorizzato'},{status:403})
  const {data,error}=await admin.from('reminders').update({paused:body.paused}).eq('id',body.id).select('*').single()
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({reminder:data})
}
