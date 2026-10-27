import {describe, expect, it} from 'vitest'
import {companionFor, dubidActionFor, explainClub, offsidesActionFor, type Catalog, type DubidLeague} from '@/lib/universe/discovery'
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
    expect(offsidesActionFor(f, listed, now)?.href).toBe('https://offsides.dubelteam.com/?from=fanlife&club=olympiacos#/match/m1')
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
    expect(e.dubid.shown).toBe(true)
    expect(e.offsides).toEqual({shown: false, reason: 'No confirmed match'})
  })
})
