import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('v2.9 release candidate', () => {
  it('pins the supported Node runtime and strict npm settings', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.engines.node).toContain('>=20.0.0')
    expect(read('.nvmrc').trim()).toBe('20')
    expect(read('.npmrc')).toContain('engine-strict=true')
  })

  it('has a non-disclosing readiness endpoint', () => {
    const route = read('app/api/health/ready/route.ts')
    expect(route).toContain('status: readiness.ready ? 200 : 503')
    expect(route).toContain("Cache-Control")
    expect(route).not.toContain('process.env.OPENAI_API_KEY')
  })

  it('keeps environment validation centralized and secret-safe', () => {
    const env = read('lib/env.ts')
    expect(env).toContain('getEnvironmentReadiness')
    expect(env).toContain('assertServerEnvironment')
    expect(env).not.toContain('console.log')
  })

  it('removes the framework powered-by header', () => {
    expect(read('next.config.ts')).toContain('poweredByHeader: false')
  })
})
