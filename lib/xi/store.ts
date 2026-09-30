'use client'

/**
 * הגיליון — the elevens this device has put its name to.
 *
 * Gate 1 kept nothing until 17.9.2026. You argued with yourself for ten minutes, picked
 * eleven men out of six hundred and sixty, shared the card — and a refresh emptied the
 * pitch. `recordDeed('/xi')` lit the plate on the wall and then had nothing to point at,
 * which is the shape of a gate that says it remembers you and does not.
 *
 * Shaped exactly like `lib/kit/collection.ts` and `lib/polls/store.ts`, for the reason
 * stated there: an async interface with one local implementation, so the day an account
 * exists this is one line and not a rewrite of the screen. The screen never names a
 * storage API.
 *
 * **Ids are stored, never names** (21.9.2026). A saved sheet is a list of eleven men, and
 * the man is the Player Master's `p_…` id — minted once and never re-derived (rule 35),
 * so a spelling fix or a reviewed merge can never orphan a sheet again. Sheets written
 * before that hold roster SLUGS; `migrateSheet` maps them on read — the current slug, and
 * the six slugs merged away on 21.9 through `pickerRoster().slugAliases` — and the next
 * save writes ids. **Nothing is dropped silently:** a reference nothing resolves is
 * returned in `unresolved` and the screen says so.
 *
 * **Everything after `picks` is optional, and that is the upgrade path** (19.9.2026).
 * The sheet grew a version per slot, an armband, a twelfth man, a last man cut and a
 * shortlist; a sheet written before any of them existed reads back as a sheet without
 * them rather than as a sheet that fails to parse. Nothing is versioned and nothing is
 * migrated, because an absent field already means the only thing it could mean.
 */

import { todayInIsrael } from '@/lib/date/israel'
import { ownerSpelling } from '@/lib/canon/spelling'
import type { Formation } from '@/lib/game/lineup'
import { cleanDecades, isChallenge, type ChallengeId } from './challenge'

const KEY = 'worker.xi.v1'

/**
 * Two sheets, and the second one is not a ranking.
 *
 * `best` is הרכב כל הזמנים. `worst` is ההרכב הגרוע בכל הזמנים — **the supporter's own
 * choice, never the app's**. See `app/xi/XIBuilder.tsx` for why that distinction is
 * load-bearing rather than a nicety.
 */
export type XITab = 'best' | 'worst'

export const XI_TABS: readonly XITab[] = ['best', 'worst']

export type SavedXI = {
  /** the formation's name, as `lib/game/lineup.ts` writes it */
  formation: string
  /** slot id → the man's `p_…` id (a legacy sheet holds a roster slug — see `migrateSheet`) */
  picks: Record<string, string>
  /**
   * slot id → the version of that man the sheet was built around, as `lib/xi/board.ts`
   * spells the id (`1979-1988`). Absent for the men who have only one, which is most of
   * them — an entry here would be a stored fact the archive never stated.
   */
  versions?: Record<string, string>
  /** the slot wearing the armband, or absent */
  captain?: string
  /** ids — the twelfth man and the last man cut, each one a real decision */
  twelfth?: string
  cut?: string
  /** ids the supporter is still arguing with himself about */
  shortlist?: string[]
  /** the rule the sheet is being built under (`lib/xi/challenge.ts`); absent = free */
  challenge?: ChallengeId
  /** the decades of a decade mission (`challenge: 'span'`); absent otherwise */
  decades?: number[]
  /**
   * The Manager Prompt this sheet accepted (`lib/xi/prompt.ts`): the seed and cursor that dealt
   * it, so the share link can hand the SAME prompt over — never the picks. Absent = none.
   */
  prompt?: { seed: number; cursor: number }
  /** ids — "the five you picked before", frozen when that prompt was accepted */
  forbidden?: string[]
  /** ISO date it was last saved */
  savedOn: string
}

export type XIBook = Partial<Record<XITab, SavedXI>>

/** Everything a sheet holds except the date the device stamps on it. */
export type XISheet = Omit<SavedXI, 'savedOn'>

export interface XIStore {
  /** true when this store can see other people's sheets. Local cannot. */
  readonly remote: boolean
  read(): Promise<XIBook>
  save(tab: XITab, sheet: XISheet): Promise<void>
  clear(): Promise<void>
}

/** a stored prompt reference, or null when it is not one */
function promptOf(value: unknown): { seed: number; cursor: number } | null {
  if (typeof value !== 'object' || value === null) return null
  const { seed, cursor } = value as { seed?: unknown; cursor?: unknown }
  if (typeof seed !== 'number' || !Number.isFinite(seed) || seed <= 0) return null
  if (typeof cursor !== 'number' || !Number.isFinite(cursor) || cursor < 0) return null
  return { seed: Math.floor(seed), cursor: Math.floor(cursor) }
}

function isTab(value: string): value is XITab {
  return value === 'best' || value === 'worst'
}

/** A stored map of string→string, with anything that is not one dropped. */
function stringMap(value: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (typeof value !== 'object' || value === null) return out
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'string' && entry !== '') out[key] = entry
  }
  return out
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export class LocalXIStore implements XIStore {
  readonly remote = false

  async read(): Promise<XIBook> {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return {}
      const out: XIBook = {}
      for (const [tab, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (!isTab(tab) || typeof value !== 'object' || value === null) continue
        const sheet = value as Partial<SavedXI>
        if (typeof sheet.formation !== 'string' || typeof sheet.picks !== 'object') continue
        // A sheet written before the versions, the armband and the bench existed reads
        // back as a sheet with none of them, not as a sheet that fails to read. That is
        // the whole reason every field after `picks` is optional.
        out[tab] = {
          formation: sheet.formation,
          picks: stringMap(sheet.picks),
          versions: stringMap(sheet.versions),
          captain: stringOrUndefined(sheet.captain),
          twelfth: stringOrUndefined(sheet.twelfth),
          cut: stringOrUndefined(sheet.cut),
          shortlist: Array.isArray(sheet.shortlist)
            ? sheet.shortlist.filter((slug): slug is string => typeof slug === 'string')
            : [],
          ...(isChallenge(sheet.challenge) ? { challenge: sheet.challenge } : {}),
          ...(cleanDecades(sheet.decades).length > 0 ? { decades: cleanDecades(sheet.decades) } : {}),
          ...(promptOf(sheet.prompt) ? { prompt: promptOf(sheet.prompt) as { seed: number; cursor: number } } : {}),
          ...(Array.isArray(sheet.forbidden)
            ? { forbidden: sheet.forbidden.filter((id): id is string => typeof id === 'string').slice(0, 5) }
            : {}),
          savedOn: sheet.savedOn ?? '',
        }
      }
      return out
    } catch {
      // private mode, blocked storage, corrupt JSON. An unreadable sheet is an empty
      // pitch, never a throw on the screen the whole gate is.
      return {}
    }
  }

  /**
   * Saved on every change, not on a button.
   *
   * There is no "save" in this gate and there should not be: the eleven is the thing
   * you are making, so a sheet that is only kept if you remember to press something is
   * a sheet that is usually lost. An empty pitch saves as an empty pitch — clearing a
   * slot is a decision too.
   */
  async save(tab: XITab, sheet: XISheet): Promise<void> {
    try {
      const current = await this.read()
      const next: XIBook = {
        ...current,
        [tab]: { ...sheet, savedOn: todayInIsrael() },
      }
      window.localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // a sheet that cannot be written is a smaller problem than a throw mid-pick
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // nothing to do
    }
  }
}

/** The store this build saves into. One line changes when an account exists. */
export function activeXI(): XIStore {
  return new LocalXIStore()
}

/**
 * Rebuild a saved sheet against the formation it was saved in.
 *
 * A formation that no longer exists, or a slot that moved, drops the picks that no
 * longer have a home rather than putting a man in the wrong place: a defender who wakes
 * up on the wing because a formation was renamed is worse than an empty slot.
 */
export function restore(
  sheet: SavedXI | undefined,
  formations: readonly Formation[],
): {
  formation: Formation
  picks: Record<string, string>
  versions: Record<string, string>
  captain: string | null
  twelfth: string | null
  cut: string | null
  shortlist: string[]
  challenge: ChallengeId
  decades: number[]
  prompt: { seed: number; cursor: number } | null
  forbidden: string[]
} | null {
  if (!sheet) return null
  const formation = formations.find((option) => option.name === sheet.formation)
  if (!formation) return null
  const slots = new Set(formation.slots.map((slot) => slot.slotId))
  const picks: Record<string, string> = {}
  for (const [slot, slug] of Object.entries(sheet.picks)) if (slots.has(slot)) picks[slot] = slug
  // A version is a fact about a SLOT's occupant, so it goes when the occupant does: a
  // stored `1990-1992` hanging on an empty slot would dress the next man picked there in
  // a spell that belongs to somebody else.
  const versions: Record<string, string> = {}
  for (const [slot, id] of Object.entries(sheet.versions ?? {})) {
    if (picks[slot] !== undefined) versions[slot] = id
  }
  // The armband belongs to a slot that still has a man in it. A captain of an empty
  // shirt is a C drawn on nothing.
  const captain = sheet.captain !== undefined && picks[sheet.captain] !== undefined
    ? sheet.captain
    : null
  return {
    formation,
    picks,
    versions,
    captain,
    twelfth: sheet.twelfth ?? null,
    cut: sheet.cut ?? null,
    shortlist: sheet.shortlist ?? [],
    challenge: sheet.challenge ?? 'free',
    decades: cleanDecades(sheet.decades),
    prompt: sheet.prompt ?? null,
    forbidden: sheet.forbidden ?? [],
  }
}

/* ------------------------------------------------------------ the id migration */

/** A saved reference → the `p_…` id it names, or null when nothing in the archive does. */
export type RefResolver = (ref: string) => string | null

/**
 * One resolver for everything a sheet has ever stored: an id (kept), a current roster
 * slug, or a slug a reviewed merge retired (`pickerRoster().slugAliases`). Nothing is
 * matched fuzzily (rule 7) — a string that is none of the three resolves to nobody.
 * The one exception is explicit: a slug saved before the owner's spelling ruling
 * (spec §0.1, 22.9.2026 — שלום תקוה, one vav) is read in his spelling
 * (`lib/canon/spelling.ts`), so the retired spelling never has to be stored as an alias.
 */
export function refResolver(input: {
  roster: ReadonlyArray<{ id?: string; slug: string }>
  slugAliases: Readonly<Record<string, string>>
}): RefResolver {
  const ids = new Set<string>()
  const bySlug = new Map<string, string>()
  for (const entry of input.roster) {
    if (!entry.id) continue
    ids.add(entry.id)
    bySlug.set(entry.slug, entry.id)
  }
  return (ref) => {
    if (ids.has(ref)) return ref
    return bySlug.get(ref) ?? input.slugAliases[ref] ?? bySlug.get(ownerSpelling(ref)) ?? null
  }
}

/**
 * A saved sheet with every reference moved to an id.
 *
 * `unresolved` lists what could not be mapped, so the screen can SAY that a pick was
 * lost rather than quietly drawing a shorter eleven. A duplicate that appears only
 * because two retired slugs now name one man keeps its first slot and reports the rest.
 */
export function migrateSheet(sheet: SavedXI, resolve: RefResolver): { sheet: SavedXI; unresolved: string[] } {
  const unresolved: string[] = []
  const one = (ref: string | undefined): string | undefined => {
    if (ref === undefined) return undefined
    const id = resolve(ref)
    if (id === null) unresolved.push(ref)
    return id ?? undefined
  }
  const picks: Record<string, string> = {}
  const versions: Record<string, string> = {}
  const placed = new Set<string>()
  for (const [slot, ref] of Object.entries(sheet.picks)) {
    const id = one(ref)
    if (id === undefined) continue
    if (placed.has(id)) {
      unresolved.push(ref)
      continue
    }
    placed.add(id)
    picks[slot] = id
    const version = sheet.versions?.[slot]
    if (version) versions[slot] = version
  }
  const shortlist: string[] = []
  for (const ref of sheet.shortlist ?? []) {
    const id = one(ref)
    if (id !== undefined && !shortlist.includes(id)) shortlist.push(id)
  }
  const twelfth = one(sheet.twelfth)
  const cut = one(sheet.cut)
  return {
    sheet: {
      formation: sheet.formation,
      picks,
      versions,
      ...(sheet.captain !== undefined && picks[sheet.captain] !== undefined ? { captain: sheet.captain } : {}),
      ...(twelfth !== undefined ? { twelfth } : {}),
      ...(cut !== undefined ? { cut } : {}),
      shortlist,
      ...(sheet.challenge !== undefined ? { challenge: sheet.challenge } : {}),
      ...(cleanDecades(sheet.decades).length > 0 ? { decades: cleanDecades(sheet.decades) } : {}),
      ...(sheet.prompt ? { prompt: sheet.prompt } : {}),
      ...(sheet.forbidden
        ? { forbidden: sheet.forbidden.map((ref) => one(ref)).filter((id): id is string => typeof id === 'string') }
        : {}),
      savedOn: sheet.savedOn,
    },
    unresolved,
  }
}
