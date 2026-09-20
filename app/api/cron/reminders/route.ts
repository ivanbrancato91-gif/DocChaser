import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const origin = new URL(req.url).origin
  const response = await fetch(`${origin}/api/reminders/process`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
      'content-type': 'application/json',
    },
    cache: 'no-store',
  })

  const body = await response.text()
  return new Response(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
  })
}
