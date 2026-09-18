import fs from 'node:fs'

const checks = [
  ['STRIPE_SECRET_KEY', /^sk_live_[A-Za-z0-9]+$/, 'chiave Stripe LIVE'],
  ['STRIPE_WEBHOOK_SECRET', /^whsec_[A-Za-z0-9]+$/, 'webhook signing secret'],
  ['STRIPE_STARTER_MONTHLY_PRICE_ID', /^price_[A-Za-z0-9]+$/, 'Price ID Starter'],
  ['STRIPE_STUDIO_MONTHLY_PRICE_ID', /^price_[A-Za-z0-9]+$/, 'Price ID Studio'],
  ['STRIPE_TEAM_MONTHLY_PRICE_ID', /^price_[A-Za-z0-9]+$/, 'Price ID Team'],
]

let failed = false
for (const [name, pattern, label] of checks) {
  const value = process.env[name]
  if (!value) {
    console.error(`MISSING ${name} — ${label}`)
    failed = true
    continue
  }
  if (!pattern.test(value)) {
    console.error(`INVALID ${name} — ${label}`)
    failed = true
    continue
  }
  console.log(`OK ${name}`)
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (!appUrl) {
  console.error('MISSING NEXT_PUBLIC_APP_URL')
  failed = true
} else {
  try {
    const url = new URL(appUrl)
    if (url.protocol !== 'https:') {
      console.error('INVALID NEXT_PUBLIC_APP_URL — production URL must use HTTPS')
      failed = true
    } else {
      console.log('OK NEXT_PUBLIC_APP_URL')
    }
  } catch {
    console.error('INVALID NEXT_PUBLIC_APP_URL — malformed URL')
    failed = true
  }
}

// Never print secret values. This audit validates shape/configuration only;
// live Stripe API calls require credentials and are intentionally not performed here.
if (failed) process.exit(1)
console.log('DocChaser Stripe production configuration checks passed.')
