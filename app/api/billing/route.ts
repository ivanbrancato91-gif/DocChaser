import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { isBillingPlan } from '@/lib/billing'

export async function GET(){
 const supabase=await createSupabaseServerClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Non autenticato'},{status:401})
 const admin=getSupabaseAdmin(); if(!admin)return NextResponse.json({error:'Supabase server non configurato'},{status:500})
 const {data:member}=await admin.from('organization_members').select('organization_id,role').eq('user_id',user.id).limit(1).maybeSingle(); if(!member)return NextResponse.json({error:'Organizzazione non configurata'},{status:400})
 const [{data:organization},{data:subscription}]=await Promise.all([admin.from('organizations').select('id,name').eq('id',member.organization_id).single(),admin.from('subscriptions').select('plan,status,current_period_end,stripe_customer_id,stripe_subscription_id').eq('organization_id',member.organization_id).maybeSingle()])
 const plan = subscription?.plan && isBillingPlan(subscription.plan) ? subscription.plan : null
 return NextResponse.json({organization,subscription: subscription ? {...subscription,plan} : null,role:member.role})
}
