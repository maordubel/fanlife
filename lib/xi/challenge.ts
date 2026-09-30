/**
 * אתגרים — six ways to build the eleven under a rule, and the rule is enforced.
 *
 * The prototype's challenge picker was a filter: it narrowed the drawer and then let the
 * poster say nothing about whether the sheet obeyed it. Here a challenge is a CONSTRAINT
 * (players.md §2, Gate 1 "A — 6 challenges"):
 *
 *  · **it is checked against the chosen spell, not the whole career.** "לפני 2000" asks
 *    about the man you put on the pitch — the version whose years and shirt you picked —
 *    so a player whose second spell ran into the 2000s is admitted as his first self and
 *    refused as his second;
 *  · **ישראלי / זר reads the club's foreign-slot record** (`Searchable.foreignSlot`,
 *    ויקיפועל's `שחקנים זרים (כדורגל)` category) and never nationality. A man with no
 *    record is EXCLUDED — the challenge cannot vouch for him — and the drawer counts him
 *    on screen rather than hiding him silently;
 *  · **"אחד מכל עשור" means no two spells starting in the same decade.** One man, one
 *    decade — the decade his chosen spell BEGAN in, which is the same partition the DNA
 *    counts (`lib/xi/dna.ts`). An undated spell cannot be placed in any decade, so it
 *    cannot satisfy the rule and is refused;
 *  · **the poster says met / not met, and that is not a score.** There is no number, no
 *    percentage and no grade here (rule 74) — a sheet either obeys the rule its builder
 *    chose or it names which slots do not.
 *
 * Pure and client-safe. `lib/xi/board.ts` is server-only, so the spell shape is restated
 * here as the three fields a rule needs.
 */

export type ChallengeId =
  | 'free'
  | 'decades'
  | 'pre2000'
  | 'modern'
  | 'israeli'
  | 'foreign'
  // the decade mission (Gate 1, 29.9.2026): every chosen spell overlaps one of the decades the
  // builder picked — `ChallengeParams.allowedDecades`, one to three of them
  | 'span'
  // the Manager Prompt's rules (`lib/xi/prompt.ts`, ONE RED WORLD §10) — never in the picker
  | 'pre1990'
  | 'the2000s'
  | 'cups'
  | 'fresh'

/** the six the picker offers */
export const CHALLENGES: readonly ChallengeId[] = [
  'free',
  'decades',
  'pre2000',
  'modern',
  'israeli',
  'foreign',
  'span',
]

/**
 * What a challenge may carry besides its id. Kept apart from `ChallengeId` so the persisted id
 * set is untouched (the smallest migration): a saved sheet without `allowedDecades` reads back
 * exactly as it always did.
 */
export type ChallengeParams = { allowedDecades?: readonly number[] }

/** A mission may ask for at most this many decades at once. */
export const SPAN_MAX = 3

/** The decades a mission can name: the first the club has a squad in, to the current one. */
export const SPAN_DECADES: readonly number[] = [1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]

/** What a fresh "decade mission" opens on. */
export const SPAN_DEFAULT: readonly number[] = [1990]

/**
 * The decades a stored or typed value may hold: whole decades from `SPAN_DECADES`, no repeats,
 * ascending, at most `SPAN_MAX`. Anything else is dropped rather than repaired.
 */
export function cleanDecades(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  const out = new Set<number>()
  for (const item of value) {
    if (typeof item === 'number' && SPAN_DECADES.includes(item)) out.add(item)
  }
  return [...out].sort((a, b) => a - b).slice(0, SPAN_MAX)
}

/** The decades after one is switched on or off: kept ascending, never fewer than one, never more than three. */
export function toggleDecade(current: readonly number[], decade: number): number[] {
  const kept = cleanDecades(current)
  if (kept.includes(decade)) return kept.length === 1 ? kept : kept.filter((d) => d !== decade)
  return kept.length >= SPAN_MAX ? kept : cleanDecades([...kept, decade])
}

/** 1990 → "90", 2000 → "2000": the number the sentence "שנות ה־…" is written with. */
export function decadeWord(decade: number): string {
  return decade < 2000 ? String(decade % 100) : String(decade)
}

/** the rules only a Manager Prompt sets — each computed from the archive, never typed */
export const PROMPT_CHALLENGES: readonly ChallengeId[] = ['pre1990', 'the2000s', 'cups', 'fresh']

export function isChallenge(value: unknown): value is ChallengeId {
  return (
    typeof value === 'string' &&
    ((CHALLENGES as readonly string[]).includes(value) || (PROMPT_CHALLENGES as readonly string[]).includes(value))
  )
}

/** "רק עד 1990" — the chosen spell began before this season. */
export const UNTIL_YEAR = 1990

/**
 * What a rule may need to know about the MAN rather than the spell. Both are derived on the
 * server from sourced rows and handed down; absent means the archive holds nothing.
 *
 *  · `cupYears` — the opening years of the seasons the club won a CUP (גביע המדינה, גביע
 *    הטוטו) while the squad table puts him in the squad: Player Master `spells[].titles`.
 *  · `forbidden` — one of the five this device picked before, for "חמישה שכבר בחרת אסורים".
 */
export type ManFacts = { cupYears?: readonly number[]; forbidden?: boolean }

/** The first season a "2000 and after" spell may start in, and the last "before 2000" one. */
export const MODERN_FROM = 2000

/**
 * One spell of one man. `id` is the version id `lib/xi/board.ts` spells (`1979-1988`), or
 * `''` for a man with a single spell — who has no version to store (rule 59).
 */
export type Spell = { id: string; fromYear: number | null; toYear: number | null }

export type SlotStatus = 'israeli' | 'foreign' | 'unknown'

/**
 * His spells as the chooser knows them: the versions where the squad table gives him more
 * than one, else one spell spanning the years the archive places him in.
 */
export function spellsFor(
  entry: { fromYear?: number | null; toYear?: number | null },
  versions?: ReadonlyArray<{ id: string; fromYear: number; toYear: number }> | null,
): Spell[] {
  if (versions && versions.length > 1) {
    return versions.map((version) => ({ id: version.id, fromYear: version.fromYear, toYear: version.toYear }))
  }
  return [{ id: '', fromYear: entry.fromYear ?? null, toYear: entry.toYear ?? entry.fromYear ?? null }]
}

/** The decade a spell BEGAN in — one man, one decade. `null` for an undated spell. */
export function decadeOf(spell: Spell): number | null {
  return spell.fromYear === null ? null : Math.floor(spell.fromYear / 10) * 10
}

/** Why a man cannot stand in this eleven under this rule. Every one is said on screen. */
export type Refusal =
  /** ישראלי/זר asked, and the club's foreign-slot record says nothing about him */
  | 'no-record'
  /** ישראלי/זר asked, and the record puts him on the other side */
  | 'other-side'
  /** no spell of his falls on the asked side of 2000 */
  | 'era'
  /** "one per decade", and no spell of his can be dated */
  | 'undated'
  /** "one per decade", and every decade his spells began in is already taken */
  | 'decade-taken'
  /** "cups only", and no spell of his holds a season the club lifted a cup in the squad table */
  | 'no-cup'
  /** "five you picked before are forbidden", and he is one of the five */
  | 'forbidden'

/** Does this ONE spell satisfy the era rules? The decade rule needs the rest of the sheet. */
function eraPasses(challenge: ChallengeId, spell: Spell, params: ChallengeParams = {}): boolean {
  if (challenge === 'span') {
    const asked = cleanDecades(params.allowedDecades)
    return asked.length === 0 || asked.some((decade) => overlaps(spell, decade))
  }
  if (challenge === 'pre2000') return spell.fromYear !== null && spell.fromYear < MODERN_FROM
  if (challenge === 'modern') return spell.toYear !== null && spell.toYear >= MODERN_FROM
  if (challenge === 'pre1990') return spell.fromYear !== null && spell.fromYear < UNTIL_YEAR
  if (challenge === 'the2000s') {
    return spell.fromYear !== null && spell.fromYear <= 2009 && (spell.toYear ?? spell.fromYear) >= 2000
  }
  return true
}

/** Does this spell hold a season the club won a cup in, with him in the squad? */
export function spellHoldsCup(spell: Spell, cupYears: readonly number[] | undefined): boolean {
  if (spell.fromYear === null || !cupYears || cupYears.length === 0) return false
  const to = spell.toYear ?? spell.fromYear
  return cupYears.some((year) => year >= (spell.fromYear as number) && year <= to)
}

function slotRefusal(challenge: ChallengeId, status: SlotStatus): Refusal | null {
  if (challenge !== 'israeli' && challenge !== 'foreign') return null
  if (status === 'unknown') return 'no-record'
  return status === challenge ? null : 'other-side'
}

/**
 * What the drawer's filters ask for, so the version follows them (the prototype's
 * `bestVersionIndexForFilters`): a four-digit season, or a decade chip.
 */
export type SpellWish = {
  year?: number | null
  decade?: number | 'any' | null
  /** the version the pick would open on with no filter at all */
  fallbackId?: string | null
}

function contains(spell: Spell, year: number): boolean {
  if (spell.fromYear === null) return false
  return spell.fromYear <= year && (spell.toYear ?? spell.fromYear) >= year
}

function overlaps(spell: Spell, decade: number): boolean {
  if (spell.fromYear === null) return false
  return spell.fromYear <= decade + 9 && (spell.toYear ?? spell.fromYear) >= decade
}

/**
 * Choose the spell a pick stands for.
 *
 * Only spells the challenge admits are candidates. Among them the one containing the
 * asked season wins, then one overlapping the asked decade, then the default version,
 * then the first admitted — so an active "2010" filter picks a man as his 2010 self, and
 * a "before 2000" challenge picks him as his first spell even when his default is his
 * second.
 */
export function chooseSpell(
  challenge: ChallengeId,
  spells: readonly Spell[],
  status: SlotStatus,
  wish: SpellWish = {},
  /** decades already begun in by the OTHER slots of the sheet */
  taken: ReadonlySet<number> = new Set(),
  /** what the rule knows about the man himself (cups, the forbidden five) */
  man: ManFacts = {},
  /** what the mission itself carries (the decades of a decade mission) */
  params: ChallengeParams = {},
): { ok: true; spell: Spell } | { ok: false; why: Refusal } {
  const slot = slotRefusal(challenge, status)
  if (slot) return { ok: false, why: slot }
  if (challenge === 'fresh' && man.forbidden) return { ok: false, why: 'forbidden' }

  let candidates = spells.filter((spell) => eraPasses(challenge, spell, params))
  if (candidates.length === 0) {
    // a man whose every spell is undated cannot be placed in ANY decade — say so, not "era"
    if (challenge === 'span' && spells.every((spell) => spell.fromYear === null)) return { ok: false, why: 'undated' }
    return { ok: false, why: 'era' }
  }
  if (challenge === 'cups') {
    candidates = candidates.filter((spell) => spellHoldsCup(spell, man.cupYears))
    if (candidates.length === 0) return { ok: false, why: 'no-cup' }
  }

  if (challenge === 'decades') {
    const dated = candidates.filter((spell) => decadeOf(spell) !== null)
    if (dated.length === 0) return { ok: false, why: 'undated' }
    candidates = dated.filter((spell) => !taken.has(decadeOf(spell) as number))
    if (candidates.length === 0) return { ok: false, why: 'decade-taken' }
  }

  const year = wish.year ?? null
  const decade = typeof wish.decade === 'number' ? wish.decade : null
  const spell =
    (year !== null ? candidates.find((row) => contains(row, year)) : undefined) ??
    (decade !== null ? candidates.find((row) => overlaps(row, decade)) : undefined) ??
    candidates.find((row) => row.id === (wish.fallbackId ?? '')) ??
    (candidates[0] as Spell)
  return { ok: true, spell }
}

/** One occupied slot of the sheet, as a rule sees it. */
export type SheetRow = { slotId: string; spell: Spell; status: SlotStatus; man?: ManFacts }

export type ChallengeStatus = {
  challenge: ChallengeId
  /** all eleven are picked */
  complete: boolean
  /** the slots whose man breaks the rule, in pitch order — named, never scored */
  broken: string[]
  /** complete AND nothing broken. Never a number. */
  met: boolean
}

/**
 * Does the sheet obey its challenge? `free` is always met once eleven are picked.
 *
 * The decade rule flags the LATER slot of a clash (pitch order), so the report names one
 * man per extra decade rather than accusing both.
 */
export function challengeStatus(
  challenge: ChallengeId,
  rows: readonly SheetRow[],
  size = 11,
  params: ChallengeParams = {},
): ChallengeStatus {
  const broken: string[] = []
  const seen = new Set<number>()
  for (const row of rows) {
    if (slotRefusal(challenge, row.status) !== null) {
      broken.push(row.slotId)
      continue
    }
    if (!eraPasses(challenge, row.spell, params)) {
      broken.push(row.slotId)
      continue
    }
    if (challenge === 'cups' && !spellHoldsCup(row.spell, row.man?.cupYears)) {
      broken.push(row.slotId)
      continue
    }
    if (challenge === 'fresh' && row.man?.forbidden) {
      broken.push(row.slotId)
      continue
    }
    if (challenge === 'decades') {
      const decade = decadeOf(row.spell)
      if (decade === null || seen.has(decade)) {
        broken.push(row.slotId)
        continue
      }
      seen.add(decade)
    }
  }
  const complete = rows.length >= size
  // a decade mission with no decade named asks nothing and so is never "met"
  const named = challenge !== 'span' || cleanDecades(params.allowedDecades).length > 0
  return { challenge, complete, broken, met: complete && named && broken.length === 0 }
}

/** The decades begun in by every occupied slot except one — what the next pick may not reuse. */
export function takenDecades(rows: readonly SheetRow[], except: string | null): Set<number> {
  const out = new Set<number>()
  for (const row of rows) {
    if (row.slotId === except) continue
    const decade = decadeOf(row.spell)
    if (decade !== null) out.add(decade)
  }
  return out
}
