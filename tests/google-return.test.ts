import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(p, 'utf8')

describe('Google sign-in comes home to the app that started it', () => {
  it('redirectTo is the bare callback so it matches the allow-list (no query string)', () => {
    const src = read('lib/portal/sync.ts')
    expect(src).toContain('redirectTo: `${window.location.origin}/auth/callback`')
    expect(src).not.toMatch(/redirectTo:[^\n]*\?next=/)
  })
  it('the return path rides in a cookie the callback reads and clears', () => {
    const src = read('app/auth/callback/route.ts')
    expect(src).toContain('fl_next')
    expect(src).toContain('safePath(')
  })
})

describe('preview banner', () => {
  it('shows only in evaluation mode', () => {
    const src = read('components/master/Shell.tsx')
    expect(src).toMatch(/evaluationMode\(\)\?<div className="mag-stop">/)
  })
})
