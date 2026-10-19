import { describe, expect, it, vi, afterEach } from 'vitest'

import { GET } from '@/app/go/[app]/route'
import { goDestination, goInput, safeTo } from '@/lib/ecosystem/go'
import { goHref } from '@/lib/ecosystem/links'
import { outbound, pageOf } from '@/lib/promo/rules'
import { SEED_DOC } from '@/lib/promo/seed'

const TOKEN = 'a'.repeat(64)
const env = { url: 'https://example.supabase.co', key: 'service-key' }
const ok = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
const req = (path: string) => new Request(`https://fanlife.dubelteam.com${path}`)

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('/go input', () => {
  it('accepts only relative paths', () => {
    expect(safeTo('/play?x=1')).toBe('/play?x=1')
    for (const bad of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'play', '/a b']) expect(safeTo(bad)).toBe('/')
  })
  it('drops a club or campaign the SDK would reject', () => {
    expect(goInput(new URLSearchParams('club=hapoel-tel-aviv&c=promo-dubid'))).toEqual({ club: 'hapoel-tel-aviv', campaign: 'promo-dubid', to: '/' })
    expect(goInput(new URLSearchParams('club=Hapoel!&c=<x>&to=//x'))).toEqual({ club: null, campaign: null, to: '/' })
  })
})

describe('/go destination', () => {
  it('falls back to the plain URL when env is missing', async () => {
    const f = vi.fn()
    expect(await goDestination('dubid', { club: null, campaign: null, to: '/' }, {}, f)).toBe('https://dubid.dubelteam.com/')
    expect(f).not.toHaveBeenCalled()
  })
  it('creates a handoff with the service role and the shared profile', async () => {
    const f = vi.fn(() => ok({ ok: true, token: TOKEN }))
    const to = await goDestination('offsides', { club: 'olympiacos', campaign: 'promo-offsides', to: '/play' }, env, f)
    expect(to).toBe(`https://offsides.dubelteam.com/play?eh=${TOKEN}`)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://example.supabase.co/rest/v1/rpc/handoff_create')
    const h = init.headers as Record<string, string>
    expect(h['Content-Profile']).toBe('shared')
    expect(h.Authorization).toBe('Bearer service-key')
    expect(JSON.parse(String(init.body))).toEqual({ p_source: 'fanlife', p_target: 'offsides', p_club: 'olympiacos', p_campaign: 'promo-offsides' })
  })
  it('falls back on a refusal, a bad token or a network error', async () => {
    const input = { club: null, campaign: null, to: '/' }
    expect(await goDestination('theworker', input, env, () => ok({ ok: false, error: 'x' }))).toBe('https://theworker.dubelteam.com/')
    expect(await goDestination('theworker', input, env, () => ok({ ok: true, token: 'nope' }))).toBe('https://theworker.dubelteam.com/')
    expect(await goDestination('theworker', input, env, () => ok({}, 500))).toBe('https://theworker.dubelteam.com/')
    expect(await goDestination('theworker', input, env, () => Promise.reject(new Error('down')))).toBe('https://theworker.dubelteam.com/')
  })
})

describe('/go route', () => {
  it('redirects to the plain URL with no env, without calling the network', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const res = await GET(req('/go/dubid?c=promo-dubid&to=/rounds'), { params: { app: 'dubid' } })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://dubid.dubelteam.com/rounds')
    expect(f).not.toHaveBeenCalled()
  })
  it('redirects to the handoff URL when the server creates one', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.url)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', env.key)
    vi.stubGlobal('fetch', vi.fn(() => ok({ ok: true, token: TOKEN })))
    const res = await GET(req('/go/dubid'), { params: { app: 'dubid' } })
    expect(res.headers.get('location')).toBe(`https://dubid.dubelteam.com/?eh=${TOKEN}`)
  })
  it('refuses an unknown app or fanlife itself', async () => {
    for (const app of ['fanlife', 'evil', '']) {
      const res = await GET(req(`/go/${app}`), { params: { app } })
      expect(res.headers.get('location')).toBe('https://fanlife.dubelteam.com/')
    }
  })
  it('never puts the key in a redirect', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.url)
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', env.key)
    vi.stubGlobal('fetch', vi.fn(() => ok({ ok: true, token: TOKEN })))
    const res = await GET(req('/go/offsides?c=x'), { params: { app: 'offsides' } })
    expect(res.headers.get('location')).not.toContain('service-key')
  })
})

describe('promo links to sibling apps', () => {
  it('every seeded banner to a sibling goes through /go/, and others stay as they were', () => {
    for (const b of SEED_DOC.banners) {
      const href = outbound(b, pageOf('olympiacos', '/clubs/olympiacos'))
      const host = new URL(b.href).hostname
      if (['dubid.dubelteam.com', 'offsides.dubelteam.com', 'theworker.dubelteam.com'].includes(host)) {
        expect(href.startsWith(`/go/${host.split('.')[0]}?`)).toBe(true)
        expect(new URL(href, 'https://x.test').searchParams.get('c')).toBe(`promo-${b.id}`)
      } else {
        expect(href.startsWith('/go/')).toBe(false)
      }
    }
  })
  it('goHref carries the path and ignores non-sibling hosts', () => {
    expect(goHref('https://dubid.dubelteam.com/r/1?x=2', 'promo-dubid', 'aek-athens')).toBe('/go/dubid?c=promo-dubid&club=aek-athens&to=%2Fr%2F1%3Fx%3D2')
    expect(goHref('https://takemeout.dubelteam.com', 'promo-x')).toBeNull()
    expect(goHref('not a url', 'promo-x')).toBeNull()
  })
})
