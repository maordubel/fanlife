import 'server-only'

import { entity } from '@/lib/archive/graph'
import { allPlayers, playerById, resolvePlayerId } from '@/lib/archive/player-master'
import { canDealRoyalRumble, rumbleDepth, type RumbleWindow } from '@/lib/game/royal-rumble'

import { lifeBridge } from './bridge'

/**
 * השנים שחיית — the men of the LIFE chapters this device has FINISHED (ONE RED WORLD §10,
 * §18, §19, §23.1). Server-only, because the answer to "who is in the pool" is the answer
 * to gate 10's question.
 *
 * The rules, in the order they bite:
 *
 *   · **Only a finished chapter counts**, and only one the bridge knows — the client sends
 *     the chapter ids its save completed (`readCompletedChapters`), and anything else is
 *     dropped here. A chapter the save has not finished names nobody, so a payoff can never
 *     reach past the story (§23.2 "never reveal future LIFE content").
 *   · **The pool is archive fact, not fiction.** A man is in it because the Player Master
 *     puts him in the squad of a season the chapter's sourced anchor names (`season:<label>`
 *     on the bridge row), or because the bridge names him as a scorer of the anchor match.
 *     No LIFE character is ever here — the bridge carries master ids only.
 *   · **Football only** (rule 6): a basketball night's season is not a football squad.
 *
 * "Finished" is stricter than the plan's "already reached" (§18) on purpose: entering a
 * chapter is not living it, which is the passport's own rule (`memoryPassport.ts`).
 */

const CHAPTER_ID = /^[a-z0-9][a-z0-9-]{0,39}$/
const MAX_CHAPTERS = 80

/** The chapter ids a client may claim: strings, known to the bridge, deduped, bounded. */
export function cleanChapters(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const known = new Set(lifeBridge().map((row) => row.chapterId))
  const out: string[] = []
  for (const raw of value.slice(0, MAX_CHAPTERS)) {
    if (typeof raw !== 'string' || !CHAPTER_ID.test(raw) || !known.has(raw) || out.includes(raw)) continue
    out.push(raw)
  }
  return out
}

/** The football seasons the finished chapters name, as `1985/86`. */
export function livedSeasons(chapters: readonly string[]): string[] {
  const done = new Set(chapters)
  const out = new Set<string>()
  for (const row of lifeBridge()) {
    if (!done.has(row.chapterId)) continue
    for (const id of row.entityIds) {
      if (!id.startsWith('season:')) continue
      const e = entity(id)
      if (e?.type === 'season' && e.sport === 'football' && e.seasonLabel) out.add(e.seasonLabel)
    }
  }
  return [...out].sort()
}

export type LivedPlayer = { id: string; slug: string; nameHe: string }

const cache = new Map<string, LivedPlayer[]>()

/** Every man of the finished chapters' seasons (and the anchor matches' scorers). */
export function livedPlayers(chapters: readonly string[]): LivedPlayer[] {
  const clean = [...new Set(chapters)].sort()
  const key = clean.join('|')
  const hit = cache.get(key)
  if (hit) return hit
  const seasons = new Set(livedSeasons(clean))
  const ids = new Set<string>()
  for (const row of lifeBridge()) if (clean.includes(row.chapterId)) for (const id of row.playerIds) ids.add(id)
  const out: LivedPlayer[] = []
  for (const player of allPlayers()) {
    const inSeason = seasons.size > 0 && player.spells.some((spell) => spell.seasons.some((label) => seasons.has(label)))
    if (!inSeason && !ids.has(player.id)) continue
    out.push({ id: player.id, slug: player.slug, nameHe: player.displayName })
  }
  if (cache.size > 64) cache.clear()
  cache.set(key, out)
  return out
}

/** The same set as ids — what gate 10's pool and gate 1's "מה נשאר איתי" intersect with. */
export function livedPlayerIds(chapters: readonly string[]): Set<string> {
  return new Set(livedPlayers(chapters).map((p) => p.id))
}

/**
 * §10 — "מה נשאר איתי": of the men in the supporter's XI, those who belong to a lived
 * chapter. The sheet is read on the client (it lives in `worker.xi.v1`) and only its refs
 * cross; the answer is names the supporter already chose, so nothing new is revealed.
 */
export function stayedWithMe(chapters: readonly string[], refs: readonly unknown[]): LivedPlayer[] {
  const lived = livedPlayerIds(chapters)
  if (lived.size === 0) return []
  const out: LivedPlayer[] = []
  for (const ref of refs.slice(0, 24)) {
    if (typeof ref !== 'string' || ref.length > 80) continue
    const id = resolvePlayerId(ref)
    const player = id ? playerById(id) : null
    if (!player || !lived.has(player.id) || out.some((p) => p.id === player.id)) continue
    out.push({ id: player.id, slug: player.slug, nameHe: player.displayName })
  }
  return out
}

const windows = new Map<string, RumbleWindow | null>()

/**
 * §18 — the Royal Rumble window of "השנים שחיית עד עכשיו": the lived men, by slug, and only
 * when a whole board (and an opponent) can be dealt from them. `null` = the mode stays shut.
 */
export function livedRumbleWindow(chapters: readonly string[]): RumbleWindow | null {
  const key = [...new Set(chapters)].sort().join('|')
  if (!key) return null
  if (windows.has(key)) return windows.get(key) ?? null
  const window: RumbleWindow = { only: livedPlayers(chapters).map((p) => p.slug) }
  const open = canDealRoyalRumble(window) && rumbleDepth(window) >= 6 ? window : null
  if (windows.size > 64) windows.clear()
  windows.set(key, open)
  return open
}
