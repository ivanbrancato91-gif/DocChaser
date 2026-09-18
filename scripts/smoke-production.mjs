const base = (process.env.SMOKE_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || '').replace(/\/$/, '')
if (!base) {
  console.error('Set SMOKE_BASE_URL to the deployed DocChaser URL.')
  process.exit(2)
}

const publicRoutes = ['/', '/pricing', '/features', '/faq', '/privacy', '/terms', '/cookies', '/login', '/register', '/recover']
const protectedRoutes = ['/dashboard', '/cases', '/clients', '/templates', '/reminders', '/team', '/billing', '/settings', '/audit', '/usage', '/completion', '/correction', '/upload', '/onboarding', '/security', '/notifications', '/reports']

async function get(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: 'manual', ...options })
}

let failures = 0
for (const path of publicRoutes) {
  const res = await get(path)
  if (![200, 304].includes(res.status)) {
    failures++
    console.error(`FAIL public ${path}: HTTP ${res.status}`)
  }
}

const health = await get('/api/health')
if (health.status !== 200) { failures++; console.error(`FAIL health: HTTP ${health.status}`) }
else {
  const body = await health.text()
  if (!body.includes('"ok":true') || body.includes('sk_live_') || body.includes('sk_test_') || body.includes('SUPABASE_SECRET_KEY')) {
    failures++; console.error('FAIL health response contract or secret leakage')
  }
  if (health.headers.get('cache-control') !== 'no-store') { failures++; console.error('FAIL health cache policy') }
}

for (const path of protectedRoutes) {
  const res = await get(path)
  const location = res.headers.get('location') || ''
  if (res.status !== 307 && res.status !== 308) {
    failures++; console.error(`FAIL protected ${path}: expected redirect, got HTTP ${res.status}`)
  } else if (!location.includes('/login') || !location.includes('next=')) {
    failures++; console.error(`FAIL protected ${path}: redirect target is ${location}`)
  }
}

const readiness = await get('/api/health/ready')
if (![200, 503].includes(readiness.status)) { failures++; console.error(`FAIL readiness status: HTTP ${readiness.status}`) }
const readinessBody = await readiness.text()
if (readinessBody.includes('checks') || readinessBody.includes('SUPABASE_SECRET_KEY') || readinessBody.includes('OPENAI_API_KEY')) {
  failures++; console.error('FAIL readiness leaks detailed configuration')
}

const details = await get('/api/health/details')
if (details.status !== 401) { failures++; console.error(`FAIL diagnostics protection: expected 401, got HTTP ${details.status}`) }

if (failures) {
  console.error(`Production smoke failed: ${failures} issue(s).`)
  process.exit(1)
}
console.log(`DocChaser v4.0.0 production smoke passed against ${base}`)
