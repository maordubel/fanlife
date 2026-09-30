/**
 * `npm run ingest:scorers`
 *
 * Rebuilds `content/manual/match-scorers.json` and `docs/15-scorers.md` from the raw
 * ויקיפועל `Games` export already in the repository.
 *
 * NO NETWORK (rule 64 §7). `content/raw/vikipoel-games.json` is the record of what the
 * owner's browser downloaded on 17.9.2026 — ויקיפועל sits behind a Cloudflare challenge
 * that this project does not circumvent (rule 11) — so the pipeline re-runs from disk and
 * every number in the doc is reproducible by anyone with the repository.
 *
 * **This script writes TWO files and reads five.** It creates nothing anywhere else, and
 * in particular it does not touch `content/manual/goals.json`. That is not an oversight,
 * so it is written down here as well as in the doc:
 *
 *   Gate 8 (`/goal`) reconstructs a goal's MOVE, touch by touch. `comments` gives a
 *   scorer and a minute. A scorer list is not a move, and building gate 8 content out of
 *   one would mean inventing the passes — rule 11's prohibition, in the one wing whose
 *   own header already records that twelve goals were checked and DROPPED because no
 *   source described their move.
 *
 * The conflicts this run finds stay inside `match-scorers.json` rather than being
 * appended to `fact-conflicts.json`: both claims come from the SAME row of the same
 * source, so the disagreement is a property of the holding and travels with it.
 */

import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  VIKIPOEL_SCORERS_SOURCE_TITLE,
  VIKIPOEL_SCORERS_SOURCE_URL,
  parseFootballScorers,
  readGamesFile,
  type MatchScorersRecord,
  type NamedPerson,
  type RefusedRow,
  type ScorersReport,
  type ScorersResult,
  type UnresolvedToken,
} from '@/scripts/ingest/sources/vikipoel-scorers'

import clubsFile from '@/content/manual/clubs.json'
import playerFactsFile from '@/content/manual/player-facts.json'
import rosterFile from '@/content/manual/players-roster.json'

const ROOT = resolve(process.cwd())

/** The house shape of `content/manual/*.json`, as `player-facts.json` writes it. */
type ManualFile = {
  note: string
  sport: 'football'
  confidence: number
  generator: string
  sources: Array<{ key: string; title: string; url: string | null; read?: number }>
  records: MatchScorersRecord[]
  conflicts: ScorersResult['conflicts']
  unknown: UnresolvedToken[]
  refused: RefusedRow[]
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function table(rows: string[][]): string {
  if (rows.length === 0) return ''
  const header = rows[0] ?? []
  const body = rows.slice(1)
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

/** The refusal codes, in the words a person reading the doc needs. */
const REFUSAL_LABELS: Readonly<Record<string, string>> = {
  'prose': 'הערת משחק ולא רשימת כובשים — המקור כתב משפט',
  'note-attached': 'רשימת כובשים ואחריה (או לפניה) משפט — הגבול אינו ניתן להוכחה',
  'spec-unreadable': 'ספרה שאינה נקראת כדקה',
  'two-goal-specs': 'שני סוגרי־דקות במקטע אחד — פסיק חסר במקור',
  'name-unreadable': 'טוקן שאינו נקרא כשם',
  'bracket-with-digits-unreadable': 'סוגר שיש בו ספרה ואינו נקרא כדקות',
  'orphan-minute': 'דקה בלי כובש לפניה',
  'still-encoded': 'הטקסט הגיע עדיין מקודד',
  'empty': 'שורה ריקה',
  'slash-shape': 'צורת לוכסן שאינה נקראת',
  'no-hapoel-side': 'אף צד או שני צדדים נפתרים להפועל ת"א',
  'duplicate-key': 'כפילות של מפתח טבעי',
}

function main(): void {
  const games = readGamesFile(join(ROOT, 'content/raw/vikipoel-games.json'))

  const playerFacts: NamedPerson[] = playerFactsFile.records.map((row) => ({
    name: row.personNameHe,
  }))
  const roster: NamedPerson[] = rosterFile.records.map((row) => {
    const record = row as { slug: string; fullNameHe: string; aliases?: string[] }
    return { slug: record.slug, name: record.fullNameHe, aliases: record.aliases ?? [] }
  })

  const run = parseFootballScorers({
    games,
    clubs: clubsFile.records as never,
    playerFacts,
    roster,
  })

  /* ---------------------------------------------------------------- write */

  const file: ManualFile = {
    note:
      'כובשי הפועל תל אביב כפי שעמודת comments בטבלת Games של ויקיפועל כותבת אותם. ' +
      'כל שורה מוצלבת מול התוצאה שרשומה באותה שורה עצמה: הסכמה בין שתי הטענות היא ' +
      'confidence 2, סתירה נשמרת כפי שהיא עם confidence 1 ואינה מוכרעת (כלל 60 §3), ' +
      'ולכן כלל 2 מרחיק אותה ממחולל הטריוויה עד שאדם יבדוק. שורה שלא הוכחה במלואה אינה ' +
      'מניבה שער אחד והיא ב-refused עם הטקסט הגולמי והסיבה (כלל 11). שם שלא נפתר מול ' +
      'הארכיון נשאר כלשון המקור עם playerSlug: null ומופיע ב-unknown — מעבר שם-משפחה ' +
      'בלבד נמדד ב-~50% טעויות ונמחק (כלל 64 §5), ולא הוחזר לכאן. ' +
      'הקובץ הזה אינו מזין את שער 8: שער 8 משחזר את המהלך של שער, ורשימת כובשים אינה מהלך.',
    sport: 'football',
    confidence: 2,
    generator: 'scripts/ingest/scorers-cli.ts (npm run ingest:scorers)',
    sources: [
      {
        key: 'vikipoel-games-comments',
        title: VIKIPOEL_SCORERS_SOURCE_TITLE,
        url: VIKIPOEL_SCORERS_SOURCE_URL,
        read: run.report.footballRowsWithComments,
      },
      {
        key: 'player-facts',
        title: 'content/manual/player-facts.json — 653 שחקנים, לפתרון שמות בהתאמה מדויקת',
        url: null,
        read: playerFacts.length,
      },
      {
        key: 'players-roster',
        title: 'content/manual/players-roster.json — גיליון השמות והכינויים של הארכיון',
        url: null,
        read: roster.length,
      },
    ],
    records: run.records,
    conflicts: run.conflicts,
    unknown: run.unresolved,
    refused: run.refused,
  }

  writeFileSync(
    join(ROOT, 'content/manual/match-scorers.json'),
    `${JSON.stringify(file, null, 1)}\n`,
    'utf8',
  )
  writeFileSync(join(ROOT, 'docs/15-scorers.md'), report(run), 'utf8')

  const r = run.report
  process.stdout.write(
    [
      `שורות שנקראו: ${r.rowsRead} · כדורגל: ${r.footballRows} · עם comments: ${r.footballRowsWithComments}`,
      `נקראו במלואן: ${r.rowsParsed} · סורבו: ${r.rowsRefused}`,
      `שערים: ${r.goalsHeld} · הסכמה עם התוצאה: ${r.agreement.agreed}/${r.agreement.agreed + r.agreement.disagreed} = ${pct(r.agreement.rate)}`,
      `confidence 2: ${r.confidenceCounts['2'] ?? 0} · confidence 1: ${r.confidenceCounts['1'] ?? 0}`,
      `שמות שנפתרו: ${r.names.resolved}/${r.names.resolved + r.names.unresolved} = ${pct(r.names.rate)}`,
      'נכתבו: content/manual/match-scorers.json · docs/15-scorers.md',
      'שער 8 (content/manual/goals.json) לא נגע — רשימת כובשים אינה מהלך.',
      '',
    ].join('\n'),
    )
}

/* -------------------------------------------------------------------- the doc */

function groupRefusals(rows: readonly RefusedRow[]): string[][] {
  const byCode = new Map<string, { count: number; example: RefusedRow }>()
  for (const row of rows) {
    const seen = byCode.get(row.code)
    if (seen) seen.count += 1
    else byCode.set(row.code, { count: 1, example: row })
  }
  return [...byCode]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([code, entry]) => [
      `\`${code}\``,
      REFUSAL_LABELS[code] ?? code,
      String(entry.count),
      `\`${entry.example.raw.slice(0, 90).replace(/\|/gu, '\\|')}\``,
    ])
}

/**
 * What the source wrote for a disagreeing row.
 *
 * The holding does not store the raw line — the raw export does, and duplicating it into
 * the canonical file would make two places the text has to stay right. The conflict row
 * already quotes it in `claimA`, so the doc reads it back from there.
 */
function sourceTextFor(run: ScorersResult, row: MatchScorersRecord): string {
  const key = row.matchKey ?? `${row.seasonRaw ?? '?'}|${row.homeClubHe}|${row.awayClubHe}|${row.stage ?? ''}`
  const conflict = run.conflicts.find((entry) => entry.entityKey === key)
  if (!conflict) return row.goals.map((goal) => goal.scorerNameHe ?? '?').join(', ')
  return conflict.claimA.replace(/^comments: \d+ שערים — /u, '')
}

function report(run: ScorersResult): string {
  const r: ScorersReport = run.report
  const disagreeing = run.records.filter((row) => row.agreesWithScore === false)

  return `# 15 · כובשים — עמודת \`comments\` של ויקיפועל

\`npm run ingest:scorers\` · מקור: \`content/raw/vikipoel-games.json\` · בלי רשת (כלל 64 §7)
· נכתב: \`content/manual/match-scorers.json\`

מסמך אוטומטי. כל מספר בו מיוצר מחדש בכל הרצה מאותו קובץ גולמי שנמצא בריפו.

## 0 · מה זה לא

**הקובץ הזה אינו מזין את שער 8 ולא נכתבה בגללו שורה אחת ב-\`content/manual/goals.json\`.**
שער 8 (\`/goal\`) משחזר את ה**מהלך** של שער, נגיעה אחר נגיעה. \`comments\` נותן כובש
ודקה. רשימת כובשים אינה מהלך, ובנייה של תוכן לשער 8 מתוכה פירושה להמציא את המסירות —
בדיוק מה שכלל 11 אוסר, ודווקא באגף שכותרת הקוד שלו כבר רשומה בה ש**שנים־עשר שערים
נבדקו ונפסלו** מפני שאף מקור לא תיאר את המהלך שלהם.

מה הנתון הזה **כן** יכול להזין:
* שאלות טריוויה על מי כבש במשחק נתון, באיזו דקה, ומי כבש מפנדל — משורות \`confidence: 2\` בלבד (כלל 2);
* מניין שערים לשחקן, על השמות שנפתרו מול הארכיון;
* כרטיס משחק באגף הארכיון, שיכול להדפיס את רשימת הכובשים לצד התוצאה.

## 1 · הענף נקרא, לא מנוחש

\`department\` **הוא** הענף, וויקיפועל כותבת אותו על כל שורה. ההליכה מקבלת \`כדורגל\`
ותו לא (כללים 6 ו-38). \`comments\` היא **מוסכמה של כדורגל**: קריאה שלה ככובשים בשורות
הכדורסל המציאה פעם עשרים שערים בענף שאינו רושם אותם כך, ולכן המסנן רץ לפני הפרסר
ו-\`assertFootballDepartment\` הוא המנעול השני מאחוריו.

${table([
  ['\`department\`', 'שורות', 'נקראו כאן'],
  ...Object.entries(r.byDepartment)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => [`\`${name}\``, String(count), name === 'כדורגל' ? 'כן' : '**לא**']),
])}

## 2 · המספרים

${table([
  ['מה', 'כמה'],
  ['שורות ב-\`Games\`', String(r.rowsRead)],
  ['שורות כדורגל', String(r.footballRows)],
  ['שורות כדורגל עם \`comments\` לא ריק', String(r.footballRowsWithComments)],
  ['**שורות שנקראו במלואן**', `**${r.rowsParsed}**`],
  ['**שורות שסורבו**', `**${r.rowsRefused}**`],
  ['שערים שנשמרו', String(r.goalsHeld)],
  ['שורות על קרקע ניטרלית (\`homegame="x"\`)', String(r.neutralGroundRows)],
  ['שורות ש-\`homegame\` שלהן לא נקרא — \`neutralGround: null\`', String(r.neutralGroundUnrecorded)],
  ['שורות בלי תאריך מלא — \`playedOn: null\`', String(r.undatedRows)],
  ['שורות שהארכיון אינו יכול להחזיק את תווית העונה שלהן — \`matchKey: null\`', String(r.rowsWithoutCanonicalSeason)],
])}

## 3 · הדקדוק, כפי שהקורפוס באמת כותב אותו

שורת כובשים היא רשימת **מקטעים**, מופרדים ב-\`,\` או ב-\`;\` ברמה העליונה (כלומר מחוץ
לסוגריים, כך ש-\`(52, 66)\` נשאר מקטע אחד). ארבע צורות נושאות דקות, וכולן בקובץ:

| צורה | דוגמה מהקובץ | שורות שמכילות אותה |
| --- | --- | --- |
| לוכסן | \`אמנון חרל"פ/10\` | 105 |
| סוגריים | \`דב רמלר (48)\` | 1,818 |
| דקה חשופה | \`אללוף 27\` | 76 |
| שם בלבד | \`שבי בן ברוך\` | 291 |

**הצורה השלטת היא הסוגריים ולא הלוכסן.** התדרוך תיאר את צורת הלוכסן כדקדוק; היא
נכונה, והיא **105 שורות מתוך 2,290**. שאר הפרטים בתדרוך אומתו מול הקובץ ונמצאו נכונים.

ועוד, שנמצאו בקובץ ולא היו בתדרוך:

* **\`N-<שם>\` הוא קידומת מניין** — \`2-חיים גלזר (87, 88)\`, \`4-רחביה רוזנבוים (5, 35, 54, 76)\`.
  איפה שגם הסוגר מונה דקות, השניים חייבים להסכים; איפה שלא — השורה מסורבת.
* **מילת־מניין יכולה לשבת גם אחרי השם** — \`חיים גלזר שלושער\`, \`סלים צמד\` — וגם לפניו,
  \`שלושער אמנון חרל"פ\`. \`רביעייה\`=4 ו-\`חמישייה\`=5 קיימות גם הן, וכך \`(שני שערים)\` ו-\`(2 שערים)\`.
* **הסימון יכול לבוא לפני הדקה** — \`(פנדל, 70')\`, \`(עצמי, 55)\` — ולא רק אחריה. זה
  אותו שער אחד בשני סדרי כתיבה, וההוכחה לכך היא ההצלבה: עשרים השורות האלה נכנסו כולן
  בהסכמה עם התוצאה.
* **סימון יכול להידבק לדקה בלי רווח** (\`90פ\`, \`35ע\`, \`?פ\`) או להתחבר אליה במקף
  (\`54'-פ'\`). הפיצול אינו ניחוש: \`פ\` ו-\`ע\` אינם ספרות.
* **הגרש נכתב משני צדי המספר** — \`90'\` וגם \`'90+4\`, וגם \`45'+2'\`.
* **\`שער עצמי (63')\`** — שער עצמי שהמקור אינו מייחס לאיש. הכובש \`null\`, השער נספר.
* **\`X או Y\`** קיים גם על דקות (\`80 או 82\`) ולא רק על שמות. בשני המקרים השער נשמר
  והשדה החלוק נשאר \`null\` עם דגל — נרשם, לא מוכרע (כלל 60 §3).

**סוגר עמוס, וזה המקום היחיד שדורש זהירות.** \`אברהם פלמן (בוצ'קה)/44\` הוא **כינוי**
ו-\`דב רמלר (48)\` הוא **דקות**. הכלל שמפריד ביניהם מכני:

> **סוגר שיש בו ספרה חייב להיקרא כדקות, אחרת השורה מסורבת.**

בטיוטה מוקדמת של הפרסר סוגר שלא נקרא **נפל בשקט לכינוי**, כך ש-\`יהושע פייגנבוים (33',54'-פ')\`
הפך לשער אחד של אדם שכינויו \`33',54'-פ'\`. נפילה לערך סביר היא בדיוק הצורה שכלל 11
אוסר, והיא נתפסת כאן ולא בסקירה — כי הערך הסביר הוא זה שאיש לא בודק פעמיים.

## 4 · ההצלבה — ${pct(r.agreement.rate)}

אותה שורה נושאת גם את התוצאה. \`homescore\`/\`awayscore\` והצד שהפועל **נקובה** בו
אומרים כמה שערים הפועל הבקיעה; רשימת הכובשים אומרת מי הבקיע אותם. שתי טענות בלתי־תלויות
של אותו מקור, בשתי עמודות, על מספר אחד.

${table([
  ['', 'שורות', 'confidence'],
  ['**הסכמה בין רשימת הכובשים לתוצאה**', `**${r.agreement.agreed}**`, '**2**'],
  ['סתירה — נשמרת, נרשמת, אינה מוכרעת', String(r.agreement.disagreed), '1'],
  ['אין תוצאה קריאה', String(r.agreement.unscored), '1'],
  ['**שיעור ההסכמה**', `**${pct(r.agreement.rate)}**`, ''],
])}

זה המדד הכן של הקליטה הזאת. הוא נבדק ב-\`tests/scorers.test.ts\` כרצפה כמותית, ולא
כדוגמה: אם שינוי בפרסר יוריד אותו, הבדיקה נופלת.

**הפרסר אינו מסתכל בתוצאה.** אפשר היה להשתמש בה כדי להכריע את העמימות שבסעיף 6, וזו
הייתה הבחירה הלא־נכונה: ההצלבה שווה משהו רק כל עוד היא **בלתי־תלויה** בפרסור, ופרסר
שקורא את התשובה כבר אי אפשר למדוד מולה.

### ${disagreeing.length} השורות החלוקות

${table([
  ['עונה', 'משחק', 'התוצאה אומרת', 'הרשימה מונה', 'מה המקור כתב'],
  ...disagreeing.map((row) => [
    row.seasonRaw ?? '—',
    `${row.homeClubHe} – ${row.awayClubHe}`,
    String(row.hapoelGoalsFromScore ?? '?'),
    String(row.goalsParsed),
    `\`${sourceTextFor(run, row).slice(0, 70).replace(/\|/gu, '\\|')}\``,
  ]),
])}

רובן שייכות למשפחה אחת, והיא מתוארת בסעיף 6.

## 5 · \`homegame: "x"\` — ולמה לא היה צריך מקרה מיוחד

כלל 36 קורא את \`homegame\` (\`1\` / \`0\` / \`x\`) לדבר אחד: \`x\` פירושו תיקו ששוחק על
**אף אחד** מהמגרשים. הפיתוי הוא להשתמש באותה עמודה כדי להכריע איזה מבין
\`homescore\`/\`awayscore\` הוא שלנו — ובשורת \`x\` השאלה הזאת נראית חסרת מענה.

יש לה מענה, כי היא **מעולם לא הייתה השאלה של \`homegame\`**: \`host\` ו-\`oponent\`
**נוקבים בשמם** של שני הצדדים, ובכל ${r.footballRowsWithComments} שורות הכדורגל שיש
בהן comments בדיוק אחד מהשניים נפתר למועדון ש-\`clubs.json\` מסמן \`isUs\` — דרך רשימת
הכינויים שלו עצמו (כלל 7), לא מפני שהוא נראה כמוהו. \`host\` מזדווג עם \`homescore\`
ו-\`oponent\` עם \`awayscore\`, בלי תלות במקום שבו שוחק המשחק.

לכן **${r.neutralGroundRows} שורות ה-\`x\`** נקראות ככל שורה אחרת, נושאות
\`neutralGround: true\`, ואינן מסורבות ואינן מקרה מיוחד. שורה שמבחן־השם **לא** מחזיר
עליה בדיוק צד אחד שלנו מסורבת ונספרת (\`no-hapoel-side\`: ${r.refusalsByCode['no-hapoel-side'] ?? 0}) —
וזו הבדיקה שהופכת את המשפט הקודם למדידה ולא לאמונה.

## 6 · עמימות אחת נשארת פתוחה בכוונה

מספר חשוף בסוגריים הוא **דקה** לפי המוסכמה השלטת (\`דב רמלר (48)\`), אבל קומץ שורות
משנות השלושים והארבעים משתמשות בו כ**מניין**: \`אמנון חרל"פ (3), משה זימון (2)\` בניצחון
5:0. **שום דבר בתוך השורה אינו מבדיל ביניהן.**

הפרסר קורא כל אחד מהם כדקה ומשאיר להצלבה לתפוס את השאר. השורות האלה נחלקות מול
התוצאה, נרשמות כסתירה, ונוחתות על \`confidence: 1\` — וכלל 2 מרחיק אותן ממחולל
הטריוויה עד שאדם יבדוק. זו בדיוק המכונה שהסתירה קיימת בשבילה.

## 7 · מה סורב, ולמה סורב במקום כוונן

שורה שהפרסר אינו מוכיח במלואה מניבה **אפס** שערים ושורה אחת ב-\`refused\` עם הטקסט
הגולמי והסיבה. זה כלל 11 בצורתו החזקה: רשימת כובשים שחסר בה השער שישב ליד המשפט
שהפרסר נחנק בו היא רשימה ש**נראית** שלמה ואינה.

${table([['קוד', 'מה זה', 'שורות', 'דוגמה מהמקור'], ...groupRefusals(run.refused)])}

**\`note-attached\` היא המחלקה שאפשר יהיה לפתוח יום אחד, ולכן היא בשם משלה.** היא
סגורה היום מסיבה שנמצאת בקורפוס ולא בטעם: השורה
\`המשחק הופסק בדקה ה-82 ... ונקבע נצחון טכני למכבי פ"ת. כבשו להפועל: חיים גלזר (3), ...\`
שמה את הכובשים **אחרי** המשפט. כלומר "מה שאחרי הנקודה הוא הערה" אינו נכון על המקור
הזה, וקורא שהיה מניח זאת היה משמיט בשקט כל שער בשורה. הגבול אינו ניתן להוכחה, ולכן
אינו נלקח.

**\`two-goal-specs\`** הן שורות שחסר בהן פסיק במקור
(\`ישראל וייס (52, 66, 80) רחביה רוזנבוים (57)\`). הצורה מזוהה; היא לא **תוקנה**, כי
תיקון של המקור אינו התפקיד של השכבה הזאת (כלל 37, התקדים של \`1967/98\`).

## 8 · שמות — ${pct(r.names.rate)}

כלל 7: התאמה דרך כינויים, לעולם לא בדמיון. טוקן נפתר כשהוא **שווה** לשם שהארכיון כבר
מחזיק. אין מרחק עריכה, אין כלל תחילית ואין כלל "אותו שם משפחה" בקובץ הזה.

${table([
  ['מה', 'כמה'],
  ['שערים שנשמרו', String(r.names.goalsTotal)],
  ['· המקור נקב בשם', String(r.names.named)],
  ['· המקור כתב \`?\` — כובש לא ידוע', String(r.names.unnamedInSource)],
  ['· המקור נקב בשני מועמדים (\`X או Y\`) — לא נפתר לאיש', String(r.names.disputed)],
  ['**שמות שנפתרו**', `**${r.names.resolved}**`],
  ['· מול \`player-facts.json\`', String(r.names.resolvedFromPlayerFacts)],
  ['· מול כינוי ב-\`players-roster.json\`', String(r.names.resolvedFromRoster)],
  ['שמות שלא נפתרו', String(r.names.unresolved)],
  ['**שיעור הפתרון**', `**${pct(r.names.rate)}**`],
])}

**שם משפחה לבדו אינו מספיק, וזו החלטה שנמדדה.** כלל 64 §5: מעבר שם-משפחה בלבד נמדד
ב-~50% טעויות ו**נמחק** ולא כוונן. \`מאיר/?\` הוא שם משפחה; הארכיון מחזיק \`מאיר לוי\`
וגם \`מרדכי מאיר\`, ובחירה באחד מהם היא הטלת מטבע בלבוש של פתרון. לכן טוקן שלא נפתר
נשאר **בלשון המקור** עם \`playerSlug: null\`, ונספר כאן לפי שם ותדירות — וזו הדרך שבה
מישהו מוסיף את הכינוי אחר כך, בקול, ב-\`players-roster.json\` שם הכינויים גרים.

### הטוקנים שלא נפתרו — 25 הגדולים

${table([
  ['שם כלשון המקור', 'שערים', 'משחקים'],
  ...r.names.topUnresolved.slice(0, 25).map((row) => [row.nameHe, String(row.goals), String(row.matches)]),
])}

הרשימה מסבירה את עצמה: רובה **איותים אחרים של אותו אדם**. הארכיון מחזיק
\`יצחק צ'צ'יק\` והמקור כותב \`אייזיק צ'צ'יק\`; הארכיון מחזיק \`גיל ורמוט\` והמקור כותב
\`גילי ורמוט\`; הארכיון מחזיק \`שמעון גרשון\` והמקור כותב \`שימון גרשון\`; הארכיון מחזיק
\`שייע פייגנבוים\` והמקור כותב גם \`יהושע פייגנבוים\` וגם \`שייע פייגנבויים\`. אף אחת
מההתאמות האלה לא נעשתה כאן. הן **החלטות** — כל אחת אדם שמאשר ששני האיותים הם אותו
אדם — והמקום שלהן הוא \`aliases\` ב-\`players-roster.json\`, לא ניחוש בפרסר.

## 9 · מה הקובץ מחזיק

\`content/manual/match-scorers.json\`, בסגנון הבית של \`player-facts.json\`:
\`note\` · \`sport\` · \`confidence\` · \`generator\` · \`sources\` · \`records\` ·
\`conflicts\` · \`unknown\` · \`refused\`.

רשומה אחת למשחק, ובתוכה \`goals[]\`. כל שדה שהמקור לא כתב הוא \`null\` ולא ברירת מחדל:
דקה שלא נכתבה היא \`null\`, כובש שנכתב \`?\` הוא \`null\`, ו-\`neutralGround\` הוא
\`null\` איפה ש-\`homegame\` לא היה \`1\`, \`0\` או \`x\`.

הסתירות יושבות **בקובץ הזה** ולא ב-\`fact-conflicts.json\`: שתי הטענות מגיעות מ**אותה
שורה** של אותו מקור, ולכן הסתירה היא תכונה של ההחזקה ונוסעת איתה.

## 10 · הרצה חוזרת

\`npm run ingest:scorers\` בונה את שני הקבצים מחדש במלואם מהקובץ הגולמי. אין רשת, אין
מצב שנשמר בין הרצות, ואין שורה שנכתבת פעמיים — ולכן הרצה שנייה מייצרת בדיוק את אותם
בייטים.

## 11 · מה לא הוכרע כאן

${r.notes.map((line) => `* ${line}`).join('\n')}
`
}

main()
