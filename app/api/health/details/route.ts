import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentReadiness } from '@/lib/env'
import { DOCCHASER_VERSION } from '@/lib/release'

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  const readiness = getEnvironmentReadiness()
  return NextResponse.json(
    {
      ok: readiness.ready,
      service: 'docchaser',
      version: DOCCHASER_VERSION,
      timestamp: new Date().toISOString(),
      checks: readiness,
    },
    { status: readiness.ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
