import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('v2.8 production reliability', () => {
  it('has global recovery UI without exposing error details', () => {
    const error = read('app/error.tsx')
    expect(error).toContain('Qualcosa non ha funzionato')
    expect(error).not.toContain('error.message')
    expect(error).not.toContain('error.stack')
  })

  it('has a safe 404 recovery path', () => {
    expect(read('app/not-found.tsx')).toContain('Pagina non trovata')
    expect(read('app/not-found.tsx')).toContain('href="/dashboard"')
  })

  it('has accessible loading state and reduced-motion fallback', () => {
    expect(read('app/loading.tsx')).toContain('aria-busy="true"')
    expect(read('app/globals.css')).toContain('prefers-reduced-motion:reduce')
  })

  it('keeps API responses protected from caching', () => {
    const config = read('next.config.ts')
    expect(config).toContain("source: '/api/:path*'")
    expect(config).toContain("value: 'no-store'")
  })
})
