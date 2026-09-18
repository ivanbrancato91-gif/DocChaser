import { NextResponse } from 'next/server'
import { DOCCHASER_VERSION } from '@/lib/release'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'docchaser',
      version: DOCCHASER_VERSION,
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
