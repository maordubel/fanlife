/**
 * LIFE · RUSH — the contract between the two engines, and the Fitter that has no pilot club.
 * Pure: no club pack is loaded here (the club matrix is tests/clubs/life-rush-fit.test.ts).
 */
import {describe, expect, it} from 'vitest'
import {readFileSync, readdirSync} from 'node:fs'
import {join} from 'node:path'
import {kindsOf, readArchive, sideOf, type ClubArchiveView} from '@/lib/life/rush/archive'
import {fitClub, fitTemplate, playable, specFor} from '@/lib/life/rush/fit'
import {resultProblems, templateProblems, ULTRAS_ONLY, type MissionTemplate} from '@/lib/life/rush/spec'
import {MISSION_TEMPLATES, templateById} from '@/lib/life/rush/templates'
import type {ArchiveRef} from '@/lib/life/universal/types'

const ref = (factId: string, title: string, hint = '', on: string | null = '1990-05-12', extra: Partial<ArchiveRef> = {}): ArchiveRef =>
  ({factId, title, hint, on, year: on ? Number(on.slice(0, 4)) : 1990, precision: on ? 'day' : 'year', locale: 'en', sources: [{title: 's', publisher: 'p', url: null}], ...extra})

const match = (us: 'home' | 'away') => ({home: 'A', away: 'B', homeGoals: 1, awayGoals: 0, us, result: us === 'home' ? 'won' as const : 'lost' as const, note: ''})

const view = (anchors: ArchiveRef[], over: Partial<ClubArchiveView> = {}): ClubArchiveView =>
  ({clubId: 'test-club', name: 'Test FC', city: 'Testville', ownNames: ['Test FC', 'Test', 'טסט'], rival: {name: 'Rival United', aliases: ['ריבל']}, ground: 'Test Park', anchors, ...over})

describe('the contract', () => {
  it('every template is valid, and the ultras-only hazards live on the ultras route only', () => {
    for (const t of MISSION_TEMPLATES) expect(templateProblems(t), t.id).toEqual([])
    for (const t of MISSION_TEMPLATES.filter(x => x.route === 'main')) for (const h of ULTRAS_ONLY) expect(t.hazards, t.id).not.toContain(h)
    expect(MISSION_TEMPLATES.some(t => t.route === 'ultras')).toBe(true)
  })

  it('template ids are unique, and every verb and both cameras are used', () => {
    expect(new Set(MISSION_TEMPLATES.map(t => t.id)).size).toBe(MISSION_TEMPLATES.length)
    expect(new Set(MISSION_TEMPLATES.map(t => t.verb))).toEqual(new Set(['run', 'drive', 'sneak', 'carry', 'find']))
    expect(new Set(MISSION_TEMPLATES.map(t => t.camera))).toEqual(new Set(['chase', 'eyes']))
  })

  it('refuses a main-route mission that throws, and a neutral text that prints a date or a name', () => {
    const bad: MissionTemplate = {...templateById('kickoff-run')!, id: 'bad', hazards: ['clock', 'strike'], neutralTitle: 'Run · {date}'}
    const problems = templateProblems(bad)
    expect(problems.some(p => p.includes('"strike"'))).toBe(true)
    expect(problems.some(p => p.includes('{date}'))).toBe(true)
  })

  it('a mandatory mission can never come back skipped; a skip is always ok', () => {
    expect(resultProblems({outcome: 'ok', clockLeft: 0, evidence: [], assisted: false, skipped: true}, true)).toContain('a mandatory mission cannot be skipped')
    expect(resultProblems({outcome: 'good', clockLeft: 0, evidence: [], assisted: false, skipped: true}, false)).toContain('a skip is always ok')
    expect(resultProblems({outcome: 'slip', clockLeft: -20, evidence: ['a', 'b'], assisted: true, skipped: false}, true)).toEqual([])
  })

  it('nothing under lib/life/rush names a club, imports the club layer, React or three', () => {
    const dir = join(process.cwd(), 'lib/life/rush')
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/from ['"](@\/lib\/clubs|react|three)/)
      expect(src, f).not.toMatch(/hapoel|olympiacos|panathinaikos|zrinjski|maccabi|celtic|pauli|aek/i)
    }
  })
})

describe('reading the archive', () => {
  const v = view([])
  it('a final is a final only when the row says so — a semi-final is not', () => {
    expect(kindsOf(ref('a', 'Celtic 2-0 Rangers', 'Scottish Cup Final'), v)).toContain('final')
    expect(kindsOf(ref('b', 'X 1-1 Y', 'Cup semi-final'), v)).not.toContain('final')
    expect(kindsOf(ref('c', 'X 1-0 Y', 'גמר גביע המדינה'), v)).toContain('final')
    expect(kindsOf(ref('d', 'X 1-0 Y', 'Greek Cup quarter-final'), v)).not.toContain('final')
  })

  it('Europe, title, relegation, founding and ground are read from the row\'s own words', () => {
    expect(kindsOf(ref('e', 'Hradec Králové 1–0 Test', 'European Cup, first round'), v)).toContain('europe')
    // the Worker's Hebrew archive writes the UEFA Cup as the club's own paper did (the 2001 Chelsea night)
    expect(kindsOf(ref('e2', 'הפועל תל אביב 2 — צ\'לסי 0', 'גביע אופ"א'), v)).toContain('europe')
    expect(kindsOf(ref('f', 'Test beat Iraklis 1-0 to reclaim the league title', ''), v)).toContain('title')
    expect(kindsOf(ref('g', 'Test 1-0 Real', 'Champions League group stage'), v)).not.toContain('title')
    expect(kindsOf(ref('h', 'Test were relegated', ''), v)).toContain('relegation')
    expect(kindsOf(ref('i', 'Football club founded', ''), v)).toContain('founding')
    expect(kindsOf(ref('j', 'The rebuilt stadium opens with a 1-0 win', ''), v)).toContain('ground')
  })

  it('a derby is a match naming the approved rival in any recorded spelling', () => {
    expect(kindsOf(ref('k', 'Test 2-1 Rival United', 'League'), v)).toContain('derby')
    expect(kindsOf(ref('l', 'ריבל 0-3 טסט', 'ליגה'), v)).toContain('derby')
    expect(kindsOf(ref('m', 'Test 2-1 Somebody', 'League'), v)).not.toContain('derby')
    expect(kindsOf(ref('n', 'Test 2-1 Rival United', 'League'), view([], {rival: null}))).not.toContain('derby')
  })

  it('the archive\'s own wording is respected: a final round, Derby County and a title season are not what they sound like', () => {
    expect(kindsOf(ref('r', 'Sampdoria 1–1 Test', 'European Cup, final round'), v)).not.toContain('final')
    expect(kindsOf(ref('s', 'Test 1–1 Rapid', 'Conference League league phase final matchday'), v)).not.toContain('final')
    expect(kindsOf(ref('t', 'Derby County 2-3 Test', 'UEFA Cup'), v)).not.toContain('derby')
    expect(kindsOf(ref('u', 'Goal season', 'He scored 39 goals in the title-winning season.', null), v)).not.toContain('title')
    expect(kindsOf(ref('w', 'B 0–2 Test', 'Eighth league title secured'), v)).toContain('title')
  })

  it('reads the side from a title written home side first, in both archive forms', () => {
    expect(sideOf(ref('x', 'Test 2-1 Rival United, League Division 1'), v.ownNames)).toBe('home')
    expect(sideOf(ref('y', 'Rival United 0–3 Test'), v.ownNames)).toBe('away')
    expect(sideOf(ref('z', 'טסט 5 — ריבל 0'), v.ownNames)).toBe('home')
    expect(sideOf(ref('z2', 'ריבל 1 — טסט 2'), v.ownNames)).toBe('away')
    expect(sideOf(ref('z3', 'Somebody 1-0 Other'), v.ownNames)).toBeNull()
    expect(sideOf(ref('z4', 'Test beat Rival 2-0 in the final'), v.ownNames)).toBeNull()
  })

  it('home and away only from a score the build could read with certainty', () => {
    expect(kindsOf(ref('o', 'Test 1-0 B', 'League', '1990-01-01', {match: match('home')}), v)).toContain('home')
    expect(kindsOf(ref('p', 'B 0-1 Test', 'League', '1990-01-01', {match: match('away')}), v)).toContain('away')
    expect(kindsOf(ref('q', 'Somebody 1-0 B', 'League'), v)).not.toContain('home')
  })
})

describe('the Fitter', () => {
  const rich = view([
    ref('home1', 'Test 3-0 B', 'League', '1986-05-24', {match: match('home')}),
    ref('away1', 'C 0-1 Test', 'League', '1990-03-10', {match: match('away')}),
    ref('final1', 'Test 2-0 D', 'State Cup final', '1983-06-01', {match: match('home')}),
    ref('euro1', 'Test 1-1 Milan', 'European Cup, first round', '1959-09-13'),
    ref('title1', 'Test clinch the league title', '', '1986-05-17'),
    ref('derby1', 'Rival United 0-2 Test', 'League', '1991-12-01', {match: match('away')}),
  ])

  it('binds an archive night only from the club\'s own rows, and the same view gives the same answer', () => {
    const a = fitClub(rich), b = fitClub(rich)
    expect(a).toEqual(b)
    const ids = new Set(rich.anchors.map(r => r.factId))
    for (const f of a) if (f.anchor) expect(ids.has(f.anchor.factId), f.template).toBe(true)
    expect(a.find(f => f.template === 'cup-final-trip')).toMatchObject({state: 'READY', anchor: {factId: 'final1'}})
    expect(a.find(f => f.template === 'europe-night')).toMatchObject({state: 'READY', anchor: {factId: 'euro1'}})
  })

  it('a missing critical record holds the mission and opens research that says where to look', () => {
    const f = fitClub(rich).find(x => x.template === 'where-you-stood')!
    expect(f.state).toBe('HELD')
    expect(f.anchor).toBeNull()
    expect(f.research[0]).toMatchObject({grade: 'critical', template: 'where-you-stood'})
    expect(f.research[0]!.find).toMatch(/RSSSF/)
  })

  it('no approved rival makes the ultras derby irrelevant, not held — and asks for no research', () => {
    for (const f of fitClub(view(rich.anchors, {rival: null})).filter(x => templateById(x.template)!.route === 'ultras')) {
      expect(f.state).toBe('IRRELEVANT')
      expect(f.research).toEqual([])
    }
  })

  it('a club with an empty archive still has a life: the missions with no critical record play neutral', () => {
    const fits = fitClub(view([]))
    const neutral = fits.filter(f => f.state === 'NEUTRAL').map(f => f.template)
    expect(neutral).toEqual(expect.arrayContaining(['kickoff-run', 'sneak-in', 'derby-banner-raid', 'tifo-carry']))
    expect(fits.filter(playable).every(f => f.anchor === null)).toBe(true)
  })

  it('two missions do not stand on the same night when another one fits', () => {
    const used = new Set<string>()
    for (const f of fitClub(rich)) {
      if (!f.anchor) continue
      if (used.has(f.anchor.factId)) {
        // a shared night is allowed only when no unused night would carry this mission
        const t = templateById(f.template)!
        const free = rich.anchors.filter(r => !used.has(r.factId)).filter(r => {
          const kinds = new Set(kindsOf(r, rich))
          return t.needs.some(n => 'anchor' in n.of && n.of.anchor.some(k => kinds.has(k)) && (!n.day || r.precision === 'day'))
        })
        expect(free.map(r => r.factId), f.template).toEqual([])
      }
      used.add(f.anchor.factId)
    }
  })

  it('relevance follows the club\'s own story: a club full of European nights puts Europe first', () => {
    const euro = view(Array.from({length: 30}, (_, i) => ref(`e${i}`, `Test ${i % 3}-1 Foreign ${i}`, 'UEFA Cup, first round', `19${70 + (i % 29)}-09-1${i % 9}`)))
    expect(fitClub(euro)[0]!.template).toBe('europe-night')
  })
})

describe('the spec RUSH receives', () => {
  const v = view([ref('final1', 'Test 2-0 D', 'State Cup final', '1983-06-01', {match: match('home')})])
  const read = readArchive(v)

  it('prints the night exactly as recorded, and nothing when neutral', () => {
    const t = templateById('cup-final-trip')!
    const spec = specFor(t, fitTemplate(read, t), v, {seed: 7, skin: 'test-club', age: 20, mandatory: true, time: 'day'})
    expect(spec.anchor?.factId).toBe('final1')
    expect(spec.title).toBe('The final · 1983-06-01')
    expect(spec).toMatchObject({verb: 'drive', camera: 'chase', route: 'main', difficulty: 2, mandatory: true, weather: 'clear'})

    const k = templateById('kickoff-run')!
    const empty = view([])
    const neutral = specFor(k, fitTemplate(readArchive(empty), k), empty, {seed: 7, skin: 'test-club', age: 8, mandatory: false, time: 'day'})
    expect(neutral.anchor).toBeNull()
    expect(neutral.title).toBe('Kickoff run')
    expect(neutral.brief).not.toMatch(/\{|\d{4}/)
    expect(neutral.difficulty).toBe(0)
  })

  it('refuses a held mission and an age the template is not written for', () => {
    const t = templateById('where-you-stood')!
    expect(() => specFor(t, fitTemplate(read, t), v, {seed: 1, skin: 'x', age: 30, mandatory: false, time: 'day'})).toThrow(/RUSH_NOT_PLAYABLE/)
    const s = templateById('sneak-in')!
    expect(() => specFor(s, fitTemplate(read, s), v, {seed: 1, skin: 'x', age: 30, mandatory: false, time: 'day'})).toThrow(/RUSH_AGE/)
  })
})
