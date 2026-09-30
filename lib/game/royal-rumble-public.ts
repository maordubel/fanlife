/**
 * Royal Rumble V2 — the PUBLIC half of the engine (25.9.2026, spec §4–§7, §57).
 *
 * Everything in this file is safe in the browser: the draft shapes, the two legal
 * formations, and the pure viability arithmetic Solo, Live and the LIFE board all share
 * (`minimumCompletionCost`, `canPickRoyalRumbleOffer`, `resolvePublicFormation`,
 * `countPicked`). There is NO hidden rating here and no way to reach one — the server
 * half (`royal-rumble.ts`, `server-only`) re-exports these types so client files keep
 * their `import type` paths.
 *
 * The draft is five slots in a fixed order — GK · DF · MF · MF · FW (V3, 29.9.2026: the
 * FLEX slot is gone). There is exactly one shape, 1-1-2-1; the slot rules make any completed
 * five legal by construction, so viability is purely a money question.
 */

export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export type RoyalRumblePrice = 1 | 2 | 3 | 4 | 5

export const ROYAL_RUMBLE_BUDGET = 15
export const ROYAL_RUMBLE_LINEUP_SIZE = 5
export const ROYAL_RUMBLE_OFFERS_PER_SLOT = 3
/** the composer + pricing generation; a board dealt under another version is another board (§14, §59) */
export const ROYAL_RUMBLE_BALANCE_VERSION = 3
/** what a persisted Live pick carries so a V1 room is never read as V2 (§73) */
export const ROYAL_RUMBLE_DRAFT_VERSION = 3

export type RoyalRumbleSlotRule = { kind: 'fixed'; position: Position }

export const ROYAL_RUMBLE_DRAFT_SLOTS: readonly RoyalRumbleSlotRule[] = [
  { kind: 'fixed', position: 'GK' },
  { kind: 'fixed', position: 'DF' },
  { kind: 'fixed', position: 'MF' },
  { kind: 'fixed', position: 'MF' },
  { kind: 'fixed', position: 'FW' },
]

export type RoyalRumblePublicPlayer = {
  slug: string
  nameHe: string
  /** display value only — the man may be documented in more than one position */
  position: Position
  positions: Position[]
  price: RoyalRumblePrice
  fromYear: number | null
  toYear: number | null
}

/** a card: the man, and the position he is dealt AS in this slot (§5) — never `player.position` */
export type RoyalRumbleOffer = {
  player: RoyalRumblePublicPlayer
  offeredAs: Position
}

export type RoyalRumbleDraftSlot = {
  index: number
  rule: RoyalRumbleSlotRule
  offers: RoyalRumbleOffer[]
}

export type RoyalRumbleDraft = {
  seed: number
  budget: number
  version: typeof ROYAL_RUMBLE_BALANCE_VERSION
  slots: RoyalRumbleDraftSlot[]
}

/** what the client sends back: the slug AND the position it was offered as (§6) */
export type RoyalRumbleSelection = {
  slug: string
  offeredAs: Position
}

/**
 * One shape only: 1-1-2-1. `defensive` (1-2-1-1) exists solely so a history row saved
 * under V2 still types; nothing produces it any more.
 */
export type RoyalRumbleFormation = 'defensive' | 'creative'

export type RoyalRumblePick = RoyalRumbleOffer | null

export function slotLabel(rule: RoyalRumbleSlotRule): Position {
  return rule.position
}

export function slotAdmits(rule: RoyalRumbleSlotRule, position: Position): boolean {
  return rule.position === position
}

export function countPicked(picks: readonly RoyalRumblePick[]): number {
  return picks.reduce((count, pick) => count + (pick ? 1 : 0), 0)
}

export function lineupCost(picks: readonly RoyalRumblePick[]): number {
  return picks.reduce((sum, pick) => sum + (pick?.player.price ?? 0), 0)
}

function cheapestOffer(slot: RoyalRumbleDraftSlot): number {
  if (slot.offers.length === 0) return Number.POSITIVE_INFINITY
  return Math.min(...slot.offers.map((offer) => offer.player.price))
}

/**
 * The least money a finished five can cost given what is already picked — every other
 * slot at its picked price, or at its cheapest card. `except` treats one slot as empty
 * (the slot being reconsidered).
 */
export function minimumCompletionCost(
  draft: Pick<RoyalRumbleDraft, 'slots'>,
  picks: readonly RoyalRumblePick[],
  except?: number,
): number {
  return draft.slots.reduce((sum, slot, index) => {
    if (index === except) return sum
    const picked = picks[index]
    return sum + (picked ? picked.player.price : cheapestOffer(slot))
  }, 0)
}

/** Would this card, in this slot, still leave a five that fits the budget? */
export function canPickRoyalRumbleOffer(
  draft: Pick<RoyalRumbleDraft, 'slots' | 'budget'>,
  picks: readonly RoyalRumblePick[],
  slotIndex: number,
  offer: RoyalRumbleOffer,
): boolean {
  const slot = draft.slots[slotIndex]
  if (!slot || !slotAdmits(slot.rule, offer.offeredAs)) return false
  if (!slot.offers.some((dealt) => dealt.player.slug === offer.player.slug && dealt.offeredAs === offer.offeredAs)) return false
  return minimumCompletionCost(draft, picks, slotIndex) + offer.player.price <= draft.budget
}

/** The formation is always 1-1-2-1 — known from the first pick, never a decision. */
export function resolvePublicFormation(_picks?: readonly RoyalRumblePick[]): RoyalRumbleFormation {
  return 'creative'
}

/** the same answer from a finished list of positions (the server's resolver, the result screen) */
export function formationOf(positions: readonly Position[]): RoyalRumbleFormation | null {
  const count = (position: Position) => positions.filter((item) => item === position).length
  if (positions.length !== ROYAL_RUMBLE_LINEUP_SIZE || count('GK') !== 1 || count('FW') !== 1) return null
  return count('DF') === 1 && count('MF') === 2 ? 'creative' : null
}

/** the little pitch in the rail and on the result: shape as five (x, y) points, attack to the end */
export function formationShape(_formation?: RoyalRumbleFormation): readonly { position: Position; x: number; y: number }[] {
  return [
    { position: 'GK', x: 10, y: 50 },
    { position: 'DF', x: 30, y: 50 },
    { position: 'MF', x: 50, y: 32 },
    { position: 'MF', x: 50, y: 68 },
    { position: 'FW', x: 76, y: 50 },
  ]
}

/** the wire form of the picks, in slot order */
export function toSelection(picks: readonly RoyalRumblePick[]): RoyalRumbleSelection[] | null {
  const out: RoyalRumbleSelection[] = []
  for (const pick of picks) {
    if (!pick) return null
    out.push({ slug: pick.player.slug, offeredAs: pick.offeredAs })
  }
  return out.length === ROYAL_RUMBLE_LINEUP_SIZE ? out : null
}

const POSITIONS: readonly Position[] = ['GK', 'DF', 'MF', 'FW']

/** a selection as the browser sent it — `null` unless it is exactly five well-formed picks */
export function parseSelection(value: unknown): RoyalRumbleSelection[] | null {
  if (!Array.isArray(value) || value.length !== ROYAL_RUMBLE_LINEUP_SIZE) return null
  const out: RoyalRumbleSelection[] = []
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null
    const { slug, offeredAs } = item as { slug?: unknown; offeredAs?: unknown }
    if (typeof slug !== 'string' || slug.length === 0) return null
    if (typeof offeredAs !== 'string' || !POSITIONS.includes(offeredAs as Position)) return null
    out.push({ slug, offeredAs: offeredAs as Position })
  }
  return new Set(out.map((pick) => pick.slug)).size === ROYAL_RUMBLE_LINEUP_SIZE ? out : null
}

/** what a Live room persists per pick (§73): the selection, stamped with the draft version */
export type RoyalRumbleLivePick = RoyalRumbleSelection & { v: typeof ROYAL_RUMBLE_DRAFT_VERSION }

export function toLivePicks(selection: readonly RoyalRumbleSelection[]): RoyalRumbleLivePick[] {
  return selection.map((pick) => ({ v: ROYAL_RUMBLE_DRAFT_VERSION, slug: pick.slug, offeredAs: pick.offeredAs }))
}

/**
 * A persisted Live pick is `{ v: 3, slug, offeredAs }`. A room locked under V1 or V2 stored
 * other shapes (V2 had a FLEX slot); those are never reinterpreted as V3 picks — the room resolves to nothing and
 * the pair starts a new one.
 */
export function parseLivePicks(value: unknown): RoyalRumbleSelection[] | null {
  if (!Array.isArray(value) || value.length !== ROYAL_RUMBLE_LINEUP_SIZE) return null
  for (const item of value) {
    if (typeof item !== 'object' || item === null || (item as { v?: unknown }).v !== ROYAL_RUMBLE_DRAFT_VERSION) return null
  }
  return parseSelection(value)
}

/** one line of a standalone history row (§54) — public numbers only */
export type RoyalRumbleHistoryItem = {
  seed: number
  selected: string[]
  formation: RoyalRumbleFormation
  cost: number
  scoreFor: number
  scoreAgainst: number
  result: 'W' | 'D' | 'L'
}
