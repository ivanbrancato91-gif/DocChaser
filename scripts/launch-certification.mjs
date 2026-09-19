import fs from 'node:fs'
import path from 'node:path'

const checks = []
const ok = (name, detail) => checks.push({ name, ok: true, detail })
const fail = (name, detail) => checks.push({ name, ok: false, detail })

const requiredFiles = [
  'app/api/auth/register/route.ts','app/api/auth/login/route.ts','app/api/stripe/checkout/route.ts',
  'app/api/stripe/webhook/route.ts','app/api/cases/route.ts','app/api/upload/route.ts',
  'app/api/ai/analyze/route.ts','app/api/documents/review/route.ts','app/api/email/send/route.ts',
  'app/api/portal/[token]/messages/route.ts','app/api/health/route.ts',
]
for (const file of requiredFiles) {
  fs.existsSync(path.resolve(file)) ? ok(`file:${file}`, 'present') : fail(`file:${file}`, 'missing')
}

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'))
pkg.version === '4.0.0' ? ok('version','4.0.0') : fail('version', `expected 4.0.0, got ${pkg.version}`)

const contracts = [
  ['Stripe LIVE enforcement','app/api/stripe/checkout/route.ts','sk_live_'],
  ['Stripe checkout success URL','app/api/stripe/checkout/route.ts','CHECKOUT_SESSION_ID'],
  ['Webhook idempotency','app/api/stripe/webhook/route.ts','stripe_webhook_events'],
  ['Webhook signature timing-safe','app/api/stripe/webhook/route.ts','timingSafeEqual'],
  ['Private document upload','app/api/upload/route.ts','documents'],
  ['AI analysis endpoint','app/api/ai/analyze/route.ts','OPENAI_API_KEY'],
  ['Document review','app/api/documents/review/route.ts','audit_events'],
  ['Portal messaging','app/api/portal/[token]/messages/route.ts','token'],
]
for (const [name,file,needle] of contracts) {
  const text = fs.readFileSync(file,'utf8')
  text.includes(needle) ? ok(name,'contract present') : fail(name,`missing ${needle}`)
}

const envGroups = [
  { label: 'NEXT_PUBLIC_SUPABASE_URL', keys: ['NEXT_PUBLIC_SUPABASE_URL'] },
  { label: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', keys: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] },
  { label: 'SUPABASE_SECRET_KEY', keys: ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] },
]
const envProviders = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_STARTER_MONTHLY_PRICE_ID','STRIPE_STUDIO_MONTHLY_PRICE_ID','STRIPE_TEAM_MONTHLY_PRICE_ID','RESEND_API_KEY','RESEND_FROM_EMAIL','OPENAI_API_KEY','CRON_SECRET']
const missingGroups = envGroups.filter(group => !group.keys.some(key => process.env[key])).map(group => group.label)
const missingProviders = envProviders.filter(key => !process.env[key])
if (missingGroups.length || missingProviders.length) fail('production environment', `missing core: ${missingGroups.join(', ') || 'none'}; missing providers: ${missingProviders.join(', ') || 'none'}`)
else ok('production environment','all required variables are set')

const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl && !/^https:\/\//i.test(appUrl)) fail('production URL','NEXT_PUBLIC_APP_URL must use HTTPS')
else if (appUrl) ok('production URL','HTTPS')

if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.startsWith('sk_live_')) fail('Stripe mode','STRIPE_SECRET_KEY is not LIVE')
else if (process.env.STRIPE_SECRET_KEY) ok('Stripe mode','LIVE')

console.log('\nDocChaser v4.0.0 — Launch Certification')
console.log('---------------------------------------')
for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name} — ${c.detail}`)
const failures = checks.filter(c => !c.ok).length
console.log(`\n${failures ? 'CERTIFICATION BLOCKED' : 'STATIC CERTIFICATION PASSED'} — ${checks.length} checks, ${failures} failure(s).`)
if (failures) process.exit(1)
