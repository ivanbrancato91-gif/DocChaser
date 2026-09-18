import fs from 'node:fs'

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
]
const productionProviders = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_STUDIO_MONTHLY_PRICE_ID',
  'STRIPE_TEAM_MONTHLY_PRICE_ID',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'OPENAI_API_KEY',
  'CRON_SECRET',
]
const publicConfig = ['NEXT_PUBLIC_APP_URL']

const values = new Map([...required, ...productionProviders, ...publicConfig].map(k => [k, process.env[k] || '']))
const missing = (keys) => keys.filter(k => !values.get(k))

const invalid = []
const supabaseUrl = values.get('NEXT_PUBLIC_SUPABASE_URL')
if (supabaseUrl && !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) invalid.push('NEXT_PUBLIC_SUPABASE_URL should be a Supabase HTTPS URL')
const appUrl = values.get('NEXT_PUBLIC_APP_URL')
if (appUrl && !/^https:\/\//i.test(appUrl)) invalid.push('NEXT_PUBLIC_APP_URL should use HTTPS in production')
const stripe = values.get('STRIPE_SECRET_KEY')
if (stripe && !stripe.startsWith('sk_live_')) invalid.push('STRIPE_SECRET_KEY must be a LIVE key for production')

const envExample = fs.readFileSync('.env.example','utf8')
for (const key of [...required, ...productionProviders, ...publicConfig]) {
  if (!new RegExp(`^${key}=`, 'm').test(envExample)) invalid.push(`.env.example missing ${key}`)
}

console.log('DocChaser production environment audit')
console.log(`Core: ${missing(required).length === 0 ? 'READY' : 'MISSING ' + missing(required).join(', ')}`)
console.log(`Providers: ${missing(productionProviders).length === 0 ? 'READY' : 'MISSING ' + missing(productionProviders).join(', ')}`)
console.log(`Public URL: ${appUrl ? 'SET' : 'MISSING NEXT_PUBLIC_APP_URL'}`)

if (invalid.length) {
  console.error('\nConfiguration issues:')
  for (const item of invalid) console.error(`- ${item}`)
  process.exit(1)
}
if (process.env.CI === 'true' && missing([...required, ...productionProviders, ...publicConfig]).length) {
  console.error('\nCI production audit failed: required production variables are not configured.')
  process.exit(1)
}
console.log('\nNo structural environment configuration errors found. Secrets are never printed.')
