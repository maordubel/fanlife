/**
 * LIFE · RUSH — the level, the simulation, the handoff (ADR-fanlife-0013, M1–M2).
 *
 * The promise this file holds: every mission template, at every difficulty, on every seed, can be
 * won — and is not won by doing nothing. Story mode never lets a mission end in a slip. A mission
 * inside a universal chapter never prints a date. RUSH words exist in both languages.
 */
import {describe, expect, it} from 'vitest'
import {buildLevel, cluesShown, lookMatches} from '@/lib/life/rush/level'
import {botInput, IDLE, resultOf, startSim, stepSim} from '@/lib/life/rush/sim'
import {MAX_EVIDENCE, resultProblems, type MissionSpec} from '@/lib/life/rush/spec'
import {MISSION_TEMPLATES, TEMPLATE_HE, templateById} from '@/lib/life/rush/templates'
import {chapterFit, type Fit} from '@/lib/life/rush/fit'
import {missionFlags, missionSpecFor, type RushDoor} from '@/lib/life/rush/call'
import {RUSH_WORDS} from '@/lib/life/rush/words'
import {screenplayChapters} from '@/lib/life/universal/screenplay'
import {MASTER_IDS, masterChapters} from '@/lib/life/universal/screenplay/master'
import type {ArchiveRef, Effect} from '@/lib/life/universal/types'

const SEEDS = Array.from({length: 12}, (_, i) => i + 1)

function specOf(template: string, seed: number, difficulty: 0 | 1 | 2): MissionSpec {
  const t = templateById(template)!
  return {template, verb: t.verb, camera: t.camera, route: t.route, seed, skin: 'test', age: 20, time: 'night', weather: 'clear', clock: t.clock, hazards: [...t.hazards], difficulty, mandatory: false, anchor: null, title: '', brief: ''}
}

function play(spec: MissionSpec, who: 'bot' | 'idle', assist = false, limit = 60 * 900) {
  const level = buildLevel(spec), s = startSim(level, assist)
  let n = 0
  while (!s.ended && n < limit) { stepSim(level, s, who === 'bot' ? botInput(level, s) : IDLE); n++ }
  return {level, s}
}

describe('RUSH · every mission can be won, and is not won by standing still', () => {
  for (const t of MISSION_TEMPLATES) for (const d of [0, 1, 2] as const) {
    it(`${t.id} · difficulty ${d}`, () => {
      const lost: string[] = []
      for (const seed of SEEDS) {
        const {s} = play(specOf(t.id, seed, d), 'bot')
        if (s.ended !== 'good') lost.push(`seed ${seed}: ${s.ended} after ${Math.round(s.t)}s, ${s.hits} hits, ${s.caught} caught`)
        const idle = play(specOf(t.id, seed, d), 'idle')
        if (idle.s.ended !== 'slip') lost.push(`seed ${seed}: standing still ended ${idle.s.ended}`)
      }
      expect(lost, lost.join('\n')).toEqual([])
    }, 60_000)
  }
})

describe('RUSH · story mode never ends in a slip', () => {
  it('a player who stands still in story mode is never sent home — the clock stops at zero', () => {
    for (const t of MISSION_TEMPLATES) {
      const {s} = play(specOf(t.id, 3, 1), 'idle', true, 60 * 400)
      expect(s.ended, t.id).not.toBe('slip')
      expect(s.clock, t.id).toBeGreaterThanOrEqual(0)
    }
  })
  it('a mission finished in story mode comes home as ok, never as good', () => {
    for (const t of MISSION_TEMPLATES) {
      const {level, s} = play(specOf(t.id, 4, 1), 'bot', true)
      expect(s.ended, t.id).toBe('ok')
      expect(resultOf(level, s).assisted).toBe(true)
    }
  })
})

describe('RUSH · determinism', () => {
  it('the same spec builds the same level and plays the same run', () => {
    for (const t of MISSION_TEMPLATES) {
      const a = play(specOf(t.id, 7, 2), 'bot'), b = play(specOf(t.id, 7, 2), 'bot')
      expect(JSON.stringify(a.level)).toBe(JSON.stringify(b.level))
      expect([a.s.t, a.s.x, a.s.z, a.s.hits, a.s.ended]).toEqual([b.s.t, b.s.x, b.s.z, b.s.hits, b.s.ended])
    }
  })
  it('a different seed is a different street', () => {
    const a = buildLevel(specOf('kickoff-run', 1, 1)), b = buildLevel(specOf('kickoff-run', 2, 1))
    expect(JSON.stringify(a.cars)).not.toBe(JSON.stringify(b.cars))
  })
})

describe('RUSH · the level keeps its own promises', () => {
  it('a find mission has exactly one person who answers every clue', () => {
    for (const id of ['europe-night', 'title-night']) for (const seed of SEEDS) {
      const level = buildLevel(specOf(id, seed, 1)), tg = level.targets[0]!
      expect(tg.kind).toBe('person')
      const twins = level.standers.filter(p => tg.clues.every(c => lookMatches(p.look, c)))
      expect(twins, `${id} seed ${seed}`).toEqual([])
      expect(tg.clues.every(c => lookMatches(tg.look!, c))).toBe(true)
    }
  })
  it('clues come one at a time: one at the start, all three before the gates shut', () => {
    const level = buildLevel(specOf('where-you-stood', 1, 0))
    expect(cluesShown(level, 0)).toHaveLength(1)
    expect(cluesShown(level, 40).length).toBe(level.targets[0]!.clues.length)
  })
  it('the main route never throws or shoves: only the ultras route has rivals in it', () => {
    for (const t of MISSION_TEMPLATES) {
      const level = buildLevel(specOf(t.id, 5, 2))
      if (t.route === 'main') {
        expect(level.throwers, t.id).toEqual([])
        expect(level.standers.filter(p => p.role === 'rival'), t.id).toEqual([])
      }
    }
  })
  it('the way into the ground is left open: nobody stands in the queue lane at the gate', () => {
    for (const seed of SEEDS) {
      const level = buildLevel(specOf('kickoff-run', seed, 1))
      expect(level.standers.filter(p => Math.abs(p.x) < 1.6 && p.z < level.goal.z + 16)).toEqual([])
    }
  })
})

describe('RUSH · the result LIFE receives', () => {
  it('carries at most three proofs, and a skip is always ok', () => {
    for (const t of MISSION_TEMPLATES) {
      const {level, s} = play(specOf(t.id, 2, 0), 'bot')
      const r = resultOf(level, s)
      expect(r.evidence.length).toBeLessThanOrEqual(MAX_EVIDENCE)
      expect(resultProblems(r, false)).toEqual([])
      const skipped = resultOf(level, s, {skipped: true})
      expect(skipped.outcome).toBe('ok')
      expect(resultProblems(skipped, true)).toContain('a mandatory mission cannot be skipped')
    }
  })
  it('becomes life flags that outlive the chapter', () => {
    const f = missionFlags('kickoff-run', {outcome: 'good', evidence: ['made-it', 'clean'], skipped: false})
    expect(f.every(x => x.k.startsWith('life:rush:kickoff-run'))).toBe(true)
    expect(f[0]).toEqual({k: 'life:rush:kickoff-run', v: 'good'})
  })
})

describe('RUSH · a mission inside a chapter', () => {
  const night: ArchiveRef = {factId: 'f1', title: 'Hapoel Tel Aviv 2–1 Maccabi Tel Aviv', on: '1986-05-24', year: 1986, precision: 'day', hint: 'league', locale: 'en', sources: []}
  const base: Fit = {clubId: 'x', template: 'kickoff-run', state: 'READY', anchor: night, relevance: 1, research: []}
  const view = {rival: {name: 'Maccabi Tel Aviv', aliases: []}, ownNames: ['Hapoel Tel Aviv']}
  it('a universal chapter (no night) plays the neutral version, whatever the club holds', () => {
    expect(chapterFit(templateById('kickoff-run')!, base, null, view).state).toBe('NEUTRAL')
  })
  it('an anchored chapter lends its own night when it is the kind the mission needs', () => {
    const f = chapterFit(templateById('kickoff-run')!, base, night, view)
    expect(f.state).toBe('READY')
    expect(f.anchor).toBe(night)
  })
  it('a club that cannot play a mission cannot play it inside a chapter either', () => {
    expect(chapterFit(templateById('derby-banner-raid')!, {...base, template: 'derby-banner-raid', state: 'IRRELEVANT', anchor: null}, night, view).state).toBe('IRRELEVANT')
  })
  const door: RushDoor = {fits: MISSION_TEMPLATES.map(t => ({clubId: 'x', template: t.id, state: t.id === 'title-night' ? 'HELD' : 'NEUTRAL', anchor: null, relevance: 1, research: []})), view: {clubId: 'x', name: 'Club', city: 'City', ownNames: ['Club'], rival: null, ground: null}, gateLabel: 'Gate 5'}
  it('the age decides: a child never drives the away day', () => {
    expect(missionSpecFor(door, {template: 'away-day', mandatory: false}, {id: 'c', age: 9}, {time: 'day', locale: 'en', playId: 'p'})).toBeNull()
    expect(missionSpecFor(door, {template: 'away-day', mandatory: false}, {id: 'c', age: 27}, {time: 'day', locale: 'en', playId: 'p'})).not.toBeNull()
  })
  it('a held mission is not played — the script\'s fallback plays instead', () => {
    expect(missionSpecFor(door, {template: 'title-night', mandatory: false}, {id: 'c', age: 27}, {time: 'day', locale: 'en', playId: 'p'})).toBeNull()
  })
  it('the switch off (no door) means no mission at all', () => {
    expect(missionSpecFor(null, {template: 'kickoff-run', mandatory: false}, {id: 'c', age: 27}, {time: 'day', locale: 'en', playId: 'p'})).toBeNull()
  })
  it('the Hebrew mission is in Hebrew and still never prints a date in its neutral version', () => {
    const spec = missionSpecFor(door, {template: 'kickoff-run', mandatory: true}, {id: 'c', age: 27}, {time: 'day', locale: 'he', playId: 'p'})!
    expect(spec.title).toBe(TEMPLATE_HE['kickoff-run']!.neutralTitle)
    expect(spec.mandatory).toBe(true)
    expect(/\d{4}/.test(spec.title + spec.brief)).toBe(false)
  })
})

describe('RUSH · words', () => {
  it('every key exists in both languages, and nothing is empty', () => {
    expect(Object.keys(RUSH_WORDS.he).sort()).toEqual(Object.keys(RUSH_WORDS.en).sort())
    for (const loc of ['en', 'he'] as const) for (const [k, v] of Object.entries(RUSH_WORDS[loc])) expect(v.trim(), `${loc}.${k}`).not.toBe('')
  })
  it('every line a level can say and every clue it can give has words', () => {
    for (const t of MISSION_TEMPLATES) for (const seed of [1, 2, 3]) {
      const level = buildLevel(specOf(t.id, seed, 1))
      for (const v of level.voice) expect(RUSH_WORDS.en, v.key).toHaveProperty(v.key)
      for (const c of level.targets[0]?.clues ?? []) expect(RUSH_WORDS.en, c).toHaveProperty(`clue.${c}`)
    }
  })
  it('every template has its Hebrew, and the Hebrew neutral lines keep the same rule', () => {
    for (const t of MISSION_TEMPLATES) {
      const he = TEMPLATE_HE[t.id]
      expect(he, t.id).toBeTruthy()
      for (const token of ['{date}', '{rival}', '{ground}']) expect(`${he!.neutralTitle} ${he!.neutralBrief}`.includes(token), `${t.id} ${token}`).toBe(false)
    }
  })
})

describe('RUSH · the screenplay asks for missions that exist', () => {
  const plays = (fx: readonly Effect[] | undefined, out: Extract<Effect, {e: 'play'}>[] = []) => { for (const e of fx ?? []) if (e.e === 'play') { out.push(e); plays(e.then, out); plays(e.good, out); plays(e.slip, out) } return out }
  for (const locale of ['en', 'he'] as const) it(`every mission in the ${locale} screenplay names a real template, fits the chapter's age, and has a way through without RUSH`, () => {
    let found = 0
    for (const ch of [...screenplayChapters(locale), ...masterChapters(MASTER_IDS, locale)]) for (const talk of ch.talks) for (const b of talk.branches) {
      const all = [...plays(b.then), ...(b.choices ?? []).flatMap(c => plays(c.then))]
      for (const p of all) if (p.mission) {
        found++
        const t = templateById(p.mission.template)
        expect(t, `${ch.id} → ${p.mission.template}`).toBeTruthy()
        expect(ch.age >= t!.ages[0] && ch.age <= t!.ages[1], `${ch.id} is age ${ch.age}, ${t!.id} is for ${t!.ages.join('–')}`).toBe(true)
        // without RUSH the choice still happens: its `then` carries the story
        expect((p.then ?? []).length, `${ch.id}`).toBeGreaterThan(0)
      }
    }
    expect(found).toBeGreaterThan(0)
  })
  it('the ultras missions are asked for only on the terrace route, and a mandatory mission exists', () => {
    const asked: {chapter: string; template: string; mandatory: boolean}[] = []
    for (const ch of [...screenplayChapters('en'), ...masterChapters(MASTER_IDS, 'en')]) for (const talk of ch.talks) for (const b of talk.branches) for (const p of [...plays(b.then), ...(b.choices ?? []).flatMap(c => plays(c.then))]) if (p.mission) asked.push({chapter: ch.id, template: p.mission.template, mandatory: p.mission.mandatory})
    for (const a of asked) if (templateById(a.template)!.route === 'ultras') expect(a.chapter, a.template).toBe('R-TER')
    expect(asked.some(a => a.mandatory)).toBe(true)
    // sneak waits for a scene in the bible (the banner raid): the owner's script decides where it goes
    expect(new Set(asked.map(a => templateById(a.template)!.verb))).toEqual(new Set(['run', 'carry', 'drive', 'find']))
  })
})
