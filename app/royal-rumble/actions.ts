'use server'

import {
  pairedRoyalRumbleDrafts,
  playRoyalRumble,
  type RoyalRumbleDraft,
  type RoyalRumbleResult,
  type RoyalRumbleSelection,
  type RumbleWindow,
} from '@/lib/game/royal-rumble'
import { royalRumbleLivedSeed } from '@/lib/game/royal-rumble-seeds'
import { cleanChapters, livedRumbleWindow } from '@/lib/life/livedPool'
import { parseSelection } from '@/lib/game/royal-rumble-public'
import { resolvePlayerId } from '@/lib/archive/player-master'
import { recommend, type NextAction, type ResultContext } from '@/lib/results/context'

/**
 * Resolve a locked Royal Rumble five on the server.
 * Hidden 9-99 ratings never enter the browser: the action returns only the opponent's
 * public cards, the resolved formations and the already-resolved match animation frames.
 * V2 (25.9.2026): the selection carries `offeredAs`, and the server re-deals the board from
 * the seed to check every card against the slot it was dealt in (spec §6).
 */
export async function submitRoyalRumble(
  seed: number,
  selection: RoyalRumbleSelection[],
  window?: RumbleWindow,
): Promise<RoyalRumbleResult | null> {
  const picks = parseSelection(selection)
  if (!picks) return null
  // `window` is THE WORKER LIFE's pack: the same match, over the men of the life's years only
  const cut = window && typeof window.before === 'number' && Number.isFinite(window.before) ? { before: Math.round(window.before) } : undefined
  return playRoyalRumble(seed, picks, cut)
}

/**
 * The Universal Exit after the whistle (ONE RED WORLD §5, §6, §38): the five he chose, as
 * Player Master ids resolved HERE (slugs only cross the wire), and at most two doors from
 * `recommend()` — his man's archive card, "הוא נכנס להרכב שלך?".
 */
export async function nextAfterRumble(slugs: string[], runId: string): Promise<NextAction[]> {
  const playerIds = (Array.isArray(slugs) ? slugs : [])
    .filter((slug): slug is string => typeof slug === 'string')
    .slice(0, 5)
    .map((slug) => resolvePlayerId(slug))
    .filter((id): id is string => Boolean(id))
  const context: ResultContext = { gateId: 9, runId: typeof runId === 'string' ? runId.slice(0, 32) : undefined, playerIds }
  return recommend(context)
}

/* ------------------------------------------------------------------ "השנים שחיית עד עכשיו" */

/**
 * ONE RED WORLD §18 — the themed draft over the men of this device's FINISHED LIFE chapters.
 * A separate mode: its own route (`/royal-rumble/lived`), its own seed namespace
 * (`royalRumbleLivedSeed`), and a window built HERE from the chapter ids (a client can
 * claim chapters, never slugs). The canonical board of a seed does not move.
 */
export async function livedRumbleOpen(chapters: string[]): Promise<boolean> {
  return livedRumbleWindow(cleanChapters(chapters)) !== null
}

export async function dealLivedRumble(
  chapters: string[],
  seed: number,
  cursor = 0,
): Promise<{ draft: RoyalRumbleDraft; shuffleDraft: RoyalRumbleDraft } | null> {
  const window = livedRumbleWindow(cleanChapters(chapters))
  if (!window || !Number.isFinite(seed)) return null
  return pairedRoyalRumbleDrafts(royalRumbleLivedSeed(Math.floor(Math.abs(seed)) >>> 0, Number.isFinite(cursor) ? cursor : 0), window)
}

export async function submitLivedRumble(seed: number, selection: RoyalRumbleSelection[], chapters: string[]): Promise<RoyalRumbleResult | null> {
  const picks = parseSelection(selection)
  const window = livedRumbleWindow(cleanChapters(chapters))
  if (!picks || !window || !Number.isFinite(seed)) return null
  return playRoyalRumble(seed >>> 0, picks, window)
}
