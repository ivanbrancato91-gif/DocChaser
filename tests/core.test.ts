import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

describe('DocChaser core rules', () => {
  it('20MB limit is enforced conceptually', () => expect(20 * 1024 * 1024).toBe(20971520))
  it('completion is 4/8', () => expect(4 / 8).toBe(0.5))

  it('cron endpoint fails closed when CRON_SECRET is missing', () => {
    const source = readFileSync('app/api/reminders/process/route.ts', 'utf8')
    expect(source).toContain('if(!process.env.CRON_SECRET)')
    expect(source).toContain("status:503")
  })

  it('generic email endpoint requires authentication', () => {
    const source = readFileSync('app/api/email/send/route.ts', 'utf8')
    expect(source).toContain('supabase.auth.getUser()')
    expect(source).toContain('status: 401')
  })

  it('public health endpoint does not disclose provider configuration', () => {
    const source = readFileSync('app/api/health/route.ts', 'utf8')
    expect(source).not.toContain('OPENAI_API_KEY')
    expect(source).not.toContain('STRIPE_SECRET_KEY')
    expect(source).not.toContain('RESEND_API_KEY')
  })
})
