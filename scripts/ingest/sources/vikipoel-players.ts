/**
 * ויקיפועל — דפי השחקנים, ומה בדיוק הם אומרים על התפקיד.
 *
 * NO NETWORK (rule 36). `content/raw/vikipoel-player-wikitext.json` is the record of
 * what was read through the owner's browser on 17.9.2026 — 641 pages with their full
 * wikitext — and everything here is a pass over those bytes.
 *
 * **Why this file exists.** Maor, 17.9.2026:
 * *"לא יכול להיות ששמת את שייע פיינגבוים, החלוץ הגדול עם הכי הרבה שערים בהיסטוריה של
 * הפועל בתור שחקן הגנה."* He is right, and the row was not the bug. The cause is that
 * `תפקיד` is a **list** and every importer read it as a scalar:
 *
 *   |תפקיד=מגן שמאלי, חלוץ, מאמן          ← שייע פייגנבוים
 *   '''חלוץ, שיחק בהפועל בשנים 1979-1965 ומאמן הקבוצה…'''
 *
 * 43 of the 635 pages that carry the field write more than one role in it. Handed whole
 * to a lexicon scan the string resolved to whichever CODE the lexicon tested first, so
 * the club's all-time top scorer came out `DF` — and so did twenty-two other men, each
 * of them one comma away from being described as somebody he was not.
 *
 * Three decisions, and all three are the reason this is a parser and not a patch:
 *
 *  1. **The field is a list and stays a list.** Every role is kept (`positions`), the
 *     display value is one of them (`position`), and nothing is thrown away.
 *  2. **The body outranks the infobox for the role at Hapoel** (rule 16 — read the
 *     thing, then describe the thing). The infobox states a CAREER: every role the man
 *     ever held, at any club, coaching included. The bolded lead sentence states what
 *     he played **for this club** — and this app is about this club. Where they
 *     disagree the lead decides what is displayed and the disagreement is RECORDED
 *     (rule 60 §3 — a contradiction is kept, not resolved).
 *  3. **A role that is not a place on the pitch never becomes one.** `מאמן`, `מנהל`,
 *     `סקאוט` are facts about the man; they are read, labelled and never promoted.
 *
 * What this module does NOT do: it does not touch origin or years. Those come off the
 * page's categories, they were read in an earlier pass, and re-deriving them here would
 * be a second answer to a question that already has one (rule 59).
 */

import { readFileSync } from 'node:fs'

import {
  extractTemplate,
  firstTemplateName,
  leadSection,
  stripMarkup,
} from '@/scripts/ingest/adapters/mediawiki'
import {
  isStaffRole,
  parsePositions,
  retiredScalarPosition,
  splitRoleValues,
  type PositionCode,
} from '@/scripts/ingest/lib/normalize'

/* -------------------------------------------------------------- the source */

export const VIKIPOEL_PLAYERS_SOURCE_TITLE =
  'ויקיפועל — ויקיטקסט של דפי השחקנים (Special:Export), נקרא 17.9.2026'
export const VIKIPOEL_PLAYERS_SOURCE_URL =
  'https://wiki.red-fans.com/index.php?title=Special:Export'

/** A playing position. `UNK` is not one of these — an unreadable role is absent. */
export type Position = Exclude<PositionCode, 'UNK'>

/** One page of the raw export. `revisions[0].slots.main.content` is the wikitext. */
export type PlayerWikitextPage = {
  pageid?: number
  ns?: number
  title: string
  revisions?: Array<{
    revid?: number
    timestamp?: string
    slots?: { main?: { content?: string } }
  }>
}

export function readPlayerWikitextFile(path: string): PlayerWikitextPage[] {
  return JSON.parse(readFileSync(path, 'utf8')) as PlayerWikitextPage[]
}

export function wikitextOf(page: PlayerWikitextPage): string | null {
  const content = page.revisions?.[0]?.slots?.main?.content
  return typeof content === 'string' && content !== '' ? content : null
}

/* ---------------------------------------------------------------- the read */

/** Who decided the displayed position — the infobox field, or the page's own lead. */
export type PositionSource = 'vikipoel' | 'vikipoel-body'

export type PlayerRoleReading = {
  title: string
  /** the infobox template this page uses, as it writes it */
  template: string | null
  /** `תפקיד` exactly as the page writes it, or null where the page does not carry it */
  roleRaw: string | null
  /** every value in the field, in the order the source wrote them */
  roleValues: string[]
  /** the playing positions among them, in the source's order, deduplicated */
  infoboxPositions: Position[]
  /** values that are jobs at the club rather than places on the pitch */
  staffRoles: string[]
  /** values no lexicon term covers — reported, never guessed at (rule 11) */
  unreadableRoles: string[]
  /** roles the page states in a parenthetical aside — kept, never promoted */
  asideRoles: string[]
  /** the lead sentence that states a role at Hapoel, or null */
  leadHe: string | null
  /** the positions that sentence names, in the order it names them */
  bodyPositions: Position[]
  /** every playing role this page states, body first where the body speaks */
  positions: Position[]
  /** the one value a screen prints */
  position: Position | null
  positionFrom: PositionSource | null
  /** the infobox's first playing role, when the lead overruled it */
  conflict: { infobox: Position; body: Position } | null
}

/**
 * The club this app is about, as the pages spell it.
 *
 * A lead sentence only speaks for us when it is speaking ABOUT us. "הוא בלם סלובני"
 * with no mention of Hapoel is a claim about a career, which is the infobox's job; the
 * lead earns its precedence by naming the club it is describing him at.
 */
const CLUB_WORD = /הפועל/u

/**
 * The role words a lead sentence may state, and what each one is.
 *
 * Deliberately NARROWER than the infobox lexicon. `הגנה` is a role in a field that
 * holds roles and an ordinary noun in a sentence — "חבר ההגנה" is a man in the pre-state
 * militia, not a defender — so it is read in the field and not in the prose. This is the
 * whole difference between reading a declared value and reading somebody's writing.
 */
const LEAD_ROLES: ReadonlyArray<readonly [string, Position]> = [
  ['שוער', 'GK'],
  ['בלם', 'DF'],
  ['מגן', 'DF'],
  ['קשר', 'MF'],
  ['קישור', 'MF'],
  ['ווינגר', 'MF'],
  ['חלוץ', 'FW'],
  ['קיצוני', 'FW'],
]

/**
 * A role word in running Hebrew, with its prefixes and without its neighbours.
 *
 * Hebrew glues prefixes on (`כחלוץ`, `בעמדת ה-שוער`, `וקשר`) so a bare word boundary
 * finds nothing, and a bare `includes` finds far too much: `קישור` lives inside
 * `קישורים חיצוניים`, which is how a scan once filed two men as midfielders on the
 * strength of the external-links heading, and `בלמה` ("its centre-back") is a different
 * word from `בלם`. So: up to two prefix letters are allowed in front, and NOTHING is
 * allowed behind.
 */
const ROLE_WORD = new RegExp(
  `(?<![א-ת])[הובכלמשו]{0,2}(${LEAD_ROLES.map(([word]) => word).join('|')})(?![א-ת])`,
  'gu',
)

function rolesIn(text: string): Position[] {
  const out: Position[] = []
  for (const match of text.matchAll(ROLE_WORD)) {
    const found = LEAD_ROLES.find(([word]) => word === match[1])
    if (found && !out.includes(found[1])) out.push(found[1])
  }
  return out
}

/**
 * **A role is read where the sentence DECLARES one, never wherever the word appears.**
 *
 * This is the whole difference between a parser and a word search, and it was measured
 * rather than assumed. Reading every role word in the opening paragraph gave 30 changes
 * and three of them were wrong in the same way: ארתור אטצזיאנוב's page says
 * *"התחיל כחלוץ, בהמשך ביקש לעבור **לתפקיד** המגן השמאלי"* — a striker for one season
 * and a left back for a career — and a first-word-wins scan calls him a striker.
 * איתי אלקסלסי's *"בגיל 6… שיחק כבלם"* is about a six-year-old. דוד פרימו's page has a
 * supporter's testimonial four paragraphs down with the words "על קו השער" in it.
 *
 * So only three forms count, and each of them is a page stating a position rather than
 * telling a story:
 *
 *   · **the headline** — the paragraph opens with the role itself:
 *     *"חלוץ, שיחק בהפועל בשנים 1979-1965"* (שייע פייגנבוים);
 *   · **`בעמדת` / `בתפקיד`** — *"המשחק בעמדת החלוץ"*, *"בתפקיד מגן ימני וקשר אחורי"*,
 *     and everything within the same clause after it, so `בעמדת הקשר והחלוץ` is two;
 *   · **a copula** — *"הוא בלם סלובני"*, *"הינו חלוץ מגיניאה-ביסאו"*, where the role is
 *     one of the next two words. Two, not more: *"הוא כדורגלן ישראלי המשחק בעמדת…"*
 *     must be left to the anchor above rather than swept up here.
 *
 * `כ<role>` — *"שיחק בהפועל כבלם"* — is deliberately NOT an anchor. It reads correctly
 * on אייל בן עמי and wrongly on both narrative pages above, and a form that is right
 * about one man and wrong about two is not a rule.
 */
const STATEMENT_ANCHOR = /(?<![א-ת])(?:[בל]?עמדו?ת|[בל]?תפקיד[ום]?)(?![א-ת])/gu
const COPULA_ANCHOR = /(?<![א-ת])(?:הוא|היה|הינו|הנו)(?![א-ת])/gu
/** how far past `בעמדת` the same clause runs. Measured on the corpus, not guessed. */
const ANCHOR_WINDOW = 44

function rolesStatedIn(sentence: string): Position[] {
  const out: Position[] = []
  const add = (found: Position[]) => {
    for (const code of found) if (!out.includes(code)) out.push(code)
  }

  // the headline form — the paragraph IS the role
  if (new RegExp(`^(?:${LEAD_ROLES.map(([word]) => word).join('|')})(?![א-ת])`, 'u').test(sentence)) {
    add(rolesIn(sentence.slice(0, 30)))
  }
  for (const match of sentence.matchAll(STATEMENT_ANCHOR)) {
    const from = (match.index ?? 0) + match[0].length
    add(rolesIn(sentence.slice(from, from + ANCHOR_WINDOW)))
  }
  for (const match of sentence.matchAll(COPULA_ANCHOR)) {
    const from = (match.index ?? 0) + match[0].length
    const words = sentence.slice(from).trim().split(/\s+/u).slice(0, 2).join(' ')
    add(rolesIn(words))
  }
  return out
}

/**
 * The positions a lead states, in the order it states them.
 *
 * Only the first paragraph that names the club is read, and only its first sentence.
 * A lead can run for four paragraphs about a man's other clubs and his boyhood; the
 * sentence that says what he was here is the one at the top, which is also the one a
 * reader would quote.
 */
export function rolesFromLead(wikitext: string): { leadHe: string | null; positions: Position[] } {
  const lead = leadSection(wikitext)
  if (lead === '') return { leadHe: null, positions: [] }
  for (const paragraph of lead.split(/\n\s*\n/u)) {
    const text = stripMarkup(paragraph)
    if (text === '' || !CLUB_WORD.test(text)) continue
    const sentence = text.split(/(?<=[.!?])\s/u)[0] ?? text
    const positions = rolesStatedIn(sentence)
    if (positions.length > 0) return { leadHe: sentence, positions }
    return { leadHe: null, positions: [] }
  }
  return { leadHe: null, positions: [] }
}

/**
 * The retired read, applied to a page's field exactly as the old pipeline applied it —
 * markup stripped, whole string, lexicon order. See {@link retiredScalarPosition}.
 */
export function legacyPositionOf(page: PlayerWikitextPage): Position | null {
  const wikitext = wikitextOf(page)
  if (wikitext === null) return null
  const { raw } = roleFieldOf(wikitext)
  if (raw === null) return null
  const code = retiredScalarPosition(stripMarkup(raw))
  return code === 'UNK' ? null : code
}

/** The `תפקיד` field, off whichever infobox template this page happens to use. */
export function roleFieldOf(wikitext: string): { template: string | null; raw: string | null } {
  const template = firstTemplateName(wikitext)
  if (template === null) return { template: null, raw: null }
  const fields = extractTemplate(wikitext, template)
  const raw = fields?.['תפקיד']?.trim()
  return { template, raw: raw === undefined || raw === '' ? null : raw }
}

/** Roles the page states inside brackets — "(תופקד גם כשוער, חלוץ)". Kept, not promoted. */
function asideRolesOf(raw: string): string[] {
  const out: string[] = []
  for (const match of raw.matchAll(/\(([^)]*)\)/gu)) {
    for (const value of splitRoleValues(stripMarkup(match[1] ?? ''))) out.push(value)
  }
  return out
}

/**
 * One page, read.
 *
 * The order of the four steps is the decision: read the field as a list, read the lead,
 * let the lead lead, and keep everything either of them said.
 */
export function readPlayerRoles(page: PlayerWikitextPage): PlayerRoleReading | null {
  const wikitext = wikitextOf(page)
  if (wikitext === null) return null

  const { template, raw } = roleFieldOf(wikitext)
  // `stripMarkup` first: half the pages write the role as `[[מערך (כדורגל)#מגן|מגן]]`,
  // and a link's target is not what the page says — its label is.
  const clean = raw === null ? null : stripMarkup(raw)
  const roleValues = clean === null ? [] : splitRoleValues(clean)
  const infoboxPositions = clean === null ? [] : parsePositions(clean)
  const staffRoles = roleValues.filter((value) => isStaffRole(value))
  const unreadableRoles = roleValues.filter(
    (value) => !isStaffRole(value) && parsePositions(value).length === 0,
  )

  const lead = rolesFromLead(wikitext)

  // The body first, then whatever the infobox adds that the body did not mention. Both
  // are true about the man; the order says which claim is about THIS club.
  const positions: Position[] = [...lead.positions]
  for (const code of infoboxPositions) if (!positions.includes(code)) positions.push(code)

  const infoboxFirst = infoboxPositions[0] ?? null
  const bodyFirst = lead.positions[0] ?? null
  const position = bodyFirst ?? infoboxFirst
  const positionFrom: PositionSource | null =
    position === null ? null : bodyFirst !== null ? 'vikipoel-body' : 'vikipoel'

  return {
    title: page.title,
    template,
    roleRaw: raw,
    roleValues,
    infoboxPositions,
    staffRoles,
    unreadableRoles,
    asideRoles: raw === null ? [] : asideRolesOf(raw),
    leadHe: lead.leadHe,
    bodyPositions: lead.positions,
    positions,
    position,
    positionFrom,
    conflict:
      bodyFirst !== null && infoboxFirst !== null && bodyFirst !== infoboxFirst
        ? { infobox: infoboxFirst, body: bodyFirst }
        : null,
  }
}

/* ------------------------------------------------------------------ the run */

export type PlayerRolesReport = {
  pagesRead: number
  /** pages with no template at all — reported, not skipped silently */
  pagesWithoutInfobox: string[]
  /** every infobox template the corpus uses, and how many pages use it */
  byTemplate: Record<string, number>
  pagesWithRoleField: number
  /** the pages whose `תפקיד` holds more than one value */
  multiValue: string[]
  /** …of those, the ones whose values are not all the same position */
  multiPosition: string[]
  /** pages whose lead states a role at Hapoel */
  leadStated: number
  /** pages where the lead and the infobox disagree about the first role */
  conflicts: Array<{ title: string; infobox: Position; body: Position; leadHe: string }>
  /** role values no lexicon term covers, and how often each appeared */
  unreadable: Record<string, number>
  staff: Record<string, number>
  notes: string[]
}

export type PlayerRolesRun = {
  readings: PlayerRoleReading[]
  report: PlayerRolesReport
}

export function parsePlayerRoles(pages: readonly PlayerWikitextPage[]): PlayerRolesRun {
  const readings: PlayerRoleReading[] = []
  const report: PlayerRolesReport = {
    pagesRead: pages.length,
    pagesWithoutInfobox: [],
    byTemplate: {},
    pagesWithRoleField: 0,
    multiValue: [],
    multiPosition: [],
    leadStated: 0,
    conflicts: [],
    unreadable: {},
    staff: {},
    notes: [],
  }

  for (const page of pages) {
    const reading = readPlayerRoles(page)
    if (reading === null) {
      report.pagesWithoutInfobox.push(page.title)
      continue
    }
    readings.push(reading)
    if (reading.template === null) report.pagesWithoutInfobox.push(page.title)
    else report.byTemplate[reading.template] = (report.byTemplate[reading.template] ?? 0) + 1
    if (reading.roleRaw !== null) report.pagesWithRoleField += 1
    if (reading.roleValues.length > 1) report.multiValue.push(reading.title)
    if (reading.infoboxPositions.length > 1) report.multiPosition.push(reading.title)
    if (reading.bodyPositions.length > 0) report.leadStated += 1
    if (reading.conflict) {
      report.conflicts.push({
        title: reading.title,
        infobox: reading.conflict.infobox,
        body: reading.conflict.body,
        leadHe: (reading.leadHe ?? '').slice(0, 180),
      })
    }
    for (const value of reading.unreadableRoles) {
      report.unreadable[value] = (report.unreadable[value] ?? 0) + 1
    }
    for (const value of reading.staffRoles) {
      report.staff[value] = (report.staff[value] ?? 0) + 1
    }
  }

  report.notes.push(
    'שדות נוספים בתיבה שנושאים רשימה ואינם נקראים כאן: `מועדונים`, `מועדונים כשחקן`, ' +
      '`מועדונים כמאמן`, `מועדוני נוער`, `כינוי`, `תארים`, `מספרים נוספים`. אף אחד מהם ' +
      'אינו נקרא היום כסקלר על ידי הצינור, ולכן לא שונה דבר — אבל הם רשומים כאן כדי ' +
      'שהמלכודת לא תיפתח שוב מאותו מקום.',
  )

  return { readings, report }
}
