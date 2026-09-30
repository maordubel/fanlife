import { describe, expect, it } from 'vitest'

import { CALLEES, cancellerOf, FOUNDING_CALLS, FOUNDING_KEY, FOUNDING_ROLE } from '@/lib/life/content/chapter2007founding'
import { TEDDY_2010 } from '@/lib/life/content/chapter2010double'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import type { Effect } from '@/lib/life/content/script'
import { STORY_CHORES, STORY_CHORE_PREFIX } from '@/lib/life/content/storyChores'
import type { DialogueChoice } from '@/lib/life/runtime/bus'
import { ALL_SCENES, inEra, sceneIn } from '@/lib/life/world/scenes'
import { meets } from '@/lib/life/world/types'

import { WALK_AWAY, WorldSim } from './fixtures/lifeWorldSim'

/**
 * הקווסטים הבוגרים, חלק א' — 2002, 2006, 2007–2009, 2010 (דלתא 90, LIFE 90-D).
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §5 (hook → want → commitment → performed action →
 * complication → adapt → payoff → handoff), §11.4 (*"Dialogue choices that claim calls /
 * deliveries / organization / work occurred and immediately award skill/proof"*), §13 (the
 * 2007 calls conversion) and §15 (Definition of Done). Played headless on the real rooms,
 * beats and `DialogueRunner` (`fixtures/lifeWorldSim.ts`), three ways each:
 *
 *   · **Golden** — the intended route, the work done in full;
 *   · **Messy** — short on money, half the work, the honest "less", the broken promise;
 *   · **Confused** — `tests/life-confused-player.test.ts` walks every one of these chapters
 *     with four temperaments (closing every box once, walking away, first/last answer);
 *     here, the recoveries that walk depends on.
 *
 * And one structural guard over every conversation these chapters can open: no CHOICE pays
 * for work that the same choice did not also perform.
 */

// ------------------------------------------------------------------------ helpers --

/** answer a box with the first of these ids that is on it and enabled, else the first enabled */
function pick(...ids: string[]) {
  return (choices: readonly DialogueChoice[]) => {
    const open = choices.filter((choice) => choice.enabled)
    for (const id of ids) if (open.some((choice) => choice.id === id)) return id
    return open[0]?.id ?? WALK_AWAY
  }
}

/** a chore played to `share` of its target (1 = all of it), then back in its room */
function playChores(sim: WorldSim, share = 1) {
  sim.onMinigame = (id, world) => {
    if (!id.startsWith(`chore:${STORY_CHORE_PREFIX}`)) return
    const chore = STORY_CHORES[id.slice(`chore:${STORY_CHORE_PREFIX}`.length)]
    if (!chore) return
    const events = chore.finish(Math.round(chore.shape.target * share), chore.shape.target)
    if (events.length) world.engine.dispatch(...events)
    world.go(chore.where)
  }
}

/**
 * `purse` — a chapter with no `entry` of its own (2010-teddy follows 2010-cup four days later)
 * starts the sim with nothing in the pocket; the real game carries the money over, so the
 * test puts back what four days after the cup final would plausibly hold.
 */
function start(chapter: string, answer: ReturnType<typeof pick>, seed: Record<string, boolean | string | number> = {}, share = 1, purse = 0): WorldSim {
  const sim = new WorldSim(chapter)
  playChores(sim, share)
  const entries = Object.entries(seed)
  if (entries.length) sim.engine.dispatch(...entries.map(([flag, value]) => ({ t: 'flag.set' as const, flag, value })))
  if (purse) sim.engine.dispatch({ t: 'money.changed', agorot: purse, why: 'test: carried from 2010-cup' })
  sim.beatAnswer = answer
  // the constructor walked in with nobody answering; walk in again, now answering
  sim.go(sim.location)
  return sim
}

const has = (sim: WorldSim, id: string) => sim.find(id) !== undefined
const proof = (sim: WorldSim, id: string) => sim.state.proofs.some((row) => row.proofId.startsWith(id))

// ============================================================ 2007 · U01 — the table --

describe('2007 · U01 — a role is a thing you then do', () => {
  it('golden · operations: the storeroom counted by hand, and the proof opens only then', () => {
    const sim = start('2007-table', pick('ops'))
    expect(sim.state.flags['u:roleKind']).toBe('operations')
    expect(sim.endings).toEqual([])
    // the proof of the founding is not in the room before any work
    expect(has(sim, 'proof-found-table')).toBe(false)
    expect(sim.exit('store')).toBe(true)
    expect(sim.press('u-shelves', 'count')).toBe(true)
    expect(sim.state.flags['life:founding:count-full']).toBe(true)
    expect(sim.state.flags['u:hands']).toBe(true)
    sim.exit('out')
    expect(has(sim, 'proof-found-table')).toBe(true)
    expect(sim.endings).toEqual(['role'])
    expect(sim.opened).toContain('u-table-close')
  })

  it('messy · operations, walked out of the storeroom at once: the role stays, the proof does not open', () => {
    const sim = start('2007-table', pick('ops'), {}, 0)
    sim.exit('store')
    sim.press('u-shelves', 'count')
    expect(sim.state.flags['u:counted']).toBe(true)
    expect(sim.state.flags['u:hands']).toBeFalsy()
    expect(sim.state.flags['life:founding:worked']).toBeFalsy()
    sim.exit('out')
    expect(sim.location).toBe('community-room')
    expect(has(sim, 'proof-found-table')).toBe(false)
    expect(sim.endings).toEqual(['role'])
  })

  it('golden · people: the chairs are already moving — they are caught on the way to the door', () => {
    const sim = start('2007-table', pick('people'))
    expect(sim.minigames).toContain('chore:story:returns-07')
    expect(sim.state.flags['life:founding:asked-all']).toBe(true)
    expect(has(sim, 'proof-found-table')).toBe(true)
    expect(sim.endings).toEqual(['role'])
  })

  it('"I just come" is a whole life, not a failed one', () => {
    const sim = start('2007-table', pick('watch'))
    expect(sim.endings).toEqual(['watcher'])
    expect(sim.state.flags['life:founding:worked']).toBeFalsy()
  })
})

// ======================================================= 2007 · U02 — the calls ----

describe('2007 · U02 — the calls, one at a time, and the one who cancels', () => {
  it('always has a cancellation, and it is one of the names with a "but" beside it when any was called', () => {
    const risky = new Set(CALLEES.filter((c) => c.risky).map((c) => c.id))
    const ids = CALLEES.map((c) => c.id)
    const combos = (n: number, from = 0): string[][] => (n === 0 ? [[]] : ids.slice(from).flatMap((id, i) => combos(n - 1, from + i + 1).map((rest) => [id, ...rest])))
    for (const n of [3, 4]) {
      for (const called of combos(n)) {
        // two safe names only: any three or four always include a "but"
        expect(called.some((id) => risky.has(id)), called.join(',')).toBe(true)
        const flags = Object.fromEntries(called.map((id) => [`u:call:${id}`, true]))
        expect(risky.has(cancellerOf({ flags } as never)), called.join(',')).toBe(true)
      }
    }
  })

  it('golden · "what you promised": four names, Shlomi cancels, Melamed replaces him, the sheet goes to Yosef by hand', () => {
    const sim = start('2007-registered', pick('deliver', 'stay'), { [FOUNDING_ROLE]: 'people' })
    expect(sim.state.flags['u:want']).toBe(4)
    for (const id of ['batya', 'yaron', 'shlomi', 'azulay']) expect(sim.press('u-phone', `call-${id}`), id).toBe(true)
    // the complication arrives by itself, on the clock, and says who
    expect(sim.opened).toContain('u-cancel')
    expect(sim.state.flags['u:cancel']).toBe('shlomi')
    expect(has(sim, 'u-hand')).toBe(false)
    expect(sim.press('u-phone', 'replace-melamed')).toBe(true)
    expect(sim.state.flags['u:replaced']).toBe(true)
    // no reward was paid by any of those sentences: it is paid when Yosef reads the sheet
    const before = sim.state.skills.organization
    expect(sim.press('u-hand', pick())).toBe(true)
    expect(sim.state.flags['u:deliver']).toBe(true)
    expect(sim.state.flags[FOUNDING_CALLS]).toBe('replaced')
    expect(sim.state.skills.organization).toBeGreaterThan(before)
    expect(has(sim, 'proof-found-registered')).toBe(true)
    /*
     * (delta 92, upgrade plan §8) the demolition is a walk now: the last evening inside,
     * the morning call at home, the walk back to the fence, and only then the choice.
     */
    expect(sim.state.flags['u:lastEve']).toBe(true)
    sim.go('ussishkin-hall')
    expect(sim.state.flags['u:last']).toBe(true)
    expect(sim.state.flags['life:place:ussishkin']).toBeUndefined()
    sim.go('ussishkin-outside')
    expect(sim.state.flags['u:morning']).toBe(true)
    expect(sim.state.flags['u:news']).toBe(true)
    sim.go('ussishkin-outside')
    expect(sim.endings).toEqual(['together'])
    // Beat 7 — only now is the hall gone from the world
    expect(sim.state.flags['life:place:ussishkin']).toBe('demolished')
    expect(sim.state.flags['life:uss:lossKind']).toBe('together')
  })

  it('messy · "three calls, not thirty", and the honest short list', () => {
    const sim = start('2007-registered', pick('late', 'father'))
    expect(sim.state.flags['u:want']).toBe(3)
    for (const id of ['batya', 'yaron', 'melamed']) sim.press('u-phone', `call-${id}`)
    expect(sim.state.flags['u:cancel']).toBe('melamed')
    sim.press('u-phone', 'reduce')
    sim.press('u-hand', pick())
    expect(sim.state.flags[FOUNDING_CALLS]).toBe('reduced')
    expect(sim.state.personality.honesty).toBeGreaterThan(50)
    // (delta 92) he never goes in that last evening: the night ends by itself, the call comes at home
    for (let hour = 0; hour < 8 && !sim.state.flags['u:morning']; hour += 1) sim.wait(60)
    expect(sim.state.flags['u:news']).toBe(true)
    sim.go('ussishkin-outside')
    expect(sim.endings).toEqual(['father'])
    expect(sim.state.flags['life:place:ussishkin']).toBe('demolished')
  })

  it('confused · the cancellation box closed by mistake rings again; the sheet still holds the empty line', () => {
    const sim = start('2007-registered', pick('late'))
    sim.beatAnswer = WALK_AWAY
    for (const id of ['batya', 'yaron', 'shlomi']) sim.press('u-phone', `call-${id}`)
    expect(sim.state.flags['u:cancelled']).toBeFalsy()
    // the beat is guarded by what its conversation raises, so it is armed again
    const beat = eraFor('2007-registered').beats!.find((b) => b.id === 'u-cancel')!
    expect(beat.when?.none?.some((part) => part.flag === 'u:cancelled')).toBe(true)
    sim.beatAnswer = pick()
    sim.wait(1)
    expect(sim.state.flags['u:cancelled']).toBe(true)
    expect(sim.find('u-phone')).toBeDefined()
  })

  it('the handover to Inbal is a decision and pays nothing but responsibility', () => {
    const sim = start('2007-registered', pick('handover', 'photo'), { [FOUNDING_ROLE]: 'operations' })
    expect(sim.state.flags['u:handover']).toBe(true)
    expect(has(sim, 'proof-found-registered')).toBe(false)
  })
})

// ======================================================== 2007 · U04 — the key ----

describe('2007 · U04 — who opens tomorrow, and tomorrow somebody does', () => {
  it('golden · the kit carried to the cage, shown to Inbal — and at eight she finds the pump', () => {
    const sim = start('2007-key', pick('sort'))
    expect(sim.minigames).toContain('chore:story:kit-07')
    expect(has(sim, 'proof-found-key')).toBe(true)
    expect(sim.press('u-show', pick())).toBe(true)
    expect(sim.state.flags['u:keyKind']).toBe('opened')
    expect(sim.state.flags[FOUNDING_KEY]).toBe('held')
    expect(sim.opened).toContain('u-key-close')
    expect(sim.endings).toEqual(['opened'])
  })

  it('messy · half a list pinned by the doors: the morning is a quarter past eight', () => {
    const sim = start('2007-key', pick('list'), {}, 0.5)
    expect(sim.press('u-pin', pick())).toBe(true)
    expect(sim.state.flags['u:keyKind']).toBe('half')
    expect(sim.endings).toEqual(['half'])
  })

  it('the whole list: somebody who was not here yesterday reads it and finds everything alone', () => {
    const sim = start('2007-key', pick('list'))
    sim.press('u-pin', pick())
    expect(sim.endings).toEqual(['listed'])
  })

  it('confused · chose to sort, and the carrying never happened: the crates still stand by the doors', () => {
    const sim = new WorldSim('2007-key')
    sim.beatAnswer = pick('sort')
    sim.go('hall-new')
    expect(sim.state.flags['u:keyPlan']).toBe('sort')
    expect(sim.state.flags['u:sorted']).toBeFalsy()
    // the beat will not ask again (the plan is made) — the room holds the work instead
    expect(has(sim, 'u-crates')).toBe(true)
    expect(has(sim, 'u-show')).toBe(false)
    playChores(sim)
    expect(sim.press('u-crates', 'carry')).toBe(true)
    expect(sim.state.flags['life:founding:kit-full']).toBe(true)
    expect(has(sim, 'u-crates')).toBe(false)
    expect(sim.press('u-show', pick())).toBe(true)
    expect(sim.endings).toEqual(['opened'])
  })

  it('standing with Efi is still the evening, not the morning', () => {
    const sim = start('2007-key', pick('stand'))
    expect(sim.endings).toEqual(['stood'])
  })
})

// ========================================================= 2009 · U05 — the photo --

describe('2009 · U05 — the world remembers what was done in 2007', () => {
  it('who worked can say "not alone this time"; who held a key can hand it back', () => {
    const sim = start('2009-up', pick('handover'), { 'life:founding:worked': true, [FOUNDING_KEY]: 'held' })
    expect(sim.endings).toEqual(['handover'])
    expect(sim.state.flags[FOUNDING_KEY]).toBe('returned')
  })

  it('who did nothing is not offered two years of work — he stands at the back and claps', () => {
    const offered: string[] = []
    const sim = start('2009-up', (choices) => {
      offered.push(...choices.map((choice) => choice.id))
      // pass C: the hall empties after the photograph (`u-empty`) — somebody else closes
      return choices.some((choice) => choice.id === 'guest') ? 'guest' : 'delegate'
    })
    expect(offered).not.toContain('share')
    expect(offered).not.toContain('handover')
    expect(sim.endings).toEqual(['guest'])
  })
})

// ======================================================== 2010 · the double ------

describe('2010 · D02 — the banner is painted, and delivered when it goes up', () => {
  it('golden: painted in full by the kiosk, raised at the derby, the proof recorded there', () => {
    const sim = start('2010-cup', pick('metuki', 'banner', 'walk', 'go'))
    sim.go('kiosk')
    expect(sim.minigames).toContain('chore:story:banner-10')
    expect(sim.state.flags['d10:bannerUp']).toBe(true)
    expect(proof(sim, 'group_delivered:2010-cup:banner')).toBe(true)
    expect(sim.endings).toEqual(['there'])
  })

  it('messy: half the letters, no banner in the stand — and the derby is not held up by it', () => {
    const sim = start('2010-cup', pick('metuki', 'banner', 'walk', 'tv'), {}, 0.5)
    sim.go('kiosk')
    expect(sim.state.flags['d10:bannerUp']).toBeFalsy()
    expect(proof(sim, 'group_delivered')).toBe(false)
    expect(sim.endings).toEqual(['screen'])
  })
})

describe('2010 · D05–D09 — a plan made before the biggest night, and lived with after it', () => {
  const PURSE = 60000
  const venue = (seat: 'ofir' | 'metuki', promise: 'promise' | 'honest', back: string) =>
    start('2010-teddy', pick('venue', seat, 'pay', promise, 'ours', 'kobi', back, 'sit'), {}, 1, PURSE)

  function plan(sim: WorldSim, seat: string, promise: string) {
    expect(sim.state.flags['d10:mode']).toBe('venue')
    expect(sim.state.flags['d10:plan']).toBeFalsy()
    // the three steps are things standing in the street, each lit when the one before is done
    expect(has(sim, 'd10-pay')).toBe(false)
    expect(sim.press('d10-roster', seat)).toBe(true)
    expect(has(sim, 'd10-promise')).toBe(false)
    const money = sim.state.agorot
    expect(sim.press('d10-pay', 'pay')).toBe(true)
    expect(money - sim.state.agorot).toBe(14000)
    expect(sim.press('d10-promise', promise)).toBe(true)
  }

  /**
   * (27.9.2026) Teddy is a ROOM: the road card carries whoever took the seat into the away
   * end, the night is lived there (a spot at the rail, the whistle, the call, the chaos, the
   * promise), and the car is where he goes out of the door on the left — back to his street.
   */
  function teddy(sim: WorldSim, spot = 'rail') {
    expect(sim.location).toBe('teddy')
    expect(sim.opened).toContain('d10-away')
    if (has(sim, 'd10-spot')) expect(sim.press('d10-spot', spot)).toBe(true)
    expect(sim.state.flags['d10:back']).toBe(true)
    expect(sim.exit('home')).toBe(true)
    expect(sim.location).toBe('street')
  }

  it('golden · Metuki in the last seat, the promise kept through the crowd — the proof when Amit sees you at the car', () => {
    const sim = venue('metuki', 'promise', 'keep')
    plan(sim, 'metuki', 'promise')
    teddy(sim)
    expect(sim.state.flags['promise:return2010']).toBe(true)
    // the night explodes before the question is asked — in the away end itself
    expect(sim.opened).toEqual(expect.arrayContaining(['d10-title-away', 'd10-call-away', 'd10-chaos', 'd10-back', 'd10-car']))
    expect(sim.opened).not.toContain('d10-title')
    expect(sim.opened.indexOf('d10-chaos')).toBeLessThan(sim.opened.indexOf('d10-back'))
    expect(sim.state.flags[TEDDY_2010]).toBe('kept')
    expect(proof(sim, 'promise_kept:2010-teddy:return')).toBe(true)
    // the consequence a later chapter can read: Amit remembers the night you came to the car
    expect(meets(sim.state, { relationshipMemory: { who: 'amit', eventId: 'teddy2010-kept' } })).toBe(true)
    sim.go('kitchen')
    expect(sim.endings).toEqual(['kept'])
  })

  it('messy · Ofir picked up from the office, the plan changed beforehand and aloud: a taxi', () => {
    const sim = venue('ofir', 'promise', 'change')
    plan(sim, 'ofir', 'promise')
    teddy(sim, 'phone')
    expect(sim.opened).toContain('d10-pickup')
    expect(sim.opened.indexOf('d10-pickup')).toBeLessThan(sim.opened.indexOf('d10-title-away'))
    expect(sim.state.flags[TEDDY_2010]).toBe('renegotiated')
    expect(proof(sim, 'promise_renegotiated:2010-teddy:return')).toBe(true)
    sim.go('kitchen')
    expect(sim.endings).toEqual(['renegotiated'])
  })

  it('messy · the promise forgotten in the crowd — and the morning remembers it', () => {
    const offered: string[] = []
    const sim = start('2010-teddy', (choices) => {
      offered.push(...choices.map((choice) => choice.id))
      return pick('venue', 'metuki', 'pay', 'promise', 'ours', 'here', 'forget', 'amit')(choices)
    }, {}, 1, PURSE)
    plan(sim, 'metuki', 'promise')
    teddy(sim)
    expect(sim.state.flags[TEDDY_2010]).toBe('broken')
    expect(proof(sim, 'promise_kept')).toBe(false)
    expect(meets(sim.state, { relationshipMemory: { who: 'amit', eventId: 'teddy2010-broken' } })).toBe(true)
    sim.go('kitchen')
    expect(offered).toContain('amit')
    expect(sim.endings).toEqual(['broken'])
  })

  it('the honest "I do not promise what I do not know" is not tested as a broken promise', () => {
    const sim = venue('metuki', 'honest', 'keep')
    plan(sim, 'metuki', 'honest')
    teddy(sim)
    expect(sim.state.flags['promise:return2010']).toBeFalsy()
    expect(sim.state.flags[TEDDY_2010]).toBe('unpromised')
    sim.go('kitchen')
    expect(sim.endings).toEqual(['unpromised'])
  })

  /**
   * §6 — the bread of A2 matures into the pickup of 2010. The ledger crosses forty years; the
   * memory is Pugi's own (a narrator line in `d10-promise`), and nobody in the street speaks it.
   */
  it('the bread of 1984 is in the promise of 2010 — kept, late, or never promised', () => {
    const lived = (kinds: string[]) => {
      const sim = new WorldSim('2010-teddy')
      playChores(sim)
      sim.engine.dispatch({ t: 'money.changed', agorot: PURSE, why: 'test' })
      for (const kind of kinds) sim.engine.dispatch({ t: 'proof.recorded', proof: { kind, proofId: `${kind}:a2-alley:bread`, chapter: 'a2-alley', year: eraFor('a2-alley').year, subjectHe: 'הלחם של אמא' } })
      sim.beatAnswer = pick('venue', 'metuki', 'pay', 'promise')
      sim.go('street')
      sim.press('d10-roster', 'metuki')
      sim.press('d10-pay', 'pay')
      sim.press('d10-promise', 'promise')
      return sim
    }
    const kept = lived(['promise_renegotiated', 'promise_kept'])
    expect(kept.state.flags['d10:bread-kept']).toBe(true)
    expect(kept.state.flags['d10:bread-late']).toBeFalsy()
    expect(kept.state.flags['promise:return2010']).toBe(true)
    const late = lived(['promise_renegotiated'])
    expect(late.state.flags['d10:bread-late']).toBe(true)
    expect(late.state.flags['d10:bread-kept']).toBeFalsy()
    const none = lived([])
    expect(none.state.flags['d10:bread-kept'] || none.state.flags['d10:bread-late']).toBeFalsy()
    // the memory is a narrator line — no one in the street is made to know about 1984
    for (const branch of DIALOGUE['d10-promise']!.branches.filter((b) => b.when)) {
      const extra = branch.lines.at(-1)!
      expect(extra.who).toBeNull()
      expect(extra.text).toContain('לפני חמש')
    }
  })

  it('who stays to watch with Dad finds him in his armchair', () => {
    const sim = start('2010-teddy', pick('kobi', 'ours', 'kobi', 'sit'))
    expect(sim.state.flags['d10:mode']).toBe('home')
    const home = sceneIn(ALL_SCENES.find((scene) => scene.id === 'home')!, '2010-teddy')
    const kobi = home.actors.filter((actor) => actor.nameHe === 'קובי' && inEra(actor, '2010-teddy'))
    expect(kobi.length).toBe(1)
    expect(meets(sim.state, kobi[0]!.when)).toBe(true)
    // ...and not for who drove to Teddy
    const away = venue('metuki', 'promise', 'keep')
    expect(meets(away.state, kobi[0]!.when)).toBe(false)
  })

  it('short on money: the car is greyed with the reason before anything is spent, and the living room is a life', () => {
    const sim = new WorldSim('2010-teddy')
    playChores(sim)
    sim.engine.dispatch({ t: 'money.changed', agorot: -(sim.state.agorot - 5000), why: 'test' })
    const seen: DialogueChoice[] = []
    sim.beatAnswer = (choices) => {
      seen.push(...choices)
      return pick('kobi', 'ours', 'kobi', 'sit')(choices)
    }
    sim.go('street')
    expect(seen.find((choice) => choice.id === 'venue')?.enabled).toBe(false)
    sim.go('kitchen')
    expect(sim.endings).toEqual(['home'])
  })

  it('giving the seat back at the money step turns the evening into the living room, without a dead end', () => {
    const sim = start('2010-teddy', pick('venue', 'metuki', 'home', 'ours', 'kobi', 'sit'), {}, 1, PURSE)
    sim.press('d10-roster', 'metuki')
    sim.press('d10-pay', 'home')
    expect(sim.state.flags['d10:mode']).toBe('home')
    expect(sim.opened).toContain('d10-title')
    sim.go('kitchen')
    expect(sim.endings).toEqual(['home'])
  })
})

// ================================================ 2002 · E05, 2006 · H01 / H03 ----

describe('2002 · E05 — the head count is done at the doors, and the meeting point from Nicosia buys time', () => {
  const atThePort = (meet: boolean, share: number) =>
    start('2002-europe', pick('count', 'count-lost'), { 'e:chelsea': true, 'e:beds': true, 'e:trip': true, 'e:milan': true, 'e:flown': true, ...(meet ? { 'e:meetpoint': true } : {}) }, share)

  it('golden: a meeting point fixed, all six counted — "did you count yourself too?"', () => {
    const sim = atThePort(true, 1)
    sim.go('port-europe')
    expect(sim.minigames).toContain('chore:story:heads-02')
    expect(proof(sim, 'travel_proof:2002-europe:together')).toBe(true)
    expect(sim.endings).toEqual(['together'])
  })

  it('messy: no meeting point, the doors spill everywhere, two missing — nobody claims they were counted', () => {
    const sim = atThePort(false, 0.5)
    sim.go('port-europe')
    expect(sim.minigames).toContain('chore:story:heads-02-lost')
    expect(STORY_CHORES['heads-02-lost']!.shape.seconds).toBeLessThan(STORY_CHORES['heads-02']!.shape.seconds)
    expect(proof(sim, 'travel_proof')).toBe(false)
    expect(sim.endings).toEqual(['missing'])
  })
})

describe('2006 · H01 / H03 — the dismantling and Liron\'s day are done with the hands', () => {
  it('golden: the crates to the door; Shachor answers, and the proof is his', () => {
    const sim = start('2006-home', pick('help'))
    expect(sim.minigames).toContain('chore:story:fold-04')
    expect(sim.opened).toContain('h-helped')
    expect(proof(sim, 'community_help:2006-home:hall')).toBe(true)
  })

  it('Liron pays by what went out of the window: all of it, three quarters, half, nothing', () => {
    const paid = (share: number) => {
      const sim = start('2006-home', pick('sort'), { 'h:derby': true, 'h:door': true }, share)
      const before = sim.state.agorot
      sim.go('workshop')
      return { sim, paid: sim.state.agorot - before }
    }
    const full = paid(1)
    const most = paid(0.5)
    const none = paid(0)
    expect(full.paid).toBeGreaterThan(most.paid)
    expect(most.paid).toBeGreaterThan(0)
    expect(none.paid).toBe(0)
    expect(proof(full.sim, 'adult_shift:2006-home:liron')).toBe(true)
    expect(proof(none.sim, 'adult_shift')).toBe(false)
  })
})

// ================================================================ §11.4 detector --

/**
 * *"Dialogue choices that claim calls/deliveries/organization/work occurred and immediately
 * award skill/proof."* A CHOICE may commit, spend, risk, decide — and the world may pay for
 * work in the reaction that follows it (a branch's `then`, read off what the log says was
 * done). What a choice may not do is pay organization, skill, trust or a proof AND pass the
 * time the work would take, without performing anything: no chore, no ride, no money spent.
 */
const PERFORMED: ReadonlySet<Effect['e']> = new Set<Effect['e']>(['minigame', 'travel', 'pitch', 'penalty', 'hoops', 'shop', 'mechanic'])

function claimsWork(then: readonly Effect[]): boolean {
  const minutes = then.reduce((sum, effect) => sum + (effect.e === 'time' ? effect.minutes : 0), 0)
  const energy = then.reduce((sum, effect) => sum + (effect.e === 'energy' ? effect.delta : 0), 0)
  const pays = then.some((effect) => effect.e === 'skill' || effect.e === 'proof' || (effect.e === 'rel' && effect.axis === 'trust' && effect.delta > 0))
  const performed = then.some((effect) => PERFORMED.has(effect.e) || (effect.e === 'money' && effect.agorot < 0))
  return pays && (minutes >= 20 || energy <= -5) && !performed
}

/** every conversation a chapter's own rooms, people and beats can open (route missions excluded) */
function ownConversations(chapter: string): Set<string> {
  const roots: string[] = []
  for (const base of ALL_SCENES) {
    const room = sceneIn(base, chapter)
    for (const spot of room.hotspots) {
      const own = Array.isArray(spot.era) ? (spot.era as readonly string[]).includes(chapter) : spot.era === chapter
      if (own) roots.push(spot.act)
    }
    for (const actor of room.actors) if (actor.talk && actor.era === chapter) roots.push(actor.talk)
  }
  for (const beat of eraFor(chapter).beats ?? []) for (const action of beat.do) if (action.a === 'talk') roots.push(action.conversation)
  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const id = queue.shift() as string
    if (seen.has(id) || !DIALOGUE[id] || id.startsWith('route-')) continue
    seen.add(id)
    for (const branch of DIALOGUE[id]!.branches) {
      for (const effect of [...(branch.then ?? []), ...(branch.choices ?? []).flatMap((choice) => choice.then)]) if (effect.e === 'goto') queue.push(effect.node)
    }
  }
  return seen
}

function claims(chapter: string): string[] {
  const out: string[] = []
  for (const id of ownConversations(chapter)) {
    for (const branch of DIALOGUE[id]!.branches) for (const choice of branch.choices ?? []) if (claimsWork(choice.then)) out.push(`${id}/${choice.id}`)
  }
  return out.sort()
}

describe('§11.4 — no choice in these chapters claims work it did not perform', () => {
  for (const chapter of ['2007-table', '2007-registered', '2007-key', '2009-up', '2010-cup', '2010-teddy']) {
    it(`${chapter}: none`, () => {
      expect(claims(chapter)).toEqual([])
    })
  }

  /**
   * 2002 and 2006 are converted where travel, cost or a job matters (§7: E05's head count,
   * H01's dismantling, H03's day at Liron's). What is left is named here, so that a new one
   * fails: the hosting of E02, the list and the photo at the door of H02 (the quiet seed of
   * 2007, a vignette), and Uli's roster in H04 (the seed of 2010's roster).
   */
  const LEFT: Record<string, string[]> = {
    '2002-europe': ['e-beds/one', 'e-beds/split'],
    '2006-home': ['h-door/list', 'h-door/photo', 'h-oli/roster'],
  }
  for (const [chapter, left] of Object.entries(LEFT)) {
    it(`${chapter}: only what is named as not converted in delta 90`, () => {
      expect(claims(chapter)).toEqual([...left].sort())
    })
  }

  it('the detector is not blind: the old shape of the 2007 calls would fail it', () => {
    expect(claimsWork([{ e: 'flag', flag: 'u:deliver' }, { e: 'time', minutes: 45 }, { e: 'energy', delta: -10 }, { e: 'skill', skill: 'organization', delta: 3, why: 'x' }])).toBe(true)
    expect(claimsWork([{ e: 'flag', flag: 'x' }, { e: 'minigame', id: 'chore:story:kit-07' }])).toBe(false)
  })

  it('the founding proof stands once in each 2007 chapter, in that chapter\'s own room, and only after work', () => {
    for (const chapter of ['2007-table', '2007-registered', '2007-key']) {
      const spots = ALL_SCENES.flatMap((scene) => scene.hotspots.filter((spot) => inEra(spot, chapter) && spot.act === 'route-proof-found').map((spot) => ({ scene: scene.id, spot })))
      expect(spots.length, chapter).toBe(1)
      expect(['community-room', 'hall-new']).toContain(spots[0]!.scene)
      expect(spots[0]!.spot.when, `${chapter}: the proof is open before any work`).toBeTruthy()
    }
  })

  it('every chore these quests open exists and can be stopped with nothing done without a dead end', () => {
    for (const id of ['heads-02', 'heads-02-lost', 'fold-04', 'orders-06', 'boxes-06', 'count-07', 'returns-07', 'kit-07', 'labels-07', 'banner-10']) {
      const chore = STORY_CHORES[id]
      expect(chore, id).toBeDefined()
      const raised = chore!.finish(0, chore!.shape.target).filter((event) => event.t === 'flag.raised')
      expect(raised.length, `${id} raises nothing when walked out of`).toBeGreaterThan(0)
    }
  })
})
