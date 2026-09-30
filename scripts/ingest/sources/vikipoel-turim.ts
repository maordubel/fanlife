/**
 * ויקיפועל — מדור "בשער": 1,385 טורי עיתונות, וכל אחד עם תאריך מלא.
 *
 * NO NETWORK (rule 36). `content/raw/vikipoel-turim.json` is the record of what was read
 * through the owner's browser on 17.9.2026, and everything here is a pass over those
 * bytes — the same shape delta 71 gave the `Games` table.
 *
 * **What makes this corpus worth a gate:** every single row carries a full ISO date.
 * 1970s 152 · 1980s 451 · 1990s 485 · 2000s 296. An archive where every item is dated is
 * the one kind of archive that can answer *"what happened on today's date"* without
 * anybody inventing an anniversary.
 *
 * ## A press column is somebody else's writing, and the parser is where that is enforced
 *
 * Rule 12 says a question is built from a song's METADATA and no screen prints verses.
 * A newspaper column is the same object with a different shape, so the same rule applies
 * and it is applied HERE rather than in a component:
 *
 *   · the canonical row carries the **headline, the date, the byline and ONE short
 *     quotation** — never the column;
 *   · the quotation is cut once, at ingest, and stored. A screen cannot ask for "another
 *     bit of that column", because there is no other bit in the file it reads. That is
 *     what stops a piece being reassembled across several cards — a structural
 *     guarantee rather than a promise in a comment;
 *   · the full text stays in `content/raw/`, which is the RECORD (rule 64 §7) and is not
 *     what the app imports.
 *
 * The quotation is the WIKI'S OWN pull-quote where the page has one (353 of them do —
 * somebody chose that sentence), and otherwise the column's opening, cut at a sentence
 * end inside the cap. A row with neither carries `quoteHe: null` and the screen shows
 * the headline, the date and the byline, which is a real card and not a stub.
 */

import { readFileSync } from 'node:fs'

import { decodeEntities } from './vikipoel-cargo'

/* ------------------------------------------------------------------- source */

export const VIKIPOEL_TURIM_SOURCE_TITLE =
  'ויקיפועל — מדור "בשער" (Special:CargoExport), נקרא 17.9.2026'
export const VIKIPOEL_TURIM_SOURCE_URL =
  'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Turim'

/**
 * One column as the export writes it. `page` is the wiki page (`בשער:<headline>`),
 * `Tur` the headline, `text` the column, `quote` the page's own pull-quote.
 */
export type VikipoelTurRow = {
  page?: string | null
  Tur?: string | null
  description?: string | null
  filename?: string | null
  text?: string | null
  date?: string | null
  date__precision?: string | number | null
  source?: string | null
  quote?: string | null
  quote2?: string | null
  image?: string | null
  ocr?: string | null
}

export function readTurimFile(path: string): VikipoelTurRow[] {
  return JSON.parse(readFileSync(path, 'utf8')) as VikipoelTurRow[]
}

/* -------------------------------------------------------------- the canon row */

export type PressColumn = {
  /** `tur-1986-05-23` — the date, plus a letter where a day carried more than one */
  slug: string
  /** the wiki page this came off, so a reader can be sent to the column itself */
  pageHe: string
  publishedOn: string
  decade: number
  titleHe: string
  /**
   * Who the wiki credits. It writes a PERSON on some rows (`שרון מוהר`, 658) and a
   * PAPER on others (`הארץ`, 727), and the two are not the same kind of fact — so the
   * field is called what it is and neither is rewritten into the other.
   */
  bylineHe: string
  /** ONE short quotation, cut once, here. Never the column. */
  quoteHe: string | null
  /** where the quotation came from — the page's own pull-quote, or the column's opening */
  quoteFrom: 'pull' | 'opening' | null
  /** how long the column is, so a card can say what share of it the quotation is */
  words: number
  sport: 'football'
  confidence: number
  sourceTitle: string
  sourceUrl: string
}

/**
 * How much of somebody else's column this app will ever print.
 *
 * 240 characters is about two sentences — enough to carry a voice, far short of the
 * piece. The cap is a constant here and nowhere else, so raising it is one edit that
 * somebody has to make on purpose.
 */
export const QUOTE_MAX = 240

/** Cut at the last sentence end inside the cap, or the last word. Never mid-word. */
export function shortQuote(raw: string): string | null {
  const text = decodeEntities(raw).replace(/\s+/gu, ' ').trim()
  if (text === '') return null
  if (text.length <= QUOTE_MAX) return text
  const window = text.slice(0, QUOTE_MAX)
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '))
  if (sentence > QUOTE_MAX * 0.4) return window.slice(0, sentence + 1)
  const word = window.lastIndexOf(' ')
  return `${window.slice(0, word > 0 ? word : QUOTE_MAX).trim()}…`
}

/** `1986-05-23` and nothing else. A partial date is not a date (rule 11). */
export function publishedOnFrom(row: VikipoelTurRow): string | null {
  const raw = (row.date ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const [year, month, day] = raw.split('-').map(Number) as [number, number, number]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  if (year < 1900 || year > 2100) return null
  return raw
}

export type TurimIngestReport = {
  rowsRead: number
  accepted: number
  /** every row that did not become a column, with the reason — never a silent drop */
  skipped: Array<{ key: string; reason: string }>
  byDecade: Record<string, number>
  byByline: Record<string, number>
  /** columns whose quotation is the page's own pull-quote, and the opening ones */
  quoteFrom: { pull: number; opening: number; none: number }
  /** days carrying more than one column — the slug suffix exists for these */
  sharedDays: number
  earliest: string | null
  latest: string | null
  notes: string[]
}

export type TurimIngestResult = { columns: PressColumn[]; report: TurimIngestReport }

/**
 * The rows, parsed. Pure — `readTurimFile` is the only thing that touches a disk.
 *
 * `confidence` is **1** on every row: one source, the club's own wiki, not cross-checked
 * against a newspaper archive. Rule 2's floor is what keeps a confidence-1 row out of
 * the trivia generator, and this wing is not the trivia generator — it prints the source
 * on the card instead (rule 16).
 */
export function parseTurim(rows: readonly VikipoelTurRow[]): TurimIngestResult {
  const report: TurimIngestReport = {
    rowsRead: rows.length,
    accepted: 0,
    skipped: [],
    byDecade: {},
    byByline: {},
    quoteFrom: { pull: 0, opening: 0, none: 0 },
    sharedDays: 0,
    earliest: null,
    latest: null,
    notes: [],
  }

  const columns: PressColumn[] = []
  const usedDays = new Map<string, number>()

  for (const row of rows) {
    const key = (row.page ?? row.Tur ?? '(ללא שם)').trim()
    const publishedOn = publishedOnFrom(row)
    if (publishedOn === null) {
      report.skipped.push({ key, reason: `תאריך לא קריא: ${JSON.stringify(row.date ?? null)}` })
      continue
    }
    const titleHe = decodeEntities((row.Tur ?? '').trim())
    if (titleHe === '') {
      report.skipped.push({ key, reason: 'אין כותרת' })
      continue
    }
    const bylineHe = decodeEntities((row.source ?? '').trim())
    if (bylineHe === '') {
      report.skipped.push({ key, reason: 'אין מקור/כותב' })
      continue
    }

    const pull = (row.quote ?? '').trim()
    const body = (row.text ?? '').trim()
    const quoteHe = pull !== '' ? shortQuote(pull) : body !== '' ? shortQuote(body) : null
    const quoteFrom = quoteHe === null ? null : pull !== '' ? 'pull' : 'opening'
    report.quoteFrom[quoteFrom ?? 'none'] += 1

    const seen = usedDays.get(publishedOn) ?? 0
    usedDays.set(publishedOn, seen + 1)
    if (seen === 1) report.sharedDays += 1
    // `tur-1986-05-23`, and `-b`, `-c` for the twelve days that carry more than one.
    // The date is what makes it unique and readable; a hash would be neither.
    const slug = `tur-${publishedOn}${seen === 0 ? '' : `-${String.fromCharCode(97 + seen)}`}`

    const decade = Math.floor(Number(publishedOn.slice(0, 4)) / 10) * 10
    report.byDecade[`${decade}s`] = (report.byDecade[`${decade}s`] ?? 0) + 1
    report.byByline[bylineHe] = (report.byByline[bylineHe] ?? 0) + 1
    if (report.earliest === null || publishedOn < report.earliest) report.earliest = publishedOn
    if (report.latest === null || publishedOn > report.latest) report.latest = publishedOn

    columns.push({
      slug,
      pageHe: decodeEntities(key),
      publishedOn,
      decade,
      titleHe,
      bylineHe,
      quoteHe,
      quoteFrom,
      // The length of the piece is a fact ABOUT the piece and is not the piece. It is
      // what lets a card say how small the quotation is.
      words: body === '' ? 0 : decodeEntities(body).split(/\s+/u).filter(Boolean).length,
      sport: 'football',
      confidence: 1,
      sourceTitle: VIKIPOEL_TURIM_SOURCE_TITLE,
      sourceUrl: VIKIPOEL_TURIM_SOURCE_URL,
    })
    report.accepted += 1
  }

  report.notes.push(
    'הטקסט המלא של הטור אינו נכתב לקובץ הקנוני. מה שנשמר הוא כותרת, תאריך, כותב וציטוט ' +
      `אחד באורך ${QUOTE_MAX} תווים לכל היותר. הטור השלם נשאר ב-content/raw/ כרשומה ` +
      '(כלל 64 §7) ואינו מה שהאפליקציה טוענת.',
    'שדות שלא נקלטו: `description`, `filename`, `ocr`, `image`, `quote2`. `ocr` הוא דגל ' +
      'בוליאני על איכות ההקלדה ולא תוכן; `image` הוא שם קובץ בוויקי שאין לנו את הבייטים ' +
      'שלו ואין לנו זכויות עליו (כלל 5); `quote2` הוא ציטוט שני, ושמירתו לצד הראשון היא ' +
      'בדיוק הדרך שבה יצירה מורכבת מחדש מכמה כרטיסים.',
  )

  columns.sort((a, b) => (a.publishedOn < b.publishedOn ? -1 : a.publishedOn > b.publishedOn ? 1 : 0))
  return { columns, report }
}
