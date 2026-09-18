import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { rateLimit, requireSameOrigin } from '@/lib/security'
const schema=z.object({email:z.string().email()})
export async function POST(req:Request){
  const originError=requireSameOrigin(req); if(originError)return originError
  const limited=rateLimit(req,'auth-recover',5,60*60*1000); if(limited)return limited
  const parsed=schema.safeParse(await req.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:'Email non valida'},{status:400})
  const supabase=await createSupabaseServerClient()
  const origin=process.env.NEXT_PUBLIC_APP_URL||new URL(req.url).origin
  const {error}=await supabase.auth.resetPasswordForEmail(parsed.data.email,{redirectTo:`${origin}/auth/callback?next=/reset-password`})
  if(error)return NextResponse.json({error:'Impossibile inviare le istruzioni in questo momento'},{status:502})
  return NextResponse.json({ok:true})
}
