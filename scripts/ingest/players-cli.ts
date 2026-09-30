/**
 * `npm run ingest:players`
 *
 * Re-derives the POSITION of every ויקיפועל player from the raw wikitext export, and
 * writes the report that says what moved and why.
 *
 * NO NETWORK (rule 36): the only input is `content/raw/vikipoel-player-wikitext.json`,
 * the file the owner exported through his own browser on 17.9.2026, so a parser change
 * re-runs for free and every value stays traceable to the page it came off.
 *
 *   content/manual/player-facts-vikipoel.json   `position`, `positions`, `positionFrom`
 *   docs/12-player-roles.md                     every number this run produced
 *
 * **It touches three fields and nothing else.** `origin`, `fromYear`, `toYear` and
 * `squadSeasons` on the same rows come off the pages' CATEGORIES, they were read in an
 * earlier pass, and re-deriving them here would be a second answer to a question that
 * already has one (rule 59). A row whose page is not in the export keeps every value it
 * has and is named in the report.
 *
 * `content/manual/player-facts.json` is NOT written here. It is the merge of six
 * sources and `scripts/players/merge.py` owns it; run `sh scripts/players/pipeline.sh`
 * after this, which is what the report says too.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  legacyPositionOf,
  parsePlayerRoles,
  readPlayerWikitextFile,
  VIKIPOEL_PLAYERS_SOURCE_TITLE,
  VIKIPOEL_PLAYERS_SOURCE_URL,
  type PlayerRoleReading,
  type PlayerRolesReport,
  type Position,
  type PositionSource,
} from './sources/vikipoel-players'

const ROOT = resolve(process.cwd())

type VikipoelRow = {
  personNameHe: string
  position: Position | null
  /** every playing role the page states, display value first */
  positions?: Position[]
  /** the infobox field, or the page's own lead sentence */
  positionFrom?: PositionSource | null
  /** both claims, kept where they disagree — rule 60 §3 */
  positionSays?: Record<string, Position>
  origin: string
  fromYear?: number | null
  toYear?: number | null
  squadSeasons?: number
  [key: string]: unknown
}

type VikipoelFile = {
  note: string
  sport: string
  confidence: number
  source: { title: string; url: string; read: number; readOn: string }
  confirmedSpelling: Record<string, string>
  table: VikipoelRow[]
}

/**
 * The table is keyed by the page's own title; `confirmedSpelling` maps that title to the
 * ARCHIVE's spelling of the same man (`יאניק ללינדאל` → `יאניק לליינדל`). A reading is
 * therefore indexed under both, because using only the archive's spelling loses the one
 * row whose two spellings differ — which is the row the map exists for.
 */
function keysFor(title: string, spelling: Record<string, string>): string[] {
  const other = spelling[title]
  return other === undefined || other === title ? [title] : [title, other]
}

function main(): void {
  const pages = readPlayerWikitextFile(join(ROOT, 'content/raw/vikipoel-player-wikitext.json'))
  const { readings, report } = parsePlayerRoles(pages)

  const path = join(ROOT, 'content/manual/player-facts-vikipoel.json')
  const text = readFileSync(path, 'utf8')
  const file = JSON.parse(text) as VikipoelFile
  const pageOf = new Map(pages.map((page) => [page.title, page]))
  const byName = new Map<string, PlayerRoleReading>()
  for (const reading of readings) {
    for (const key of keysFor(reading.title, file.confirmedSpelling)) byName.set(key, reading)
  }

  /**
   * **"Before" is the RETIRED READ, not the file on disk.**
   *
   * Comparing against the row already written makes the report empty on the second run
   * and silently untrue on every run after a parser change. Comparing against
   * `legacyPositionOf` — the scalar scan this pass replaced, applied to the same page —
   * is reproducible, and it is the comparison the reader actually wants: what the old
   * rule said about this man, and what the new one says.
   */
  const moved: Array<{
    personNameHe: string
    before: Position | null
    after: Position | null
    from: PositionSource | null
    roleRaw: string | null
    positions: Position[]
    leadHe: string | null
  }> = []
  const unread: string[] = []

  for (const row of file.table) {
    const reading = byName.get(row.personNameHe)
    if (!reading) {
      unread.push(row.personNameHe)
      continue
    }
    const before = legacyPositionOf({ title: reading.title, revisions: pageOf.get(reading.title)?.revisions })
    if (before !== reading.position) {
      moved.push({
        personNameHe: row.personNameHe,
        before,
        after: reading.position,
        from: reading.positionFrom,
        roleRaw: reading.roleRaw,
        positions: reading.positions,
        leadHe: reading.leadHe,
      })
    }
    row.position = reading.position
    // `positions` is written only where there is more than one, because a one-element
    // array beside a scalar that already holds the same value is a second copy of a
    // fact (rule 59) on 570 rows.
    if (reading.positions.length > 1) row.positions = reading.positions
    else delete row.positions
    row.positionFrom = reading.positionFrom
    if (reading.conflict) {
      row.positionSays = { vikipoel: reading.conflict.infobox, 'vikipoel-body': reading.conflict.body }
    } else {
      delete row.positionSays
    }
  }

  file.note =
    'ויקיפועל — האנציקלופדיה של הפועל תל אביב (wiki.red-fans.com), קטגוריה "שחקני הפועל ' +
    'תל אביב (כדורגל)": 638 שחקנים. זה המקור שרשימת 637 השמות בארכיון נולדה ממנו, ולכן ' +
    'השמות מתאימים אחד-לאחד. שלושה שדות נקראו מכל ערך: `תפקיד` מתיבת המידע, החברות ' +
    'בקטגוריה "שחקנים זרים (כדורגל)" — שהיא ההגדרה של המועדון עצמו למי שתפס מקום של זר — ' +
    'וקטגוריות "סגל הפועל ת\'א (כדורגל) YYYY/YY", עונה-עונה, שמהן נגזרות השנים. ' +
    'האתר חסום ל-Cloudflare בפני גישה אוטומטית; הוא נקרא בדפדפן של מאור, ואומת מול ' +
    'הדפדפן בטביעת SHA-256 (46e106131821c699) על כל 638 השורות. ' +
    'מ-17.9.2026 העמדה נקראת מהוויקיטקסט הגולמי ב-`content/raw/vikipoel-player-wikitext.json` ' +
    'על ידי `npm run ingest:players`: `תפקיד` הוא **רשימה** ולא ערך יחיד, כל תפקיד נשמר ' +
    'ב-`positions`, ומשפט הפתיחה של הדף — שאומר מה הוא שיחק **בהפועל** — גובר על התיבה, ' +
    'שאומרת מה הוא שיחק בקריירה. `positionFrom` אומר מי הכריע ו-`positionSays` שומר את ' +
    'שני הצדדים איפה שהם חלוקים. ראה `docs/12-player-roles.md`.'

  writeFileSync(path, `${JSON.stringify(file, null, 1)}\n`, 'utf8')

  writeFileSync(
    join(ROOT, 'docs/12-player-roles.md'),
    reportMarkdown({ report, moved, unread, readings }),
    'utf8',
  )

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        pagesRead: report.pagesRead,
        withRoleField: report.pagesWithRoleField,
        multiValue: report.multiValue.length,
        multiPosition: report.multiPosition.length,
        leadStated: report.leadStated,
        conflicts: report.conflicts.length,
        rowsChanged: moved.length,
        rowsNotInExport: unread.length,
      },
      null,
      1,
    ),
  )
}

function table(rows: string[][]): string {
  if (rows.length <= 1) return '_אין._'
  const [head, ...body] = rows as [string[], ...string[][]]
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

const POSITION_HE: Record<Position, string> = { GK: 'שוער', DF: 'הגנה', MF: 'קישור', FW: 'חלוץ' }
const say = (code: Position | null): string => (code === null ? '—' : `${code} (${POSITION_HE[code]})`)

function reportMarkdown(input: {
  report: PlayerRolesReport
  moved: Array<{
    personNameHe: string
    before: Position | null
    after: Position | null
    from: PositionSource | null
    roleRaw: string | null
    positions: Position[]
    leadHe: string | null
  }>
  unread: string[]
  readings: PlayerRoleReading[]
}): string {
  const { report, moved, unread, readings } = input
  const multi = readings.filter((row) => row.roleValues.length > 1)
  return `# 12 · תפקיד הוא רשימה — קליטת העמדות מוויקיטקסט של ויקיפועל

נוצר על ידי \`npm run ingest:players\` (\`scripts/ingest/players-cli.ts\`) מתוך
\`content/raw/vikipoel-player-wikitext.json\`. בלי רשת (כלל 36).

מקור: **${VIKIPOEL_PLAYERS_SOURCE_TITLE}** · <${VIKIPOEL_PLAYERS_SOURCE_URL}>

## 1 · למה זה קיים

מאור, 17.9.2026: *"אני מבקש דיוק בפרטים! לא יכול להיות ששמת את שייע פיינגבוים, החלוץ
הגדול עם הכי הרבה שערים בהיסטוריה של הפועל בתור שחקן הגנה."*

הוא צדק, והשורה לא הייתה התקלה. השדה \`תפקיד\` בתיבת המידע הוא **רשימה**:

\`\`\`
|תפקיד=מגן שמאלי, חלוץ, מאמן          ← שייע פייגנבוים
'''חלוץ, שיחק בהפועל בשנים 1979-1965 ומאמן הקבוצה…'''
\`\`\`

המחרוזת כולה נמסרה לסריקת לקסיקון, שהחזירה את ה**קוד** הראשון שהיא בודקת ולא את
התפקיד הראשון שהמקור כתב — \`parsePosition('חלוץ, בלם')\` החזיר \`DF\`. זו מחלקה של
תקלות, לא שורה.

## 2 · מה נקרא

| מה | כמה |
| --- | --- |
| דפים בייצוא | ${report.pagesRead} |
| דפים בלי תיבת מידע | ${report.pagesWithoutInfobox.length}${report.pagesWithoutInfobox.length > 0 ? ` (${report.pagesWithoutInfobox.join(', ')})` : ''} |
| דפים עם שדה \`תפקיד\` | ${report.pagesWithRoleField} |
| **דפים שהשדה שלהם נושא יותר מערך אחד** | **${report.multiValue.length}** |
| מתוכם, כאלה שהערכים אינם אותה עמדה | **${report.multiPosition.length}** |
| דפים שפסקת הפתיחה שלהם מצהירה תפקיד בהפועל | ${report.leadStated} |
| **פתיחה שחלוקה על התיבה** | **${report.conflicts.length}** |
| שורות שהשתנו ב-\`player-facts-vikipoel.json\` | ${moved.length} |
| שורות בטבלה שאין להן דף בייצוא | ${unread.length}${unread.length > 0 ? ` (${unread.join(', ')})` : ''} |

**חמש תבניות מידע, לא אחת.** \`${Object.entries(report.byTemplate)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${name}\` (${n})`)
    .join(' · `')}. קורא שמחפש רשימה קבועה של שמות תבניות לא מוצא דבר בדפים שלא חשב
עליהם — ושייע פייגנבוים יושב על \`איש כדורגל\`, שלא היה ברשימה.

## 3 · השדה כרשימה

\`splitRoleValues\` חותך על פסיק ועל לוכסן, ו**סוגריים אינם ערך**: \`קשר/חלוץ (קיצוני
ימני)\` מדייק את התפקיד שלפניו, ו-\`בלם, מגן ימני, קשר הגנתי (תופקד גם כשוער, חלוץ…)\`
מספר איפה בלם נדחף פעם. שניהם נשמרים כהערה ואינם הופכים לעמדה — מגן שפעם עמד בשער
אינו שוער.

${table([
  ['שחקן', '`תפקיד` כפי שהדף כותב', 'עמדות מהתיבה', 'תפקידי צוות'],
  ...multi.map((row) => [
    row.title,
    `\`${(row.roleRaw ?? '').replace(/\|/gu, '\\|')}\``,
    row.infoboxPositions.join(' · ') || '—',
    row.staffRoles.join(' · ') || '—',
  ]),
])}

## 4 · הגוף גובר על התיבה, והסתירה נרשמת

התיבה מתארת **קריירה** — כל תפקיד שהאיש מילא אי־פעם, בכל מועדון, כולל אימון. פסקת
הפתיחה מתארת מה הוא שיחק **בהפועל**, והאפליקציה הזאת היא על הפועל. לכן הפתיחה מכריעה
את ערך התצוגה, והחלוקה נרשמת ואינה מוכרעת (כלל 60 §3).

הפתיחה נקראת רק כשהיא **מצהירה** תפקיד — כותרת שפותחת בתפקיד, \`בעמדת\`/\`בתפקיד\`,
או אוגד (\`הוא בלם סלובני\`) — ולא בכל מקום שבו מילה של תפקיד מופיעה. הצורה הרחבה
נמדדה וייצרה שלוש טעויות מאותו סוג: דף שמספר שמישהו **התחיל** כחלוץ ועבר לתפקיד המגן.

${table([
  ['שחקן', 'התיבה', 'הפתיחה', 'המשפט'],
  ...report.conflicts.map((row) => [
    row.title,
    row.infobox,
    `**${row.body}**`,
    row.leadHe.replace(/\|/gu, '\\|').slice(0, 110),
  ]),
])}

## 5 · מה זז בפועל

${table([
  ['שחקן', 'לפני', 'אחרי', 'מי הכריע', '`תפקיד`', 'כל התפקידים'],
  ...moved.map((row) => [
    row.personNameHe,
    say(row.before),
    `**${say(row.after)}**`,
    `\`${row.from ?? '—'}\``,
    row.roleRaw === null ? '_ריק_' : `\`${row.roleRaw.replace(/\|/gu, '\\|')}\``,
    row.positions.join(' · ') || '—',
  ]),
])}

## 6 · מה לא נקרא, ונאמר

* ערכי תפקיד שאף מונח בלקסיקון אינו מכסה: ${
    Object.keys(report.unreadable).length === 0
      ? '**אין**'
      : Object.entries(report.unreadable)
          .map(([value, n]) => `\`${value}\` (${n})`)
          .join(' · ')
  } — נספרים, לא מנוחשים (כלל 11).
* תפקידים שאינם עמדה: ${Object.entries(report.staff)
    .sort((a, b) => b[1] - a[1])
    .map(([value, n]) => `\`${value}\` (${n})`)
    .join(' · ')}. נקראים, מתויגים, ולעולם לא הופכים לעמדה.
${report.notes.map((line) => `* ${line}`).join('\n')}

## 7 · הרצה חוזרת

הסקריפט קורא את הייצוא הגולמי ודורס שלושה שדות בכל שורה שיש לה דף: \`position\`,
\`positions\`, \`positionFrom\` (ו-\`positionSays\` איפה שיש סתירה). \`origin\`,
\`fromYear\`, \`toYear\` ו-\`squadSeasons\` אינם נגעים — הם נקראים מהקטגוריות של הדף
ויש להם כבר תשובה אחת (כלל 59). הרצה שנייה מייצרת את אותו קובץ בדיוק.

**אחרי ההרצה:** \`sh scripts/players/pipeline.sh\` בונה מחדש את
\`content/manual/player-facts.json\` משישה המקורות. \`tests/players.test.ts\` נופל אם
עמדה מוצגת של שחקן כלשהו עדיין נגזרה מהערך הראשון בשדה רב-ערכי.
`
}

main()
