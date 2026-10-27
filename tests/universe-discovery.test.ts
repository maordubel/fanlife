import {describe, expect, it} from 'vitest'
import {companionFor, dubidActionFor, explainClub, matchdayDecision, offsidesActionFor, productAllowed, stillValid, type Catalog, type DubidLeague} from '@/lib/universe/discovery'
import {compatible, compatOf} from '@/lib/life/universal/compat'
import {lifeProgress} from '@/lib/life/universal/progress'
import {SAVE_VERSION, saveKey} from '@/lib/life/universal/engine'
import {featuresOf, validateFeaturePatch} from '@/lib/features'
import {familyOf} from '@/lib/universe/attention'
import type {Fixture} from '@/lib/fixtures/types'

const now = new Date('2026-10-28T10:00:00Z')
const H = 3_600_000
const fx = (clubId: string, h: number, home: string, away: string, o: Partial<Fixture> = {}): Fixture => ({clubId, kickoff: new Date(now.getTime() + h * H).toISOString(), dateOnly: false, home, away, clubSide: 'home', opponent: away, competition: 'Cup', round: null, venue: null, status: 'scheduled', providerEventId: `${clubId}${h}`, ...o})
const league = (code: string, o: Partial<DubidLeague> = {}): DubidLeague => ({code, names: {en: {full: code === 'GR_SUPER' ? 'Greek Super League' : 'Israeli Premier League'}}, round: 9, status: 'open', lockAt: new Date(now.getTime() + 60 * H).toISOString(), currentGameweek: 'gw-9',
  formats: {five: {mode: 'five', state: 'ready', canSubmit: true}, full: {mode: 'full', state: 'ready', canSubmit: true}}, ...o})
const cat = (o: Partial<Catalog> = {}): Catalog => ({dubid: [league('IL_PREMIER'), league('GR_SUPER')], offsides: [], checkedAt: now.toISOString(), ...o})

describe('Connected Football — a card only promises what the target can do', () => {
  it('a club DUBID does not cover gets no DUBID card (the Dinamo Zagreb case)', () => {
    expect(dubidActionFor('dinamo-zagreb', cat(), now)).toBeNull()
    expect(companionFor([fx('dinamo-zagreb', 30, 'Dinamo Zagreb', 'Rijeka')], cat(), now)).toBeNull()
  })
  it('an open round with canSubmit: the league and the round, never the fixture', () => {
    const a = dubidActionFor('olympiacos', cat(), now)!
    expect(a.state).toBe('playable')
    expect(a.copy.line).toBe('Greek Super League · Round 9')
    expect(a.copy.kicker).toBe('Your league this weekend')
    expect(new URL(a.href).searchParams.get('league')).toBe('GR_SUPER')
    expect(new URL(a.href).searchParams.get('club')).toBe('olympiacos')
  })
  it('ready but canSubmit=false, a live round, a lock that has passed, or no catalog: nothing', () => {
    const no = {five: {mode: 'five' as const, state: 'ready', canSubmit: false}, full: {mode: 'full' as const, state: 'ready', canSubmit: false}}
    expect(dubidActionFor('olympiacos', cat({dubid: [league('GR_SUPER', {formats: no})]}), now)).toBeNull()
    expect(dubidActionFor('olympiacos', cat({dubid: [league('GR_SUPER', {status: 'live'})]}), now)).toBeNull()
    expect(dubidActionFor('olympiacos', cat({dubid: [league('GR_SUPER', {lockAt: new Date(now.getTime() + 5 * 60_000).toISOString()})]}), now)).toBeNull()
    expect(dubidActionFor('olympiacos', cat({dubid: null}), now)).toBeNull()
  })
  it('OFFSIDES only for the same match, near kick-off', () => {
    const f = fx('olympiacos', 2, 'Olympiacos', 'AEK Athens')
    const listed = cat({offsides: [{id: 'm1', home: 'Olympiacos', away: 'AEK Athens', league: 'Super League Greece', kickoff: f.kickoff, arenas: 3}]})
    expect(offsidesActionFor(f, listed, now)?.href).toBe('https://offsides.dubelteam.com/?from=fanlife&club=olympiacos&lang=en&src=hub#/match/m1')
    expect(offsidesActionFor(fx('olympiacos', 2, 'Olympiacos', 'PAOK'), listed, now)).toBeNull()
    expect(offsidesActionFor(fx('olympiacos', 6, 'Olympiacos', 'AEK Athens'), listed, now)).toBeNull()
    expect(companionFor([f], listed, now)?.action.family).toBe('offsides')
  })
  it('deterministic, one action, and a snoozed family is skipped', () => {
    const list = [fx('aek-athens', 40, 'AEK Athens', 'Aris'), fx('hapoel-tel-aviv', 30, 'Hapoel Tel Aviv', 'Bnei Sakhnin')]
    expect(companionFor(list, cat(), now)?.action.leagueCode).toBe('IL_PREMIER')
    expect(companionFor([...list].reverse(), cat(), now)?.action.leagueCode).toBe('IL_PREMIER')
    expect(companionFor(list, cat(), now, new Set(['dubid']))).toBeNull()
  })
  it('a family is the product, whatever the language variant', () => {
    expect(familyOf('dubid-gr', 'https://dubid.dubelteam.com/?x=1')).toBe('dubid')
    expect(familyOf('dubid-en', 'https://dubid.dubelteam.com')).toBe('dubid')
    expect(familyOf('manager', 'https://fanlife.dubelteam.com/all-football/legends')).toBe('legends')
    expect(familyOf('dubid-en', '')).toBe('dubid')
  })
})

describe('the control room explains each club with the same rules', () => {
  it('a club outside DUBID, an open round, and no match', () => {
    const c = {dubid: [{code: 'GR_SUPER', names: {en: {full: 'Greek Super League'}}, round: 9, status: 'open', lockAt: new Date(Date.UTC(2026, 9, 31)).toISOString(), formats: {five: {mode: 'five' as const, state: 'ready', canSubmit: true}}}], offsides: [], checkedAt: new Date(Date.UTC(2026, 9, 27)).toISOString()}
    const now = new Date(Date.UTC(2026, 9, 27, 8))
    expect(explainClub('dinamo-zagreb', [], c, now).dubid.reason).toBe('Not a DUBID league')
    const e = explainClub('olympiacos', [], c, now)
    // audit CF-08: an open round with no match is ELIGIBLE, not shown — the hub draws no card for it (this line said true)
    expect(e.dubid).toMatchObject({shown: false, stage: 'ineligible'})
    expect(e.offsides).toEqual({shown: false, stage: 'ineligible', reason: 'No confirmed match'})
  })
})

describe('the audit of 27.10.2026 — every promise is one the target can keep', () => {
  const f = fx('olympiacos', 2, 'Olympiacos', 'AEK Athens')
  const m = (arenas: number) => cat({offsides: [{id: 'm1', home: 'Olympiacos', away: 'AEK Athens', league: 'Super League Greece', kickoff: f.kickoff, arenas}]})
  it('CF-03 · OFFSIDES: zero open arenas is an invitation to START one, never "join"; an open public arena is "join"', () => {
    const zero = offsidesActionFor(f, m(0), now)!
    expect(zero.intent).toBe('create'); expect(zero.reasonCode).toBe('arena_create')
    expect(zero.copy.cta).toMatch(/Start an arena/); expect(zero.copy.line).not.toMatch(/open arena(s)? ·|\d+ open/)
    const two = offsidesActionFor(f, m(2), now)!
    expect(two.intent).toBe('join'); expect(two.copy.line).toMatch(/2 open arenas/)
    expect(offsidesActionFor(fx('olympiacos', -0.1, 'Olympiacos', 'AEK Athens'), m(2), now)).toBeNull() // kicked off: no pre-match promise
  })
  it('CF-03 · the SQL counts only arenas a visitor can join: public, open, not archived, no password', async () => {
    const {readFileSync} = await import('node:fs')
    const sql = readFileSync('supabase/migrations/20261027170000_worker_live_open_arenas.sql', 'utf8')
    expect(sql).toMatch(/a\.type = 'public' and a\.status = 'open' and a\.password_hash is null/)
  })
  it('CF-04 · every combination of DUBID 5 and DUBID 11 gives matching copy and destination', () => {
    const at = (five: boolean, full: boolean) => dubidActionFor('olympiacos', cat({dubid: [league('GR_SUPER', {formats: {five: {mode: 'five', state: 'ready', canSubmit: five}, full: {mode: 'full', state: 'ready', canSubmit: full}}})]}), now)
    const only5 = at(true, false)!, only11 = at(false, true)!, both = at(true, true)!
    expect(only5.format).toBe('five'); expect(only5.copy.cta).toMatch(/five/); expect(only5.copy.cta).not.toMatch(/XI/); expect(new URL(only5.href).searchParams.get('format')).toBe('five')
    expect(only11.format).toBe('full'); expect(only11.copy.cta).toMatch(/XI/); expect(new URL(only11.href).searchParams.get('format')).toBe('full')
    expect(both.format).toBe('any'); expect(both.copy.cta).toMatch(/team/); expect(new URL(both.href).searchParams.get('format')).toBe('any')
    expect(new URL(both.href).searchParams.get('gw')).toBe('gw-9')
    expect(at(false, false)).toBeNull()
  })
  it('CF-05 · the deadline is the real one, and a passed or malformed deadline is never shown', () => {
    const a = dubidActionFor('olympiacos', cat(), now)!
    expect(Date.parse(a.expiresAt)).toBe(Date.parse(league('GR_SUPER').lockAt) - 15 * 60_000)
    expect(stillValid(a, now)).toBe(true)
    expect(stillValid(a, new Date(Date.parse(a.expiresAt) + 1))).toBe(false)
    expect(stillValid({...a, expiresAt: 'soon'}, now)).toBe(false)
    expect(offsidesActionFor(f, m(1), now)!.expiresAt).toBe(new Date(f.kickoff).toISOString())
    expect(dubidActionFor('olympiacos', cat({checkedAt: 'broken'}), now)).toBeNull()
  })
  it('CF-06 · a product or a club switched off is never a candidate', () => {
    const list = [fx('olympiacos', 30, 'Olympiacos', 'Aris')]
    expect(companionFor(list, cat(), now)?.action.family).toBe('dubid')
    expect(companionFor(list, cat(), now, new Set(), {off: new Set(['dubid'])})).toBeNull()
    expect(companionFor(list, cat(), now, new Set(), {off: new Set(['club:olympiacos'])})).toBeNull()
    expect(companionFor(list, cat(), now, new Set(), {off: new Set(['dubid:olympiacos'])})).toBeNull()
    expect(companionFor(list, cat(), now, new Set(), {off: new Set(['dubid:aek-athens'])})?.action.family).toBe('dubid')
    expect(productAllowed('legends', 'olympiacos', {off: new Set(['legends'])})).toBe(false)
    expect(validateFeaturePatch({universeOff: ['dubid', 'club:olympiacos', 'life:celtic']}).ok).toBe(true)
    expect(validateFeaturePatch({universeOff: ['everything']}).ok).toBe(false)
    expect(featuresOf({features: {universeOff: ['dubid', 'nope!']}} as never).universeOff).toEqual(['dubid'])
  })
  it('CF-08 · the desk tells eligible from selected, and never calls "shown" what the hub did not draw', () => {
    const c = cat()
    const e = explainClub('olympiacos', [], c, now)
    expect(e.dubid.shown).toBe(false) // no match → the hub card does not appear for this club
    expect(e.dubid.reason).toMatch(/no confirmed match/)
    expect(companionFor([], c, now)).toBeNull()
    const two = [fx('aek-athens', 40, 'AEK Athens', 'Aris'), fx('olympiacos', 30, 'Olympiacos', 'PAOK')]
    const d = matchdayDecision(two, c, now)
    expect(d.candidates.filter(x => x.stage === 'selected')).toHaveLength(1)
    expect(explainClub('olympiacos', two, c, now, d).dubid).toMatchObject({shown: true, stage: 'selected'})
    expect(explainClub('aek-athens', two, c, now, d).dubid).toMatchObject({shown: false, stage: 'eligible'})
    expect(explainClub('olympiacos', two, c, now, matchdayDecision(two, c, now, {policy: {off: new Set(['dubid'])}})).dubid.stage).toBe('suppressed')
  })
  it('CF-10 · a save that names a removed chapter is not a life to continue — the card and the engine agree', () => {
    const compat = compatOf({chapters: [{id: 'c1'} as never], rooms: {home: {} as never}})
    const ok = [{t: 'chapter', id: 'c1'}, {t: 'moved', room: 'home', spawn: 'a', time: 'day'}] as never[]
    const gone = [{t: 'chapter', id: 'c-removed'}] as never[]
    expect(compatible(compat, ok)).toBe(true); expect(compatible(compat, gone)).toBe(false)
    const store = (events: unknown[]) => ({getItem: (k: string) => k === saveKey('celtic') ? JSON.stringify({v: SAVE_VERSION, club: 'celtic', events}) : null})
    expect(lifeProgress('celtic', store(gone), compat)).toBeNull()
    expect(lifeProgress('celtic', store(ok), compat)?.chapters).toBe(1)
    expect(lifeProgress('celtic', store(gone))?.chapters).toBe(1) // without compat the light reader cannot know — so every door passes it
  })
})
