/**
 * `npm run ingest:turim`
 *
 * Reads `content/raw/vikipoel-turim.json` — 1,385 press columns from ויקיפועל's "בשער"
 * series, every one with a full ISO date — and writes the canonical rows gate 12 reads.
 *
 *   content/manual/press-columns.json   headline · date · byline · ONE short quotation
 *   docs/13-turim-ingest.md             every number this run produced
 *
 * NO NETWORK (rule 36), the same shape as `vikipoel-cli.ts`: the raw export stays in the
 * repository as the record, the parser is a pass over it, and a parser change re-runs
 * for free.
 *
 * **Idempotency is by SOURCE TITLE**, as in delta 71: a row this script wrote carries
 * `sourceTitle === VIKIPOEL_TURIM_SOURCE_TITLE`, and on a re-run every such row is
 * discarded and rebuilt while anything else in the file is kept byte-for-byte. Nothing
 * curated can be overwritten and a second run cannot double the archive.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  parseTurim,
  readTurimFile,
  QUOTE_MAX,
  VIKIPOEL_TURIM_SOURCE_TITLE,
  VIKIPOEL_TURIM_SOURCE_URL,
  type PressColumn,
  type TurimIngestReport,
} from './sources/vikipoel-turim'

const ROOT = resolve(process.cwd())
const OUT = join(ROOT, 'content/manual/press-columns.json')

type ManualFile = {
  note: string
  sport: string
  confidence: number
  source: { title: string; url: string | null; read: number; readOn: string }
  records: PressColumn[]
}

function main(): void {
  const rows = readTurimFile(join(ROOT, 'content/raw/vikipoel-turim.json'))
  const { columns, report } = parseTurim(rows)

  const curated: PressColumn[] = existsSync(OUT)
    ? (JSON.parse(readFileSync(OUT, 'utf8')) as ManualFile).records.filter(
        (row) => row.sourceTitle !== VIKIPOEL_TURIM_SOURCE_TITLE,
      )
    : []

  const file: ManualFile = {
    note:
      'טורי עיתונות ממדור "בשער" בוויקיפועל. לכל שורה: כותרת, תאריך מלא, מי שהוויקי ' +
      'מייחס לו את הטור, וציטוט אחד קצר. **הטקסט המלא אינו כאן ולא ייכנס לכאן** — טור ' +
      'הוא יצירה של מישהו, ומה שהאפליקציה מדפיסה הוא כותרת, תאריך, שם וציטוט של עד ' +
      `${QUOTE_MAX} תווים (כלל 12 בצורתו לטקסט עיתונאי). הטור השלם שמור ב-` +
      'content/raw/vikipoel-turim.json כרשומה. נוצר על ידי `npm run ingest:turim`; ' +
      'ראה docs/13-turim-ingest.md.',
    sport: 'football',
    confidence: 1,
    source: {
      title: VIKIPOEL_TURIM_SOURCE_TITLE,
      url: VIKIPOEL_TURIM_SOURCE_URL,
      read: rows.length,
      readOn: '2026-09-17',
    },
    records: [...curated, ...columns],
  }

  writeFileSync(OUT, `${JSON.stringify(file, null, 1)}\n`, 'utf8')
  writeFileSync(join(ROOT, 'docs/13-turim-ingest.md'), reportMarkdown(report, curated.length), 'utf8')

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        rowsRead: report.rowsRead,
        accepted: report.accepted,
        skipped: report.skipped.length,
        byDecade: report.byDecade,
        quoteFrom: report.quoteFrom,
        span: [report.earliest, report.latest],
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

function reportMarkdown(report: TurimIngestReport, curated: number): string {
  return `# 13 · "בשער" — קליטת טורי העיתונות

נוצר על ידי \`npm run ingest:turim\` (\`scripts/ingest/turim-cli.ts\`) מתוך
\`content/raw/vikipoel-turim.json\`. בלי רשת (כלל 36).

מקור: **${VIKIPOEL_TURIM_SOURCE_TITLE}** · <${VIKIPOEL_TURIM_SOURCE_URL}>

## 1 · מה נקרא

| מה | כמה |
| --- | --- |
| שורות בייצוא | ${report.rowsRead} |
| **טורים שנקלטו** | **${report.accepted}** |
| נדחו | ${report.skipped.length} |
| שורות מתועדות שנשמרו | ${curated} |
| הטור המוקדם ביותר | ${report.earliest ?? '—'} |
| הטור המאוחר ביותר | ${report.latest ?? '—'} |
| ימים שנושאים יותר מטור אחד | ${report.sharedDays} |

**כל שורה נושאת תאריך מלא.** זה מה שהופך את האוסף הזה לאגף ולא לרשימה: "היום לפני"
יכולה לשאול את הארכיון מה קרה בתאריך של היום בלי שאיש ימציא יום שנה.

${table([
  ['עשור', 'טורים'],
  ...Object.entries(report.byDecade)
    .sort()
    .map(([decade, n]) => [decade, String(n)]),
])}

## 2 · מי כתוב על הטור

הוויקי כותב בשדה אחד שני סוגי דבר: **אדם** על חלק מהשורות ו**עיתון** על האחרות. שני
אלה אינם אותה עובדה, ולכן אחד לא נכתב מחדש כשני — השדה נקרא \`bylineHe\` ומדפיס את מה
שכתוב.

${table([
  ['כפי שהוויקי כותב', 'טורים'],
  ...Object.entries(report.byByline)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => [name, String(n)]),
])}

## 3 · טור הוא יצירה של מישהו

כלל 12 אומר ששאלה נבנית מה**מטא־דאטה** של שיר ושאף מסך אינו מדפיס בתים. טור עיתונאי
הוא אותו עצם בצורה אחרת, ולכן אותו כלל — והוא נאכף **בקליטה**, לא בקומפוננטה:

* השורה הקנונית נושאת כותרת, תאריך, שם וציטוט **אחד**, עד **${QUOTE_MAX} תווים**.
* הציטוט נחתך פעם אחת, כאן, ונשמר. מסך אינו יכול לבקש "עוד קטע מאותו טור", כי בקובץ
  שהוא קורא אין עוד קטע. זו הסיבה שיצירה אינה יכולה להיות מורכבת מחדש מכמה כרטיסים —
  ערובה מבנית ולא הבטחה בהערה.
* הטקסט המלא נשאר ב-\`content/raw/\` כרשומה (כלל 64 §7).

| מקור הציטוט | טורים |
| --- | --- |
| הציטוט של הדף עצמו (\`quote\`) | ${report.quoteFrom.pull} |
| פתיחת הטור, חתוכה בסוף משפט | ${report.quoteFrom.opening} |
| **בלי ציטוט** (אין טקסט ואין ציטוט בדף) | ${report.quoteFrom.none} |

## 4 · מה נדחה, ולמה

${
  report.skipped.length === 0
    ? '_שום שורה לא נדחתה._'
    : table([['דף', 'סיבה'], ...report.skipped.map((row) => [row.key, row.reason])])
}

## 5 · מה לא נקלט, ונאמר

${report.notes.map((line) => `* ${line}`).join('\n')}

## 6 · הרצה חוזרת

הסקריפט מזהה את השורות שהוא עצמו כתב לפי \`sourceTitle\`, מוחק אותן ובונה אותן מחדש; כל
שורה אחרת נשמרת כפי שהיא. הרצה שנייה מייצרת את אותו קובץ בדיוק.
`
}

main()
