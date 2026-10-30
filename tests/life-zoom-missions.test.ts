/**
 * LIFE · RUSH zoom missions (rule 135): close-up missions tied to the task in front of him, on the archive's own big
 * nights. What this suite holds them to:
 *  · the bot wins every seed at every difficulty, and the crowd close-ups ask for the thing in his hand first;
 *  · the archive tie prints only what the row records: a READY mission stands on the chapter's own night (or the paper
 *    of its week), its title carries that row's date and nothing invented; the film after the clipping names a scorer
 *    only when the club's own record lists every goal of that day;
 *  · every word exists in English and Hebrew;
 *  · each episode wires its mission on the step whose story it is, keeps a fallback, and pays it off with a film;
 *  · the season picks the BIG nights first (finals, titles, Europe, derbies), never reuses one, and the pack's own
 *    choice still comes before any weight.
 */
import {describe, expect, it} from 'vitest'
import {buildLevel, type Level} from '@/lib/life/rush/level'
import {botInput, IDLE, startSim, stepSim, STEP} from '@/lib/life/rush/sim'
import {HOME_TEMPLATES} from '@/lib/life/rush/flat'
import {MISSION_TEMPLATES, TEMPLATE_HE, templateById} from '@/lib/life/rush/templates'
import {missionSpecFor, type RushDoor} from '@/lib/life/rush/call'
import {rushWord, RUSH_WORDS} from '@/lib/life/rush/words'
import type {MissionSpec} from '@/lib/life/rush/spec'
import type {ArchiveRef, CineDef} from '@/lib/life/universal/types'
import {e3} from '@/lib/life/universal/season/e3'
import {clippingNames, e4} from '@/lib/life/universal/season/e4'
import {e5} from '@/lib/life/universal/season/e5'
import {e6} from '@/lib/life/universal/season/e6'
import {seasonOne, weight} from '@/lib/life/universal/season'
import type {EpisodeScript} from '@/lib/life/universal/season/write'

const ZOOM = ['clipping-hunt', 'first-step', 'lost-scarf', 'away-pen'] as const
const CROWD = ['first-step', 'lost-scarf', 'away-pen'] as const

const specOf = (template: string, seed: number, difficulty: 0 | 1 | 2, beat: string | null = null): MissionSpec => {
  const t = templateById(template)!
  return {template, verb: t.verb, camera: t.camera, route: t.route, seed, skin: 'test', age: 12, time: 'night', weather: 'clear', clock: t.clock, hazards: [...t.hazards], difficulty, mandatory: false, anchor: null, title: '', brief: '', beat}
}
const run = (l: Level, limit = 60 * 600) => { const s = startSim(l); for (let n = 0; !s.ended && n < limit; n++) stepSim(l, s, botInput(l, s), STEP); return s }

let fid = 0
function night(o: {on: string; us: 'home' | 'away'; result: 'won' | 'lost' | 'drew'; hg?: number; ag?: number; hint?: string; title?: string; scorers?: {name: string; minute: number | null}[]}): ArchiveRef {
  const hg = o.hg ?? (o.result === 'won' ? (o.us === 'home' ? 2 : 0) : o.result === 'lost' ? (o.us === 'home' ? 0 : 1) : 1)
  const ag = o.ag ?? (o.result === 'won' ? (o.us === 'home' ? 0 : 1) : o.result === 'lost' ? (o.us === 'home' ? 1 : 0) : 1)
  return {
    factId: `t:${++fid}`, title: o.title ?? `Club ${hg}–${ag} Other`, on: o.on, year: Number(o.on.slice(0, 4)), precision: 'day', hint: o.hint ?? 'League', locale: 'en',
    sources: [{title: 'Record', publisher: 'Archive', url: null}],
    match: {home: o.us === 'home' ? 'Club' : 'Other', away: o.us === 'home' ? 'Other' : 'Club', homeGoals: hg, awayGoals: ag, us: o.us, result: o.result, note: null,
      ...(o.scorers ? {detail: {scorers: o.scorers, lineup: [], bench: []}} : {})},
  }
}

const door: RushDoor = {
  fits: MISSION_TEMPLATES.map(t => ({clubId: 'x', template: t.id, state: 'NEUTRAL', anchor: null, relevance: 1, research: []})),
  view: {clubId: 'x', name: 'Club', city: 'City', ownNames: ['Club'], rival: null, ground: 'The Ground'}, gateLabel: 'Gate 5',
}
const ctx = {time: 'night' as const, locale: 'en' as const, playId: 'p'}

const linesOf = (c: CineDef) => c.shots.map(s => s.say?.t ?? '')
const stepOf = (ep: EpisodeScript, id: string) => ep.steps.find(s => s.id === id)!

describe('zoom missions: every seed is won', () => {
  for (const id of ZOOM) it(`${id}: the bot wins every seed at every difficulty, and standing still does not`, () => {
    const beats = id === 'away-pen' ? ['won', 'lost', 'drew', null] : [null]
    for (const beat of beats) for (let seed = 1; seed <= 10; seed++) for (const d of [0, 1, 2] as const) {
      const l = buildLevel(specOf(id, seed, d, beat))
      expect(run(l).ended, `${id} ${beat} seed ${seed} d${d}`).toBe('good')
      const idle = startSim(l)
      for (let n = 0; !idle.ended && n < 60 * 600; n++) stepSim(l, idle, IDLE, STEP)
      expect(idle.ended, `${id} idle`).toBe('slip')
    }
  }, 120_000)

  it('the clipping is a scene at home; the terrace close-ups are finds on the crowd', () => {
    expect(HOME_TEMPLATES).toContain('clipping-hunt')
    expect(buildLevel(specOf('clipping-hunt', 1, 1)).place).toBe('flat')
    for (const id of CROWD) expect(buildLevel(specOf(id, 1, 1)).place).toBe('crowd')
    // the clipping is three things hidden in the flat, never on show
    const l = buildLevel(specOf('clipping-hunt', 4, 1))
    for (const k of ['paper', 'scissors', 'glue']) expect(l.pickups.find(p => p.kind === k)?.inside, k).toBeTypeOf('number')
  })

  it('on the terrace, what he came back for has to be in his hand before the find counts', () => {
    for (const id of CROWD) for (let seed = 1; seed <= 6; seed++) {
      const l = buildLevel(specOf(id, seed, 1)), s = startSim(l), tg = l.targets[0]!
      expect(l.steps[0]!.kind, id).toBe('collect')
      expect(l.steps.at(-1)!.kind, id).toBe('goal')
      s.x = tg.x; s.z = tg.z
      stepSim(l, s, {...IDLE, act: true}, STEP)
      expect(s.ended, `${id} seed ${seed}: found with empty hands`).toBeNull()
      expect(s.events.some(e => e.k === 'notyet')).toBe(true)
      expect(s.wrong, 'standing by the one you came for is never a wrong guess').toBe(0)
    }
    expect(buildLevel(specOf('lost-scarf', 1, 1)).targets[0]!.kind).toBe('spot')
    expect(buildLevel(specOf('first-step', 1, 1)).targets[0]!.kind).toBe('person')
  })
})

describe('zoom missions: the archive tie prints only what the row records', () => {
  const home = night({on: '1986-05-24', us: 'home', result: 'won', hg: 1, ag: 0, scorers: [{name: 'A. Scorer', minute: 86}]})
  const away = night({on: '1992-01-31', us: 'away', result: 'lost'})

  it('a ground mission stands on the chapter’s own night, of the kind it needs, and prints its date as recorded', () => {
    const s = missionSpecFor(door, {template: 'first-step', mandatory: false}, {id: 'S1E3', age: 8, anchor: home}, ctx)!
    expect(s.anchor).toBe(home)
    expect(s.title).toBe(`Third from the fence · ${home.on}`)
    expect(s.brief).toContain('The Ground')
    // an away night is not a home night: the same mission plays neutral, with no date and no ground
    const n = missionSpecFor(door, {template: 'first-step', mandatory: false}, {id: 'S1E3', age: 8, anchor: away}, ctx)!
    expect(n.anchor).toBeNull()
    expect(n.title).toBe('Third from the fence')
    expect(n.brief).not.toContain('The Ground')
    expect(missionSpecFor(door, {template: 'away-pen', mandatory: false, beat: 'lost'}, {id: 'S1E6', age: 14, anchor: away}, ctx)!.anchor).toBe(away)
    expect(missionSpecFor(door, {template: 'lost-scarf', mandatory: false}, {id: 'S1E5', age: 12, anchor: home}, ctx)!.anchor).toBe(home)
  })

  it('a chapter with no night lends the paper of its week — only to the mission that asks for a night', () => {
    const paper = night({on: '1988-01-01', us: 'home', result: 'won'})
    const clip = missionSpecFor(door, {template: 'clipping-hunt', mandatory: false}, {id: 'S1E4', age: 10, paper}, ctx)!
    expect(clip.anchor).toBe(paper)
    expect(clip.title).toBe('The clipping · 1988-01-01')
    // the chapter's own night wins over the paper; a home mission with no anchor need stays neutral
    expect(missionSpecFor(door, {template: 'tin-hunt', mandatory: false}, {id: 'S1E2', age: 7, paper}, ctx)!.anchor).toBeNull()
    const neutral = missionSpecFor(door, {template: 'clipping-hunt', mandatory: false}, {id: 'S1E4', age: 10}, ctx)!
    expect(neutral.anchor).toBeNull()
    expect(neutral.title).toBe('The clipping')
    expect(`${neutral.title} ${neutral.brief}`).not.toMatch(/\d/)
    // Hebrew: the same rule
    const he = missionSpecFor(door, {template: 'clipping-hunt', mandatory: false}, {id: 'S1E4', age: 10}, {...ctx, locale: 'he'})!
    expect(he.title).toBe(TEMPLATE_HE['clipping-hunt']!.neutralTitle)
  })

  it('the clipping names a scorer only when the club’s own record lists every goal of that day — and never a minute', () => {
    const listed = night({on: '1990-05-12', us: 'home', result: 'won', hg: 2, ag: 0, scorers: [{name: 'First Man', minute: 12}, {name: 'Second Man', minute: null}]})
    expect(clippingNames(listed)).toEqual(['First Man', 'Second Man'])
    const partial = night({on: '1990-05-13', us: 'home', result: 'won', hg: 3, ag: 0, scorers: [{name: 'First Man', minute: 12}]})
    expect(clippingNames(partial), 'a record that does not list them all names nobody').toEqual([])
    expect(clippingNames(night({on: '1990-05-14', us: 'home', result: 'won'}))).toEqual([])
    expect(clippingNames(null)).toEqual([])
    const film = (p: ArchiveRef | null) => e4(p).cines!.find(c => c.id === 'e4-clip')!
    expect(linesOf(film(listed)).join(' ')).toContain('First Man, Second Man')
    expect(linesOf(film(partial)).join(' ')).not.toContain('First Man')
    // no line of a zoom film prints a score, a minute or a date: the archive row does that, on its own card
    const films = [...['won', 'lost', 'drew'].flatMap(r => e6(night({on: '1992-01-31', us: 'away', result: r as 'won'}), 14).cines!.filter(c => c.id.startsWith('e6-pen-'))),
      film(listed), film(null), e3(home, 8).cines!.find(c => c.id === 'e3-step')!, e5(home, 12).cines!.find(c => c.id === 'e5-scarf')!]
    for (const f of films) for (const t of linesOf(f)) expect(t, f.id).not.toMatch(/\d/)
  })

  it('the away end sounds like the night’s own result, from the row — never like another', () => {
    for (const r of ['won', 'lost', 'drew'] as const) {
      const ep = e6(night({on: '1992-01-31', us: 'away', result: r}), 14)
      const pen = stepOf(ep, 'pen')
      expect(pen.mission).toEqual({template: 'away-pen', beat: r})
      expect(pen.show).toEqual([{e: 'cine', id: `e6-pen-${r}`}])
      const l = buildLevel(specOf('away-pen', 3, 1, r))
      expect(l.steps.find(s => s.kind === 'talk')!.say).toBe(`npc.away-pen.${r}`)
    }
    expect(stepOf(e6(null, 14), 'pen').mission).toEqual({template: 'away-pen', beat: 'unread'})
  })
})

describe('zoom missions: words in both languages', () => {
  it('every key a zoom mission prints exists in English and Hebrew', () => {
    const keys = [
      ...ZOOM.flatMap(id => ['good', 'ok', 'slip'].map(o => `res.${o}.sub.${id}`)), ...ZOOM.map(id => `hud.clock.${id}`),
      'got.paper', 'got.scissors', 'got.glue', 'obj.clip.find', 'obj.clip.desk', 'clip.1', 'clip.2', 'clip.3',
      ...CROWD.flatMap(id => ['get', 'ask', 'goal'].map(k => `obj.${id}.${k}`)), 'npc.first-step', 'npc.lost-scarf',
      ...['won', 'lost', 'drew', 'unread'].map(r => `npc.away-pen.${r}`),
    ]
    for (const lang of ['en', 'he'] as const) for (const k of keys) {
      expect(k in RUSH_WORDS[lang], `${lang} ${k}`).toBe(true)
      expect(rushWord(lang, k).length, `${lang} ${k}`).toBeGreaterThan(2)
    }
    for (const id of ZOOM) {
      expect(TEMPLATE_HE[id], id).toBeTruthy()
      for (const key of ['{date}', '{rival}', '{ground}']) expect(`${TEMPLATE_HE[id]!.neutralTitle} ${TEMPLATE_HE[id]!.neutralBrief}`).not.toContain(key)
    }
    // every step a zoom level prints has its words
    for (const id of ZOOM) for (const beat of id === 'away-pen' ? ['won', 'lost', 'drew', null] : [null]) {
      const l = buildLevel(specOf(id, 2, 1, beat))
      for (const s of l.steps) for (const k of [s.key, s.say].filter((x): x is string => !!x)) for (const lang of ['en', 'he'] as const) expect(k in RUSH_WORDS[lang], `${lang} ${k}`).toBe(true)
      for (const v of l.voice) expect(v.key in RUSH_WORDS.he, v.key).toBe(true)
    }
  })
})

describe('zoom missions: each episode wires its mission where the story is, and a film pays it off', () => {
  const home = night({on: '1986-05-24', us: 'home', result: 'won'})
  const wired: [EpisodeScript, string, string, string][] = [
    [e3(home, 8), 'step', 'first-step', 'e3-step'],
    [e4(night({on: '1988-01-01', us: 'home', result: 'won'})), 'clip', 'clipping-hunt', 'e4-clip'],
    [e5(home, 12), 'dad', 'lost-scarf', 'e5-scarf'],
    [e6(night({on: '1992-01-31', us: 'away', result: 'won'}), 14), 'pen', 'away-pen', 'e6-pen-won'],
  ]
  for (const [ep, step, template, film] of wired) it(`${ep.id} · ${step}: ${template}, then ${film}`, () => {
    const s = stepOf(ep, step)
    expect(s.mission?.template).toBe(template)
    expect(s.mission?.mandatory, 'a zoom mission keeps its quiet skip').not.toBe(true)
    expect(s.game, 'a fallback when the mission cannot play').toBeTruthy()
    expect(s.show?.some(x => x.e === 'cine' && x.id === film)).toBe(true)
    expect(ep.cines!.some(c => c.id === film)).toBe(true)
    // a slip never ends the story: the step still leads on
    expect(s.final).not.toBe(true)
    expect(s.slip?.length, 'a slip has its own words').toBeGreaterThan(0)
  })

  it('E4 opens at home on the paper, and the bell only starts once the clipping is in', () => {
    const ep = e4(night({on: '1988-01-01', us: 'home', result: 'won'}))
    expect(ep.start.room).toBe('bedroom')
    expect(ep.steps[0]!.id).toBe('clip')
    expect(ep.steps[0]!.cut?.room).toBe('schoolyard')
    expect(ep.clock?.from).toEqual({flag: 's1:S1E4:clip:done'})
    expect(ep.paper?.on).toBe('1988-01-01')
    expect(e4(null).paper).toBeUndefined()
  })

  it('E6: a missed bus home is a later kitchen, never a dead end', () => {
    const ep = e6(null, 14)
    const pen = stepOf(ep, 'pen'), home = stepOf(ep, 'home')
    expect(pen.reward?.slip?.some(f => f.e === 'flag')).toBe(true)
    expect(home.after).toEqual(['pen'])
    expect(home.callbacks?.some(c => JSON.stringify(c.when).includes('pen:late'))).toBe(true)
  })
})

describe('the season stands its zoom missions on the BIG nights', () => {
  it('a final, a title, a European night outweigh a bigger league win; a won night outweighs a lost one', () => {
    const final = night({on: '1990-06-01', us: 'home', result: 'won', hint: 'Cup final'})
    const league = night({on: '1990-05-01', us: 'home', result: 'won', hg: 6, ag: 0})
    const europe = night({on: '1990-09-20', us: 'home', result: 'drew', hint: 'UEFA Cup, first round'})
    const lost = night({on: '1990-04-01', us: 'home', result: 'lost'})
    expect(weight(final)).toBeGreaterThan(weight(league))
    expect(weight(europe)).toBeGreaterThan(weight(league))
    expect(weight(league)).toBeGreaterThan(weight(lost))
    // a semi-final is not a final
    expect(weight(night({on: '1990-05-20', us: 'home', result: 'won', hint: 'Cup semi-final'}))).toBeLessThan(weight(final))
  })

  it('picks the biggest fitting night for each ground episode, never twice, and the pack’s own choice still comes first', () => {
    const born = 1978
    const nights = [
      night({on: '1986-03-01', us: 'home', result: 'won', hg: 3, ag: 0}),
      night({on: '1986-05-24', us: 'home', result: 'won', hint: 'Cup final'}),
      night({on: '1990-04-01', us: 'home', result: 'won'}),
      night({on: '1990-05-12', us: 'home', result: 'won', hint: 'title secured on the last day', title: 'Club 2–0 Other, league title secured'}),
      night({on: '1992-01-31', us: 'away', result: 'won'}),
      night({on: '1992-03-01', us: 'away', result: 'won', hint: 'UEFA Cup, second round'}),
    ]
    const eps = seasonOne({birthYear: born, nights})
    const on = (id: string) => eps.find(c => c.id === id)!.anchor?.on
    expect(on('S1E3')).toBe('1986-05-24')
    expect(on('S1E5')).toBe('1990-05-12')
    expect(on('S1E6')).toBe('1992-03-01')
    const stood = eps.flatMap(c => [c.anchor?.factId, c.paper?.factId].filter(Boolean))
    expect(new Set(stood).size).toBe(stood.length)
    // the pack chose the smaller night by hand: it stands
    const chosen = seasonOne({birthYear: born, nights, chosen: [nights[0]!.factId]})
    expect(chosen.find(c => c.id === 'S1E3')!.anchor?.on).toBe('1986-03-01')
  })
})
