import { rosterIndex } from '@/lib/game/allTimeXI'

/**
 * מפקד השחקנים — how many men wore the Hapoel Tel Aviv football shirt, and when.
 *
 * Counted, never typed (rule 11): the total is the length of the Player Master's football
 * roster, and each decade is the number of those men whose recorded seasons touch it — so a
 * man who played from 1998 to 2003 is in two decades, and the decade bars therefore add up to
 * MORE than the total, which the plate says. A man the archive cannot date is counted in the
 * total and in `undated`, and in no decade: a guessed decade would be a fact nobody wrote.
 */
export type Census = {
  total: number
  decades: { decade: number; n: number }[]
  undated: number
  /** the busiest decade — the bar the plate paints in vermilion */
  peak: { decade: number; n: number } | null
  earliest: number | null
  latest: number | null
}

export function playerCensus(): Census {
  const { all, total } = rosterIndex()
  // a contract that runs to 2027 is not a season anyone has played yet
  const thisYear = new Date().getFullYear()
  const perDecade = new Map<number, number>()
  let undated = 0
  let earliest: number | null = null
  let latest: number | null = null
  for (const entry of all) {
    const from = entry.fromYear
    if (from === null || from === undefined) {
      undated += 1
      continue
    }
    const to = Math.min(entry.toYear ?? from, thisYear)
    earliest = earliest === null ? from : Math.min(earliest, from)
    latest = latest === null ? Math.max(to, from) : Math.max(latest, to, from)
    for (let d = Math.floor(from / 10) * 10; d <= Math.floor(Math.max(to, from) / 10) * 10; d += 10) {
      perDecade.set(d, (perDecade.get(d) ?? 0) + 1)
    }
  }
  const decades = [...perDecade.entries()].sort((a, b) => a[0] - b[0]).map(([decade, n]) => ({ decade, n }))
  const peak = decades.reduce<{ decade: number; n: number } | null>((best, row) => (best === null || row.n > best.n ? row : best), null)
  return { total, decades, undated, peak, earliest, latest }
}
