import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

describe('DocChaser mobile/PWA release', () => {
  it('has an installable web manifest and app icon', () => {
    expect(existsSync('app/manifest.ts')).toBe(true)
    expect(existsSync('public/icon.svg')).toBe(true)
    const layout = readFileSync('app/layout.tsx', 'utf8')
    expect(layout).toContain("manifest: '/manifest.webmanifest'")
    expect(layout).toContain("viewportFit: 'cover'")
  })

  it('has a functional mobile navigation trigger and drawer', () => {
    const shell = readFileSync('components/AppShell.tsx', 'utf8')
    const css = readFileSync('app/globals.css', 'utf8')
    expect(shell).toContain('Apri menu')
    expect(shell).toContain('mobile-drawer')
    expect(shell).toContain('mobile-backdrop')
    expect(css).toContain('@media(max-width:900px)')
    expect(css).toContain('.mobile-drawer.open')
  })

  it('keeps wide data tables scrollable on phones', () => {
    const css = readFileSync('app/globals.css', 'utf8')
    expect(css).toContain('.card{overflow-x:auto}')
    expect(css).toContain('.table{min-width:640px}')
  })
})
