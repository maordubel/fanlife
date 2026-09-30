import { describe, expect, it } from 'vitest'

import { DIALOGUE } from '@/lib/life/content/dialogue'
import { RIDES, RIDE_PREFIX } from '@/lib/life/content/passages'
import { meets } from '@/lib/life/world/types'
import { STORY_CHORES } from '@/lib/life/content/storyChores'
import type { LifeEvent } from '@/lib/life/events'
import type { DialogueChoice } from '@/lib/life/runtime/bus'

import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'

/**
 * pass D (28.9.2026) — `IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27` §41–§63, the adult chapters
 * 2013–2026, walked in the headless world (`fixtures/lifeWorldSim.ts`: the real engine and the
 * real dialogue runner over the rooms of `scenes.ts`).
 *
 * Each block holds a chapter to what the brief asked of it in its own words — a strategy with
 * no maximum, a cost per option, a named fail-forward, a world that changes before the close —
 * and never to a sentence count.
 */

const pick =
  (...ids: string[]) =>
  (choices: readonly DialogueChoice[]) =>
    ids.find((id) => choices.some((c) => c.id === id && c.enabled)) ?? choices.find((c) => c.enabled)?.id ?? WALK_AWAY

function seed(sim: WorldSim, flags: Record<string, boolean | string | number>) {
  const events: LifeEvent[] = Object.entries(flags).map(([flag, value]) => ({ t: 'flag.set', flag, value }))
  if (events.length) sim.engine.dispatch(...events)
}

function choicesOf(sim: WorldSim, conversation: string): DialogueChoice[] {
  let seen: DialogueChoice[] = []
  sim.converse(conversation, (choices) => {
    seen = [...choices]
    return WALK_AWAY
  })
  return seen
}

// ======================================================= 2025-owner — the triangle ===

describe('2025-owner — money, sport, trust: two corners before eight', () => {
  function office(flags: Record<string, boolean | string | number> = {}, answer = pick('fork', 'go', 'agree', 'delegate', 'service')) {
    const sim = new WorldSim('2025-owner')
    seed(sim, flags)
    sim.beatAnswer = answer
    sim.go('office')
    return sim
  }

  it('after the fork the room holds four approaches at once, and the door is shut until the seller answers', () => {
    const sim = office()
    expect(sim.state.flags['o:brief']).toBe(true)
    const spots = sim.things().filter((t) => t.kind === 'spot').map((t) => t.id)
    for (const id of ['o-spot-money', 'o-spot-partner', 'o-spot-squad', 'o-spot-fans']) expect(spots).toContain(id)
    const door = sim.things().find((t) => t.kind === 'exit')
    expect(door && door.kind === 'exit' && door.locked).toBe(true)
  })

  it('covered money needs the route apex; the bridge does not, and it is remembered', () => {
    const sim = office()
    const money = choicesOf(sim, 'o-tri-money')
    expect(money.find((c) => c.id === 'covered')?.enabled).toBe(false)
    expect(money.find((c) => c.id === 'bridge')?.enabled).toBe(true)
  })

  it('money + squad passes the seller and leaves the fans out — the meeting says so, and Monday too', () => {
    const sim = office({ 'own:route:OWNER:apex': true })
    sim.press('o-spot-money', pick('covered'))
    sim.press('o-spot-squad', pick('two'))
    expect(sim.state.flags['o:verdict']).toBe(true)
    expect(sim.state.flags['life:owner:triangle']).toBe('money_squad')
    expect(sim.state.flags['o:dealGo']).toBe(true)
    expect(sim.state.flags['o:team']).toBe(true)
    expect(sim.state.flags['o:moneyGo']).toBe(true)
    // the exit opens once the seller has answered
    const door = sim.things().find((t) => t.kind === 'exit')
    expect(door && door.kind === 'exit' && door.locked).toBe(false)
  })

  it('without the apex, only the hour at the window buys the team — money alone does not solve trust', () => {
    const moneyOnly = office({}, pick('fork', 'go', 'agree', 'pilot'))
    moneyOnly.press('o-spot-money', pick('bridge'))
    moneyOnly.press('o-spot-squad', pick('two'))
    expect(moneyOnly.state.flags['o:dealGo']).toBe(true)
    // agree is greyed without the apex or the fans' corner → the meeting ends in the pilot
    expect(moneyOnly.endings).toEqual(['pilot'])

    const withFans = office({}, pick('fork', 'go', 'agree'))
    withFans.press('o-spot-money', pick('bridge'))
    withFans.press('o-spot-fans', pick('books'))
    expect(withFans.state.flags['life:owner:triangle']).toBe('money_trust')
    expect(withFans.state.flags['o:teamGo']).toBe(true)
    expect(withFans.state.flags['life:owner:bridge']).toBe(true)
    expect(withFans.endings).toEqual([])
  })

  it('no combination closes all three corners: the third approach is gone once two are closed', () => {
    const sim = office({ 'own:route:OWNER:apex': true }, pick('fork', 'withdraw'))
    sim.press('o-spot-partner', pick('partner'))
    sim.press('o-spot-fans', pick('seat'))
    expect(sim.state.flags['o:verdict']).toBe(true)
    expect(sim.find('o-spot-squad')).toBeUndefined()
  })

  it('trust without money: the deal falls and the table stays (a named fail-forward)', () => {
    const sim = office({}, pick('fork', 'table'))
    sim.press('o-spot-squad', pick('two'))
    sim.press('o-spot-fans', pick('books'))
    expect(sim.endings).toEqual(['trust_first'])
    expect(sim.state.flags['life:owner:triangle']).toBe('squad_trust')
  })

  it('doing nothing is a life too: eight o’clock comes, and the seller is answered for him', () => {
    const sim = office({}, pick('fork', 'pass'))
    sim.wait(90)
    expect(sim.state.flags['o:verdict']).toBe(true)
    expect(sim.endings).toEqual(['missed'])
  })

  it('a late approach is greyed with the minutes it needs, not hidden', () => {
    const sim = office()
    sim.wait(50) // 19:25 — forty minutes with Yevgeny no longer fit
    const fans = choicesOf(sim, 'o-tri-fans')
    expect(fans.find((c) => c.id === 'books')?.enabled).toBe(false)
    const squad = choicesOf(sim, 'o-tri-squad')
    expect(squad.find((c) => c.id === 'two')?.enabled).toBe(true)
  })
})

// ============================================ 2026-finale — the walk and the last word ===

describe('2026-finale — the walk after F04, and the last word is Kobi’s', () => {
  function outside(flags: Record<string, boolean | string | number>, close = 'father') {
    const sim = new WorldSim('2026-finale')
    seed(sim, { 'f:name': true, 'f:road': true, 'f:seats': true, 'f:inside': true, ...flags })
    const heard: string[] = []
    sim.onMinigame = (id, world) => {
      const ride = RIDES[id.replace(RIDE_PREFIX, '')]
      if (!ride) return
      for (const stop of ride.stops) {
        if (!stop.conversation) continue
        heard.push(stop.conversation)
        world.converse(stop.conversation, pick())
      }
      for (const flag of ride.flags) world.engine.dispatch({ t: 'flag.raised', flag })
      world.go(ride.land.mapId as never)
    }
    sim.beatAnswer = pick(close)
    sim.go('arena-out')
    return { sim, heard }
  }

  it('the answer outside the hall starts a walk; the card comes only after it', () => {
    const { sim, heard } = outside({ 'life:finale:party': 'two' })
    expect(heard).toEqual(['f-walk-step', 'f-walk-shirt', 'f-walk-phone', 'f-walk-sign', 'f-walk-road'])
    expect(sim.state.flags['f:walked']).toBe(true)
    expect(sim.endings).toEqual(['together'])
  })

  it('every walk stop answers the life it is walked in — and has its own line for a life without the thing', () => {
    for (const id of ['f-walk-step', 'f-walk-shirt', 'f-walk-phone', 'f-walk-sign']) {
      const conversation = DIALOGUE[id]
      expect(conversation, id).toBeDefined()
      expect(conversation!.branches.length, id).toBeGreaterThan(2)
      // the last branch has no `when`: nobody walks past a stop in silence
      expect(conversation!.branches[conversation!.branches.length - 1]!.when, id).toBeUndefined()
    }
  })

  it('the shirt, the shoulders, the child, the work: the branch chosen is the life', () => {
    const state = (flags: Record<string, boolean | string | number>) => {
      const sim = new WorldSim('2026-finale')
      seed(sim, flags)
      return sim.state
    }
    const first = (id: string, flags: Record<string, boolean | string | number>) =>
      DIALOGUE[id]!.branches.findIndex((branch) => meets(state(flags), branch.when))
    expect(first('f-walk-shirt', { 'own:outfit:2026-finale': 'visa86', 'life:first-shirt:gift': true })).toBe(0)
    expect(first('f-walk-shirt', { 'own:outfit:2026-finale': 'plain' })).toBe(4)
    expect(first('f-walk-step', { 'life:a1:grip': 'caught' })).toBe(0)
    expect(first('f-walk-phone', { 'life:finale:party': 'three', 'life:child': true })).toBe(0)
    expect(first('f-walk-sign', { 'life:owner:role': 'controlling_owner', 'life:owner:triangle': 'money_squad' })).toBe(0)
  })

  it('three generations close on the child’s word, and a life elsewhere on "ותתקשר גם משם"', () => {
    const three = outside({ 'life:finale:party': 'three', 'life:child': true }, 'three')
    expect(three.sim.endings).toEqual(['generations'])
    const abroad = outside({ 'life:finale:party': 'reunion', 'life:abroad': true }, 'mine')
    expect(abroad.sim.endings).toEqual(['mine'])
  })

  it('a reload in the middle of the walk offers the walk again, never a room without a door', () => {
    const sim = new WorldSim('2026-finale')
    seed(sim, { 'f:name': true, 'f:road': true, 'f:seats': true, 'f:inside': true, 'f:back': true, 'life:finale:close': 'together' })
    let offered = 0
    sim.onMinigame = (id) => {
      if (id === 'ride:walk-26') offered += 1
    }
    sim.beatAnswer = pick()
    sim.go('arena-out')
    sim.wait(2)
    expect(offered).toBeGreaterThan(0)
    expect(sim.endings).toEqual([])
  })
})

// ================================================ 2013-household — the week on the fridge ===

describe('2013-household — five evenings, seven things, and the week happens', () => {
  function home(flags: Record<string, boolean | string | number>, diary: string, week: string[]) {
    const sim = new WorldSim('2013-household')
    seed(sim, flags)
    let n = 0
    sim.beatAnswer = (choices) => {
      // the diary answer first, then one demand per evening, then whatever comes after
      const ids = choices.map((c) => c.id)
      if (ids.includes(diary)) return diary
      const want = week[n]
      if (want && ids.includes(want)) {
        n += 1
        return want
      }
      return choices.find((c) => c.enabled)?.id ?? WALK_AWAY
    }
    sim.go('home')
    for (let i = 0; i < 30 && !sim.state.flags['hh:lived']; i += 1) sim.wait(1)
    return sim
  }

  it('Wednesday is the neck: whatever is written, two things stay out and answer in their own voice', () => {
    const sim = home({ 'life:partner': 'melanie' }, 'calendar', ['work', 'ofir', 'us', 'terrace', 'parents'])
    expect(sim.state.flags['hh:planned']).toBe(true)
    expect(sim.state.flags['hh:lived']).toBe(true)
    // metuki and "alone" were left out — both paid for
    expect(sim.state.flags['hh:missed:metuki']).toBe(true)
    expect(sim.state.flags['hh:missed:alone']).toBe(true)
    expect(sim.state.flags['hh:missed:ofir']).toBeUndefined()
    expect(sim.state.flags['life:household:week']).toBe('us')
  })

  it('a promise made without the diary lands on the fullest evening, and the week knows if it was kept', () => {
    const kept = home({ 'life:partner': 'dor' }, 'promise', ['work', 'ofir', 'metuki', 'us', 'parents'])
    expect(kept.state.flags['life:household:week']).toBe('kept')
    const broken = home({ 'life:partner': 'dor' }, 'promise', ['us', 'ofir', 'work', 'terrace', 'parents'])
    expect(broken.state.flags['life:household:week']).toBe('broken')
  })

  it('a demand appears only on the evenings it exists, and never twice', () => {
    const sim = new WorldSim('2013-household')
    seed(sim, { 'life:partner': 'tamar', 'hh:wk:ofir': true })
    const wed = choicesOf(sim, 'hh-week-pair-wed').map((c) => c.id)
    expect(wed).toContain('terrace')
    expect(wed).not.toContain('ofir')
    expect(wed).not.toContain('parents')
  })

  it('the life without a partner plays the same week, and Keren’s move is the evening that counts', () => {
    const sim = home({}, 'own', ['alone', 'ofir', 'metuki', 'terrace', 'parents'])
    expect(sim.state.flags['life:household:week']).toBe('no-us')
    expect(sim.state.flags['hh:missed:work']).toBe(true)
  })

  it('the question about parenthood waits for Thursday night', () => {
    const sim = new WorldSim('2013-household')
    seed(sim, { 'life:partner': 'melanie' })
    sim.beatAnswer = (choices) => (choices.some((c) => c.id === 'calendar') ? 'calendar' : WALK_AWAY)
    sim.go('home')
    sim.wait(5)
    expect(sim.opened).not.toContain('hh-parent')
    // …and a week closed half way is offered again, at the first empty evening
    expect(sim.opened).toContain('hh-week-resume')
    expect(sim.find('hh-diary-fridge')).toBeDefined()
  })
})

// ================================================ 2015-newhall — the hall before the crowd ===

describe('2015-newhall — four things in an empty hall, time for two, and the crowd walks into what was done', () => {
  function hall() {
    const sim = new WorldSim('2015-newhall')
    sim.beatAnswer = pick('short', 'hang', 'cut', 'door', 'sit')
    sim.go('drive-in')
    return sim
  }

  it('after Efi’s sentence the empty hall offers four things at once', () => {
    const sim = hall()
    expect(sim.state.flags['nr:prep']).toBe(true)
    const spots = sim.things().filter((t) => t.kind === 'spot').map((t) => t.id)
    for (const id of ['nr-spot-banner', 'nr-spot-confetti', 'nr-spot-families', 'nr-spot-seat']) expect(spots).toContain(id)
  })

  it('two done and the doors open; the third is gone, and the room is rebuilt with the banner up', () => {
    const sim = hall()
    sim.press('nr-spot-banner', pick('hang'))
    sim.press('nr-spot-families', pick('door'))
    expect(sim.state.flags['nr:crowd']).toBe(true)
    expect(sim.find('nr-spot-confetti')).toBeUndefined()
    expect(sim.state.flags['nr:seen:banner']).toBe(true)
    expect(sim.state.flags['nr:seen:confetti']).toBe(true)
    expect(sim.state.flags['nr:first']).toBe(true)
    expect(sim.state.flags['life:drivein:banner']).toBe(true)
  })

  it('a man who sits and does not help is a choice with a price, not a skip', () => {
    const sim = hall()
    sim.engine.dispatch({ t: 'relationship.changed', who: 'efi', axis: 'bond', delta: 10 })
    const before = sim.state.relationships?.['efi']?.bond ?? 0
    sim.press('nr-spot-seat', pick('sit'))
    expect(sim.state.flags['life:drivein:row']).toBe('seven')
    const after = sim.state.relationships?.['efi']?.bond ?? 0
    expect(after).toBeLessThan(before)
  })

  it('doing nothing: six thirty comes, the doors open on an unprepared hall, and the chapter goes on', () => {
    const sim = hall()
    sim.wait(120)
    expect(sim.state.flags['nr:crowd']).toBe(true)
    expect(sim.state.flags['nr:first']).toBe(true)
    expect(sim.state.flags['nr:did:banner']).toBeUndefined()
  })
})

// ============================================ 2021-suitcase + 2025-abroad — one corner, one date ===

describe('X01 → X05 — the last corner of the suitcase, and a promise with a date', () => {
  it('2021: the move opens the corner; the shirt is offered only to a life that has it', () => {
    const sim = new WorldSim('2021-suitcase')
    const seen: string[][] = []
    sim.beatAnswer = (choices) => {
      if (choices.some((c) => c.id === 'move')) return 'move'
      seen.push(choices.map((c) => c.id))
      return choices.find((c) => c.id === 'scarf')?.id ?? WALK_AWAY
    }
    sim.go('home')
    expect(sim.state.flags['life:abroad:corner']).toBe('scarf')
    expect(seen[0]).not.toContain('shirt')

    const gifted = new WorldSim('2021-suitcase')
    seed(gifted, { 'life:first-shirt:gift': true })
    expect(choicesOf(gifted, 'x-corner').map((c) => c.id)).toContain('shirt')
  })

  it('2025: the invitation waits for a date — the laptop, the leave, and Kobi calls back', () => {
    const sim = new WorldSim('2025-abroad')
    seed(sim, { 'life:abroad': true, 'life:abroad:corner': 'shirt' })
    sim.beatAnswer = pick('later', 'invite', 'aside')
    sim.go('flat-abroad')
    expect(sim.state.flags['x:later']).toBe(true)
    expect(sim.state.flags['x:reunion']).toBeUndefined()
    sim.press('x-spot-leave', pick('three'))
    expect(sim.state.flags['life:finale:leave']).toBe('three')
    expect(sim.state.flags['x:invited']).toBe(true)
    // the shirt from the corner came out, and was left where it is seen
    expect(sim.state.flags['life:finale:packed']).toBe('shirt:aside')
    expect(sim.endings).toEqual(['invite'])
  })

  it('2026: a scarf packed for May is on the walk out of the hall', () => {
    const sim = new WorldSim('2026-finale')
    seed(sim, { 'life:finale:packed': 'scarf' })
    const first = DIALOGUE['f-walk-shirt']!.branches.findIndex((branch) => meets(sim.state, branch.when))
    expect(DIALOGUE['f-walk-shirt']!.branches[first]!.lines[0]!.text).toContain('הצעיף')
  })
})

// ============================================ 2017-after — the answer is a thing in the room ===

describe('2017-after — Kobi asks, and the answer is the form, the chair or the phone', () => {
  function atKobis() {
    const sim = new WorldSim('2017-after')
    seed(sim, { 'p:amit': true })
    sim.beatAnswer = pick()
    sim.go('home')
    return sim
  }

  it('the question has no menu: three things in his living room', () => {
    const sim = atKobis()
    expect(sim.state.flags['p:asked']).toBe(true)
    expect(sim.state.flags['p:choice']).toBeUndefined()
    const spots = sim.things().filter((t) => t.kind === 'spot').map((t) => t.id)
    for (const id of ['p-spot-form', 'p-spot-chair', 'p-spot-phone']) expect(spots).toContain(id)
  })

  it('the phone on the sofa is the break — and it opens the decade-long window', () => {
    const sim = atKobis()
    sim.press('p-spot-phone', pick('distance'))
    expect(sim.state.flags['life:distance']).toBe(true)
    expect(sim.find('p-spot-form')).toBeUndefined()
  })

  it('touching a thing by mistake is not an answer', () => {
    const sim = atKobis()
    sim.press('p-spot-chair', pick('not-yet'))
    expect(sim.state.flags['p:choice']).toBeUndefined()
    expect(sim.find('p-spot-chair')).toBeDefined()
  })
})

// ============================================ 2019-armchair — the ten minutes, and the shelf ===

describe('2019-armchair — the match from home is interrupted, and the Saturday is done with the hands', () => {
  it('watching with Kobi, Rachel asks for ten minutes — and the photo waits for the answer', () => {
    const sim = new WorldSim('2019-armchair')
    sim.beatAnswer = pick('watch', 'help')
    sim.go('home')
    expect(sim.state.flags['life:armchair:ten']).toBe('roof')
  })

  it('fixing Ilan’s shelf is a chore; the level decides what Ilan says, and the chapter ends after it', () => {
    const sim = new WorldSim('2019-armchair')
    seed(sim, { 'a:remote': true, 'a:photo': true })
    sim.onMinigame = (id, world) => {
      const chore = STORY_CHORES[id.replace('chore:story:', '')]
      if (!chore) return
      world.engine.dispatch(...chore.finish(chore.shape.target, chore.shape.target))
      world.go(chore.where)
    }
    sim.beatAnswer = pick('fix')
    sim.go('street')
    expect(sim.state.flags['a:shelf']).toBe('straight')
    expect(sim.endings).toEqual(['fixed'])
  })
})

// ============================================ 2025-eurocup — the night against the morning ===

describe('2025-eurocup — the celebration has somebody else’s morning in it', () => {
  it('the child’s tournament at eight: going to bed is kept, staying is a price', () => {
    const sim = new WorldSim('2025-eurocup')
    seed(sim, { 'life:child': true })
    sim.beatAnswer = pick('together', 'night')
    sim.go('home')
    sim.wait(3)
    expect(sim.state.flags['life:eurocup:night']).toBe('night:child')
  })

  it('without a partner or a child, it is the meeting at eight — and moving it needs her yes', () => {
    const sim = new WorldSim('2025-eurocup')
    sim.beatAnswer = pick('together', 'move')
    sim.go('home')
    sim.wait(3)
    expect(sim.state.flags['life:eurocup:night']).toBe('moved:work')
  })
})

// ============================================ 2021-promises — the evening itself, without a child ===

describe('2021-promises — the life without a child keeps its promise in a place, with the phone in the pocket', () => {
  it('Keren: the evening happens on the promenade, and leaving for the match is written into the diary', () => {
    const sim = new WorldSim('2021-promises')
    sim.beatAnswer = pick('meet', 'leave')
    sim.go('home')
    sim.wait(2)
    expect(sim.state.flags['pr:out']).toBe(true)
    expect(sim.location).toBe('promenade')
    expect(sim.state.flags['life:promise2021']).toBe('left')
    expect(sim.endings).toEqual(['repaired'])
  })

  it('a partner and a repaired promise: the phone face down all evening', () => {
    const sim = new WorldSim('2021-promises')
    seed(sim, { 'life:partner': 'dor', 'promise:householdEvening': true })
    sim.beatAnswer = pick('do', 'down')
    sim.go('home')
    sim.wait(2)
    expect(sim.state.flags['life:promise2021']).toBe('present')
    expect(sim.endings).toEqual(['repaired'])
  })

  it('the life with a child is not sent to the promenade — its evening is the Saturday', () => {
    const sim = new WorldSim('2021-promises')
    seed(sim, { 'life:child': true, 'life:partner': 'melanie', 'promise:householdEvening': true, 'pr:first': true })
    sim.beatAnswer = pick('do')
    sim.go('home')
    sim.wait(2)
    expect(sim.state.flags['pr:out']).toBeUndefined()
  })
})
