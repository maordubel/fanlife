import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SSO_COOKIE, ssoCookieDomain, ssoStorage } from '@/ecosystem/sdk'

const src = (p: string) => readFileSync(p, 'utf8')

describe('SSO: one account across *.dubelteam.com', () => {
  it('both Supabase clients put the session cookie on the parent domain', () => {
    expect(src('lib/supabase/client.ts')).toMatch(/cookieOptions: \{ domain \}/)
    expect(src('lib/supabase/client.ts')).toMatch(/ssoCookieDomain\(window\.location\.hostname\)/)
    expect(src('lib/supabase/server.ts')).toMatch(/cookieOptions: \{ domain: ssoCookieDomain\(/)
  })
  it('parent domain only on dubelteam.com hosts', () => {
    expect(ssoCookieDomain('fanlife.dubelteam.com')).toBe('.dubelteam.com')
    expect(ssoCookieDomain('hapoel-tel-aviv.fanlife.dubelteam.com')).toBe('.dubelteam.com')
    expect(ssoCookieDomain('localhost')).toBeUndefined()
    expect(ssoCookieDomain('fanlife-git-x.vercel.app')).toBeUndefined()
  })
  it('the cookie name is the one @supabase/ssr derives for Football Master', () => {
    expect(SSO_COOKIE).toBe(`sb-${new URL('https://afxpjfxwpdjvlmuoawda.supabase.co').hostname.split('.')[0]}-auth-token`)
  })
  it('a guest never enters the shared cookie', () => {
    const c: Record<string, string> = {}
    const jar = { read: () => ({ ...c }), write: (n: string, v: string, a: number) => { if (a === 0) delete c[n]; else c[n] = v } }
    const s = ssoStorage({ storageKey: 'k', jar, local: null })
    s.setItem('k', JSON.stringify({ access_token: 'g', user: { is_anonymous: true } }))
    expect(c).toEqual({})
  })
})
