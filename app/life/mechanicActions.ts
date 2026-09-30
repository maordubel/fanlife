'use server'

import { pickerRoster } from '@/lib/archive/player-master'
import { lifeBox, lifeWhat } from '@/lib/archive/wing'
import { formationList, rosterIndex } from '@/lib/game/allTimeXI'
import { dealRun, type GoalChallenge } from '@/lib/game/goal'
import { dealQueue, rosterSize } from '@/lib/game/hate'
import { dealKitRound, type KitPuzzle } from '@/lib/game/kitBuild'
import { dealChallenge, type Challenge } from '@/lib/game/lineup'
import { buildRound, type MemoryRound } from '@/lib/game/memory'
import { pairedRoyalRumbleDrafts, royalRumblePlayerCount, type RoyalRumbleDraft } from '@/lib/game/royal-rumble'
import { playerShirt, seasonOf, wardrobe, type ShirtLook, type Wardrobe } from '@/lib/kit/playerShirt'
import { homeKits } from '@/lib/kit/seasons'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import { KIT_OPTIONS, MEMORY_PAIRS, type MechanicWindow } from '@/lib/mechanics/types'
import { shirtBoard } from '@/lib/xi/board'

/**
 * הדלתות של החיים אל המנועים של השערים (21.9.2026) — one server file, and nothing in it
 * decides anything.
 *
 * Every function here calls the SAME engine the gate's page and actions call, with THE
 * WORKER LIFE's window (`lib/mechanics/types.ts`): only rows dated before the life's
 * year, at the life's level, and — for a lineup, a goal, a shirt — the one row the life
 * pinned. Grading goes through the gates' own actions (`submitLineup`, `submitKit`,
 * `submitGoal`, `submitRoyalRumble`) with the same window, so there is one grade and it
 * lives where the answer lives (rule 4, ADR D6). `lib/life/**` never imports any of this
 * (`tests/life.test.ts` "הגבול"): the life asks the page, the page asks the archive.
 *
 * Every input is cleaned here, because a window is data a browser sent.
 */

function cut(window: MechanicWindow | null | undefined): MechanicWindow | null {
  if (!window || !Number.isFinite(window.before)) return null
  const level = window.level === 'adult' || window.level === 'teen' ? window.level : 'child'
  const pin = typeof window.pin === 'string' && /^[0-9A-Za-z_:.-]{3,80}$/.test(window.pin) ? window.pin : null
  const from = Number.isFinite(window.from) ? Math.round(window.from as number) : undefined
  const sport = window.sport === 'basketball' || window.sport === 'football' ? window.sport : undefined
  return { before: Math.round(window.before), level, pin, ...(from !== undefined ? { from } : {}), ...(sport ? { sport } : {}) }
}

const seedOf = (seed: number) => (Number.isFinite(seed) ? Math.abs(Math.round(seed)) % 2147483000 : 1)

/**
 * the café argument and the schoolyard bet: one verified eleven, the match the life pinned —
 * with that night's REAL shirt (delta 88), the same one on every locker, as on the gate
 */
export async function dealLifeLineup(
  seed: number,
  window: MechanicWindow,
): Promise<(Challenge & { look: ShirtLook | null; keeperLook: ShirtLook | null }) | null> {
  const w = cut(window)
  if (!w?.pin) return null
  const challenge = dealChallenge(seedOf(seed), 0, { before: w.before, pin: w.pin })
  if (!challenge) return null
  const season = challenge.intro.season || challenge.kitSeason
  return { ...challenge, look: season ? playerShirt(null, { season }) : null, keeperLook: season ? playerShirt(null, { season, keeper: true }) : null }
}

/** the shop order: one shirt of a season before the year, three to five choices a step by age */
export async function dealLifeKit(seed: number, window: MechanicWindow): Promise<KitPuzzle[]> {
  const w = cut(window)
  if (!w) return []
  return dealKitRound(seedOf(seed), 0, { before: w.before, pin: w.pin ?? null, options: KIT_OPTIONS[w.level] })
}

/** the bus stop: what the old fan remembers — pairs dated before the window's year */
export async function dealLifeMemory(seed: number, window: MechanicWindow): Promise<MemoryRound | null> {
  const w = cut(window)
  if (!w) return null
  const round = buildRound(seedOf(seed), MEMORY_PAIRS[w.level], 0, { before: w.before, ...(w.from !== undefined ? { from: w.from } : {}) })
  return round.pairs.length >= 3 ? round : null
}

/**
 * the parliament: the one goal the life pinned, as goal one of a run — the gate's own pin —
 * and every one of our men in HIS shirt of that season (delta 88), keyed `index|name` as
 * `/goal` keys them; the other side's men get none (they are printed in navy)
 */
export async function dealLifeGoal(
  seed: number,
  window: MechanicWindow,
): Promise<{ goals: GoalChallenge[]; shirts: Wardrobe }> {
  const w = cut(window)
  const none = { goals: [], shirts: { shirts: [], by: {} } }
  if (!w?.pin) return none
  const [first] = dealRun(seedOf(seed), 0, w.pin)
  if (!first || first.goalId !== w.pin) return none
  const shirts = wardrobe(
    first.pool
      .filter((name) => !first.opponents.includes(name))
      .map((name) => ({ key: `0|${name}`, player: name, season: first.seasonLabel })),
  )
  return { goals: [first], shirts }
}

export type LifeRumble = {
  draft: RoyalRumbleDraft
  shuffleDraft: RoyalRumbleDraft
  playerCount: number
  kits: Array<{ seasonLabel: string; spec: ReturnType<typeof homeKits>[number]['spec'] }>
  /** the dealt men's REAL shirts, from before the year (delta 88) — only the 30 on the cards */
  looks: Wardrobe
}

/** Ofir's pack: both drafts over the men of the life's years */
export async function dealLifeRumble(seed: number, window: MechanicWindow): Promise<LifeRumble | null> {
  const w = cut(window)
  if (!w) return null
  const paired = pairedRoyalRumbleDrafts(seedOf(seed), { before: w.before })
  if (paired.draft.slots.some((slot) => slot.offers.length === 0)) return null
  // a card prints the seasons a man had played BY the life's year — "1985–1994" in 1993 is a
  // year nobody at the pitch has lived yet (rules 45, 88)
  const upTo = (d: RoyalRumbleDraft): RoyalRumbleDraft => ({
    ...d,
    slots: d.slots.map((slot) => ({
      ...slot,
      offers: slot.offers.map((offer) =>
        offer.player.toYear !== null && offer.player.toYear >= w.before
          ? { ...offer, player: { ...offer.player, toYear: Math.max(offer.player.fromYear ?? w.before - 1, w.before - 1) } }
          : offer,
      ),
    })),
  })
  const draft = upTo(paired.draft)
  const shuffleDraft = upTo(paired.shuffleDraft)
  const kits = homeKits()
    .filter(({ seasonLabel }) => Number(seasonLabel.slice(0, 4)) < w.before)
    .map(({ seasonLabel, spec }) => ({ seasonLabel, spec }))
  const dealt = [...draft.slots, ...shuffleDraft.slots].flatMap((slot) => slot.offers)
  const looks = wardrobe(dealt.map((offer) => ({ key: offer.player.slug, player: offer.player.slug, before: w.before })))
  return { draft, shuffleDraft, playerCount: royalRumblePlayerCount(), kits, looks }
}

export type LifeWall = ReturnType<typeof dealQueue> & { rosterSize: number }

/** Shachor's wall: one sport, the names that were names before the year, no later record beside them */
export async function dealLifeWall(seed: number, window: MechanicWindow): Promise<LifeWall | null> {
  const w = cut(window)
  if (!w) return null
  const queue = dealQueue(seedOf(seed), 0, { before: w.before, ...(w.sport ? { sport: w.sport } : {}) })
  if (queue.order.length < 3) return null
  return { ...queue, rosterSize: rosterSize() }
}

/**
 * the ticket office and the living room: the men who had worn the shirt before the year.
 * `withShirts` (the living room's XI only — a poll draws no shirts) adds the wardrobe.
 */
export async function dealLifeRoster(window: MechanicWindow, withShirts = false) {
  const w = cut(window)
  if (!w) return null
  const whole = rosterIndex({ before: w.before })
  if (whole.all.length === 0) return null
  const before = w.before
  const year = (label: string | null) => (label ? Number(label.slice(0, 4)) : Number.NaN)
  // every man as the life's year knew him: his seasons up to it, his shirt from before it
  // (rules 45, 88) — "1985–1996" in 1993 is a year nobody in the living room has lived yet
  const cap = <T extends { toYear?: number | null }>(entry: T): T =>
    typeof entry.toYear === 'number' && entry.toYear >= before ? { ...entry, toYear: before - 1 } : entry
  const capped = new Map(whole.all.map((entry) => [entry, cap(entry)]))
  const roster = {
    ...whole,
    all: whole.all.map((entry) => capped.get(entry) ?? entry),
    letters: whole.letters.map((row) => ({ ...row, names: row.names.map((entry) => capped.get(entry) ?? cap(entry)) })),
  }
  const board = shirtBoard(whole)
  const versions: typeof board.versions = {}
  for (const [slug, list] of Object.entries(board.versions)) {
    const kept = list.filter((version) => version.fromYear < before).map((version) => cap(version))
    if (kept.length > 1) versions[slug] = kept
  }
  const bySlug: typeof board.bySlug = {}
  for (const [slug, shirt] of Object.entries(board.bySlug)) {
    if (year(shirt.seasonLabel) < before) bySlug[slug] = shirt
    else {
      const earlier = (board.versions[slug] ?? []).filter((version) => version.seasonLabel && year(version.seasonLabel) < before).at(-1)
      if (earlier?.seasonLabel) bySlug[slug] = { ...shirt, seasonLabel: earlier.seasonLabel }
    }
  }
  const defaultVersion: typeof board.defaultVersion = {}
  for (const [slug, id] of Object.entries(board.defaultVersion)) {
    if (versions[slug]?.some((version) => version.id === id)) defaultVersion[slug] = id
  }
  const shirts = { ...board, versions, bySlug, defaultVersion }
  // every man's REAL shirt as the life's year knew him (delta 88): a season begun before it
  const rows: Array<{ key: string; player: string; season?: string; before: number }> = []
  for (const entry of withShirts === true ? whole.all : []) {
    const player = entry.id ?? entry.slug
    rows.push({ key: entry.slug, player, before })
    for (const version of versions[entry.slug] ?? []) {
      rows.push({ key: `${entry.slug}@${version.id}`, player, season: version.seasonLabel ?? seasonOf(version.fromYear), before })
    }
  }
  // the club's home shirt of the last season before the year — the number's shirt back
  const home = homeKits().find(({ seasonLabel }) => Number(seasonLabel.slice(0, 4)) < w.before)
  return {
    roster,
    shirts,
    wardrobe: withShirts === true ? wardrobe(rows) : undefined,
    formations: formationList(),
    slugAliases: pickerRoster().slugAliases,
    homeShirt: home?.spec ?? DEFAULT_SPEC,
  }
}

/** the kitchen: the pile of old papers, dated before the year */
export async function dealLifeArchive(seed: number, window: MechanicWindow) {
  const w = cut(window)
  if (!w) return []
  return lifeBox(seedOf(seed), w.before)
}

/** one clipping, read — its own text, never a list that reaches past the year */
export async function readLifeClipping(id: string, window: MechanicWindow) {
  const w = cut(window)
  if (!w || typeof id !== 'string' || id.length > 120) return null
  return lifeWhat(id, w.before)
}
