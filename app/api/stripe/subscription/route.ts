import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { requireSameOrigin } from '@/lib/security'
const bodySchema=z.object({action:z.enum(['change_plan','cancel']),plan:z.enum(['starter','studio','team']).optional()})
const prices={starter:process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,studio:process.env.STRIPE_STUDIO_MONTHLY_PRICE_ID,team:process.env.STRIPE_TEAM_MONTHLY_PRICE_ID}
export async function POST(request:Request){
 const oe=requireSameOrigin(request);if(oe)return oe
 const key=process.env.STRIPE_SECRET_KEY;if(!key?.startsWith('sk_live_'))return NextResponse.json({ok:false,error:'Stripe live non configurato'},{status:503})
 const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({ok:false,error:'Richiesta non valida'},{status:400})
 if(parsed.data.action==='change_plan'&&!parsed.data.plan)return NextResponse.json({ok:false,error:'Piano non specificato'},{status:400})
 const server=await createSupabaseServerClient();const {data:{user}}=await server.auth.getUser();if(!user)return NextResponse.json({ok:false,error:'Autenticazione richiesta'},{status:401})
 const admin=getSupabaseAdmin();if(!admin)return NextResponse.json({ok:false,error:'Supabase server non configurato'},{status:503})
 const {data:member}=await admin.from('organization_members').select('organization_id,role').eq('user_id',user.id).limit(1).maybeSingle();if(!member)return NextResponse.json({ok:false,error:'Organizzazione non configurata'},{status:403})
 if(!['owner','admin'].includes(member.role))return NextResponse.json({ok:false,error:'Permesso richiesto: owner o admin'},{status:403})
 const {data:sub}=await admin.from('subscriptions').select('stripe_subscription_id').eq('organization_id',member.organization_id).maybeSingle();if(!sub?.stripe_subscription_id)return NextResponse.json({ok:false,error:'Nessun abbonamento Stripe attivo'},{status:400})
 if(parsed.data.action==='change_plan'){
  const price=prices[parsed.data.plan!];if(!price)return NextResponse.json({ok:false,error:'Price ID non configurato'},{status:503})
  const current=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,{headers:{Authorization:`Bearer ${key}`}});const cp=await current.json().catch(()=>({}));if(!current.ok)return NextResponse.json({ok:false,error:'Impossibile leggere l’abbonamento Stripe'},{status:502})
  const item=cp?.items?.data?.[0]?.id;if(!item)return NextResponse.json({ok:false,error:'Voce abbonamento Stripe non trovata'},{status:502})
  const params=new URLSearchParams({'items[0][id]':item,'items[0][price]':price,'proration_behavior':'create_prorations','metadata[plan]':parsed.data.plan!,'metadata[organization_id]':member.organization_id})
  const response=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`docchaser-plan-${sub.stripe_subscription_id}-${parsed.data.plan}`},body:params});const payload=await response.json().catch(()=>({}));if(!response.ok)return NextResponse.json({ok:false,error:'Cambio piano non riuscito'},{status:502})
  await admin.from('audit_events').insert({organization_id:member.organization_id,actor_user_id:user.id,event_type:'stripe_plan_changed',metadata:{plan:parsed.data.plan,subscription_id:sub.stripe_subscription_id}});return NextResponse.json({ok:true,status:payload.status,plan:parsed.data.plan})
 }
 const params=new URLSearchParams({cancel_at_period_end:'true'});const response=await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(sub.stripe_subscription_id)}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':`docchaser-cancel-${sub.stripe_subscription_id}`},body:params});const payload=await response.json().catch(()=>({}));if(!response.ok)return NextResponse.json({ok:false,error:'Annullamento non riuscito'},{status:502})
 await admin.from('audit_events').insert({organization_id:member.organization_id,actor_user_id:user.id,event_type:'stripe_subscription_cancel_scheduled',metadata:{subscription_id:sub.stripe_subscription_id}});return NextResponse.json({ok:true,cancel_at:payload.cancel_at,current_period_end:payload.current_period_end})
}
