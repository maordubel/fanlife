/**
 * Hebrew and football normalisation.
 *
 * House rule (football-data): normalise for MATCHING, keep the original for DISPLAY.
 * Nothing here ever guesses a character it cannot verify — an unmappable input is
 * rejected with a reason, never coerced into a "similar" value.
 *
 * The one correction both matching forms apply is `ownerSpelling` — the names whose
 * spelling the owner ruled on (spec §0.1, 22.9.2026: שלום תקוה, one vav). A source that
 * spells them otherwise matches the same alias and mints the same slug, so the ruled-out
 * spelling is never stored (rule 7). See `lib/canon/spelling.ts`.
 */
import { ownerSpelling } from '@/lib/canon/spelling'

/** Hebrew niqqud, teamim and the Hebrew punctuation we strip for matching. */
const HEBREW_DIACRITICS = /[֑-ׇ]/g
/** Gershayim/geresh in all the forms Hebrew sources actually use. */
const HEBREW_MARKS = /[׳״'"`‘’“”]/g
const BRACKETED_SUFFIX = /\s*[([][^)\]]*[)\]]\s*/g
const NON_WORD = /[^\p{L}\p{N} ]/gu

/**
 * Loose matching form: same cleanup as {@link normalizeName} but bracketed
 * qualifiers are KEPT. Sport markers live inside them — "(כדורגל)" is the only thing
 * separating a football page from a basketball one — so the sport guard must not use
 * a form that throws them away.
 */
export function normalizeLoose(raw: string): string {
  return ownerSpelling(raw)
    .normalize('NFKD')
    .replace(HEBREW_DIACRITICS, '')
    .replace(HEBREW_MARKS, '')
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Matching form of a Hebrew (or Latin) name.
 * Strips diacritics, gershayim, bracketed qualifiers and punctuation, collapses spaces.
 * The raw string must always be stored alongside it.
 */
export function normalizeName(raw: string): string {
  return ownerSpelling(raw)
    .normalize('NFKD')
    .replace(HEBREW_DIACRITICS, '')
    .replace(HEBREW_MARKS, '')
    .replace(BRACKETED_SUFFIX, ' ')
    .replace(NON_WORD, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** A stable url/key slug. Hebrew is kept as-is; only separators are normalised. */
export function slugify(raw: string): string {
  const base = normalizeName(raw).replace(/\s+/g, '-')
  if (!base) throw new IngestValueError('slugify: empty input', raw)
  return base
}

export class IngestValueError extends Error {
  constructor(
    message: string,
    readonly input: string,
  ) {
    super(`${message} (input: ${JSON.stringify(input)})`)
    this.name = 'IngestValueError'
  }
}

/* ------------------------------------------------------------------ seasons */

export type SeasonLabel = `${number}/${string}`

const SEASON_PATTERNS: RegExp[] = [
  /^(\d{4})\s*[/\-–—]\s*(\d{2})$/, //  2001/02 · 2001-02
  /^(\d{4})\s*[/\-–—]\s*(\d{4})$/, //  2001/2002
  /^(\d{4})$/, //                      1955  (single calendar year season)
]

/**
 * One canonical season label: `YYYY/YY`. Everything else is an alias.
 * A single-year season is expressed as `YYYY/YY` of the following year, because the
 * schema stores start_year and end_year and every downstream query assumes a span.
 */
export function canonicalSeasonLabel(raw: string): {
  label: string
  startYear: number
  endYear: number
} {
  const cleaned = raw.replace(/[‎‏]/g, '').trim()
  for (const pattern of SEASON_PATTERNS) {
    const match = pattern.exec(cleaned)
    if (!match) continue

    const startYear = Number(match[1])
    if (startYear < 1900 || startYear > 2100) {
      throw new IngestValueError('season year out of range', raw)
    }

    const tail = match[2]
    const endYear = tail === undefined ? startYear + 1 : resolveEndYear(startYear, tail, raw)
    if (endYear !== startYear + 1) {
      throw new IngestValueError('season must span exactly one year boundary', raw)
    }
    return { label: `${startYear}/${String(endYear).slice(-2)}`, startYear, endYear }
  }
  throw new IngestValueError('unrecognised season label', raw)
}

function resolveEndYear(startYear: number, tail: string, raw: string): number {
  if (tail.length === 4) return Number(tail)
  if (tail.length === 2) {
    const century = Math.floor((startYear + 1) / 100) * 100
    const candidate = century + Number(tail)
    // 1999/00 rolls the century; 2001/02 does not.
    return candidate === startYear + 1 ? candidate : century + 100 + Number(tail)
  }
  throw new IngestValueError('unrecognised season tail', raw)
}

/* ------------------------------------------------------------- shirt number */

/** Shirt numbers are 1–99. Anything else is rejected, never clamped. */
export function parseShirtNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const digits = String(raw).replace(/[^\d]/g, '')
  if (!digits) return null
  const value = Number(digits)
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    throw new IngestValueError('shirt number out of range 1-99', String(raw))
  }
  return value
}

/* ----------------------------------------------------------------- position */

export type PositionCode = 'GK' | 'DF' | 'MF' | 'FW' | 'UNK'

const POSITION_TERMS: ReadonlyArray<readonly [PositionCode, readonly string[]]> = [
  ['GK', ['שוער', 'goalkeeper', 'gk']],
  ['DF', ['מגן', 'בלם', 'הגנה', 'defender', 'df']],
  ['MF', ['קשר', 'קישור', 'ווינגר', 'midfielder', 'mf']],
  ['FW', ['חלוץ', 'כנף', 'קיצוני', 'התקפה', 'forward', 'striker', 'fw']],
]

/**
 * Roles a source states in the position field that are NOT positions.
 *
 * ויקיפועל writes a man's whole relationship with the club in `תפקיד`: שייע פייגנבוים
 * reads `מגן שמאלי, חלוץ, מאמן` and יוסי אבוקסיס reads
 * `קשר אחורי, סקאוט, עוזר מאמן, מאמן`. A coach is a fact about the man and it is not a
 * position, so it is recognised, kept by the caller, and never allowed to become one.
 */
const STAFF_TERMS: readonly string[] = [
  'מאמן',
  'מנהל',
  'סקאוט',
  'ע. מאמן',
  'שופט',
  'נשיא',
  'יו"ר',
  'coach',
  'manager',
  'scout',
]

/** True when this single role is a job at the club rather than a place on the pitch. */
export function isStaffRole(raw: string): boolean {
  const needle = normalizeName(raw)
  return needle !== '' && STAFF_TERMS.some((term) => needle.includes(normalizeName(term)))
}

/**
 * **`תפקיד` IS A LIST, and reading it as a scalar is what filed the club's greatest
 * striker as a defender.**
 *
 * ויקיפועל's player infobox carries every role a man held, separated by a comma or a
 * slash — `חלוץ, בלם` · `קשר/חלוץ` · `מגן שמאלי, חלוץ, מאמן`. 43 of the 635 player
 * pages write more than one. Handed whole to a lexicon scan, the string resolves to
 * whichever CODE the lexicon happens to test first, which is not even the first role
 * the source wrote: `parsePosition('חלוץ, בלם')` answered `DF`, because `DF` is tested
 * before `FW`. That is how שייע פייגנבוים — 131 goals, the club's all-time top scorer —
 * was filed `DF` and offered as a defender in gate 1.
 *
 * So the field is split first and each value is read on its own, in the order the
 * source wrote them. A parenthetical aside is NOT a value — `קשר/חלוץ (קיצוני ימני)`
 * refines the role it follows and `בלם, מגן ימני, קשר הגנתי (תופקד גם כשוער, חלוץ…)`
 * lists where a centre-back was once pressed into service. Both are dropped here and
 * reported by the caller rather than promoted to positions, because a defender who once
 * went in goal is not a goalkeeper.
 */
export function splitRoleValues(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .replace(/\([^)]*\)/gu, ' ')
    .split(/[,\/]|\sו-/u)
    .map((part) => part.trim())
    .filter((part) => part !== '' && !/^[-?]+$/.test(part))
}

/**
 * Every playing position the field states, in the order the source stated them.
 *
 * Staff roles are dropped (they are not positions), a value no lexicon term covers is
 * dropped (rule 11 — unreadable is not a guess), and duplicates collapse so
 * `בלם, מגן ימני` is one DF rather than two.
 */
export function parsePositions(raw: string | null | undefined): Exclude<PositionCode, 'UNK'>[] {
  const out: Exclude<PositionCode, 'UNK'>[] = []
  for (const value of splitRoleValues(raw)) {
    if (isStaffRole(value)) continue
    const needle = normalizeName(value)
    if (!needle) continue
    const found = POSITION_TERMS.find(([, terms]) =>
      terms.some((term) => needle.includes(normalizeName(term))),
    )
    if (!found) continue
    const code = found[0] as Exclude<PositionCode, 'UNK'>
    if (!out.includes(code)) out.push(code)
  }
  return out
}

/**
 * **The read this replaced, kept so the change can be MEASURED rather than claimed.**
 *
 * Until 17.9.2026 the whole field went to one scan that answered with the first CODE in
 * `POSITION_TERMS` order appearing anywhere in the string. That is not even "the first
 * role the source wrote": `חלוץ, בלם` answered `DF`, because `DF` is tested before `FW`.
 *
 * It lives here, beside the lexicon it reads, so it cannot drift from the thing it is a
 * record of, and it is called by exactly two callers: the report that prints the
 * before/after table, and the test that fails if any displayed position still agrees
 * with it on a multi-value field.
 */
export function retiredScalarPosition(raw: string | null | undefined): PositionCode {
  if (!raw) return 'UNK'
  const needle = normalizeName(raw)
  if (!needle) return 'UNK'
  for (const [code, terms] of POSITION_TERMS) {
    if (terms.some((term) => needle.includes(normalizeName(term)))) return code
  }
  return 'UNK'
}

/**
 * The one position a screen prints. Unknown stays UNK — a guessed position silently
 * corrupts every lineup query, so it is never inferred from anything else.
 *
 * It is now the FIRST playing role the source wrote, which is a different answer from
 * the one this function used to give for a multi-value field (see
 * {@link parsePositions}). Where a stronger claim exists — the player page's own lead
 * sentence, which states the role he played AT HAPOEL — it outranks this one; that
 * decision lives in `scripts/ingest/sources/vikipoel-players.ts`, not here, because
 * this function is handed a field and knows nothing about the page it came off.
 */
export function parsePosition(raw: string | null | undefined): PositionCode {
  return parsePositions(raw)[0] ?? 'UNK'
}

/* -------------------------------------------------------------------- score */

export type Score = { home: number; away: number }

/** `2:1` · `2-1` · `2 – 1`. Returns null for anything that is not a played score. */
export function parseScore(raw: string | null | undefined): Score | null {
  if (!raw) return null
  const match = /(\d{1,2})\s*[:\-–—]\s*(\d{1,2})/.exec(raw.trim())
  if (!match) return null
  return { home: Number(match[1]), away: Number(match[2]) }
}

/* --------------------------------------------------------------------- date */

/** ISO date from `d.m.yyyy`, `d/m/yyyy` or an ISO string. Never guesses a partial date. */
export function parseIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = raw.trim()

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  if (iso) return text

  const dmy = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(text)
  if (!dmy) return null

  const [, d, m, y] = dmy
  const day = Number(d)
  const month = Number(m)
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new IngestValueError('impossible date', raw)
  }
  return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ minutes */

/** `45+2` → { minute: 45, extra: 2 }. `90` → { minute: 90, extra: null }. */
export function parseMinute(raw: string | null | undefined): {
  minute: number
  extra: number | null
} | null {
  if (!raw) return null
  const match = /^(\d{1,3})(?:\s*\+\s*(\d{1,2}))?'?$/.exec(raw.trim())
  if (!match) return null
  const minute = Number(match[1])
  if (minute > 130) throw new IngestValueError('minute out of range', raw)
  return { minute, extra: match[2] === undefined ? null : Number(match[2]) }
}
