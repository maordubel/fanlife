import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EVENT_NAMES, METERED_ROUTES, cleanDevice, cleanEvent, meteredGate } from '@/lib/analytics/events'
import { cleanDays, funnelRow, orderedFunnel, statsKeyOk } from '@/lib/analytics/stats'
import { GATES } from '@/lib/gates'

/**
 * המדידה (delta 89) — the vocabulary, the one hook, and the route. The database side is
 * run for real in `supabase/tests/40-events.sql` (scripts/db/verify.sh).
 */
const ROOT = join(__dirname, '..')

describe('the vocabulary', () => {
  it('measures all thirteen gates, AWAY DAYS and the LIFE entry', () => {
    const open = GATES.filter((gate) => gate.href).map((gate) => gate.href!.split('?')[0])
    for (const route of open) expect(METERED_ROUTES).toContain(route)
    expect(METERED_ROUTES).toContain('/away-days')
    expect(METERED_ROUTES).toContain('/life')
    expect(open.length).toBe(13)
  })

  it('files a path under the longest whole-segment route', () => {
    expect(meteredGate('/kits/build')).toBe('/kits/build')
    expect(meteredGate('/kits/closet')).toBe('/kits')
    expect(meteredGate('/trivia/europe')).toBe('/trivia')
    expect(meteredGate('/blind-cow')).toBe('/blind-cow')
    expect(meteredGate('/goalkeeper')).toBeNull()
    expect(meteredGate('/')).toBeNull()
    expect(meteredGate('/qa/stats')).toBeNull()
  })

  it('drops what it does not know, never fixes it', () => {
    expect(cleanEvent({ name: 'gate_view', gate: '/goal' })).toEqual({ name: 'gate_view', gate: '/goal' })
    expect(cleanEvent({ name: 'drop_table', gate: '/goal' })).toBeNull()
    expect(cleanEvent({ name: 'gate_view', gate: 'https://evil.example' })).toBeNull()
    expect(cleanEvent({ name: 'gate_step', gate: '/goal', step: 5000, detail: '<b>', value: 1e12 })).toEqual({ name: 'gate_step', gate: '/goal' })
    expect(cleanEvent({ name: 'blind_cow_solved', gate: '/blind-cow', step: 3, value: 18400.4, detail: 'solo' })).toEqual({
      name: 'blind_cow_solved',
      gate: '/blind-cow',
      step: 3,
      value: 18400,
      detail: 'solo',
    })
    expect(cleanDevice('0b9f0d2e-1c1a-4a4b-9c8e-1f2e3d4c5b6a')).not.toBeNull()
    expect(cleanDevice('maor@example.com')).toBeNull()
  })

  it('carries every Blind Cow event of the spec §11', () => {
    for (const name of [
      'blind_cow_started', 'blind_cow_hint_revealed', 'blind_cow_guess_wrong', 'blind_cow_solved', 'blind_cow_gave_up',
      'blind_cow_duel_created', 'blind_cow_duel_shared', 'blind_cow_duel_joined', 'blind_cow_duel_completed', 'blind_cow_result_shared',
    ]) {
      expect(EVENT_NAMES).toContain(name)
      // …and the gate really fires it
      expect(readFileSync(join(ROOT, 'components/blind-cow/BlindCowGame.tsx'), 'utf8') + readFileSync(join(ROOT, 'components/blind-cow/ResultPanel.tsx'), 'utf8')).toContain(`'${name}'`)
    }
  })
})

describe('one hook, no per-gate lines', () => {
  it('is mounted once in the root layout', () => {
    const layout = readFileSync(join(ROOT, 'app/layout.tsx'), 'utf8')
    expect(layout).toContain('<GateMeter />')
  })
  it('hears finishes from the progress ledger, not from each gate', () => {
    expect(readFileSync(join(ROOT, 'lib/profile/events.ts'), 'utf8')).toContain('meterProgress(event)')
  })
  it('counts the ground’s one pick effect', () => {
    expect(readFileSync(join(ROOT, 'components/meter/GateMeter.tsx'), 'utf8')).toContain("'tw:pickfx'")
    expect(readFileSync(join(ROOT, 'components/stage/PickFx.tsx'), 'utf8')).toContain("const EVENT = 'tw:pickfx'")
  })
  it('is first-party: no third-party host, and it honours GPC / Do Not Track', () => {
    const meter = readFileSync(join(ROOT, 'lib/analytics/meter.ts'), 'utf8')
    expect(meter).toContain("const ENDPOINT = '/api/track'")
    expect(meter).not.toMatch(/https?:\/\//)
    expect(meter).toContain('globalPrivacyControl')
    expect(meter).toContain("doNotTrack === '1'")
  })
})

describe('a visit, end to end in a fake browser', () => {
  const sent: unknown[] = []
  beforeEach(() => {
    vi.resetModules()
    sent.length = 0
    const store = new Map<string, string>()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon')
    vi.stubGlobal('window', {
      location: { pathname: '/goal', search: '' },
      localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) },
      setTimeout: (fn: () => void) => {
        fn()
        return 1
      },
      clearTimeout: () => {},
    })
    vi.stubGlobal('navigator', {
      sendBeacon: (_url: string, blob: Blob) => {
        sent.push(blob)
        return true
      },
    })
    vi.stubGlobal('fetch', (_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body))
      return Promise.resolve(new Response(null, { status: 204 }))
    })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('view → start → steps → leave, with the last step', async () => {
    const meter = await import('@/lib/analytics/meter')
    meter.markStep(1, undefined, true) // declared before the visit opens (child effect first)
    meter.openVisit('/goal', 'direct')
    meter.countPick()
    meter.markStep(2)
    meter.closeVisit(false)
    const events = (sent as { events: { name: string; step?: number; detail?: string }[]; device: string }[]).flatMap((b) => b.events ?? [])
    expect(events.map((e) => e.name)).toEqual(['gate_view', 'gate_start', 'gate_step', 'gate_leave'])
    expect(events.at(-1)).toMatchObject({ name: 'gate_leave', step: 2, detail: 'step' })
    const device = (sent[0] as { device: string }).device
    expect(device).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('a finish closes the visit — no leave after it', async () => {
    const meter = await import('@/lib/analytics/meter')
    const { meterProgress } = await import('@/lib/analytics/progress')
    meter.openVisit('/goal', 'internal')
    meter.countPick()
    meterProgress({ type: 'gate_completed', gate: '/goal', score: 1200 })
    meter.closeVisit(false)
    const names = (sent as { events: { name: string }[] }[]).flatMap((b) => b.events).map((e) => e.name)
    expect(names).toEqual(['gate_view', 'gate_start', 'gate_finish'])
  })

  it('a bounce is a view and nothing else', async () => {
    const meter = await import('@/lib/analytics/meter')
    meter.openVisit('/goal', 'external')
    meter.closeVisit(false)
    expect((sent as { events: { name: string }[] }[]).flatMap((b) => b.events).map((e) => e.name)).toEqual(['gate_view'])
  })

  it('sends nothing without Supabase keys, or when the browser says do-not-track', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    let meter = await import('@/lib/analytics/meter')
    meter.openVisit('/goal', 'direct')
    meter.closeVisit(false)
    expect(sent).toEqual([])
    vi.resetModules()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubGlobal('navigator', { doNotTrack: '1' })
    meter = await import('@/lib/analytics/meter')
    meter.openVisit('/goal', 'direct')
    meter.closeVisit(false)
    expect(sent).toEqual([])
  })
})

describe('the route', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@supabase/supabase-js')
    vi.resetModules()
  })

  it('is a quiet no-op without Supabase env', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const { POST } = await import('@/app/api/track/route')
    const res = await POST(new Request('http://x/api/track', { method: 'POST', body: '{"device":"aaaaaaaa-1111","events":[{"name":"gate_view","gate":"/goal"}]}' }))
    expect(res.status).toBe(204)
  })

  it('forwards only clean events to worker_events_record, with the public key', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon')
    const calls: { name: string; args: unknown; key: string }[] = []
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: (_url: string, key: string) => ({
        rpc: async (name: string, args: unknown) => {
          calls.push({ name, args, key })
          return { data: { ok: true }, error: null }
        },
      }),
    }))
    const { POST } = await import('@/app/api/track/route')
    const body = JSON.stringify({
      device: 'aaaaaaaa-1111',
      events: [{ name: 'gate_view', gate: '/goal', detail: 'direct' }, { name: 'nope', gate: '/goal' }, { name: 'gate_leave', gate: '/goal', step: 2, email: 'x@y.z' }],
    })
    const res = await POST(new Request('http://x/api/track', { method: 'POST', body }))
    expect(res.status).toBe(204)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ name: 'worker_events_record', key: 'public-anon' })
    expect(calls[0]!.args).toEqual({
      p_device: 'aaaaaaaa-1111',
      p_events: [{ name: 'gate_view', gate: '/goal', detail: 'direct' }, { name: 'gate_leave', gate: '/goal', step: 2 }],
    })
  })

  it('refuses a body over 16 KB without calling anybody', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon')
    const calls: unknown[] = []
    vi.doMock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: async () => calls.push(1) }) }))
    const { POST } = await import('@/app/api/track/route')
    await POST(new Request('http://x/api/track', { method: 'POST', body: 'x'.repeat(20_000) }))
    expect(calls).toEqual([])
  })
})

describe('the stats page', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('opens on the live site only with the server key (16+ chars, exact)', () => {
    vi.stubEnv('WORKER_STATS_KEY', '')
    expect(statsKeyOk('anything')).toBe(false)
    vi.stubEnv('WORKER_STATS_KEY', 'short')
    expect(statsKeyOk('short')).toBe(false)
    vi.stubEnv('WORKER_STATS_KEY', 'a-long-owner-key-2026')
    expect(statsKeyOk('a-long-owner-key-2026')).toBe(true)
    expect(statsKeyOk('a-long-owner-key-2027')).toBe(false)
    expect(statsKeyOk(undefined)).toBe(false)
  })

  it('is behind the same QA gate as every /qa screen', () => {
    const page = readFileSync(join(ROOT, 'app/qa/stats/page.tsx'), 'utf8')
    expect(page).toContain('if (!qaAllowed() && !keyed) notFound()')
    // the demo fixture is only reachable where qaAllowed() is
    expect(page).toContain("const demo = qaAllowed() && searchParams.demo === '1'")
  })

  it('reads the sums with the service key only, on the server', () => {
    const stats = readFileSync(join(ROOT, 'lib/analytics/stats.ts'), 'utf8')
    expect(stats.startsWith("import 'server-only'")).toBe(true)
    expect(stats).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(readFileSync(join(ROOT, 'app/qa/stats/StatsBoard.tsx'), 'utf8')).not.toContain('SUPABASE')
  })

  it('lists every measured route in wall order, zero-filled', () => {
    const rows = orderedFunnel([funnelRow({ gate: '/goal', visitors: '3', starters: 2, finishers: 1, finish_rate: '33.3', leaves: 1, top_leave_step: 2 })])
    expect(rows.map((r) => r.gate)[0]).toBe('/xi')
    expect(rows.at(-1)?.gate).toBe('/life')
    expect(rows.find((r) => r.gate === '/goal')).toMatchObject({ visitors: 3, finishRate: 33.3, topLeaveStep: 2 })
    expect(rows.find((r) => r.gate === '/trivia')).toMatchObject({ visitors: 0, finishRate: null })
    expect(cleanDays('7')).toBe(7)
    expect(cleanDays('5')).toBe(30)
  })
})
