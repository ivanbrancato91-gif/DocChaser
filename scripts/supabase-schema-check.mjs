import fs from 'node:fs'

const migrationDir = 'supabase/migrations'
const files = fs.readdirSync(migrationDir).filter((f) => f.endsWith('.sql')).sort()
const expected = [
  '20260915142000_documents_storage.sql',
  '20260915150000_harden_membership_policies.sql',
  '20260916003000_production_billing_hardening.sql',
  '20260916100000_stripe_webhook_idempotency.sql',
  '20260916113000_webhook_processing_state.sql',
  '20260916140000_webhook_claim_safety.sql',
  '20260917100000_document_versions.sql',
  '20260917120000_ai_jobs.sql',
  '20260917133000_workflow_runs.sql',
  '20260917150000_portal_messages.sql',
  '20260917170000_template_workflows.sql',
  '20260917190000_onboarding_settings.sql',
]

const missing = expected.filter((f) => !files.includes(f))
const unexpected = files.filter((f) => !expected.includes(f))
if (missing.length) {
  console.error(`Missing expected migrations: ${missing.join(', ')}`)
  process.exit(1)
}

console.log(`Supabase migration inventory: ${files.length} files`)
console.log(`Expected production migrations: ${expected.length}`)
if (unexpected.length) console.log(`Additional migrations present: ${unexpected.join(', ')}`)
console.log('Migration inventory check passed.')
console.log('For live schema verification, run supabase/production_verification.sql in the LIVE Supabase SQL Editor.')
