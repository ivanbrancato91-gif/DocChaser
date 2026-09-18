import { NextResponse } from 'next/server'
import { timingSafeEqual, randomUUID } from 'crypto'

const buckets = new Map<string, { count:number; reset:number }>()
const MAX_BUCKETS = 10_000

function pruneBuckets(now:number) {
  if (buckets.size < MAX_BUCKETS) return
  for (const [key, bucket] of buckets) {
    if (bucket.reset <= now) buckets.delete(key)
    if (buckets.size < MAX_BUCKETS * 0.8) break
  }
}

export function requestId(request: Request) {
  const incoming = request.headers.get('x-request-id')
  if (incoming && /^[A-Za-z0-9._:-]{1,128}$/.test(incoming)) return incoming
  return randomUUID()
}

export function sameOrigin(request: Request) { const origin=request.headers.get('origin'); if(!origin)return true; return origin===new URL(request.url).origin }
export function requireSameOrigin(request: Request) { if(!sameOrigin(request)) return NextResponse.json({error:'Origine della richiesta non autorizzata'},{status:403}); return null }
export function rateLimit(request: Request,name:string,limit:number,windowMs:number) { const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown'; const key=`${name}:${ip}`; const now=Date.now(); pruneBuckets(now); const current=buckets.get(key); if(!current||current.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return null} if(current.count>=limit)return NextResponse.json({error:'Troppe richieste. Riprova tra poco.'},{status:429,headers:{'Retry-After':String(Math.ceil((current.reset-now)/1000))}}); current.count+=1; return null }
export function requireContentLength(request: Request,maxBytes:number){const raw=request.headers.get('content-length');if(!raw)return null;const length=Number(raw);if(!Number.isFinite(length)||length<0)return NextResponse.json({error:'Content-Length non valido'},{status:400});if(length>maxBytes)return NextResponse.json({error:'Richiesta troppo grande'},{status:413});return null}
export function secretsEqual(a:string,b:string){const left=Buffer.from(a,'utf8'),right=Buffer.from(b,'utf8');return left.length===right.length&&timingSafeEqual(left,right)}
