import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { randomUUID } from 'crypto'
const PRIVATE=['/dashboard','/cases','/clients','/templates','/reminders','/team','/billing','/settings','/audit','/usage','/completion','/correction','/upload','/onboarding','/security','/notifications','/reports']

export async function middleware(request:NextRequest){
  const pathname=request.nextUrl.pathname
  const requestId = request.headers.get('x-request-id') && /^[A-Za-z0-9._:-]{1,128}$/.test(request.headers.get('x-request-id')!) ? request.headers.get('x-request-id')! : randomUUID()
  if(!PRIVATE.some(prefix=>pathname===prefix||pathname.startsWith(`${prefix}/`))){
    const response=NextResponse.next()
    response.headers.set('X-Request-ID',requestId)
    return response
  }
  let response=NextResponse.next({request})
  const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>request.cookies.getAll(),setAll:(items)=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}})
  const {data:{user}}=await supabase.auth.getUser()
  if(!user){const url=request.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',pathname);const redirect=NextResponse.redirect(url);redirect.headers.set('X-Request-ID',requestId);return redirect}
  response.headers.set('X-Request-ID',requestId)
  return response
}
export const config={matcher:['/dashboard/:path*','/cases/:path*','/clients/:path*','/templates/:path*','/reminders/:path*','/team/:path*','/billing/:path*','/settings/:path*','/audit/:path*','/usage/:path*','/completion/:path*','/correction/:path*','/upload/:path*','/onboarding/:path*','/security/:path*','/notifications/:path*','/reports/:path*','/((?!_next/static|_next/image|favicon.ico).*)']}
