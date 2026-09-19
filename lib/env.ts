const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

const OPTIONAL_ENV = [
  "OPENAI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_STARTER_MONTHLY_PRICE_ID",
  "STRIPE_STUDIO_MONTHLY_PRICE_ID",
  "STRIPE_TEAM_MONTHLY_PRICE_ID",
  "CRON_SECRET",
] as const;

export function getEnvironmentReadiness() {
  const required = Object.fromEntries(
    REQUIRED_ENV.map((key) => [key, !!process.env[key]])
  );

  const providers = Object.fromEntries(
    OPTIONAL_ENV.map((key) => [key, !!process.env[key]])
  );

  return {
    required,
    providers,
    ready: REQUIRED_ENV.every((key) => !!process.env[key]),
  };
}

/**
 * NON lancia errori nell'Edge Runtime.
 * Restituisce semplicemente la lista delle variabili mancanti.
 */
export function assertServerEnvironment() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  return {
    ok: missing.length === 0,
    missing,
  };
}