/**
 * חיפוש שחקנים — finding one man among 637.
 *
 * The first version was `name.includes(term)` capped at eighty rows. Maor's verdict was
 * that it is not usable and that it has to find a man by his FAMILY name, and both halves
 * of that are right for reasons a substring match cannot reach:
 *
 *  · **A supporter looks up "בוזגלו", not "מאור".** A raw substring ranks every man with
 *    those letters anywhere in his name equally, so the one you meant lands wherever the
 *    alphabet put him. Here a family-name prefix outranks a given-name prefix, which
 *    outranks a hit anywhere else — three tiers, and the top of the list is the answer.
 *  · **Hebrew types back at you.** A final letter is a different codepoint from its
 *    medial form, and quotation marks in a name arrive as ׳ ״ ' or " depending on the
 *    keyboard. "אמסלם" typed with a medial mem, or "מ׳ דובל" typed with an apostrophe,
 *    used to find nothing. Everything is folded before it is compared.
 *
 * Pure and client-safe; `lib/game/allTimeXI.ts` reads the archive and is server-only.
 */

const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }

/** Fold a Hebrew name to the form a search compares: no nikud, no quotes, no finals. */
export function fold(text: string): string {
  return text
    .replace(/[֑-ׇ]/g, '')
    .replace(/[׳״'"`]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/[ךםןףץ]/g, (letter) => FINALS[letter] ?? letter)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Drop the article and any bracketed qualifier, so the index is not swallowed by "ה". */
export function nameCore(name: string): string {
  return name.replace(/[("].*$/, '').trim()
}

export type NameParts = { givenHe: string; familyHe: string; initial: string }

import nameParts from '@/content/manual/player-name-parts.json'

/** A surname particle is part of the family name, never a middle name. */
const PARTICLES = new Set(['בן', 'בר', 'דה', 'דל', 'אבו', 'בית', 'דוס', 'ואן', 'פון'])
const REVIEWED = nameParts.names as Record<string, { givenHe: string; familyHe: string }>

/**
 * Split a name into given and family.
 *
 * 1. A REVIEWED row (`content/manual/player-name-parts.json`) wins — כהן צדק, אבו אל היג'א,
 *    מאיר אהרן מליקה are not derivable from the string.
 * 2. Otherwise a surname particle (בן / דה / אבו …) before the last word belongs to the family:
 *    "דדי בן דיין" is דדי + בן דיין, never "דדי בן" + דיין (Deep QA, 29.9.2026).
 * 3. Otherwise the last word is the family name; one word is a mononym and is its own family.
 *
 * This only splits what is DISPLAYED and searched. Identity is the player id; nothing
 * rebuilds a name by joining these parts.
 */
export function splitName(name: string): NameParts {
  const core = nameCore(name)
  const reviewed = REVIEWED[core]
  if (reviewed) return { ...reviewed, initial: fold(reviewed.familyHe)[0] ?? '·' }
  const parts = core.split(/\s+/).filter(Boolean)
  let take = parts.length > 1 ? 1 : 0
  if (parts.length > 2 && PARTICLES.has(parts[parts.length - 2] as string)) take = 2
  const familyHe = parts.length > 1 ? parts.slice(-take).join(' ') : (parts[0] ?? name)
  const givenHe = parts.length > 1 ? parts.slice(0, -take).join(' ') : ''
  return { givenHe, familyHe, initial: fold(familyHe)[0] ?? '·' }
}

const SHARED = new Set(nameParts.sharedFamilies as string[])

/** Is this family name worn by more than one man in the archive? (Folded; see the drift guard in tests.) */
export function isSharedFamily(familyHe: string): boolean {
  return SHARED.has(fold(familyHe))
}

/**
 * The name a COMPACT surface prints (a pitch chip, a rail card, a stamp).
 *
 * The family name where it is his alone — `סיני`, `בן דיין`, `דה סילבה` — and the FULL name
 * where anybody else shares it: fifteen Cohens must never read as fifteen `כהן`. Decided over
 * the whole archive, never guessed per screen, so the same man prints the same on every surface.
 */
export function compactName(nameHe: string): string {
  const { familyHe } = splitName(nameHe)
  return isSharedFamily(familyHe) ? nameCore(nameHe) : familyHe
}

export type Searchable = {
  /**
   * The Player Master's `p_…` id (21.9.2026) — the key a saved pick should hold from now
   * on. Optional so a list built from anything else still type-checks; `rosterIndex()`
   * always sets it.
   */
  id?: string
  slug: string
  nameHe: string
  givenHe: string
  familyHe: string
  initial: string
  /**
   * What a source says about this man, and which source said it. Absent means the
   * archive has nothing — which is the honest answer for most of the 637 and is shown
   * as its own bucket rather than hidden. Built in `lib/game/roster-facets.ts`.
   */
  position?: 'GK' | 'DF' | 'MF' | 'FW' | null
  /**
   * Every playing position a source states for him, display value first.
   *
   * Present only where there is more than one, because a one-element array beside a
   * scalar holding the same value is a second copy of a fact. שייע פייגנבוים is
   * `['FW', 'DF']` — a left back who became the club's greatest striker — and asking the
   * sheet for defenders has to find him, or the filter is a claim that he never was one.
   */
  positions?: ReadonlyArray<'GK' | 'DF' | 'MF' | 'FW'>
  positionFrom?: 'squad' | 'lineup' | 'database' | 'name' | null
  origin?: 'israeli' | 'foreign' | null
  originFrom?: 'squad' | 'lineup' | 'database' | 'name' | null
  /**
   * מכסת זרים — the CLUB's own record of whether he took a foreign slot (ויקיפועל's
   * `שחקנים זרים (כדורגל)` category), read off the Player Master's `foreignSlot`.
   *
   * It is not nationality and the screens never call it that: 42 of the old `origin`
   * rows were a squad sheet's or Wikipedia's NATIONALITY, which is a different claim about
   * a man. Where it is present the "ישראלי / זר" filter, the badge and the challenges read
   * it; `origin` stays for any caller that builds a row without it.
   */
  foreignSlot?: 'israeli' | 'foreign' | 'unknown'
  /** his other Hebrew spellings (Player Master aliases), so a search for `עמרי אפק` finds עומרי */
  aliasesHe?: readonly string[]
  fromYear?: number | null
  toYear?: number | null
}

/**
 * The foreign-slot answer a filter, a badge and a challenge read — the club's record where
 * the row carries it, the legacy facet otherwise, and `'unknown'` where neither speaks.
 */
export function slotStatusOf(entry: Searchable): 'israeli' | 'foreign' | 'unknown' {
  if (entry.foreignSlot) return entry.foreignSlot
  return entry.origin ?? 'unknown'
}

/**
 * הסינון — what the sheet is currently narrowed to.
 *
 * `'any'` is no filter. `'unknown'` is a REAL choice, not the absence of one: a reader
 * who wants to see who the archive cannot place is asking a useful question about the
 * archive, and answering it is how the gap gets closed.
 */
export type RosterFilter = {
  position: 'any' | 'GK' | 'DF' | 'MF' | 'FW' | 'unknown'
  origin: 'any' | 'israeli' | 'foreign' | 'unknown'
  /** a decade's opening year — 1970, 1980 … — or 'any' */
  decade: number | 'any'
  /**
   * One season, as its opening year — "who was here in 2010". `null` is no filter.
   *
   * A decade answers "roughly when"; a supporter building an all-time eleven asks the
   * narrower question constantly, and it is the same fact read at a finer grain. A man
   * the archive cannot date never matches a year: absence of a record is not a record of
   * absence, so he is missing from this answer rather than assumed into it.
   */
  year: number | null
  /** family-name initial, or 'any' */
  letter: string | 'any'
}

export const NO_FILTER: RosterFilter = {
  position: 'any',
  origin: 'any',
  decade: 'any',
  year: null,
  letter: 'any',
}

export function isFiltered(filter: RosterFilter): boolean {
  return (
    filter.position !== 'any' ||
    filter.origin !== 'any' ||
    filter.decade !== 'any' ||
    filter.year !== null ||
    filter.letter !== 'any'
  )
}

/**
 * Every position this man is filed under. One where a source states one, several where
 * it states several, none where it states none.
 */
export function positionsOf(entry: Searchable): ReadonlyArray<'GK' | 'DF' | 'MF' | 'FW'> {
  if (entry.positions && entry.positions.length > 0) return entry.positions
  return entry.position ? [entry.position] : []
}

/** Did this man wear the shirt inside that decade, as far as the archive can tell? */
function inDecade(entry: Searchable, decade: number): boolean {
  const from = entry.fromYear
  const to = entry.toYear
  if (from === null || from === undefined) return false
  return from <= decade + 9 && (to ?? from) >= decade
}

/** Was he at the club in that season, as far as the archive can tell? */
function inYear(entry: Searchable, year: number): boolean {
  const from = entry.fromYear
  if (from === null || from === undefined) return false
  return from <= year && (entry.toYear ?? from) >= year
}

/**
 * Narrow a list. Pure, synchronous and cheap enough to run on every keystroke — the
 * whole roster is 637 objects and this is four comparisons each.
 */
export function filterRoster(entries: Searchable[], filter: RosterFilter): Searchable[] {
  if (!isFiltered(filter)) return entries
  return entries.filter((entry) => {
    if (filter.letter !== 'any' && entry.initial !== filter.letter) return false
    if (filter.position === 'unknown') {
      if (entry.position) return false
    } else if (filter.position !== 'any' && !positionsOf(entry).includes(filter.position)) {
      return false
    }
    if (filter.origin !== 'any' && slotStatusOf(entry) !== filter.origin) return false
    if (filter.decade !== 'any' && !inDecade(entry, filter.decade)) return false
    if (filter.year !== null && !inYear(entry, filter.year)) return false
    return true
  })
}

/** How many names each choice would leave, so a filter chip can print its own count. */
export function facetCounts(entries: Searchable[]): {
  position: Record<string, number>
  origin: Record<string, number>
  decade: Record<number, number>
} {
  const position: Record<string, number> = { GK: 0, DF: 0, MF: 0, FW: 0, unknown: 0 }
  const origin: Record<string, number> = { israeli: 0, foreign: 0, unknown: 0 }
  const decade: Record<number, number> = {}
  for (const entry of entries) {
    // A man with two positions is counted under both, because the filter returns him
    // under both. A chip that promises 201 defenders and hands back 202 is a chip that
    // lies about the sheet it opens.
    const codes = positionsOf(entry)
    if (codes.length === 0) position.unknown = (position.unknown ?? 0) + 1
    for (const code of codes) position[code] = (position[code] ?? 0) + 1
    const slot = slotStatusOf(entry)
    origin[slot] = (origin[slot] ?? 0) + 1
    const from = entry.fromYear
    if (from !== null && from !== undefined) {
      const to = entry.toYear ?? from
      for (let year = Math.floor(from / 10) * 10; year <= to; year += 10) {
        decade[year] = (decade[year] ?? 0) + 1
      }
    }
  }
  return { position, origin, decade }
}

/** 0 = no match. Higher is better: family prefix > given prefix > anywhere. */
export function score(entry: Searchable, folded: string): number {
  if (folded === '') return 1
  const own = scoreName(entry.nameHe, entry.familyHe, entry.givenHe, folded)
  if (own > 0 || !entry.aliasesHe || entry.aliasesHe.length === 0) return own
  // Another spelling the archive attached to HIM (a reviewed alias, never a guess) — one
  // step below the same hit on his own name, so the canonical spelling still leads.
  let best = 0
  for (const alias of entry.aliasesHe) {
    const parts = splitName(alias)
    best = Math.max(best, scoreName(alias, parts.familyHe, parts.givenHe, folded))
  }
  return best > 0 ? best - 5 : 0
}

function scoreName(nameHe: string, familyHe: string, givenHe: string, folded: string): number {
  const family = fold(familyHe)
  const given = fold(givenHe)
  const whole = fold(nameHe)
  if (family === folded) return 100
  if (family.startsWith(folded)) return 90
  if (given.startsWith(folded)) return 70
  // the last word of a compound family: 'דיין' finds בן דיין, one step under the full surname
  if (family.split(' ').some((word) => word === folded)) return 85
  if (family.includes(folded)) return 50
  // any word in the name starting with the term — catches a two-word family name
  if (whole.split(' ').some((word) => word.startsWith(folded))) return 40
  if (whole.includes(folded)) return 20
  return 0
}

export function searchRoster(entries: Searchable[], term: string): Searchable[] {
  const folded = fold(term)
  if (folded === '') return entries
  return entries
    .map((entry) => ({ entry, rank: score(entry, folded) }))
    .filter((row) => row.rank > 0)
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        fold(a.entry.familyHe).localeCompare(fold(b.entry.familyHe), 'he'),
    )
    .map((row) => row.entry)
}

/** Group a result list under its family-name initials, in Hebrew order. */
export function byInitial(entries: Searchable[]): { letter: string; names: Searchable[] }[] {
  const buckets = new Map<string, Searchable[]>()
  for (const entry of entries) {
    const bucket = buckets.get(entry.initial) ?? []
    bucket.push(entry)
    buckets.set(entry.initial, bucket)
  }
  return [...buckets.entries()]
    .map(([letter, names]) => ({
      letter,
      names: names.sort((a, b) => fold(a.familyHe).localeCompare(fold(b.familyHe), 'he')),
    }))
    .sort((a, b) => a.letter.localeCompare(b.letter, 'he'))
}
