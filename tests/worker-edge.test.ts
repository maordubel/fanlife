import { afterEach, describe, expect, it, vi } from 'vitest'

import worker, { BOOT_AFTER_MS, bootPage, edgeKey, EDGE_FRESH_S } from '../deploy/space/worker.js'

/** The edge copy and the boot screen (18.11.2026): a public page answers from the edge; a cold server shows the boot screen. */
const page = (url: string, init: RequestInit = {}) => new Request(url, { headers: { accept: 'text/html' }, ...init })

function memoryCache() {
  const m = new Map<string, Response>()
  return {
    m,
    async match(k: string) { const r = m.get(k); return r ? r.clone() : undefined },
    async put(k: string, r: Response) { m.set(k, r) },
  }
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('edgeKey', () => {
  it('keys a public FAN LIFE page and drops tracking noise', () => {
    expect(edgeKey(page('https://fanlife.dubelteam.com/clubs/olympiacos?utm_source=x&lang=el'))).toBe('https://edge-copy.fanlife/fanlife.dubelteam.com/clubs/olympiacos?lang=el')
  })
  it.each([
    ['an API', page('https://fanlife.dubelteam.com/api/x')],
    ['the sign-in door', page('https://fanlife.dubelteam.com/auth/callback?code=1')],
    ['a file', page('https://fanlife.dubelteam.com/brand/a.webp')],
    ['another app', page('https://dubid.dubelteam.com/')],
    ['a non-GET', page('https://fanlife.dubelteam.com/', { method: 'POST' })],
    ['the owner', page('https://fanlife.dubelteam.com/', { headers: { accept: 'text/html', cookie: 'fan-life-admin=1' } })],
    ['a client navigation', page('https://fanlife.dubelteam.com/', { headers: { accept: 'text/html', rsc: '1' } })],
  ])('never keeps %s', (_, req) => { expect(edgeKey(req)).toBeNull() })
})

describe('the front door', () => {
  it('shows the boot screen when the server is slow and no copy exists, then keeps the page', async () => {
    vi.useFakeTimers()
    const cache = memoryCache()
    vi.stubGlobal('caches', { default: cache })
    let answer: (r: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((ok) => { answer = ok })))
    const waits: Promise<unknown>[] = []
    const out = worker.fetch(page('https://fanlife.dubelteam.com/'), {}, { waitUntil: (p) => { waits.push(p) } })
    await vi.advanceTimersByTimeAsync(BOOT_AFTER_MS + 10)
    const res = await out
    expect(res.headers.get('x-fanlife-edge')).toBe('boot')
    expect(await res.text()).toContain('Kick-off soon')
    answer(new Response('<html>home</html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    vi.useRealTimers()
    await Promise.all(waits)
    await new Promise((r) => setTimeout(r, 0))
    expect([...cache.m.keys()]).toEqual(['https://edge-copy.fanlife/fanlife.dubelteam.com/?'])
  })

  it('answers a kept page at once, and refreshes a stale one behind', async () => {
    const cache = memoryCache()
    vi.stubGlobal('caches', { default: cache })
    const fetcher = vi.fn(async () => new Response('<html>new</html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    vi.stubGlobal('fetch', fetcher)
    const stored = Date.now() - (EDGE_FRESH_S + 5) * 1000
    await cache.put('https://edge-copy.fanlife/fanlife.dubelteam.com/clubs/celtic?', new Response('<html>old</html>', { headers: { 'content-type': 'text/html', 'x-edge-stored': String(stored) } }))
    const waits: Promise<unknown>[] = []
    const res = await worker.fetch(page('https://fanlife.dubelteam.com/clubs/celtic'), {}, { waitUntil: (p) => { waits.push(p) } })
    expect(await res.text()).toBe('<html>old</html>')
    expect(res.headers.get('x-fanlife-edge')).toBe('stale')
    await Promise.all(waits)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('never keeps a page that sets a cookie', async () => {
    const cache = memoryCache()
    vi.stubGlobal('caches', { default: cache })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>x</html>', { status: 200, headers: { 'content-type': 'text/html', 'set-cookie': 'a=1' } })))
    const waits: Promise<unknown>[] = []
    const res = await worker.fetch(page('https://fanlife.dubelteam.com/me'), {}, { waitUntil: (p) => { waits.push(p) } })
    expect(res.headers.get('x-fanlife-edge')).toBe('miss')
    await Promise.all(waits)
    expect(cache.m.size).toBe(0)
  })

  it('the boot screen is small, self-contained and in the site language', () => {
    const html = bootPage('/clubs/olympiacos')
    expect(html.length).toBeLessThan(8000)
    expect(html).toContain('"/clubs/olympiacos"')
    expect(html).toContain('prefers-reduced-motion')
    expect(html).not.toMatch(/<script[^>]+src=/)
  })
})
