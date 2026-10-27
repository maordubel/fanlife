import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const src = (p: string) => readFileSync(p, 'utf8')

describe('Connected Football audit — every discovery surface goes through one shell', () => {
  it('CF-01 · the next step is rendered for every gate and waits for the game to show its result', () => {
    const page = src('app/clubs/[slug]/[gate]/page.tsx')
    expect(page).not.toMatch(/!compact&&<Suspense fallback=\{null\}><NextStep/)
    expect(page).toMatch(/<NextStep [^>]*floating=\{compact\}/)
    const ns = src('components/universe/NextStep.tsx')
    expect(ns.match(/<DiscoveryUnit [^>]*after=\{after\}/g)).toHaveLength(2)
    expect(ns).toMatch(/Continue in Legends Manager/) // a manager who runs the club is offered his career back
    const done = src('lib/clubs/completion.ts')
    expect(done).toMatch(/export function completeRun[\s\S]{0,120}announceFinish\(club,gate\)/)
  })
  it('CF-02 · the matchday card is a discovery unit: snooze, one unit on screen, its own deadline and re-check', () => {
    const hub = src('components/home/HubFixtures.tsx')
    expect(hub).toMatch(/<DiscoveryUnit unit="matchday" family=\{a\.family\} actionId=\{a\.id\} expiresAt=\{a\.expiresAt\} recheck="\/api\/universe\/companion">/)
    expect(hub).toMatch(/hubDecision\(/)
    const unit = src('components/universe/DiscoveryUnit.tsx')
    for (const needle of ['snoozed(family)', 'snooze(family)', 'data-discovery-unit={unit}', 'occupied(unit)', 'busy()', 'visibilitychange', 'IntersectionObserver'])
      expect(unit, needle).toContain(needle)
  })
  it('CF-06 · the social plan and the hub read the same switch', () => {
    expect(src('lib/marketing/run.ts')).toMatch(/universeOff\.includes\(p\.kind!\)/)
    expect(src('lib/universe/hub.ts')).toMatch(/universeOff/)
  })
  it('CF-10 · the engine and the club page use one compatibility rule', () => {
    expect(src('lib/life/universal/engine.ts')).toMatch(/return compatible\(compatOf\(pack\), events\)/)
    for (const p of ['app/clubs/[slug]/page.tsx', 'app/clubs/[slug]/play/page.tsx']) expect(src(p)).toMatch(/compat=\{life\.href&&core\?lifeCompatFor\(core\.data\):null\}/)
  })
})
