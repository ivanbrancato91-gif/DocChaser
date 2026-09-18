import fs from 'node:fs'
import path from 'node:path'

const required = [
  'package.json', '.nvmrc', '.npmrc', '.env.example',
  'app/api/health/route.ts', 'app/api/health/ready/route.ts', 'app/api/health/details/route.ts',
  'app/error.tsx', 'app/not-found.tsx', 'app/loading.tsx', 'lib/release.ts', 'scripts/env-audit.mjs', 'scripts/supabase-schema-check.mjs', 'supabase/production_verification.sql',
]
const missing = required.filter((file) => !fs.existsSync(path.resolve(file)))
if (missing.length) {
  console.error(`Release check failed: missing ${missing.join(', ')}`)
  process.exit(1)
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
if (pkg.version !== '4.0.0') throw new Error(`Unexpected package version: ${pkg.version}`)
if (!String(pkg.engines?.node || '').includes('>=20.0.0')) throw new Error('Node 20 engine policy missing')

const forbidden = /(?:^|[=:\s])(?:sk_live_|sk_test_|re_[A-Za-z0-9]{20,})/
const candidates = ['README.md', '.env.example', 'next.config.ts', 'lib/env.ts', 'lib/release.ts', 'app/api/health/route.ts', 'app/api/health/ready/route.ts', 'app/api/health/details/route.ts']
for (const file of candidates) {
  const text = fs.readFileSync(file, 'utf8')
  if (forbidden.test(text)) throw new Error(`Possible credential found in ${file}`)
}

const health = fs.readFileSync('app/api/health/route.ts', 'utf8')
if (!health.includes('no-store') || !health.includes('DOCCHASER_VERSION')) throw new Error('Health endpoint contract missing')
const ready = fs.readFileSync('app/api/health/ready/route.ts', 'utf8')
if (!ready.includes('503') || ready.includes('checks: readiness')) throw new Error('Public readiness endpoint leaks detailed checks')
const details = fs.readFileSync('app/api/health/details/route.ts', 'utf8')
if (!details.includes('Bearer') || !details.includes('401')) throw new Error('Protected diagnostics endpoint missing authorization')

const checkout = fs.readFileSync('app/api/stripe/checkout/route.ts', 'utf8')
if (!checkout.includes("sk_live_") || !checkout.includes('STRIPE_STARTER_MONTHLY_PRICE_ID') || !checkout.includes('STRIPE_STUDIO_MONTHLY_PRICE_ID') || !checkout.includes('STRIPE_TEAM_MONTHLY_PRICE_ID')) throw new Error('Stripe LIVE checkout contract missing')
const webhook = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8')
for (const eventType of ['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','invoice.paid','invoice.payment_failed']) {
  if (!webhook.includes(eventType)) throw new Error(`Stripe webhook event contract missing: ${eventType}`)
}
if (!webhook.includes('stripe_webhook_events') || !webhook.includes('timingSafeEqual')) throw new Error('Stripe webhook security contract missing')

console.log('DocChaser v4.0.0 release checks passed.')

const middleware = fs.readFileSync('middleware.ts', 'utf8')
if (!middleware.includes('X-Request-ID') || !middleware.includes('/security/:path*') || !middleware.includes('/notifications/:path*')) throw new Error('Request tracing or protected route policy missing')
const security = fs.readFileSync('lib/security.ts', 'utf8')
if (!security.includes('MAX_BUCKETS') || !security.includes('randomUUID')) throw new Error('Rate-limit memory protection missing')
