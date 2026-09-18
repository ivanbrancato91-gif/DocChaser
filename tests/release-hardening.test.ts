import { describe,it,expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
const root=process.cwd()
describe('release hardening',()=>{it('has recovery flow',()=>{expect(fs.existsSync(path.join(root,'app/api/auth/recover/route.ts'))).toBe(true);expect(fs.existsSync(path.join(root,'app/auth/callback/page.tsx'))).toBe(true);expect(fs.existsSync(path.join(root,'app/reset-password/page.tsx'))).toBe(true)});it('does not advertise a free trial',()=>{const s=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8');expect(s).not.toContain('Prova gratuita')});it('has security helper',()=>expect(fs.existsSync(path.join(root,'lib/security.ts'))).toBe(true))})


describe('v1.0.7 security pass',()=>{it('has private route middleware',()=>{const s=fs.readFileSync(path.join(root,'middleware.ts'),'utf8');expect(s).toContain("'/dashboard/:path*'");expect(s).toContain("/login")});it('guards upload and AI bursts',()=>{expect(fs.readFileSync(path.join(root,'app/api/upload/route.ts'),'utf8')).toContain('requireContentLength');expect(fs.readFileSync(path.join(root,'app/api/ai/analyze/route.ts'),'utf8')).toContain('ai-analyze')})})
