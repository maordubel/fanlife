import { describe, expect, it } from 'vitest'

import { dealFile, dealPairs } from '@/lib/game/blackfile'
import { dealRun } from '@/lib/game/goal'
import { dealQueue } from '@/lib/game/hate'
import { dealKitRound } from '@/lib/game/kitBuild'
import { dealChallenge } from '@/lib/game/lineup'
import { buildBoard } from '@/lib/game/memory'
import { dealTimelineRun } from '@/lib/game/timeline'
import { deal, ROUND_LENGTH } from '@/lib/game/trivia'
import {
  cycleSeed,
  positionOf,
  rotate,
  roundQuery,
  slicesIn,
  takeFrom,
  withRound,
} from '@/lib/rotation/deck'
import { roundFrom } from '@/lib/rotation/round'

/**
 * הרוטציה — the claim is "a different round every time", and this is the script.
 *
 * Maor's requirement, in his words: *"לוודא שהאתר וכל מיני משחק, כל טרוויה, כל שאלון
 * מבצע סבב אקראי שכל משתתף יקבל חוויה אחרת וגם אם אתה נכנס כמה פעמים ביום לאותה פעילות
 * יהיה לך חוויה שונה. למעט 'הזמנה אישית' של דו קרב על אותן שאלות."*
 *
 * That is four separate promises and they pull against each other, so each one is
 * tested on its own:
 *
 *   1. **A repeat visit is a different round.** Walking the cursor forward changes what
 *      is dealt, in every mode.
 *   2. **It does not repeat until it has to.** Consecutive rounds inside one lap of the
 *      pool are disjoint — not merely different.
 *   3. **A lap is not a loop.** The lap after the pool is exhausted is a different
 *      shuffle, not the first lap again.
 *   4. **A named round is exactly reproducible**, which is what makes a personal duel a
 *      duel rather than two unrelated quizzes.
 *
 * And one promise nobody asked for out loud, which is why it is first: **cursor 0 is
 * byte-for-byte what these modes dealt before rotation existed.** That is what let this
 * land under 1,270 existing tests without touching a single expectation, and it is the
 * property that would break silently if somebody "simplified" the deck later.
 */

describe('הדק — the arithmetic', () => {
  it('leaves cycle 0 exactly as it found it', () => {
    expect(cycleSeed(12345, 0)).toBe(12345)
    expect(positionOf(12345, 0, 100, 10)).toMatchObject({ seed: 12345, slot: 0, cycle: 0 })
    expect(rotate([1, 2, 3, 4], 0)).toEqual([1, 2, 3, 4])
    expect(takeFrom([1, 2, 3, 4, 5], 0, 2)).toEqual([1, 2])
  })

  it('walks the deck, then wraps into a NEW shuffle rather than repeating', () => {
    const slices = slicesIn(30, 5)
    expect(slices).toBe(6)
    // the last slice of a lap
    expect(positionOf(7, 5, 30, 5)).toMatchObject({ slot: 5, cycle: 0, seed: 7 })
    // the first slice of the next one — same place in the deck, different deck
    const next = positionOf(7, 6, 30, 5)
    expect(next.slot).toBe(0)
    expect(next.cycle).toBe(1)
    expect(next.seed).not.toBe(7)
  })

  it('survives a hand-edited cursor rather than dealing nothing', () => {
    expect(positionOf(7, -4, 30, 5).slot).toBe(0)
    expect(positionOf(7, Number.NaN, 30, 5).slot).toBe(0)
    expect(takeFrom([], 3, 5)).toEqual([])
    expect(slicesIn(0, 5)).toBe(1)
  })

  it('wraps a short tail instead of dealing a short round', () => {
    expect(takeFrom([1, 2, 3, 4, 5], 4, 3)).toEqual([5, 1, 2])
  })

  it('writes a round into a URL that already has a query', () => {
    expect(roundQuery(9, 0)).toBe('seed=9')
    expect(roundQuery(9, 3)).toBe('seed=9&r=3')
    expect(withRound('/trivia/europe', 9, 3)).toBe('/trivia/europe?seed=9&r=3')
    expect(withRound('/x?a=1', 9, 0)).toBe('/x?a=1&seed=9')
  })
})

describe('הכתובת של סבב — what the route reads', () => {
  it('mints a fresh round when the link names none — twice running, differently', () => {
    const a = roundFrom({})
    const b = roundFrom({})
    expect(a.pinned).toBe(false)
    expect(a.cursor).toBe(0)
    // A collision is possible in principle; across ten draws from ten million it is
    // not, and a fallback that returned a constant is the bug this replaces.
    const seeds = new Set(Array.from({ length: 10 }, () => roundFrom({}).seed))
    expect(seeds.size).toBeGreaterThan(1)
    expect(b.seed).toBeGreaterThan(0)
  })

  it('plays a named round exactly as written — the duel case', () => {
    const round = roundFrom({ seed: '4242', r: '7' })
    expect(round).toEqual({ seed: 4242, cursor: 7, pinned: true })
    // read twice, same answer: a duel link cannot re-roll on arrival
    expect(roundFrom({ seed: '4242', r: '7' })).toEqual(round)
  })

  it('ignores a cursor on a link that named no seed', () => {
    // `?r=5` alone addresses a deck that was never named. Honouring it would deal the
    // sixth slice of a shuffle the sender never saw.
    expect(roundFrom({ r: '5' }).cursor).toBe(0)
  })
})

/**
 * Every mode, three questions each, driven off one table so a new gate cannot be added
 * to the app and quietly left out of the guarantee.
 *
 * `size` is how many items a round takes, and `ids` pulls the stable identifiers out of
 * whatever shape the mode deals — which is different for every one of them.
 */
const MODES: Array<{
  name: string
  size: number
  ids: (seed: number, cursor: number) => string[]
}> = [
  {
    name: 'trivia',
    size: ROUND_LENGTH,
    ids: (seed, cursor) =>
      Array.from({ length: ROUND_LENGTH }, (_, index) => deal(seed, index, 'general', cursor))
        .filter((question): question is NonNullable<typeof question> => question !== null)
        .map((question) => question.id),
  },
  {
    name: 'goal',
    size: 3,
    ids: (seed, cursor) => dealRun(seed, cursor).map((goal) => goal.goalId),
  },
  {
    name: 'timeline',
    size: 10,
    ids: (seed, cursor) => dealTimelineRun(seed, cursor).queue.map((card) => card.id),
  },
  {
    name: 'kits',
    size: 5,
    // Gate 4's cursor counts SHIRTS since ONE RED WORLD §13 (Quick spends 3, Full 5 —
    // `kitNextCursor`), so "the next round" of a Full player is five shirts on, not one.
    // The guarantee this table holds is unchanged; only the address of round N moved.
    ids: (seed, round) => dealKitRound(seed, round * 5).map((puzzle) => puzzle.id),
  },
  {
    name: 'memory',
    size: 6,
    ids: (seed, cursor) => [...new Set(buildBoard(seed, 6, cursor).map((card) => card.pair))],
  },
  {
    name: 'hate',
    size: 10,
    ids: (seed, cursor) => dealQueue(seed, cursor).order,
  },
]

describe('כל שער מחלק משהו אחר בכניסה הבאה', () => {
  for (const mode of MODES) {
    it(`${mode.name} — a second visit is not the first one again`, () => {
      const first = mode.ids(1234, 0)
      const second = mode.ids(1234, 1)
      expect(first.length).toBe(mode.size)
      expect(second.length).toBe(mode.size)
      expect(second).not.toEqual(first)
    })

    /**
     * **הבדיקה הזאת הייתה על זרע אחד ועל מעבר אחד, והיא הייתה ירוקה במקרה** (21.9.2026).
     *
     * ברגע שבריכת הטריוויה זזה — שורת כדורסל אחת שנוספה לארכיון — היא נפלה על
     * `trophy:גביע-הטוטו:2001/02`, ומה שהתברר מאחוריה היה תקלה אמיתית ולא רעש:
     * `trophy-season` מייצרת מהארכיון **שאלה אחת בדיוק**, והרוטציה סובבה את הרשימה
     * שלה במקום לחתוך אותה — כלומר אותה שאלה בדיוק הופיעה **בכל סיבוב, לתמיד**.
     * זה כלל 65 בצורתו הטהורה: לא לרפות, לשאול מה השומר ידע שהקוד לא.
     *
     * ועכשיו הוא רחב יותר ולא צר יותר — ארבעה זרעים על ארבעה מעברים רצופים, כי
     * מה שנפל על 1234→1 נפל גם על אחרים, והזרע הבודד הוא בדיוק מה שהסתיר את זה.
     */
    it(`${mode.name} — consecutive rounds share nothing, across seeds and cursors`, () => {
      const bad: string[] = []
      for (const seed of [7, 1234, 4242, 90210]) {
        for (let cursor = 0; cursor < 4; cursor += 1) {
          const first = new Set(mode.ids(seed, cursor))
          const second = mode.ids(seed, cursor + 1)
          const repeated = second.filter((id) => first.has(id))
          if (repeated.length > 0) bad.push(`${seed}@${cursor}→${cursor + 1}: ${repeated.join(', ')}`)
          if (second.length !== mode.size) bad.push(`${seed}@${cursor + 1}: short round (${second.length})`)
        }
      }
      expect(bad, `${mode.name} repeated: ${bad.join(' · ')}`).toEqual([])
    })

    it(`${mode.name} — the same address is the same round, every time`, () => {
      expect(mode.ids(99, 3)).toEqual(mode.ids(99, 3))
      // and a different device, playing the link, gets the same thing
      expect(mode.ids(99, 3)).not.toEqual(mode.ids(99, 4))
    })

    it(`${mode.name} — a new lap of the pool is a new shuffle, not a rerun`, () => {
      // Far enough out that every mode here has been round its pool at least once.
      const early = mode.ids(1234, 0)
      const late = mode.ids(1234, 40)
      expect(late).not.toEqual(early)
      expect(late.length).toBe(mode.size)
    })
  }
})

describe('שערים עם צורה משלהם', () => {
  it('lineup walks the recorded matches instead of a three-step cycle', () => {
    // `rng()`'s first output is nearly linear in the seed, so the old
    // `records[floor(rng(seed)() * n)]` gave seeds 1..6 only four distinct matches.
    // Five playable records since 21.9.2026: the documented XI of 2000/01 names no match
    // and is withheld (brief §14). Five rounds, five matches.
    const walked = new Set(
      Array.from({ length: 5 }, (_, cursor) => dealChallenge(500, cursor)?.matchId),
    )
    expect(walked.size).toBeGreaterThanOrEqual(5)
  })

  it('the black file deals a round the counter can actually count', () => {
    // It used to declare 8 while dealing 9, so a perfect score printed "9 / 8". The
    // total is now summed from what the seed dealt (`app/derby/file/page.tsx`), which
    // only works if both halves stay countable under rotation.
    expect(dealFile(11).length + dealPairs(11).length).toBe(9)
    expect(dealFile(11, 3).length + dealPairs(11, undefined, 3).length).toBe(9)
  })

  it('the memory deck is addressed over the pool it can actually field', () => {
    /*
     * `buildBoard` passed `positionOf` the RAW candidate count (65) while the
     * de-duplication that follows collapses every competition to one row and leaves 29
     * usable pairs. A lap was therefore ELEVEN boards long over a pool that fills five —
     * `takeFrom` wrapped, and more than half of every lap was a pair the same lap had
     * already dealt. That is the one guarantee `lib/rotation/deck.ts` exists to make.
     * 17.9.2026.
     *
     * FRESH_BOARDS is a FLOOR, not a description: 29 pairs fill four boards of six with
     * five pairs to spare, so the fifth board of a lap is allowed to wrap and the sixth
     * begins a new lap. Grow the archive and this number can be raised; it must never be
     * lowered to make the suite green (rule 47).
     */
    const FRESH_BOARDS = 4
    for (const seed of [11, 42, 7, 1234, 99]) {
      const seen = new Map<string, number>()
      for (let cursor = 0; cursor < FRESH_BOARDS; cursor += 1) {
        for (const card of buildBoard(seed, 6, cursor)) {
          seen.set(card.pair, (seen.get(card.pair) ?? 0) + 1)
        }
      }
      // Every card is dealt exactly twice — it is a pair — so a pair that turns up on two
      // boards of the same lap shows as four.
      const repeated = [...seen.values()].filter((count) => count > 2).length
      expect(
        repeated,
        `seed ${seed}: ${repeated} pairs repeated inside the first ${FRESH_BOARDS} boards`,
      ).toBe(0)
      expect(seen.size).toBe(FRESH_BOARDS * 6)
    }
  })

  it('the black file reorders the file rather than hiding half of it', () => {
    // Five transfer cards, and all five are the round: the cursor may change the order
    // they arrive in and may not drop one, because this half IS the whole file.
    const first = dealFile(11, 0).map((card) => card.id)
    const second = dealFile(11, 1).map((card) => card.id)
    expect([...second].sort()).toEqual([...first].sort())
    expect(second).not.toEqual(first)
  })
})
