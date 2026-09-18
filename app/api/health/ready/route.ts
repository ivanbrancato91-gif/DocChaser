import { NextResponse } from 'next/server'
import { getEnvironmentReadiness } from '@/lib/env'
import { DOCCHASER_VERSION } from '@/lib/release'

export const dynamic = 'force-dynamic'

export async function GET() {
  const readiness = getEnvironmentReadiness()
  return NextResponse.json(
    {
      ok: readiness.ready,
      service: 'docchaser',
      version: DOCCHASER_VERSION,
      // Detailed provider configuration is intentionally hidden from the public endpoint.
    },
    {
      status: readiness.ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
