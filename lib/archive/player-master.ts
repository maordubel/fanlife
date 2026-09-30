import 'server-only'

import masterJson from '@/content/generated/player-master.json'
import {
  buildIdentityIndex,
  identityKey,
  type PlayerId,
  type PlayerIdEntry,
  type PlayerKind,
  type PlayerMasterV2File,
  type PlayerMasterV2Record,
  type PlayerSpellV2,
  type Position,
} from '@/lib/archive/player-identity'
import { fold, splitName } from '@/lib/game/roster-search'

/**
 * The Player Master reader — the ONE way into the football people (21.9.2026, v2).
 *
 * Server-only: the master is 1.5 MB and holds evidence no screen needs. A screen gets a
 * projection (`pickerRoster()`), built here, handed down as a plain object.
 *
 * Identity goes through `lib/archive/player-identity.ts`: an id, a slug (current or former),
 * a v1 `player-…` id, or any spelling a source attached to the person. Nothing here
 * matches a name fuzzily (rule 7) — a spelling two people share resolves to nobody, and
 * the 59 shirt-number spellings no reviewer has attached to anyone stay in
 * `playerMaster.unresolved`, where `holdersOfNumber` still reports them by the name the
 * source wrote, with `playerId: null`.
 *
 * `npm run players:master` rebuilds `content/generated/player-master.json`;
 * `tests/player-master.test.ts` fails when its `inputsSha` is stale.
 */

export type DatePrecision = 'day' | 'month' | 'year' | 'unknown'
export type PlayerMasterRecord = PlayerMasterV2Record
export type { PlayerId, PlayerKind, PlayerSpellV2, Position }

export const playerMaster = masterJson as unknown as PlayerMasterV2File

const byId = new Map<string, PlayerMasterRecord>(playerMaster.players.map((p) => [p.id, p]))
const byLegacy = new Map<string, PlayerMasterRecord>()
for (const p of playerMaster.players) for (const legacy of p.legacyIds) byLegacy.set(legacy, p)

/**
 * The resolution index is built from the master's own records, which carry every slug
 * and spelling the registry holds for a live person — so a reader needs one JSON, not two.
 */
const identity = buildIdentityIndex(
  playerMaster.players.map(
    (p): PlayerIdEntry => ({
      id: p.id,
      slug: p.slug,
      slugAliases: p.slugAliases,
      nameAliases: [p.displayName, ...p.aliases.he, ...p.aliases.latin],
      mintedOn: '',
    }),
  ),
)

/* ------------------------------------------------------------------ identity */

export function allPlayers(): readonly PlayerMasterRecord[] {
  return playerMaster.players
}

export function playerCount(): number {
  return playerMaster.players.length
}

export function playerById(id: PlayerId | null | undefined): PlayerMasterRecord | null {
  if (!id) return null
  return byId.get(id) ?? null
}

/**
 * A person from anything a file or a saved state might hold: a `p_…` id, a slug (current
 * or merged away), a Player Master v1 `player-…` id, or a spelling. `null` when nobody —
 * or more than one person — answers to it.
 */
export function resolvePlayer(nameOrSlugOrLegacyId: string | null | undefined): PlayerMasterRecord | null {
  if (!nameOrSlugOrLegacyId) return null
  const legacy = byLegacy.get(nameOrSlugOrLegacyId.trim())
  if (legacy) return legacy
  const hit = identity.resolve(nameOrSlugOrLegacyId)
  return hit ? (byId.get(hit.id) ?? null) : null
}

export function resolvePlayerId(nameOrSlugOrLegacyId: string | null | undefined): PlayerId | null {
  return resolvePlayer(nameOrSlugOrLegacyId)?.id ?? null
}

/** Every spelling of him, display name first — for joins that are still keyed by name. */
export function namesOf(player: PlayerMasterRecord): string[] {
  return [player.displayName, ...player.aliases.he]
}

/** v1 API — kept. `fold` is now the only normaliser; this is its lower-cased form. */
export function normalizePlayerName(value: string): string {
  return identityKey(value)
}

/** v1 API — kept. Exact resolution, never a guess. */
export function findPlayer(name: string): PlayerMasterRecord | undefined {
  return resolvePlayer(name) ?? undefined
}

/** v1 API — kept. Substring over every spelling, folded. */
export function searchPlayers(query: string, limit = 30): PlayerMasterRecord[] {
  const q = identityKey(query)
  if (!q) return playerMaster.players.slice(0, limit)
  return playerMaster.players
    .filter((p) => [...namesOf(p), ...p.aliases.latin].some((name) => identityKey(name).includes(q)))
    .slice(0, limit)
}

/** v1 API — kept. Resolved holders only; see `holdersOfNumber` for the whole answer. */
export function playersByShirtNumber(number: number, season?: string): PlayerMasterRecord[] {
  return playerMaster.players.filter((p) =>
    p.shirtNumbers.some((s) => s.number === number && (!season || s.seasonLabel === season)),
  )
}

export function currentSquad(): PlayerMasterRecord[] {
  return playerMaster.players.filter((p) => p.currentSquad?.active)
}

/* ------------------------------------------------------------------ views */

/** His spells, oldest first — the XI's "versions" — with the shirt each one wears. */
export function versionsOf(idOrName: string): PlayerSpellV2[] {
  return resolvePlayer(idOrName)?.spells ?? []
}

export type NumberHolder = {
  /** null where the source's spelling reaches nobody in the archive — shown, never merged */
  playerId: PlayerId | null
  nameHe: string
  number: number
  seasonLabel: string
  historical: boolean
  disputed?: boolean
  sourceTitle: string | null
  sourceUrl: string | null
}

/**
 * Who wore #n — season-bound holders only (`shirt-numbers.json` and the current squad
 * sheet), each with its source. ויקיפועל's undated `מספר בהפועל` is NOT a holding of a
 * season (rule 37) and is not returned here.
 */
export function holdersOfNumber(number: number, season?: string): NumberHolder[] {
  const out: NumberHolder[] = []
  for (const p of playerMaster.players) {
    for (const s of p.shirtNumbers) {
      if (s.number !== number || (season && s.seasonLabel !== season)) continue
      out.push({
        playerId: p.id,
        nameHe: p.displayName,
        number,
        seasonLabel: s.seasonLabel,
        historical: s.historical,
        ...(s.disputed ? { disputed: true } : {}),
        sourceTitle: s.source.sourceTitle ?? null,
        sourceUrl: s.source.sourceUrl ?? null,
      })
    }
  }
  for (const miss of playerMaster.unresolved) {
    for (const row of miss.numbers ?? []) {
      if (row.number !== number || (season && row.seasonLabel !== season)) continue
      out.push({
        playerId: null,
        nameHe: miss.nameHe,
        number,
        seasonLabel: row.seasonLabel,
        historical: true,
        sourceTitle: row.sourceTitle,
        sourceUrl: row.sourceUrl,
      })
    }
  }
  return out.sort((a, b) => (a.seasonLabel < b.seasonLabel ? -1 : a.seasonLabel > b.seasonLabel ? 1 : 0))
}

/* ------------------------------------------------------------------ the picker */

/** One pickable player, in the shape a phone can hold. Client-safe: no evidence, no sources. */
export type PickerPlayer = {
  id: PlayerId
  slug: string
  nameHe: string
  givenHe: string
  familyHe: string
  initial: string
  /** his other Hebrew spellings, so a search for `עמרי אפק` finds עומרי */
  aliasesHe?: string[]
  position: Position | null
  /** only where a source states more than one */
  positions?: Position[]
  positionFrom: PlayerMasterRecord['positions']['from']
  foreignSlot: 'israeli' | 'foreign' | 'unknown'
  /** the legacy facet the current filters read (see `PlayerMasterRecord.origin`) */
  origin: 'israeli' | 'foreign' | null
  originFrom: PlayerMasterRecord['origin']['from']
  fromYear: number | null
  toYear: number | null
  /** spells as indexes into `PickerRoster.seasons`; only where there are two or more */
  spells?: { id: string; from: number; to: number; seasons: number[]; kitSeason: number | null; primary: boolean }[]
  /** season-bound numbers he wore, unique */
  numbers?: number[]
}

export type PickerRoster = {
  /** every season label the spells mention, sent once */
  seasons: string[]
  players: PickerPlayer[]
  /** a slug merged away → the id it now belongs to, so a saved pick still resolves */
  slugAliases: Record<string, PlayerId>
}

let picker: PickerRoster | null = null

/**
 * Everyone a supporter may pick: `kind === 'player'` only. A referee, a singer who was
 * the association's thousandth member, or a man a match report names without a role is
 * a person in the archive and not a footballer in an XI.
 */
export function pickerRoster(): PickerRoster {
  if (picker) return picker
  const seasonIndex = new Map<string, number>()
  const seasons: string[] = []
  const at = (label: string): number => {
    let index = seasonIndex.get(label)
    if (index === undefined) {
      index = seasons.length
      seasons.push(label)
      seasonIndex.set(label, index)
    }
    return index
  }
  const slugAliases: Record<string, PlayerId> = {}
  const players: PickerPlayer[] = []
  for (const p of playerMaster.players) {
    if (p.kind !== 'player') continue
    for (const slug of p.slugAliases) slugAliases[slug] = p.id
    const numbers = [...new Set(p.shirtNumbers.map((s) => s.number))].sort((a, b) => a - b)
    players.push({
      id: p.id,
      slug: p.slug,
      nameHe: p.displayName,
      ...splitName(p.displayName),
      ...(p.aliases.he.length ? { aliasesHe: p.aliases.he } : {}),
      position: p.positions.codes[0] ?? null,
      ...(p.positions.codes.length > 1 ? { positions: p.positions.codes } : {}),
      positionFrom: p.positions.from,
      foreignSlot: p.foreignSlot.status,
      origin: p.origin.value,
      originFrom: p.origin.from,
      fromYear: p.years.from,
      toYear: p.years.to,
      ...(p.spells.length > 1
        ? {
            spells: p.spells.map((spell) => ({
              id: spell.id,
              from: spell.from,
              to: spell.to,
              seasons: spell.seasons.map(at),
              kitSeason: spell.kitSeason === null ? null : at(spell.kitSeason),
              primary: spell.primary,
            })),
          }
        : {}),
      ...(numbers.length ? { numbers } : {}),
    })
  }
  players.sort((a, b) => fold(a.familyHe).localeCompare(fold(b.familyHe), 'he'))
  picker = { seasons, players, slugAliases }
  return picker
}

/** Pickable people only — the list `rosterIndex()` is built from. */
export function pickablePlayers(): PlayerMasterRecord[] {
  return playerMaster.players.filter((p) => p.kind === 'player')
}
