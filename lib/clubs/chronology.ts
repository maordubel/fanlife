import type {DatedCard} from '@/lib/game/timeline-run'
import {exactDay} from './blackfile-engine'

/**
 * Gate 13 · Chronology — the pool and the shape of a run (rulebook §15.1, TI-R01..R08).
 * Pure: the engine that deals lives in `lib/game/timeline-engine.ts`; this decides WHAT may be dealt and what a run
 * is called, so the screen, the share card and the tests all read one definition.
 */

type FactLike = {id: string; value: DatedCard & {on?: string | null}; status?: string; confidence?: number}

/** TI-R01 — approved, conflict-free, exact calendar dates; ONE card per date; ids distinct. */
export function chronologyPool(facts: readonly FactLike[]): DatedCard[] {
  const days = new Set<string>(), ids = new Set<string>()
  const out: DatedCard[] = []
  // pool order is kept: the deal is a function of it, and existing links must keep dealing the same run
  for (const f of facts) {
    const v = f.value
    if (f.status !== undefined && f.status !== 'approved') continue
    if (f.confidence !== undefined && f.confidence < 2) continue
    const day = exactDay(v?.on)
    if (!day || !v.id || !String(v.title ?? '').trim() || days.has(day) || ids.has(v.id)) continue
    days.add(day)
    ids.add(v.id)
    out.push({...v, on: day})
  }
  return out
}

export const FULL_PLACEMENTS = 10
/** TI-R02 — three dates are an anchor and two placements; eleven are a full run */
export const MIN_DATES = 3
export const FULL_DATES = FULL_PLACEMENTS + 1

export type ChronologyShape = {
  /** the cards to place, not counting the anchor */
  placements: number
  category: 'full' | 'short' | 'locked'
  /** distinct exact dates still needed for a full run */
  datesShort: number
  blocker: 'TIMELINE_EXACT_DATES_SHORT' | null
}

export function chronologyShape(poolSize: number): ChronologyShape {
  const placements = Math.max(0, Math.min(FULL_PLACEMENTS, poolSize - 1))
  const category = poolSize >= FULL_DATES ? 'full' : poolSize >= MIN_DATES ? 'short' : 'locked'
  return {placements, category: category, datesShort: Math.max(0, FULL_DATES - poolSize), blocker: poolSize >= MIN_DATES ? null : 'TIMELINE_EXACT_DATES_SHORT'}
}

/** the run key carries the category, so a short practice score is never compared with a ten-card run (TI-R08) */
export function runKey(version: string, seed: number, cursor: number, shape: ChronologyShape): string {
  return `timeline:${shape.category}${shape.placements}:${version}:${seed}:${cursor}`
}

export {roundScore} from '@/lib/game/timeline-run'

/* ------------------------------------------------------------------ TI-R06 anti-leak */

const ISO_DAY = /\b\d{4}-\d{2}-\d{2}\b/
const SLASH_DAY = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/
const YEAR = /(?<![\d])(1[89]\d{2}|20\d{2})(?![\d])/
const COMPACT_DAY = /(?<!\d)(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?!\d)/
const MONTH_YEAR = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}\b/i

const OPAQUE_ID = /^[0-9a-f]{12,}$/

/** What in a string gives a date away — empty when it is clean. */
export function dateLeaks(text: string): string[] {
  const found: string[] = []
  for (const [name, re] of [['iso', ISO_DAY], ['slash', SLASH_DAY], ['compact', COMPACT_DAY], ['year', YEAR], ['month-year', MONTH_YEAR]] as const) if (re.test(text)) found.push(name)
  return found
}

/**
 * Scan the whole public deal — every id, title and hint the browser is handed before the first answer — for a date.
 * Returns `path: leak` strings; an empty list means the payload is clean.
 */
export function payloadLeaks(deal: {anchor?: {id: string; title: string; hint: string; on?: string}; queue: readonly {id: string; title: string; hint: string}[]}): string[] {
  const out: string[] = []
  const check = (path: string, text: string) => {for (const l of dateLeaks(text)) out.push(`${path}: ${l}`)}
  // a long hex hash is opaque: four digits that happen to sit inside it are not a year
  const checkId = (path: string, id: string) => {if (!OPAQUE_ID.test(id)) check(path, id)}
  deal.queue.forEach((c, i) => {checkId(`queue[${i}].id`, c.id); check(`queue[${i}].title`, c.title); check(`queue[${i}].hint`, c.hint)})
  if (deal.anchor) {checkId('anchor.id', deal.anchor.id); check('anchor.title', deal.anchor.title); check('anchor.hint', deal.anchor.hint)}
  return out
}
