import { ownerSpelling } from '@/lib/canon/spelling'
import { fold } from '@/lib/game/roster-search'

/**
 * זהות שחקן — one person, one id, whatever the file calls him (21.9.2026).
 *
 * Before this file the same man had four keys: a Hebrew `slug` (saved XIs, squads,
 * scorers), `fold(nameHe)` (the facets and the shirt join), the Player Master's
 * `player-<sha1(name)>` (which changed on every spelling fix — rule 35's bug, for people),
 * and plain display names (lineups, ballots). This module is the one place a name, a
 * slug or an id becomes a `PlayerId`.
 *
 * **A `PlayerId` is `p_` + 10 hex, minted once** into `content/manual/player-ids.json` by
 * `npm run canon:ids -- --write-ids` and never derived at read time. Two spellings are
 * the same man only through that registry — a reviewed merge in
 * `content/manual/player-aliases.json`, or a spelling a source attached to him — never
 * by a guess here (rule 7). `fold` is the only normaliser, lower-cased so a Latin alias
 * is found however it is typed.
 *
 * Pure and client-safe: no JSON, no `node:crypto`, no I/O. The registry is data and the
 * minting lives in `scripts/ingest/lib/playerIds.ts`.
 */

export const PLAYER_ID_PREFIX = 'p_'

/** Opaque. Nothing may parse it and nothing may derive it at read time. */
export type PlayerId = string

export function isPlayerId(value: string): boolean {
  return /^p_[0-9a-f]{10}$/.test(value)
}

/**
 * The comparison form of a name or a slug. `fold` + lower case; slugs fold like names.
 * `ownerSpelling` is the one explicit correction on top (spec §0.1, 22.9.2026): a source
 * that writes שלום תקוה with two vavs still reaches him, without that spelling ever being
 * stored as an alias (`lib/canon/spelling.ts`).
 */
export function identityKey(value: string): string {
  return ownerSpelling(fold(value)).toLowerCase()
}

/** One row of `content/manual/player-ids.json`. Append-only: `id` never changes. */
export type PlayerIdEntry = {
  id: PlayerId
  /** the canonical roster slug */
  slug: string
  /** every other slug this person has been filed under (a reviewed merge), oldest first */
  slugAliases: string[]
  /** every spelling a source has written for him — Hebrew and Latin */
  nameAliases: string[]
  mintedOn: string
}

export type Resolution = {
  id: PlayerId
  /** how the query reached him — the screen and the report can say which */
  via: 'id' | 'slug' | 'slug-alias' | 'name'
}

export type IdentityIndex = {
  resolve: (query: string | null | undefined) => Resolution | null
  /** keys that name more than one person — never resolved, always reported */
  ambiguous: ReadonlyMap<string, readonly PlayerId[]>
}

/**
 * Index a registry for resolution.
 *
 * Order: an id, then an exact slug, then an exact former slug, then the folded name
 * against every spelling and every slug. A folded key that two people share resolves to
 * NOBODY — `עומר פרץ` is two men, and picking one is the fuzzy match rule 7 forbids.
 */
export function buildIdentityIndex(entries: readonly PlayerIdEntry[]): IdentityIndex {
  const ids = new Set<string>()
  const slugs = new Map<string, PlayerId>()
  const former = new Map<string, PlayerId>()
  const keys = new Map<string, Set<PlayerId>>()

  const addKey = (value: string, id: PlayerId) => {
    const key = identityKey(value)
    if (!key) return
    const set = keys.get(key) ?? new Set<PlayerId>()
    set.add(id)
    keys.set(key, set)
  }

  for (const entry of entries) {
    ids.add(entry.id)
    slugs.set(entry.slug, entry.id)
    addKey(entry.slug, entry.id)
    for (const slug of entry.slugAliases) {
      former.set(slug, entry.id)
      addKey(slug, entry.id)
    }
    for (const name of entry.nameAliases) addKey(name, entry.id)
  }

  const ambiguous = new Map<string, PlayerId[]>()
  const unique = new Map<string, PlayerId>()
  for (const [key, set] of keys) {
    if (set.size === 1) unique.set(key, [...set][0] as PlayerId)
    else ambiguous.set(key, [...set].sort())
  }

  return {
    ambiguous,
    resolve(query) {
      if (query === null || query === undefined) return null
      const raw = query.trim()
      if (!raw) return null
      if (ids.has(raw)) return { id: raw, via: 'id' }
      const bySlug = slugs.get(raw)
      if (bySlug) return { id: bySlug, via: 'slug' }
      const byFormer = former.get(raw)
      if (byFormer) return { id: byFormer, via: 'slug-alias' }
      const byName = unique.get(identityKey(raw))
      return byName ? { id: byName, via: 'name' } : null
    },
  }
}

/* ---------------------------------------------------------------- the master's shape */

export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export type FacetSource = 'squad' | 'lineup' | 'database' | 'name'
export type PlayerKind = 'player' | 'coach' | 'public' | 'unknown'

export type SourceRef = { file: string; sourceTitle?: string | null; sourceUrl?: string | null }

export type SeasonNumber = {
  number: number
  seasonLabel: string
  /** `false` only for the current squad sheet, which is working data rather than history */
  historical: boolean
  disputed?: boolean
  source: SourceRef
}

export type PlayerSpellV2 = {
  /** `fromYear-toYear` — the same id the XI's version chooser already stores */
  id: string
  from: number
  to: number
  seasons: string[]
  /** the longest run — the years he is identified with */
  primary: boolean
  /** the season whose shirt this spell wears (lib/kit/playerKit.ts's rule); null = no kit on file */
  kitSeason: string | null
  kitWhy: 'trophy' | 'run' | null
  /** what the club won in `kitSeason`, named. Empty unless `kitWhy` is trophy. */
  wonHe: string[]
  /** every honour inside the spell's seasons */
  titles: { seasonLabel: string; competitionSlug: string; nameHe: string }[]
  /** numbers documented inside the spell, season-bound */
  numbers: { number: number; seasonLabel: string }[]
  /** match-scorer rows inside the spell — explicitly incomplete, never a total */
  documentedGoals?: { count: number; complete: false }
}

export type PlayerLineupRef = {
  /** the canonical match id, or null where the record names no match (a season XI) */
  matchId: string | null
  lineupKey: string
  role: 'start' | 'sub'
  line: Position | null
}

export type PlayerMasterV2Record = {
  id: PlayerId
  slug: string
  slugAliases: string[]
  displayName: string
  aliases: { he: string[]; latin: string[] }
  kind: PlayerKind
  /** what else the archive says this person was, where it says it (a player who coached) */
  roles: string[]
  kindEvidence: string
  positions: {
    /** display value first; empty where no source states one */
    codes: Position[]
    from: FacetSource | null
    /** ויקיפועל's `תפקיד` terms, verbatim — a CAREER description, never per spell */
    fine?: { terms: string[]; from: 'vikipoel-infobox'; scope: 'career' }
  }
  /** the club's own foreign-slot record (ויקיפועל category) — NOT nationality */
  foreignSlot: { status: 'israeli' | 'foreign' | 'unknown'; from: 'vikipoel-category' | null }
  /** kept for v1 readers; equals `foreignSlot.status` */
  foreignSlotStatus: 'israeli' | 'foreign' | 'unknown'
  /** nationality as a source declared it (squad sheet, Hebrew Wikipedia) — never inferred */
  declaredNationality?: string[]
  nationalityClaims?: { origin: 'israeli' | 'foreign'; nationalityHe?: string; from: string }[]
  /**
   * The picker's legacy "origin" facet, exactly as `lib/game/roster-facets.ts` has always
   * decided it (squad nationality > research file > Latin spelling). Kept so the gates
   * run unchanged while they move to `foreignSlot`.
   */
  origin: { value: 'israeli' | 'foreign' | null; from: FacetSource | null }
  years: { from: number | null; to: number | null }
  spells: PlayerSpellV2[]
  /** the whole-career shirt (lib/kit/playerKit.ts's `shirtIndex` rule); absent = no kit on file */
  shirt?: { seasonLabel: string; why: 'trophy' | 'run' | 'other'; wonHe: string[] }
  shirtNumbers: SeasonNumber[]
  /** ויקיפועל's `מספר בהפועל` / `מספרים נוספים` — no season attached, so never a season claim */
  clubNumbersUndated: number[]
  lineups: PlayerLineupRef[]
  archiveGoals?: { documentedGoals: number; complete: false; scope: string; source: SourceRef }
  currentSquad?: {
    active: true
    season: string
    number?: number
    captain?: boolean
    declaredNationality?: string[]
    source: SourceRef
  }
  provenance: SourceRef[]
  /**
   * Player Master v1's `player-<sha1(name)>` ids for every Hebrew spelling of him. Nothing
   * persisted them, but a reader handed one still reaches the person; never minted anew.
   */
  legacyIds: string[]
}

export type UnresolvedSpelling = {
  nameHe: string
  file: string
  /** what the row says, so a reviewer can check it without opening the file */
  contextHe: string
  reason: 'no-person' | 'ambiguous' | 'surname-only' | 'not-a-person'
  /** mechanical suggestions for a reviewer — NEVER applied (rule 7) */
  candidates?: { slug: string; evidence: string }[]
  /** for a shirt-number spelling: the season-bound numbers the row documents */
  numbers?: { number: number; seasonLabel: string; sourceTitle: string | null; sourceUrl: string | null }[]
}

export type PlayerMasterV2File = {
  schemaVersion: 2
  inputsSha: string
  inputs: string[]
  counts: Record<string, number>
  players: PlayerMasterV2Record[]
  excluded: { nameHe: string; reason: string }[]
  unresolved: UnresolvedSpelling[]
}
