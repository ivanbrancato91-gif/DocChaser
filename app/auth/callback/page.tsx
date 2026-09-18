import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'
export default async function Callback({searchParams}:{searchParams:Promise<{code?:string;next?:string}>}){
 const p=await searchParams
 if(p.code){const supabase=await createSupabaseServerClient(); await supabase.auth.exchangeCodeForSession(p.code)}
 redirect(p.next?.startsWith('/')?p.next:'/dashboard')
}
