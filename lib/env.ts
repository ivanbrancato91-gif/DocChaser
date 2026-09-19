const REQUIRED_GROUPS = [
  { label: "NEXT_PUBLIC_SUPABASE_URL", keys: ["NEXT_PUBLIC_SUPABASE_URL"] },
  {
    label: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    keys: ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  {
    label: "SUPABASE_SECRET_KEY",
    keys: ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  },
] as const;

const configured = (keys: readonly string[]) => keys.some((key) => !!process.env[key]);

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
    REQUIRED_GROUPS.map(({ label, keys }) => [label, configured(keys)])
  );

  const providers = Object.fromEntries(
    OPTIONAL_ENV.map((key) => [key, !!process.env[key]])
  );

  return {
    required,
    providers,
    ready: REQUIRED_GROUPS.every(({ keys }) => configured(keys)),
  };
}

/**
 * NON lancia errori nell'Edge Runtime.
 * Restituisce semplicemente la lista delle variabili mancanti.
 */
export function assertServerEnvironment() {
  const missing = REQUIRED_GROUPS
    .filter(({ keys }) => !configured(keys))
    .map(({ label }) => label);

  return {
    ok: missing.length === 0,
    missing,
  };
}