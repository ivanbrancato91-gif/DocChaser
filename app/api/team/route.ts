import { NextResponse } from 'next/server'
import { requireSameOrigin } from '@/lib/security'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const invite=z.object({email:z.string().email(),role:z.enum(['admin','collaborator']).default('collaborator')})
const roleSchema=z.object({role:z.enum(['admin','collaborator'])})

async function ctx(){
  const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser()
  if(!user)return {error:NextResponse.json({error:'Non autenticato'},{status:401})}
  const admin=getSupabaseAdmin(); if(!admin)return {error:NextResponse.json({error:'Supabase server non configurato'},{status:500})}
  const {data:member}=await admin.from('organization_members').select('id,organization_id,role').eq('user_id',user.id).limit(1).maybeSingle()
  if(!member)return {error:NextResponse.json({error:'Organizzazione non configurata'},{status:400})}
  return {user,admin,orgId:member.organization_id,member}
}

export async function GET(){
  const c=await ctx(); if('error'in c)return c.error
  const {admin,orgId}=c
  const {data,error}=await admin.from('organization_members').select('id,user_id,role,created_at,profiles(full_name,email)').eq('organization_id',orgId).order('created_at')
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({members:data||[], currentRole:c.member.role})
}

export async function POST(req:Request){
  const originError=requireSameOrigin(req); if(originError)return originError
  const c=await ctx(); if('error'in c)return c.error
  if(c.member.role!=='owner')return NextResponse.json({error:'Solo il proprietario può gestire il team'},{status:403})
  const parsed=invite.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:'Email o ruolo non validi'},{status:400})
  const {admin,orgId,user}=c
  const {data:userData}=await admin.auth.admin.listUsers({page:1,perPage:1000})
  const target=userData.users.find((u:any)=>u.email?.toLowerCase()===parsed.data.email.toLowerCase())
  if(!target)return NextResponse.json({error:'Utente non trovato. Deve prima registrarsi a DocChaser.'},{status:404})
  const {data:existing}=await admin.from('organization_members').select('id').eq('organization_id',orgId).eq('user_id',target.id).maybeSingle()
  if(existing)return NextResponse.json({error:'Utente già nel team'},{status:409})
  const {data:member,error}=await admin.from('organization_members').insert({organization_id:orgId,user_id:target.id,role:parsed.data.role}).select('id,user_id,role').single()
  if(error)return NextResponse.json({error:error.message},{status:500})
  await admin.from('audit_events').insert({organization_id:orgId,actor_user_id:user.id,event_type:'team.member_added',metadata:{email:parsed.data.email,role:parsed.data.role}})
  return NextResponse.json({member})
}

export async function PATCH(req:Request){
  const originError=requireSameOrigin(req); if(originError)return originError
  const c=await ctx(); if('error'in c)return c.error
  if(c.member.role!=='owner')return NextResponse.json({error:'Solo il proprietario può modificare i ruoli'},{status:403})
  const payload=await req.json().catch(()=>null) as any
  const parsed=roleSchema.safeParse(payload); if(!parsed.success)return NextResponse.json({error:'Ruolo non valido'},{status:400})
  const body=payload
  if(typeof body?.memberId!=='string')return NextResponse.json({error:'Membro non valido'},{status:400})
  const {admin,orgId,user}=c
  const {data:target}=await admin.from('organization_members').select('id,user_id,role,profiles(email)').eq('id',body.memberId).eq('organization_id',orgId).maybeSingle()
  if(!target)return NextResponse.json({error:'Membro non trovato'},{status:404})
  if(target.user_id===user.id)return NextResponse.json({error:'Il proprietario non può modificare il proprio ruolo'},{status:400})
  const {data:updated,error}=await admin.from('organization_members').update({role:parsed.data.role}).eq('id',body.memberId).eq('organization_id',orgId).select('id,user_id,role').single()
  if(error)return NextResponse.json({error:error.message},{status:500})
  await admin.from('audit_events').insert({organization_id:orgId,actor_user_id:user.id,event_type:'team.member_role_changed',metadata:{member_id:body.memberId,role:parsed.data.role}})
  return NextResponse.json({member:updated})
}

export async function DELETE(req:Request){
  const originError=requireSameOrigin(req); if(originError)return originError
  const c=await ctx(); if('error'in c)return c.error
  if(c.member.role!=='owner')return NextResponse.json({error:'Solo il proprietario può rimuovere membri'},{status:403})
  const body=await req.json().catch(()=>null) as any
  if(typeof body?.memberId!=='string')return NextResponse.json({error:'Membro non valido'},{status:400})
  const {admin,orgId,user}=c
  const {data:target}=await admin.from('organization_members').select('id,user_id,role').eq('id',body.memberId).eq('organization_id',orgId).maybeSingle()
  if(!target)return NextResponse.json({error:'Membro non trovato'},{status:404})
  if(target.user_id===user.id || target.role==='owner')return NextResponse.json({error:'Il proprietario non può essere rimosso'},{status:400})
  const {error}=await admin.from('organization_members').delete().eq('id',body.memberId).eq('organization_id',orgId)
  if(error)return NextResponse.json({error:error.message},{status:500})
  await admin.from('audit_events').insert({organization_id:orgId,actor_user_id:user.id,event_type:'team.member_removed',metadata:{member_id:body.memberId}})
  return NextResponse.json({ok:true})
}
