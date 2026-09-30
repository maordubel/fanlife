/**
 * ה-DNA של ההרכב — what an eleven is made of, counted and never scored.
 *
 * The poster's summary. Gate 1 is preference, not correctness (rule 74), so this file
 * counts and nothing more: how many men came from each decade, how many the club
 * recruited from abroad, how many decades the sheet spans. There is no total, no
 * percentage of anything, no "balance" reading and no grade — a number that added up to
 * a verdict would be exactly the fake scoring this gate refuses.
 *
 * **Three honesty decisions, all of them visible on the screen:**
 *
 *  · **A man belongs to the decade his spell BEGAN in**, not to every decade it touched.
 *    Counting a 1979–1992 career under both the seventies, the eighties and the nineties
 *    makes eleven men add up to nineteen, and a reader looking at a column of decades
 *    reads it as a partition whatever the caption says. One man, one decade, and the
 *    label says which decade it is — the one he arrived in.
 *  · **`null` is a bucket, not a zero.** A man the archive cannot date and a man whose
 *    origin no source states are counted as `unknown` and printed. Folding them into the
 *    Israeli column — the overwhelmingly likely answer — would be a guess about named
 *    people, which is rule 11 in its plainest form.
 *  · **An incomplete eleven still has a DNA.** Nothing here requires eleven rows; the
 *    counts describe whoever has been picked. A screen that refuses to describe ten men
 *    is a screen that thinks the eleventh is the point, and it is not.
 */

export type DnaRow = {
  /** the first year of the spell this pick represents — `null` where the archive cannot date him */
  fromYear: number | null
  origin: 'israeli' | 'foreign' | null
}

export type XIDna = {
  /** decade opening year → how many of the picked men arrived inside it, oldest first */
  decades: { decade: number; count: number }[]
  /** picked men the archive cannot place in any decade */
  undated: number
  origin: { israeli: number; foreign: number; unknown: number }
  /** how many different decades the eleven touches — the spread, not a score */
  spread: number
  /** how many slots are filled */
  picked: number
  /** the shape, carried through so the poster prints one object and not two */
  formation: string
}

export function xiDna(rows: readonly DnaRow[], formation: string): XIDna {
  const byDecade = new Map<number, number>()
  let undated = 0
  const origin = { israeli: 0, foreign: 0, unknown: 0 }

  for (const row of rows) {
    if (row.fromYear === null) undated += 1
    else {
      const decade = Math.floor(row.fromYear / 10) * 10
      byDecade.set(decade, (byDecade.get(decade) ?? 0) + 1)
    }
    if (row.origin === 'israeli') origin.israeli += 1
    else if (row.origin === 'foreign') origin.foreign += 1
    else origin.unknown += 1
  }

  const decades = [...byDecade.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade - b.decade)

  return { decades, undated, origin, spread: decades.length, picked: rows.length, formation }
}
