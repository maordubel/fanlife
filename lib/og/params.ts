/**
 * מה כרטיס השיתוף מקבל — the query of the two result cards (delta 89), both ends.
 *
 * The result screen writes it (`blindCowCardQuery`, `goalCardQuery`), the gate page reads
 * it for its Open Graph image and the image route draws from it. Everything is a number or
 * a closed word, parsed with a whitelist: a link cannot make the card print text of its
 * own choosing. **Gate 10 carries no name and no player id** — the card says how you did,
 * never who it was (CLAUDE.md, gate 10: "the text never names the man").
 */

export type BlindCowCard = {
  mode: 'solo' | 'daily' | 'duel'
  status: 'solved' | 'gave_up' | 'timeout'
  hints: number
  /** raw seconds × 10 (18.4 s → 184) */
  tenths: number
  /** weighted seconds × 10, only for a solve */
  weightedTenths: number | null
  duel: 'won' | 'lost' | 'tie' | 'none' | null
  /** the daily's date, `2026-09-25` */
  day: string | null
}

export type GoalCard = {
  goalId: string
  /** the run's average accuracy, 0–100 */
  avg: number
  /** the best goal's accuracy, 0–100 */
  best: number
  score: number
}

const MODES = { s: 'solo', d: 'daily', v: 'duel' } as const
const STATUS = { s: 'solved', g: 'gave_up', t: 'timeout' } as const
const DUEL = { w: 'won', l: 'lost', t: 'tie', n: 'none' } as const

const key = <T extends Record<string, string>>(map: T, value: string) =>
  (Object.entries(map).find(([, v]) => v === value)?.[0] ?? '') as keyof T & string

function int(raw: string | null | undefined, min: number, max: number): number | null {
  if (raw === null || raw === undefined || !/^\d{1,9}$/.test(raw)) return null
  const n = Number(raw)
  return n >= min && n <= max ? n : null
}

type Search = { get(name: string): string | null } | Record<string, string | string[] | undefined>

function read(search: Search, name: string): string | null {
  if (typeof (search as { get?: unknown }).get === 'function') return (search as { get(name: string): string | null }).get(name)
  const v = (search as Record<string, string | string[] | undefined>)[name]
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null)
}

export function blindCowCardQuery(card: BlindCowCard): string {
  const q = new URLSearchParams()
  q.set('bm', key(MODES, card.mode))
  q.set('bs', key(STATUS, card.status))
  q.set('bh', String(Math.max(1, Math.min(10, Math.round(card.hints)))))
  q.set('bt', String(Math.max(0, Math.min(99999, Math.round(card.tenths)))))
  if (card.weightedTenths !== null) q.set('bw', String(Math.max(0, Math.min(99999, Math.round(card.weightedTenths)))))
  if (card.duel) q.set('bd', key(DUEL, card.duel))
  if (card.day && /^\d{4}-\d{2}-\d{2}$/.test(card.day)) q.set('by', card.day)
  return q.toString()
}

export function parseBlindCowCard(search: Search): BlindCowCard | null {
  const mode = MODES[read(search, 'bm') as keyof typeof MODES]
  const status = STATUS[read(search, 'bs') as keyof typeof STATUS]
  const hints = int(read(search, 'bh'), 1, 10)
  const tenths = int(read(search, 'bt'), 0, 99999)
  if (!mode || !status || hints === null || tenths === null) return null
  const duel = DUEL[read(search, 'bd') as keyof typeof DUEL] ?? null
  const day = read(search, 'by')
  return {
    mode,
    status,
    hints,
    tenths,
    weightedTenths: status === 'solved' ? int(read(search, 'bw'), 0, 99999) : null,
    duel: mode === 'duel' ? duel : null,
    day: mode === 'daily' && day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null,
  }
}

const GOAL_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function goalCardQuery(card: GoalCard): string {
  const q = new URLSearchParams()
  q.set('cg', card.goalId)
  q.set('ca', String(Math.max(0, Math.min(100, Math.round(card.avg)))))
  q.set('cb', String(Math.max(0, Math.min(100, Math.round(card.best)))))
  q.set('cs', String(Math.max(0, Math.min(999999, Math.round(card.score)))))
  return q.toString()
}

export function parseGoalCard(search: Search): GoalCard | null {
  const goalId = read(search, 'cg')
  const avg = int(read(search, 'ca'), 0, 100)
  const best = int(read(search, 'cb'), 0, 100)
  const score = int(read(search, 'cs'), 0, 999999)
  if (!goalId || goalId.length > 64 || !GOAL_ID.test(goalId) || avg === null || best === null || score === null) return null
  return { goalId, avg, best, score }
}

export type CardSize = 'wide' | 'story'
export const CARD_SIZE: Record<CardSize, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  story: { width: 1080, height: 1350 },
}
export function cleanSize(raw: string | null | undefined): CardSize {
  return raw === 'story' ? 'story' : 'wide'
}

/** "18.4" from tenths */
export function secondsOf(tenths: number): string {
  return (tenths / 10).toFixed(1)
}
