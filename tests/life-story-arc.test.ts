/**
 * LIFE · the hood — the WHOLE LIFE beyond childhood (teens, on your own, your turn), checked against the director.
 *
 * Holds: every mission is a valid `Mission` by the director's own rules (2–4 approaches, two always open on a main,
 * a complication, a spine of real mains with non-decreasing ages and same-age forks), every match night carries a
 * Fitter template whose ages fit, the ultras route is the only one on ultras templates, the routes are forks that
 * converge, every printed word exists and holds no Hapoel or Israel name, no date and no score, and a seeded life
 * walked from six to forty-eight with the director's semantics never runs out of missions, for every core club.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {rng} from '@/lib/life/rush/level'
import {templateById} from '@/lib/life/rush/templates'
import {
  accept, CHILDHOOD, doneFlag, endDay, holds, isFinished, MATCHDAY, MISSIONS, newLife, nextMissions, nightFor, objectiveKey, resolve, ROUTES, STANDING, stepsOf, STORY_WORDS,
  type Approach, type Effect, type Mission, type StoryState,
} from '@/lib/life/hood/story'
import {LIFE_MISSIONS, LIFE_SPINE, LIFE_STAGES, lifeStageOf, routeFlag, routeOf, standingFor, stageById} from '@/lib/life/hood/story/stages'
import {ARC_WORDS, arcWord} from '@/lib/life/hood/story/arc-words'

const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0 }
const BY_ID = new Map(LIFE_MISSIONS.map(m => [m.id, m]))
const LATER = LIFE_STAGES.filter(s => s.id !== 'child')
const WORDS: Record<string, string> = {...STORY_WORDS, ...ARC_WORDS}
const PEOPLE = ['dad', 'mate', 'kiosk', 'neighbour']
const PLACES = ['home', 'kiosk', 'corner', 'school', 'pitch', 'ground']
const allEffects = (m: Mission): Effect[] => [...m.aftermath, ...m.approaches.flatMap(a => a.effects), ...(m.complication?.choices.flatMap(c => c.effects) ?? [])]
const setsFlag = (m: Mission, f: string) => allEffects(m).some(e => 'flag' in e && e.flag === f)

describe('the whole life: shape', () => {
  it('reuses childhood unchanged and adds three authored stages that tile six to forty-eight', () => {
    expect(LIFE_STAGES.map(s => s.id)).toEqual(['child', 'teen', 'young', 'adult'])
    expect(stageById('child').missions).toBe(CHILDHOOD); expect(stageById('child').standing).toBe(STANDING)
    for (const m of MISSIONS) expect(BY_ID.get(m.id), m.id).toBe(m)
    for (let i = 1; i < LIFE_STAGES.length; i++) expect(LIFE_STAGES[i]!.ages[0]).toBe(LIFE_STAGES[i - 1]!.ages[1] + 1)
    expect(LIFE_STAGES[0]!.ages).toEqual([6, 12]); expect(LIFE_STAGES[3]!.ages).toEqual([31, 48])
    for (const s of LIFE_STAGES) { expect(s.question in WORDS, s.question).toBe(true); expect(s.theme in WORDS, s.theme).toBe(true) }
    expect(lifeStageOf(15).id).toBe('teen'); expect(lifeStageOf(60).id).toBe('adult')
    expect(new Set(LIFE_MISSIONS.map(m => m.id)).size).toBe(LIFE_MISSIONS.length)
  })

  it.each(LATER.map(s => [s.id, s]))('%s: eight to twelve chapters, each a valid mission by the director\'s rules', (_id, stage) => {
    expect(stage.missions.length).toBeGreaterThanOrEqual(8); expect(stage.missions.length).toBeLessThanOrEqual(12)
    expect(stage.spine.flat().sort()).toEqual(stage.missions.map(m => m.id).sort())
    for (const m of stage.missions) {
      expect(m.kind, m.id).toBe('main'); expect(m.stage, m.id).toBe(stage.id)
      expect(m.age, m.id).toBeGreaterThanOrEqual(stage.ages[0]); expect(m.age, m.id).toBeLessThanOrEqual(stage.ages[1])
      expect(m.approaches.length, m.id).toBeGreaterThanOrEqual(2); expect(m.approaches.length, m.id).toBeLessThanOrEqual(4)
      expect(m.approaches.filter(a => !a.needs).length, m.id).toBeGreaterThanOrEqual(2)
      expect(new Set(m.approaches.map(a => a.id)).size, m.id).toBe(m.approaches.length)
      expect(m.complication!.choices.length, m.id).toBeGreaterThanOrEqual(2); expect(m.complication!.choices.length, m.id).toBeLessThanOrEqual(3)
      expect(m.aftermath.length, m.id).toBeGreaterThan(0)
      expect(PEOPLE, m.id).toContain(m.giver); expect(PLACES, m.id).toContain(m.place)
      for (const a of m.approaches) for (const st of stepsOf(m, a.id)) {
        if (st.do === 'talk') expect(PEOPLE).toContain(st.who); else expect(PLACES).toContain(st.at)
      }
    }
    for (const m of [...stage.sides, ...stage.standing]) {
      expect(m.stage, m.id).toBe(stage.id); expect(m.complication, m.id).toBeNull(); expect(m.approaches.length, m.id).toBeGreaterThanOrEqual(1)
    }
    // the standing work is open to anyone at any time: it is what makes "always a mission" true
    expect(stage.standing.length).toBeGreaterThanOrEqual(2)
    for (const m of stage.standing) { expect(m.kind).toBe('standing'); expect(m.needs, m.id).toBeUndefined(); expect(m.approaches.some(a => !a.needs), m.id).toBe(true) }
  })

  it('walks one spine from six to forty-eight: real mains, ages never go back, a fork is one age', () => {
    const ages = LIFE_SPINE.map(slot => { const a = slot.map(id => BY_ID.get(id)!.age); expect(new Set(a).size, slot.join('|')).toBe(1); return a[0]! })
    expect([...ages].sort((x, y) => x - y)).toEqual(ages)
    expect(ages[0]).toBe(6); expect(ages[ages.length - 1]).toBe(48)
    for (const id of LIFE_SPINE.flat()) expect(BY_ID.get(id)?.kind, id).toBe('main')
  })

  it('carries a Fitter template on every match night, real and fitting the age; ultras templates only on the ultras route', () => {
    for (const s of LATER) for (const m of s.missions) {
      if (m.day === 'matchday') expect(m.template, `${m.id} is a match night without a template`).not.toBeNull()
      if (!m.template) continue
      const t = templateById(m.template)
      expect(t, `${m.id}: unknown template ${m.template}`).not.toBeNull()
      expect(m.age, `${m.id}: ${m.template} is for ages ${t!.ages.join('–')}`).toBeGreaterThanOrEqual(t!.ages[0]); expect(m.age).toBeLessThanOrEqual(t!.ages[1])
      if (t!.route === 'ultras') expect(setsFlag(m, routeFlag('ultras')), `${m.id} plays an ultras template off the ultras route`).toBe(true)
      // with no Fitter row the chapter is personal: never a date
      expect(nightFor(m, []).dated).toBe(false)
    }
  })

  it('offers every route as a fork that converges on the next shared chapter', () => {
    for (const s of LIFE_STAGES.filter(x => x.routeFork)) {
      const at = s.spine.findIndex(slot => slot.length > 1)
      const fork = s.spine[at]!
      expect(fork.every(id => BY_ID.get(id)!.fork === s.routeFork)).toBe(true)
      expect(s.spine[at + 1]!.length, `${s.id}: the fork must converge on one chapter`).toBe(1)
      for (const id of fork) expect(allEffects(BY_ID.get(id)!).filter(e => 'flag' in e && e.flag.startsWith('story:route:')).length, id).toBe(1)
    }
    const routed = new Set(LATER.flatMap(s => s.missions).flatMap(m => ROUTES.filter(r => setsFlag(m, routeFlag(r)))))
    expect([...routed].sort()).toEqual([...ROUTES].sort())
    // later approaches lean on the route; none of them is the only way through
    const leaning = LATER.flatMap(s => s.missions).flatMap(m => m.approaches.filter(a => a.needs?.has?.some(f => f.startsWith('story:route:'))))
    expect(leaning.length).toBeGreaterThanOrEqual(4)
    expect(routeOf({flags: {}})).toBe('family'); expect(routeOf({flags: {'story:lean': 'far'}})).toBe('far')
  })
})

describe('the whole life: words', () => {
  it('prints only words that exist', () => {
    const need = new Set<string>()
    for (const m of LATER.flatMap(s => [...s.missions, ...s.sides, ...s.standing])) {
      const k = `story.m.${m.id}`
      for (const s of ['title', 'offer', 'again', 'done', 'aftermath']) need.add(`${k}.${s}`)
      for (const a of m.approaches) { need.add(`${k}.a.${a.id}`); for (const st of stepsOf(m, a.id)) { need.add(objectiveKey(st)); if (st.do === 'talk') need.add(st.say) } }
      if (m.complication) { need.add(`${k}.c`); for (const c of m.complication.choices) need.add(`${k}.c.${c.id}`) }
      for (const e of allEffects(m)) if ('keep' in e) need.add(`story.keep.${e.keep}`)
    }
    expect([...need].filter(k => !(k in WORDS))).toEqual([])
    // the arc's words are in the one table, and no childhood word stands over an arc word of the same key
    expect(Object.keys(ARC_WORDS).filter(k => STORY_WORDS[k] !== ARC_WORDS[k])).toEqual([])
    expect(arcWord('story.m.the-drift.offer', {mate: 'Sam'})).toContain('Sam')
  })

  it('holds no date, no score, no digit, no club, and nothing Hapoel- or Israel-specific', () => {
    const banned = /hapoel|maccabi|beitar|bnei|ussishkin|bloomfield|tel aviv|jaffa|allenby|israel|jerusalem|egged|toto|shekel|agorot|kibbutz|\barmy\b|\bidf\b|soldier|commander|gate (five|seven|5|7)|pogi|kobi|rachel|ofir|amit|keren|\befi\b|sinai|liron|shachor|limor|celtic|olympiacos|panathinaikos/i
    for (const [k, v] of Object.entries(ARC_WORDS)) {
      expect(v, k).not.toMatch(/\d/)
      expect(v, k).not.toMatch(/[֐-׿Ͱ-Ͽ]/)
      expect(v, k).not.toMatch(banned)
    }
    // ids are text too: nothing Hapoel-only hides in a mission id, a flag or a keepsake
    for (const m of LATER.flatMap(s => [...s.missions, ...s.sides, ...s.standing])) {
      expect(m.id).not.toMatch(banned)
      for (const e of allEffects(m)) expect(JSON.stringify(e), m.id).not.toMatch(banned)
    }
  })
})

/* ---- a seeded life with the director's own semantics (director.ts plays childhood; this walks the rest the same way) ---- */
type Walk = {state: StoryState; path: string[]; stageEnds: string[]}
function applyAll(s: StoryState, effects: readonly Effect[]): StoryState {
  const n = {...s, flags: {...s.flags}, bonds: {...s.bonds}, keeps: [...s.keeps]}
  for (const e of effects) {
    if ('flag' in e) n.flags[e.flag] = e.v ?? true
    else if ('bond' in e) n.bonds[e.bond] = (n.bonds[e.bond] ?? 0) + e.n
    else if ('money' in e) n.money = Math.max(0, n.money + e.money)
    else if ('rep' in e) n.rep += e.rep
    else if (!n.keeps.includes(e.keep)) n.keeps.push(e.keep)
  }
  return n
}
const slotAt = (s: StoryState) => { let i = 0; while (i < LIFE_SPINE.length && LIFE_SPINE[i]!.some(id => s.done.includes(id))) i++; return i }
const openOf = (s: StoryState, m: Mission): Approach[] => m.approaches.filter(a => holds(s, a.needs))
function offersOf(s: StoryState): {m: Mission; ways: Approach[]; why: string}[] {
  const slot = LIFE_SPINE[slotAt(s)]
  const ahead = slot ? slot.map(id => BY_ID.get(id)!) : []
  const waits = !ahead.length || ahead.some(m => m.day === 'any') ? 0 : (MATCHDAY - s.day + 7) % 7
  const main = waits === 0 ? ahead.map(m => ({m, ways: openOf(s, m), why: 'main'})) : []
  const sides = LIFE_MISSIONS.filter(m => m.kind === 'side' && !s.done.includes(m.id) && m.age <= s.age && holds(s, m.needs)).map(m => ({m, ways: openOf(s, m), why: 'side'}))
  const standing = main.length ? [] : standingFor(s.age).map(m => ({m, ways: openOf(s, m), why: 'standing'}))
  return [...main, ...sides, ...standing].filter(o => o.ways.length > 0)
}
function liveWhole(seed: number, cap = 4000): Walk {
  const r = rng(seed)
  // the whole life through the director itself (it plays six to forty-eight since 24.11.2026)
  let s = newLife(); const path: string[] = [], stageEnds: string[] = []
  let turns = 0
  while (!isFinished(s)) {
    if (++turns > cap) throw new Error(`life ${seed} stuck at slot ${slotAt(s)} (${LIFE_SPINE[slotAt(s)]})`)
    const o = nextMissions(s)
    expect(o.length, `seed ${seed} age ${s.age} day ${s.day}: nothing offered`).toBeGreaterThan(0)
    // the director's offers are exactly this file's reading of the stages
    expect(o.map(x => x.mission.id)).toEqual(offersOf(s).map(x => x.m.id))
    if (r() < 0.06) { s = endDay(s).state; continue }
    const pick = o[Math.floor(r() * o.length)]!, how = pick.approaches[Math.floor(r() * pick.approaches.length)]!
    const cs = pick.mission.complication?.choices ?? []
    const out = resolve(accept(s, pick.mission.id, how.id), cs.length ? cs[Math.floor(r() * cs.length)]!.id : undefined)
    s = out.state; path.push(`${pick.mission.id}/${how.id}`)
    for (const e of out.events) if (e.k === 'stage-end') stageEnds.push(e.stage)
  }
  expect(s.route).toBe(routeOf(s))
  return {state: s, path, stageEnds}
}

describe('the whole life: always a mission in front of you', () => {
  it.each(CORE_CLUB_IDS.map(id => [id]))('%s: seeded lives walk from six to forty-eight and never run out', id => {
    for (let n = 0; n < 8; n++) {
      const seed = hash(`${id}#arc#${n}`)
      const a = liveWhole(seed), b = liveWhole(seed)
      expect(b.path, `${id} #${n} is not deterministic`).toEqual(a.path)
      expect(a.state.age).toBe(48)
      expect(a.stageEnds).toEqual(['child', 'teen', 'young', 'adult'])
      expect(a.state.flags['story:life-written']).toBe(true)
      expect(a.state.keeps).toEqual(expect.arrayContaining(['box', 'away-ticket', 'season-card', 'small-shirt', 'empty-shelf']))
      expect(a.state.money).toBeGreaterThanOrEqual(0)
      // one side of each route fork, never two
      for (const s of LIFE_STAGES.filter(x => x.routeFork)) expect(a.state.done.filter(d => BY_ID.get(d)?.fork === s.routeFork).length).toBe(1)
      // the written life is over; the street is not
      let s = a.state
      for (let i = 0; i < 10; i++) { const o = offersOf(s); expect(o.length).toBeGreaterThan(0); s = applyAll({...s, times: {...s.times}}, o[0]!.ways[0]!.effects) }
    }
  })

  it('reaches every approach and every complication answer of the later stages across seeds', () => {
    const seen = new Set<string>()
    for (let n = 0; n < 500; n++) { const l = liveWhole(hash(`arc-cover#${n}`)); l.path.forEach(p => seen.add(p)); for (const [k, v] of Object.entries(l.state.flags)) if (k.startsWith('story:met:')) seen.add(`${k.slice(10)}?${v}`) }
    const want = LATER.flatMap(s => s.missions).flatMap(m => [...m.approaches.map(a => `${m.id}/${a.id}`), ...m.complication!.choices.map(c => `${m.id}?${c.id}`)])
    expect(want.filter(w => !seen.has(w))).toEqual([])
  })
})
