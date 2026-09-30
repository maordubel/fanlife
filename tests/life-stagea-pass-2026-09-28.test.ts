// the chapter registry first: `prices → chapters → income → prices` is a load cycle
import '@/lib/life/content/chapters'

import { describe, expect, it } from 'vitest'

import { CHAPTER } from '@/lib/life/content/chapters'
import { A3_TIPOFF } from '@/lib/life/content/chapterStageA'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { GESTURES } from '@/lib/life/content/gestures'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { LifeEvent } from '@/lib/life/events'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { SCENE, inEra, sceneIn } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'
import type { LocationId } from '@/lib/life/types'

import { WALK_AWAY, WorldSim, type Answer } from './fixtures/lifeWorldSim'

/**
 * Stage A implementation pass (28.9.2026, `docs/life/IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27.md`
 * §1–§8). What each chapter now does that it did not: a verb in the hand, a choice that
 * costs, a person who moves first, a world that changes before the card — and a flag the
 * NEXT chapter reads. Every test names the brief line it holds.
 */

const read = (choices: readonly DialogueChoice[]) => choices.find((c) => c.enabled)?.id ?? WALK_AWAY
const pick = (id: string) => (choices: readonly DialogueChoice[]) => (choices.some((c) => c.id === id && c.enabled) ? id : WALK_AWAY)
const pickAny = (...ids: string[]) => (choices: readonly DialogueChoice[]) => ids.find((id) => choices.some((c) => c.id === id && c.enabled)) ?? WALK_AWAY

function make(chapter: string, log?: readonly LifeEvent[], beatAnswer: Answer = read) {
  const sim = new WorldSim(chapter, log)
  sim.beatAnswer = beatAnswer
  // story chores done in full, rides ridden — the hands of a player who does the thing
  sim.onMinigame = (id, world) => {
    if (id.startsWith('chore:story:')) {
      const chore = STORY_CHORES[id.slice('chore:story:'.length)]
      if (!chore) return
      const events = chore.finish(chore.shape.target, chore.shape.target)
      if (events.length) world.engine.dispatch(...events)
      world.go(chore.where)
    }
  }
  return sim
}

function whereIs(sim: WorldSim, id: string): LocationId | null {
  if (sim.find(id)) return sim.location
  for (const [loc, base] of Object.entries(SCENE)) {
    const room = sceneIn(base as never, sim.chapter) as { actors: { id: string; talk?: string; when?: never }[]; hotspots: { id: string; act: string; when?: never }[] }
    if (room.actors.some((a) => (a.id === id || a.talk === id) && inEra(a as never, sim.chapter) && meets(sim.state, a.when))) return loc as LocationId
    if (room.hotspots.some((h) => (h.id === id || h.act === id) && inEra(h as never, sim.chapter) && meets(sim.state, h.when))) return loc as LocationId
  }
  return null
}

function visit(sim: WorldSim, id: string, answer: Answer = read): boolean {
  const room = whereIs(sim, id)
  if (!room) return false
  if (room !== sim.location) sim.go(room)
  return sim.press(id, answer)
}

const remembered = (sim: WorldSim, eventId: string) =>
  sim.engine.log().some((event) => event.t === 'relationship.memory_added' && (event as { memory: { eventId: string } }).memory.eventId === eventId)

/** a life that lived earlier chapters one way, opening a later one */
function life(chapter: string, flags: Record<string, string | boolean>, beatAnswer: Answer = read) {
  const def = CHAPTER[chapter]!
  const pre: LifeEvent[] = Object.entries(flags).map(([flag, value]) => (value === true ? { t: 'flag.raised', flag } : { t: 'flag.set', flag, value }) as LifeEvent)
  const sim = make(chapter, [...pre, { t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute }, { t: 'chapter.entered', chapter }], beatAnswer)
  const entry = def.entry?.(sim.state) ?? []
  if (entry.length) sim.engine.dispatch(...entry)
  return sim
}

// ============================================================================== A1 ==
describe('A1 · 1983 — the hand, not only the eyes (§1 S1)', () => {
  it('the first box offers the scarf, and touching it is a gesture into the crowd', () => {
    const first = DIALOGUE['a1-1983']!.branches[0]!.choices!.map((c) => c.id)
    expect(first).toContain('touch-scarf')
    const touch = DIALOGUE['a1-1983']!.branches[0]!.choices!.find((c) => c.id === 'touch-scarf')!
    expect(touch.then.some((e) => e.e === 'minigame' && e.id === 'gesture:scarf-1983')).toBe(true)
    const scarf = GESTURES['scarf-1983']!
    expect(scarf.next).toBe('a1-crowd')
    expect(scarf.taps).toBe(1)
    expect(scarf.done.some((e) => e.e === 'flagValue' && e.flag === 'life:a1:scarf' && e.value === 'held')).toBe(true)
  })
  it('the scarf is read twice later: at the 1985 gate and on the 1986 shoulders', () => {
    const gate = DIALOGUE['kobi-a5-gate']!.branches[0]!
    expect(gate.when?.flagIs).toEqual({ flag: 'life:a1:scarf', value: 'held' })
    const shoulders = DIALOGUE['kobi-shoulders-1986']!
    const reads = shoulders.branches.map((b) => b.when?.flagIs?.flag).filter(Boolean)
    expect(reads).toEqual(expect.arrayContaining(['life:a1:scarf', 'life:a1:instinct', 'life:a1:grip']))
    // and every branch of the shoulders ends the day
    for (const b of shoulders.branches) expect(b.then?.some((e) => e.e === 'ending' && e.id === 'home')).toBe(true)
  })
})

// ============================================================================== A2 ==
describe('A2 · the loaf at the pitch, and the evening at home (§2 S3–S4)', () => {
  function withBread(answerRachel = 'ok') {
    const sim = make('a2-alley')
    visit(sim, 'rachel-a2', pick(answerRachel))
    sim.go('kiosk')
    visit(sim, 'rafi-a2', read)
    expect(sim.state.flags['a2:bread']).toBe(true)
    return sim
  }
  it('Amit holds the bread: he does not play, and the flat hears who he is', () => {
    const sim = withBread()
    visit(sim, 'alley-a2', pick('amit'))
    expect(remembered(sim, 'held-the-bread-1984')).toBe(true)
    sim.go('home')
    expect(sim.endings).toEqual(['played'])
    expect(sim.state.flags['life:a2:home']).toBe('amit')
  })
  it('home first: the loaf is on the counter before five — and the teams fill while he runs', () => {
    const sim = withBread()
    visit(sim, 'alley-a2', pick('home-first'))
    expect(sim.location).toBe('home')
    expect(sim.state.flags['a2:bread-dropped']).toBe(true)
    // he dawdles past the picking of the teams: the alley says so and he counts
    sim.wait(Math.max(1, 16 * 60 + 30 - sim.state.minute))
    expect(sim.state.flags['a2:full']).toBe(true)
    visit(sim, 'alley-a2', read)
    expect(sim.endings).toEqual(['late'])
  })
  it('named "before five", missed it, and RAN to Rafi’s shutter: late bread, no false proof', () => {
    const sim = make('a2-alley', undefined, pick('run'))
    visit(sim, 'rachel-a2', pick('five'))
    visit(sim, 'alley-a2', pickAny('play'))
    sim.wait(Math.max(1, 17 * 60 + 30 - sim.state.minute))
    sim.go('home')
    expect(sim.endings).toEqual(['played'])
    expect(sim.state.flags['life:a2:home']).toBe('ran')
    expect(sim.state.proofs.some((p) => p.kind === 'promise_kept')).toBe(false)
  })
})

// ============================================================================== A3 ==
describe('A3 · Efi leads, the arch, and the hour before the whistle (§3)', () => {
  function inside(minuteShift = 0) {
    const sim = make('a3-hall')
    visit(sim, 'efi-a3', read)
    expect(sim.state.flags['a3:efi-led']).toBe(true)
    expect(sim.trace).toContain('cue:efi-a3:leave')
    sim.go('allenby')
    // Efi waits at the arch (the one intersection) and closes the gap himself in the room
    expect(sim.find('efi-a3-arch')).toBeDefined()
    visit(sim, 'efi-a3-arch', read)
    expect(sim.state.flags['a3:arch']).toBe(true)
    if (minuteShift) sim.wait(minuteShift)
    sim.go('ussishkin-outside')
    visit(sim, 'a3-queue', pick('name'))
    sim.go('ussishkin-hall')
    return sim
  }
  it('before the whistle: the door under the basket and the usher’s door — two of them cost the warm-up', () => {
    const sim = inside()
    expect(sim.state.minute).toBeLessThan(A3_TIPOFF)
    expect(sim.find('a3-locker')).toBeDefined()
    visit(sim, 'a3-locker', pick('wish'))
    expect(sim.state.flags['life:a3:locker']).toBe('wished')
    visit(sim, 'usher-a3-in', pick('hold'))
    expect(sim.state.flags['life:a3:usher']).toBe('door')
    // the whistle comes, and the warm-up's doors are gone
    sim.wait(Math.max(1, A3_TIPOFF - sim.state.minute + 1))
    expect(sim.state.flags['a3:tipoff']).toBe(true)
    expect(sim.find('a3-ball')).toBeUndefined()
    expect(sim.find('a3-locker')).toBeUndefined()
    expect(eraFor('a3-hall').objective(sim.state, 'ussishkin-hall', false)).toContain('המשחק רץ')
  })
  it('late on the way: he walks in on a game running — the step is still his, the warm-up is not', () => {
    const sim = inside(120)
    expect(sim.state.flags['a3:inside']).toBe(true)
    expect(sim.state.flags['a3:tipoff']).toBe(true)
    expect(sim.find('a3-ball')).toBeUndefined()
    expect(sim.find('a3-step')).toBeDefined()
  })
  it('the hall in 1986 remembers the corridor', () => {
    const sim = life('1986', { 'life:knows:hall': true, 'life:a3:locker': 'wished' })
    const efi = DIALOGUE['efi-hall']!
    const branch = efi.branches.find((b) => b.when?.flagIs?.flag === 'life:a3:locker')
    expect(branch).toBeDefined()
    expect(meets(sim.state, branch!.when)).toBe(true)
  })
})

// ============================================================================== A4 ==
describe('A4 · the wallet has four answers, and the promise is collected (§4 S3–S4)', () => {
  function atWallet(answer: string) {
    const sim = make('a4-shirt', undefined, pick('take'))
    sim.converse('tin-a4', pick('take'))
    sim.beatAnswer = pick(answer)
    sim.go('home')
    return sim
  }
  it('half: six on her table, and the shirt is six further', () => {
    const sim = atWallet('half')
    expect(sim.state.flags['a4:half']).toBe(true)
    expect(sim.state.agorot).toBe(1400 - 600)
    expect(remembered(sim, 'gave-half-1985')).toBe(true)
  })
  it('the promise: his father pays, the coins come back — and he walks them home to her', () => {
    const sim = atWallet('promise')
    expect(sim.state.flags['a4:promised-mother']).toBe(true)
    sim.engine.dispatch({ t: 'money.changed', agorot: 3000 - sim.state.agorot, why: 'test' })
    sim.beatAnswer = pick('all')
    sim.go('kiosk')
    visit(sim, 'rafi-a4', pick('buy'))
    expect(sim.state.flags['a4:kobi-gifted-shirt']).toBe(true)
    expect(sim.endings).toEqual(['shirt'])
    expect(sim.state.agorot).toBe(1800)
    expect(sim.state.flags['life:a4:promise']).toBe('kept')
    expect(sim.state.proofs.some((p) => p.kind === 'promise_kept' && p.proofId.includes(':tin'))).toBe(true)
  })
  it('a boy who told the truth about the loaf in 1984 is told the truth at the wallet', () => {
    const sim = life('a4-shirt', { 'life:a2:home': 'truth' })
    sim.go('bedroom')
    sim.converse('tin-a4', pick('take'))
    const branch = DIALOGUE['rachel-a4']!.branches.find((b) => meets(sim.state, b.when))
    expect(branch?.lines[0]?.text).toContain('לחם')
  })
})

// ============================================================================== A5 ==
describe('A5 · the street sees the shirt first (§5 S2–S4)', () => {
  function dressed(answer: string) {
    const sim = make('a5-first', [{ t: 'flag.raised', flag: 'own:shirt85' }], pickAny('wear', answer))
    sim.go('bedroom')
    expect(sim.state.flags['a5:dressed']).toBe(true)
    sim.go('home')
    sim.go('street')
    return sim
  }
  it('Ofir walks up by himself — and the shirt comes back stained, and everybody reads it', () => {
    const sim = dressed('ball')
    expect(sim.trace).toContain('cue:ofir-a5:approach')
    expect(sim.state.flags['life:a5:shirt']).toBe('stained')
    visit(sim, 'kobi-a5', read)
    expect(sim.location).toBe('bloomfield-outside')
    const close = DIALOGUE['a5-close']!.branches.find((b) => meets(sim.state, b.when))
    expect(close?.lines[0]?.text).toContain('אבק')
    // and the winter radio remembers it on the chair
    const winter = life('a6-radio', { 'own:shirt85': true, 'life:a5:shirt': 'stained' })
    winter.engine.dispatch({ t: 'flag.raised', flag: 'a6:on' })
    const radio = DIALOGUE['radio-a6']!.branches.find((b) => meets(winter.state, b.when))
    expect(radio?.lines[0]?.text).toContain('הכתם')
  })
  it('lent for a lap: Ofir remembers wearing it', () => {
    const sim = dressed('lend')
    expect(sim.state.flags['life:a5:shirt']).toBe('lent')
    expect(remembered(sim, 'wore-your-shirt-1985')).toBe(true)
  })
})

// ============================================================================== A6 ==
describe('A6 · every winter ending passes the wet father (§6 S3)', () => {
  it('the father’s question re-arms: a box closed by mistake keeps the card', () => {
    const sim = make('a6-radio', undefined, WALK_AWAY)
    sim.converse('radio-a6', pick('on'))
    sim.go('kitchen')
    sim.beatAnswer = pick('leave')
    sim.wait(Math.max(1, 15 * 60 + 36 - sim.state.minute))
    expect(sim.state.flags['a6:gave-up']).toBe(true)
    sim.beatAnswer = WALK_AWAY
    sim.wait(1)
    expect(sim.state.flags['a6:closing']).toBe(true)
    expect(sim.endings).toEqual([])
    sim.beatAnswer = pick('stay')
    sim.wait(1)
    expect(sim.endings).toEqual(['quiet'])
    expect(sim.state.flags['life:a6:after']).toBe('stayed')
  })
  it('A7’s armrest remembers where he sat', () => {
    const sim = life('a7-week', { 'life:a6:after': 'stayed' })
    const armrest = DIALOGUE['a7-armrest']!.branches.find((b) => meets(sim.state, b.when))
    expect(armrest?.lines[0]?.text).toContain('הגשם')
  })
})

// ============================================================================== A7 ==
describe('A7 · four ways to ask, and a knock at the window (§7 S2–S3)', () => {
  function asked(answer: string, plan = 'ofir') {
    const sim = make('a7-week', undefined, pick(plan))
    visit(sim, 'amit-a7', read)
    sim.go('home')
    visit(sim, 'kobi-a7', pick(answer))
    return sim
  }
  it('the lie closes on its own card, and the plan is made', () => {
    const sim = asked('lie')
    expect(sim.state.flags['life:a7:lied']).toBe(true)
    expect(sim.state.flags['life:a7:plan']).toBe('ofir')
    expect(sim.endings).toEqual(['lied'])
  })
  it('the car-wash is a no with a memory', () => {
    const sim = asked('car', 'amit')
    expect(sim.state.flags['life:a7:bargained']).toBe(true)
    expect(sim.state.flags['life:a7:plan']).toBe('amit')
    expect(sim.endings).toEqual(['refused'])
  })
  it('through his mother: the question is carried, and the answer is softer', () => {
    const sim = make('a7-week', undefined, pick('none'))
    visit(sim, 'amit-a7', read)
    sim.go('home')
    visit(sim, 'rachel-a7', pick('via'))
    expect(sim.state.flags['a7:via-rachel']).toBe(true)
    visit(sim, 'kobi-a7', pick('ask'))
    expect(sim.state.flags['life:a7:promised']).toBe(true)
    expect(sim.state.flags['life:a7:via-rachel']).toBe(true)
    expect(sim.state.flags['life:a7:plan']).toBe('none')
    expect(sim.endings).toEqual(['promised'])
  })
  it('the knock waits for an answer — walking away from the window does not lose the week', () => {
    const sim = make('a7-week', undefined, WALK_AWAY)
    sim.go('home')
    visit(sim, 'kobi-a7', pickAny('ask'))
    expect(sim.endings).toEqual([])
    sim.beatAnswer = pick('none')
    sim.wait(1)
    expect(sim.endings).toEqual(['refused'])
  })
})

// ============================================================================ A8 ==
describe('A8 · 24.5.1986 reads the week, the plan, and 1983', () => {
  it('the lie is met at breakfast', () => {
    const sim = life('1986', { 'life:a7:lied': true })
    sim.go('home')
    visit(sim, 'kobi-morning', read)
    expect(remembered(sim, 'caught-the-lie-1986')).toBe(true)
  })
  it('"שתיים, ליד הקיוסק" — Ofir kept the plan, and knows the way', () => {
    const sim = life('1986', { 'life:a7:plan': 'ofir' })
    const branch = DIALOGUE['ofir-wall']!.branches[0]!
    expect(meets(sim.state, branch.when)).toBe(true)
    expect(branch.then?.some((e) => e.e === 'flag' && e.flag === 'route:known')).toBe(true)
  })
  it('with Amit: the page and the gate', () => {
    const sim = life('1986', { 'life:a7:plan': 'amit' })
    const branch = DIALOGUE['amit-street']!.branches[0]!
    expect(meets(sim.state, branch.when)).toBe(true)
    expect(branch.then?.some((e) => e.e === 'flag' && e.flag === 'knows:gate7')).toBe(true)
  })
  it('the reunion goes up on the shoulders, and the 1983 hand answers', () => {
    for (const [flag, value, expected] of [
      ['life:a1:scarf', 'held', 'scarf'],
      ['life:a1:instinct', 'terrace', 'again'],
      ['life:a1:instinct', 'question', 'answered'],
      ['life:a1:grip', 'caught', 'caught'],
    ] as const) {
      const sim = life('1986', { [flag]: value })
      sim.converse('kobi-shoulders-1986', read)
      expect(sim.state.flags['life:a8:shoulders'], `${flag}=${value}`).toBe(expected)
      expect(sim.endings).toEqual(['home'])
    }
  })
})
