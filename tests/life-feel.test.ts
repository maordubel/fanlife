/**
 * LIFE · the hood — the FEEL pass (24.11.2026): the playthrough harness plays the first half hour the way the HUD tells a
 * player to, and the pacing budgets hold; a whole childhood plays through the challenges for every core club (careful and
 * careless) with no stuck state and always a mission offered; the era tables show nothing before its year; every word the
 * feel layer prints exists; the challenges name real missions.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {rushView} from '@/lib/clubs/life/rush'
import {LIFE_TIMELINE} from '@/lib/clubs/life/packs'
import {missionById, storyNights, STORY_WORDS} from '@/lib/life/hood/story'
import type {HoodClub} from '@/lib/life/hood/level'
import {playthrough, summary} from '@/lib/life/hood/story/feel/playthrough'
import {CHALLENGES} from '@/lib/life/hood/story/challenge/table'
import {CALLBACKS} from '@/lib/life/hood/story/feel/voice'
import {FEEL_WORDS} from '@/lib/life/hood/story/feel/words'
import {liveOf, MONEY_WORDS, moneyOf, moneyWord, texture, TEXTURE} from '@/lib/life/hood/story/feel/era'
import {DECADES, DRESS_ITEMS, ERA_DRESS, ERA_ITEMS, decadeStart, inEra} from '@/lib/life/rush-render/era'
import type {ArchiveRef} from '@/lib/life/universal/types'

type Club = {hood: HoodClub; nights: Record<string, ArchiveRef>; born: number | null}
const cache = new Map<string, Promise<Club>>()
const clubOf = (id: string) => {
  if (!cache.has(id)) cache.set(id, (async () => {
    const club = (await loadClub(id))!, pack = clubLife(club.data)
    const b = (LIFE_TIMELINE as Record<string, {birthYear?: number} | undefined>)[id]?.birthYear
    const born = typeof b === 'number' ? b : null
    return {hood: {id, skin: pack.skin, cast: pack.cast, born, country: club.data.identity.country}, nights: storyNights(rushView(club.data), born), born}
  })())
  return cache.get(id)!
}

/** the budgets the feel pass set (docs/life/LIFE-FEEL-AUDIT-2026-11-24.md) */
const BUDGET = {control: 20, firstMission: 30, maxGap: 50, over40: 2, deadWalk: 120, worstWait: 2, stepLineRepeats: 4}

describe('the first half hour keeps its pacing budgets', {timeout: 300_000}, () => {
  for (const id of ['hapoel-tel-aviv', 'olympiacos']) it(id, async () => {
    const c = await clubOf(id)
    const x = playthrough({club: c.hood, nights: c.nights, born: c.born, feel: true, seconds: 1800})
    console.log(summary(x))
    expect(x.stuck).toBe(false); expect(x.empty).toBe(0)
    expect(x.firstControl).toBeLessThanOrEqual(BUDGET.control)
    // the street opens on Dad's offer already in his ear: a mission is his within seconds of the picture
    expect(x.firstMission - x.firstControl).toBeLessThanOrEqual(10)
    expect(x.firstMission).toBeLessThanOrEqual(BUDGET.firstMission)
    expect(x.maxGap).toBeLessThanOrEqual(BUDGET.maxGap)
    expect(x.over40).toBeLessThanOrEqual(BUDGET.over40)
    expect(x.deadWalk).toBeLessThanOrEqual(BUDGET.deadWalk)
    expect(x.worstWait).toBeLessThanOrEqual(BUDGET.worstWait)
    for (const [k, n] of Object.entries(x.repeats)) if (k.startsWith('story.s.')) expect(n, k).toBeLessThanOrEqual(BUDGET.stepLineRepeats)
    // the challenges are felt: a clock, a find, a carry, a spend or a bargain, the song on the way to the ground
    const seen = new Set(x.notes.map(n => n.what))
    for (const k of ['feel.clock.label', 'feel.carry.on', 'feel.find.hint', 'feel.n.chant', 'feel.kept', 'feel.mate.named']) expect(seen.has(k), k).toBe(true)
    expect(x.chapters).toBeGreaterThanOrEqual(10)
  })
})

describe('a whole childhood plays through the challenges, for every core club', {timeout: 900_000}, () => {
  for (const id of CORE_CLUB_IDS) it(id, async () => {
    const c = await clubOf(id)
    for (const [seed, careless] of [[3, false], [4, true]] as const) {
      const x = playthrough({club: c.hood, nights: c.nights, born: c.born, feel: true, seed, pick: 'random', careless, seconds: 6000, until: p => p.state.done.includes('the-box')})
      expect(x.stuck, `${id} seed ${seed}`).toBe(false); expect(x.empty).toBe(0)
      expect(x.play.state.done, `${id} seed ${seed}: ${summary(x)}`).toContain('the-box')
      // fail-forward: a careless child slips now and then, and every mission still ends
      if (careless) expect(x.missions.every(m => m.t1 > 0)).toBe(true)
    }
  })
})

describe('the era shows nothing before its year', () => {
  it('the dressing tables', () => {
    for (const d of DECADES) for (const item of DRESS_ITEMS[d]) expect(ERA_ITEMS[item]!.from, `${d}: ${item}`).toBeLessThanOrEqual(decadeStart(d))
    for (const d of DECADES) expect(ERA_DRESS[d].paint.every(h => /^#[0-9a-f]{6}$/i.test(h))).toBe(true)
  })
  it('the texture lines, the live source, the money', () => {
    for (let y = 1960; y <= 2030; y++) {
      for (const k of texture(y)) { const t = TEXTURE.find(x => x.key === k)!; expect(inEra(t.item, y), `${y}: ${k}`).toBe(true) }
      if (y < 2000) { expect(texture(y)).not.toContain('era.t.mobile'); expect(texture(y)).not.toContain('era.t.text'); expect(liveOf(y)).not.toBe('text') }
      if (y < 1990) expect(liveOf(y)).toBe('radio')
      if (y < 2002) for (const c of ['Greece', 'Italy', 'Germany']) expect(moneyOf(6, c, y).key).not.toBe('era.money.euro')
    }
    expect(moneyOf(6, 'Nowhere', 1985).key).toBe('era.money.coins')
    expect(moneyOf(6, null, null)).toEqual({n: 6, key: 'era.money.coins'})
    for (const c of ['Israel', 'Greece', 'Italy', 'Germany', 'Scotland', 'Morocco', 'Egypt', 'Bosnia and Herzegovina']) for (const y of [1985, 1995, 2005, 2015]) expect(moneyOf(1, c, y).key in MONEY_WORDS, `${c} ${y}`).toBe(true)
    expect(moneyWord('era.money.euro', 2)).toBe('€2')
    // a country's money never reaches the universal words
    for (const k of Object.keys(MONEY_WORDS)) expect(k in STORY_WORDS, k).toBe(false)
  })
})

describe('the feel layer only prints what it has words for, about missions that exist', () => {
  it('challenges and callbacks name real missions and ways; every word exists', () => {
    for (const k of Object.keys(CHALLENGES)) { const [m, a] = k.split('/'); const mm = missionById(m!); expect(mm, k).not.toBeNull(); expect(mm!.approaches.some(x => x.id === a), k).toBe(true) }
    for (const c of CALLBACKS) { expect(missionById(c.mission)).not.toBeNull(); expect(c.key in STORY_WORDS).toBe(true) }
    for (const [k, c] of Object.entries(CHALLENGES)) {
      const clock = c.kind === 'promise' ? null : c.kind === 'timed' ? c.clock : c.clock
      if (clock) expect(`feel.clock.${clock.reason}` in STORY_WORDS, k).toBe(true)
      if (c.kind === 'spend') for (const o of c.offers) expect(`feel.spend.${k.replace('/', '.')}.${o.id}` in STORY_WORDS, k).toBe(true)
    }
    for (const k of Object.keys(FEEL_WORDS)) expect(STORY_WORDS[k]).toBeTruthy()
    // no yellow and no club or real name in the feel words: authored fiction only
    for (const [k, v] of Object.entries(FEEL_WORDS)) expect(/yellow/i.test(v), k).toBe(false)
  })
})
