/**
 * Royal Rumble V3 — the manual-review report (Gate 9, 29.9.2026). Pure: it reads the audit
 * view's rows and answers the questions an owner asks before trusting a price ladder. Used
 * by `npm run rumble:audit` (which prints it) and by `tests/royal-rumble-pricing.test.ts`
 * (which asserts on it), so the tool and the contract cannot disagree.
 */

export type AuditPlayer = {
  slug: string
  nameHe: string
  position: 'GK' | 'DF' | 'MF' | 'FW'
  fromYear: number | null
  rating: number
  price: 1 | 2 | 3 | 4 | 5
  suggested: 1 | 2 | 3 | 4 | 5
  overridden: boolean
  overrideReasonHe: string | null
  confidence: 'high' | 'medium' | 'low'
  factors: { peak: number; longevity: number; output: number; honours: number; bigGames: number; legacy: number }
}

export type Anomaly = { slug: string; nameHe: string; kind: 'elite-weak' | 'five-weak' | 'cheap-elite' | 'low-confidence-premium'; detail: string }

export const eraLabel = (year: number | null): string => (year === null ? 'unknown' : year < 1980 ? '<1980' : year < 2000 ? '1980–99' : '2000+')

const byRating = (a: AuditPlayer, b: AuditPlayer) => b.rating - a.rating

/**
 * What a reviewer should look at first. Thresholds are review prompts, not verdicts:
 *  · elite-weak — an automated €4 rated under 55 (fame outran the record)
 *  · five-weak — a canonical €5 rated under 80 (the list and the evidence disagree)
 *  · cheap-elite — a €1 rated 60+ (either a deliberate bargain, or a hole in fame)
 *  · low-confidence-premium — a €4/€5 on thin evidence: hand-review before shipping
 */
export function anomaliesOf(players: readonly AuditPlayer[]): Anomaly[] {
  const out: Anomaly[] = []
  for (const p of players) {
    if (p.price === 4 && !p.overridden && p.rating < 55) out.push({ slug: p.slug, nameHe: p.nameHe, kind: 'elite-weak', detail: `€4 · rating ${p.rating}` })
    if (p.price === 5 && p.rating < 80) out.push({ slug: p.slug, nameHe: p.nameHe, kind: 'five-weak', detail: `€5 · rating ${p.rating}` })
    if (p.price === 1 && p.rating >= 60) out.push({ slug: p.slug, nameHe: p.nameHe, kind: 'cheap-elite', detail: `€1 · rating ${p.rating}` })
    if (p.price >= 4 && p.confidence === 'low') out.push({ slug: p.slug, nameHe: p.nameHe, kind: 'low-confidence-premium', detail: `€${p.price} · confidence low` })
  }
  return out
}

export type RatingReport = {
  top30: AuditPlayer[]
  fives: AuditPlayer[]
  highestByTier: Record<1 | 2 | 3 | 4, AuditPlayer[]>
  lowestElite: AuditPlayer[]
  positions: Record<string, { count: number; averageRating: number; tiers: number[] }>
  eras: Record<string, { count: number; tiers: number[]; premiumShare: number }>
  anomalies: Anomaly[]
}

export function reportOf(players: readonly AuditPlayer[]): RatingReport {
  const tiers = (rows: readonly AuditPlayer[]) => [1, 2, 3, 4, 5].map((tier) => rows.filter((p) => p.price === tier).length)
  const positions: RatingReport['positions'] = {}
  for (const position of ['GK', 'DF', 'MF', 'FW'] as const) {
    const rows = players.filter((p) => p.position === position)
    positions[position] = { count: rows.length, averageRating: rows.reduce((s, p) => s + p.rating, 0) / Math.max(1, rows.length), tiers: tiers(rows) }
  }
  const eras: RatingReport['eras'] = {}
  for (const label of ['<1980', '1980–99', '2000+']) {
    const rows = players.filter((p) => eraLabel(p.fromYear) === label)
    eras[label] = { count: rows.length, tiers: tiers(rows), premiumShare: rows.filter((p) => p.price >= 4).length / Math.max(1, rows.length) }
  }
  const highest = (tier: number) => players.filter((p) => p.price === tier).sort(byRating).slice(0, 8)
  return {
    top30: [...players].sort(byRating).slice(0, 30),
    fives: players.filter((p) => p.price === 5).sort(byRating),
    highestByTier: { 1: highest(1), 2: highest(2), 3: highest(3), 4: highest(4) },
    lowestElite: players.filter((p) => p.price >= 4).sort((a, b) => a.rating - b.rating).slice(0, 15),
    positions,
    eras,
    anomalies: anomaliesOf(players),
  }
}
