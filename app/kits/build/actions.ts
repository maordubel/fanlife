'use server'

import {
  gradeKitPuzzle,
  kitHint,
  STEP_ORDER,
  type KitHintAnswer,
  type KitHintKind,
  type KitStep,
  type KitVerdict,
  type KitWindow,
} from '@/lib/game/kitBuild'
import { gateHref } from '@/lib/links'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * שער 4 — the two calls the run makes. The server deals again from the seed and grades against
 * its own deal; the client sends option ids and hint receipts, never a value (rule 4).
 */

function clean(placed: unknown): Partial<Record<KitStep, string>> {
  const out: Partial<Record<KitStep, string>> = {}
  if (typeof placed !== 'object' || placed === null) return out
  for (const step of STEP_ORDER) {
    const id = (placed as Record<string, unknown>)[step]
    if (typeof id === 'string' && /^[0-9a-f]{12}$/.test(id)) out[step] = id
  }
  return out
}

export async function submitKit(
  seed: number,
  index: number,
  placed: Partial<Record<KitStep, string>>,
  cursor = 0,
  receipts: string[] = [],
  claimedHints = 0,
  window?: KitWindow,
  legacy = false,
): Promise<KitVerdict | null> {
  if (!Number.isInteger(seed) || !Number.isInteger(index) || !Number.isInteger(cursor)) return null
  const proofs = Array.isArray(receipts) ? receipts.filter((r): r is string => typeof r === 'string').slice(0, 6) : []
  return gradeKitPuzzle(seed, index, clean(placed), cursor, proofs, Number(claimedHints) || 0, cleanWindow(window), legacy === true)
}

/**
 * THE WORKER LIFE's window (`lib/mechanics/types.ts`): a year, a kit id and an option count,
 * nothing else — the same grade over the one shirt the life ordered.
 */
function cleanWindow(window?: KitWindow): KitWindow | undefined {
  if (!window || !Number.isFinite(window.before)) return undefined
  const pin = typeof window.pin === 'string' && /^kit-[0-9a-z-]{4,40}$/.test(window.pin) ? window.pin : null
  const options = Number.isInteger(window.options) ? Math.max(2, Math.min(5, window.options as number)) : undefined
  return { before: Math.round(window.before), pin, ...(options ? { options } : {}) }
}

export async function askKitHint(
  seed: number,
  index: number,
  kind: KitHintKind,
  cursor = 0,
  window?: KitWindow,
  legacy = false,
): Promise<KitHintAnswer | null> {
  if (!Number.isInteger(seed) || !Number.isInteger(index) || !Number.isInteger(cursor)) return null
  return kitHint(seed, index, kind, cursor, cleanWindow(window), legacy === true)
}

/**
 * The Universal Exit's "עוד משהו טבעי" for a finished round (ONE RED WORLD §5, §13, §38).
 *
 * A round's shirts arrive as the archive's own kit keys (`1999/00|home`), weakest first; the
 * Entity Graph resolves each to its kit card, so the door opens on the shirt that slipped. The
 * first door is the wardrobe — a shirt built here is a shirt that went back to the closet (gate
 * 5, §13 "Unlock → Gate 5 collection"). Every href is from `lib/links`.
 */
const KIT_KEY = /^\d{4}(\/\d{2})?\|(home|away|third)$/

export async function nextAfterKits(input: { context: ResultContext }): Promise<{ context: ResultContext; next: NextAction[] }> {
  const raw = input?.context
  const keys = Array.isArray(raw?.archiveEntityIds)
    ? raw.archiveEntityIds.filter((key): key is string => typeof key === 'string' && KIT_KEY.test(key)).slice(0, 5)
    : []
  const context: ResultContext = {
    gateId: 4,
    runId: typeof raw?.runId === 'string' ? raw.runId.slice(0, 48) : undefined,
    score: typeof raw?.score === 'number' && Number.isFinite(raw.score) ? Math.trunc(raw.score) : undefined,
    kitIds: keys,
    archiveEntityIds: keys,
  }
  const wardrobe = gateHref(5)
  const doors: NextAction[] = wardrobe
    ? [{ kind: 'gate', href: wardrobe, label: 'voice.next.gate.5', subject: null, reason: 'kits→wardrobe' }]
    : []
  for (const door of recommend(context, { exclude: doors.map((d) => d.href) })) {
    if (doors.length >= 2) break
    doors.push(door)
  }
  return { context, next: doors }
}
