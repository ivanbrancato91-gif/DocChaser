const SERVER_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const

const OPTIONAL_PROVIDERS = [
  'OPENAI_API_KEY',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_STARTER_MONTHLY_PRICE_ID',
  'STRIPE_STUDIO_MONTHLY_PRICE_ID',
  'STRIPE_TEAM_MONTHLY_PRICE_ID',
  'CRON_SECRET',
] as const

export function getEnvironmentReadiness() {
  const required = Object.fromEntries(SERVER_ENV.map((name) => [name, Boolean(process.env[name])]))
  const providers = Object.fromEntries(OPTIONAL_PROVIDERS.map((name) => [name, Boolean(process.env[name])]))

  return {
    required,
    providers,
    ready: SERVER_ENV.every((name) => Boolean(process.env[name])),
  }
}

export function assertServerEnvironment() {
  const readiness = getEnvironmentReadiness()
  if (!readiness.ready) {
    const missing = SERVER_ENV.filter((name) => !process.env[name])
    throw new Error(`Missing required server environment: ${missing.join(', ')}`)
  }
}
