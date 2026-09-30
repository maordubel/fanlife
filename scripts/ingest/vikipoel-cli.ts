/**
 * `npm run ingest:vikipoel`
 *
 * Regenerates the canonical files from the three raw ויקיפועל exports in `content/raw/`.
 * NO NETWORK (rule 36) — every byte this reads is already in the repository, which is
 * what makes the run repeatable and the report checkable.
 *
 * What it writes:
 *   content/manual/matches.json         curated rows first, then the wiki rows
 *   content/manual/squads.json          curated rows first, then the parsed memberships
 *   content/manual/clubs.json           existing rows untouched, new ones appended
 *   content/manual/competitions.json    existing rows untouched, new ones appended
 *   content/manual/fact-conflicts.json  existing rows untouched, new ones appended
 *   docs/11-vikipoel-ingest.md          every number the run produced
 *
 * **Idempotency is by SOURCE TITLE, not by position.** A row this script wrote carries
 * `sourceTitle === VIKIPOEL_SOURCE_TITLE`; on a re-run every such row is discarded and
 * rebuilt, and every row that does not carry it is kept byte-for-byte. So a curated row
 * can never be overwritten by a second run, and a second run cannot double the archive.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import {
  VIKIPOEL_SOURCE_TITLE,
  VIKIPOEL_SOURCE_URL,
  VIKIPOEL_SQUADS_SOURCE_TITLE,
  VIKIPOEL_SQUADS_SOURCE_URL,
  parseFootballMatches,
  parseSquads,
  readGamesFile,
  readPlayerCategoriesFile,
  type CanonicalMatch,
  type CanonicalSquadRow,
  type FactConflict,
  type MatchIngestReport,
  type SquadIngestReport,
} from './sources/vikipoel-cargo'

type ManualFile<T> = {
  note?: string
  confidence?: number
  source?: { kind?: string; title: string; url?: string | null }
  records: T[]
  [key: string]: unknown
}

const ROOT = resolve(process.cwd())

/**
 * Each file's own indentation, read off the file.
 *
 * `content/manual` is not uniform — `matches.json` and `clubs.json` are written with one
 * space, `squads.json` and `fact-conflicts.json` with two — and re-serialising a file in
 * the other one rewrites every line it has. A 26,000-line diff is a diff nobody reads:
 * the change that actually happened disappears into the reformat. So the indent is
 * detected before the file is parsed and handed back to `JSON.stringify` unchanged.
 */
const shapeOf = new Map<string, { indent: number; trailingNewline: boolean }>()

function readManual<T>(name: string): ManualFile<T> {
  const text = readFileSync(join(ROOT, 'content/manual', name), 'utf8')
  shapeOf.set(name, {
    indent: /^\{\r?\n( +)"/.exec(text)?.[1]?.length ?? 2,
    // `player-facts.json` has no final newline. Adding one is a change to a file this
    // script had one line of business with, so it is not added.
    trailingNewline: text.endsWith('\n'),
  })
  return JSON.parse(text) as ManualFile<T>
}

function writeManual<T>(name: string, file: ManualFile<T>): void {
  const shape = shapeOf.get(name) ?? { indent: 2, trailingNewline: true }
  const body = JSON.stringify(file, null, shape.indent)
  writeFileSync(
    join(ROOT, 'content/manual', name),
    shape.trailingNewline ? `${body}\n` : body,
    'utf8',
  )
}

/**
 * A row this script wrote last time. Discarded and rebuilt; nothing else is touched.
 * Two titles because there were two reads — the Cargo table and the player pages — and
 * a squad row must cite the export that actually contains it (rule 2).
 */
const OURS = new Set<string>([VIKIPOEL_SOURCE_TITLE, VIKIPOEL_SQUADS_SOURCE_TITLE])

function isOurs(row: { sourceTitle?: string }): boolean {
  return row.sourceTitle !== undefined && OURS.has(row.sourceTitle)
}

function decade(playedOn: string | null, seasonLabel: string): string {
  const year = playedOn ? Number(playedOn.slice(0, 4)) : Number(seasonLabel.slice(0, 4))
  if (!Number.isFinite(year)) return '(לא ידוע)'
  return `${Math.floor(year / 10) * 10}s`
}

function countByDecade(rows: ReadonlyArray<CanonicalMatch>): Map<string, number> {
  const out = new Map<string, number>()
  for (const row of rows) {
    const key = decade(row.playedOn, row.seasonLabel)
    out.set(key, (out.get(key) ?? 0) + 1)
  }
  return out
}

function main(): void {
  /* ------------------------------------------------------------------ read */
  const games = readGamesFile(join(ROOT, 'content/raw/vikipoel-games.json'))
  const players = readPlayerCategoriesFile(join(ROOT, 'content/raw/vikipoel-player-categories.json'))

  const clubsFile = readManual<Record<string, unknown> & { slug: string; sourceTitle?: string }>('clubs.json')
  const competitionsFile = readManual<Record<string, unknown> & { slug: string; sourceTitle?: string }>('competitions.json')
  const matchesFile = readManual<CanonicalMatch>('matches.json')
  const squadsFile = readManual<CanonicalSquadRow & Record<string, unknown>>('squads.json')
  const conflictsFile = readManual<FactConflict & Record<string, unknown>>('fact-conflicts.json')

  // Everything that is not ours is curated, and curated rows are carried through
  // untouched. This is the single place that distinction is made.
  const curatedMatches = matchesFile.records.filter((row) => !isOurs(row))
  const curatedSquads = squadsFile.records.filter((row) => !isOurs(row))
  const curatedConflicts = conflictsFile.records.filter(
    (row) => (row as { sourceBUrl?: string }).sourceBUrl !== VIKIPOEL_SOURCE_URL,
  )
  const keptClubs = clubsFile.records.filter((row) => !isOurs(row))
  const keptCompetitions = competitionsFile.records.filter((row) => !isOurs(row))

  const beforeByDecade = countByDecade(curatedMatches)

  /* ----------------------------------------------------------------- parse */
  const matchRun = parseFootballMatches({
    games,
    clubs: keptClubs as never,
    competitions: keptCompetitions as never,
    curated: curatedMatches,
  })

  const playerFacts = readManual<{
    personNameHe: string
    position?: string | null
    nationalityHe?: string | null
    sport?: string | null
  }>('player-facts.json')

  const rosterFile = readManual<{ slug: string; fullNameHe: string; aliases?: string[] }>(
    'players-roster.json',
  )
  const peopleFile = readManual<{ slug: string; fullNameHe: string; aliases?: string[] }>(
    'people.json',
  )
  const keptRoster = rosterFile.records.filter((row) => !isOurs(row as { sourceTitle?: string }))

  const squadRun = parseSquads({
    players,
    curated: curatedSquads,
    people: [...keptRoster, ...peopleFile.records],
    playerFacts: playerFacts.records,
  })

  /* ----------------------------------------------------------------- write */
  const matches = [...curatedMatches, ...matchRun.matches]
  writeManual('matches.json', { ...matchesFile, records: matches })

  writeManual('squads.json', { ...squadsFile, records: [...curatedSquads, ...squadRun.squads] })
  // A squad row names a person, so the person has to exist. Names the roster did not
  // hold are appended to it from the same source — the file's own note already records
  // sixteen added this way on 16.9.2026 — rather than the memberships being dropped.
  writeManual('players-roster.json', {
    ...rosterFile,
    records: [...keptRoster, ...(squadRun.mintedPeople as never[])],
  })

  /**
   * `players-roster.json` and `player-facts.json` are a PAIR, and the invariant between
   * them is that every man on the roster is either covered by the facts file or named in
   * its `unknown` list — "מה שאין — מוצג" (rule 64 §6), asserted in `tests/profile.test.ts`.
   *
   * A script that grows the roster therefore has to keep that invariant, or it turns a
   * shown gap into a hidden one. A newly minted player the research pass never saw is
   * added to `unknown` by name: that is the file's own way of saying "he is on the
   * roster and no source we reached carries his position, origin or years", which is
   * true and is the opposite of guessing them.
   */
  const facts = playerFacts as unknown as { records: Array<{ personNameHe: string }>; unknown: string[] }
  const known = new Set([
    ...facts.records.map((row) => row.personNameHe),
    ...(facts.unknown ?? []),
  ])
  const newlyUnknown = squadRun.mintedPeople
    .map((person) => person.fullNameHe)
    .filter((name) => !known.has(name))
  if (newlyUnknown.length > 0) {
    writeManual('player-facts.json', {
      ...playerFacts,
      unknown: [...(facts.unknown ?? []), ...newlyUnknown],
    })
  }

  writeManual('clubs.json', { ...clubsFile, records: [...keptClubs, ...(matchRun.mintedClubs as never[])] })
  writeManual('competitions.json', {
    ...competitionsFile,
    records: [...keptCompetitions, ...(matchRun.mintedCompetitions as never[])],
  })
  writeManual('fact-conflicts.json', {
    ...conflictsFile,
    records: [...curatedConflicts, ...(matchRun.conflicts as never[])],
  })

  const afterByDecade = countByDecade(matches)
  writeFileSync(
    join(ROOT, 'docs/11-vikipoel-ingest.md'),
    renderReport({
      matchReport: matchRun.report,
      squadReport: squadRun.report,
      curatedMatches: curatedMatches.length,
      wikiMatches: matchRun.matches.length,
      curatedSquads: curatedSquads.length,
      wikiSquads: squadRun.squads.length,
      mintedClubs: matchRun.mintedClubs.length,
      mintedCompetitions: matchRun.mintedCompetitions.length,
      conflicts: matchRun.conflicts,
      clubsBefore: keptClubs.length,
      competitionsBefore: keptCompetitions.length,
      conflictsBefore: curatedConflicts.length,
      beforeByDecade,
      afterByDecade,
    }),
    'utf8',
  )

  console.log(
    `matches: ${curatedMatches.length} curated + ${matchRun.matches.length} wiki = ${matches.length}`,
  )
  console.log(
    `squads: ${curatedSquads.length} curated + ${squadRun.squads.length} wiki = ${curatedSquads.length + squadRun.squads.length}`,
  )
  console.log(`clubs minted: ${matchRun.mintedClubs.length} · competitions minted: ${matchRun.mintedCompetitions.length}`)
  console.log(`conflicts recorded: ${matchRun.conflicts.length}`)
  console.log(`skipped: ${matchRun.report.skipped.length} · undated: ${matchRun.report.undated.length}`)
  console.log('report: docs/11-vikipoel-ingest.md')
}

/* ---------------------------------------------------------------- the report */

type ReportInput = {
  matchReport: MatchIngestReport
  squadReport: SquadIngestReport
  curatedMatches: number
  wikiMatches: number
  curatedSquads: number
  wikiSquads: number
  mintedClubs: number
  mintedCompetitions: number
  conflicts: FactConflict[]
  clubsBefore: number
  competitionsBefore: number
  conflictsBefore: number
  beforeByDecade: Map<string, number>
  afterByDecade: Map<string, number>
}

function table(rows: string[][]): string {
  if (rows.length === 0) return '_(ריק)_\n'
  const head = rows[0] as string[]
  const body = rows.slice(1)
  return [
    `| ${head.join(' | ')} |`,
    `| ${head.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n')
}

function groupReasons(rows: ReadonlyArray<{ reason: string }>): string[][] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    // Row-specific numbers in brackets collapse, but a QUOTED value never does: the
    // whole use of this table is that it names `"1966-68"` rather than saying that
    // ninety-six rows failed for some reason the reader then has to go and find.
    const kind = row.reason.replace(/\((?!…)[^)]*\)/gu, '(…)')
    counts.set(kind, (counts.get(kind) ?? 0) + 1)
  }
  return [
    ['סיבה', 'שורות'],
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      // A pipe inside a cell ends the cell. The natural key is full of them.
      .map(([reason, n]) => [reason.replace(/\|/gu, '\\|'), String(n)]),
  ]
}

function renderReport(input: ReportInput): string {
  const m = input.matchReport
  const s = input.squadReport
  const decades = [...new Set([...input.beforeByDecade.keys(), ...input.afterByDecade.keys()])].sort()

  return `# 11 · קליטת ויקיפועל — טבלת Games והסגלים

נוצר על ידי \`npm run ingest:vikipoel\` (\`scripts/ingest/vikipoel-cli.ts\`), שקורא את
\`content/raw/vikipoel-games.json\` ואת \`content/raw/vikipoel-player-categories.json\`
ומייצר מחדש את הקבצים הקנוניים. **אין רשת בשום שלב** (כלל 36): שלושת הייצואים נקראו
בדפדפן של הבעלים ב-17.9.2026 ושמורים בריפו כפי שנקראו, והמעבר עליהם הוא קריאה מהדיסק.

מקור כל שורה שנכתבה כאן:

משחקים, מועדונים ומפעלים — מטבלת \`Games\`:

* \`sourceTitle\`: \`${VIKIPOEL_SOURCE_TITLE}\`
* \`sourceUrl\`: \`${VIKIPOEL_SOURCE_URL}\`

סגלים ושחקנים — מדפי השחקנים עצמם, שהם ייצוא אחר (כלל 37, וכלל 2: מקור שנקוב על שורה
חייב להיות המקור שמכיל את העובדה):

* \`sourceTitle\`: \`${VIKIPOEL_SQUADS_SOURCE_TITLE}\`
* \`sourceUrl\`: \`${VIKIPOEL_SQUADS_SOURCE_URL}\`

---

## 1 · שורות נכנסות

| מה | כמה |
| --- | --- |
| שורות בטבלת \`Games\` | ${m.rowsRead} |
${Object.entries(m.byDepartment)
  .sort((a, b) => b[1] - a[1])
  .map(([name, n]) => `| · \`department = ${name}\` | ${n} |`)
  .join('\n')}
| שורות שנכנסו להליכת הכדורגל | ${m.footballRows} |

כלל 6 וכלל 38: \`department\` **הוא** הענף, והוויקי כתב אותו בכל שורה. הכדורסל ו-\`הפועל
אוסישקין\` נספרים כאן ואינם נכנסים לשום טבלת כדורגל. אין כאן סיווג ואין ניחוש — יש סינון
על שדה שהמקור עצמו כתב.

## 2 · שורות יוצאות

| מה | כמה |
| --- | --- |
| שורות כדורגל שנקראו | ${m.footballRows} |
| נדחו לגמרי (ראו 3) | ${m.skipped.length} |
| נפלו לטובת שורה מתועדת (ראו 6) | ${m.curatedWins.length} |
| **שורות ויקי קנוניות שנכתבו** | **${input.wikiMatches}** |
| שורות מתועדות שנשמרו כפי שהיו | ${input.curatedMatches} |
| **סה"כ ב-matches.json** | **${input.curatedMatches + input.wikiMatches}** |

וודאות (כלל 2, והכלל המלא ב-\`matchConfidence\`): שורה היא **2 רק כשהיא שלמה** — תאריך
מלא, שני מועדונים, שתי תוצאות ומפעל. כל פחות מזה הוא 1.

| וודאות | שורות |
| --- | --- |
${Object.entries(m.confidenceCounts)
  .sort()
  .map(([c, n]) => `| ${c} | ${n} |`)
  .join('\n')}

מצב (\`status\`) — אוצר המילים של \`matches.json\`:

| status | שורות |
| --- | --- |
${Object.entries(m.statusCounts)
  .sort()
  .map(([c, n]) => `| ${c} | ${n} |`)
  .join('\n')}

## 3 · מה נדחה, ולמה

${table(groupReasons(m.skipped))}

## 4 · מה נשמר חלקי, ולמה

**תאריכים.** \`day\`/\`month\`/\`year\` הם מספרים שלמים ו-\`0\` פירושו "לא תועד". שורה
שאין בה שלושתם מקבלת \`playedOn: null\` ונרשמת כאן. שום יום בחודש לא נוחש.

* שורות שנקראו בלי תאריך מלא: **${m.undated.length}** (הספירה היא על הקריאה; שורה כזאת
  עדיין יכולה ליפול אחר כך לטובת שורה מתועדת או על תווית עונה)

**מגרש ניטרלי.** \`host\` ו-\`oponent\` כבר נוקבים בשני הצדדים, ולכן בית וחוץ אינם
נקבעים כברירת מחדל בשום מקום (כלל 36). \`homegame\` נקרא רק בשביל הדבר שהם אינם יכולים
לומר: \`x\`, משחק על מגרש של אף אחד מהשניים. \`1\`/\`0\` ⟹ \`neutralGround\` לא נכתב;
\`x\` ⟹ \`true\`; \`?\` או ריק ⟹ \`null\`, ונרשם.

* שורות שבהן \`homegame\` אינו קריא: **${m.groundUnrecorded.length}**

**דו־קרב פנדלים.** \`shootout\` אינו נכתב ל-\`noteHe\`: \`3:4 בפנדלים\` היא תוצאה
עם מפריד, והארכיון אוסר אותה בטקסט עברי כי בשורת RTL אי אפשר לדעת של מי כל מספר
(\`tests/seed.test.ts\`). כתיבה צמודה-לקבוצה דורשת לדעת לאיזה צד שייך ה-3, והטבלה אינה
אומרת זאת — ולכן העמודה נספרת ולא מנוחשת.

* הכרעות פנדלים שהמקור מתעד ושלא נקלטו: **${m.shootoutNotIngested}**

**עמודות שלא נקלטו בדלתא הזאת** — נאמרות, לא מושמטות בשקט (כלל 11):

${m.columnsNotIngested.map((line) => `* ${line}`).join('\n')}

## 5 · מועדונים

| מה | כמה |
| --- | --- |
| שמות מועדונים שונים בטבלה | ${m.clubsResolved.length + m.clubsMinted.length} |
| נפתרו מול \`clubs.json\` (slug · nameHe · nameEn · aliases) | ${m.clubsResolved.length} |
| **נטבעו כשורות חדשות** | **${input.mintedClubs}** |
| שורות ב-\`clubs.json\` לפני | ${input.clubsBefore} |
| שורות ב-\`clubs.json\` אחרי | ${input.clubsBefore + input.mintedClubs} |

ההתאמה היא מול כינויים בלבד (כלל 7). אין מרחק עריכה, אין "אותה מילה ראשונה", אין
הכלה. מה שלא נפתר — נטבע, ולא אוחד.

### נפתרו

${table([
  ['שם בוויקי', 'slug בארכיון', 'שורות'],
  ...m.clubsResolved.map((row) => [row.nameHe, `\`${row.slug}\``, String(row.rows)]),
])}

### נטבעו (וודאות 1)

${table([
  ['שם כפי שהוויקי כתב', 'slug', 'שורות'],
  ...m.clubsMinted.map((row) => [row.nameHe, `\`${row.slug}\``, String(row.rows)]),
])}

## 6 · מפעלים

**\`ליגה לאומית\` אינה מקופלת לתוך \`ליגת-העל\`.** אלה שתי תחרויות בשתי תקופות; מיזוגן
היה הופך את "כמה אליפויות" לשאלה שאי אפשר לענות עליה. היא נטבעת כשורה נפרדת, כמו כל
ערך \`mifal\` אחר שהקובץ לא הכיר.

${table([
  ['שם בוויקי', 'slug', 'נפתר?', 'שורות', '`liga=1` בכל שורה'],
  ...m.competitions.map((row) => [
    row.nameHe,
    `\`${row.slug}\``,
    row.resolved ? 'כן' : '**נטבע**',
    String(row.rows),
    row.leagueOnEveryRow ? 'כן' : 'לא',
  ]),
])}

* שורות ב-\`competitions.json\` לפני: ${input.competitionsBefore} · אחרי: ${input.competitionsBefore + input.mintedCompetitions}

\`type: 'league'\` נכתב רק כשדגל \`liga\` של המקור הוא \`1\` בכל שורה של אותו מפעל. סוג
של גביע לא נגזר מהשם העברי שלו, ולכן מפעל שאינו ליגה נטבע בלי \`type\`.

## 7 · שורות מתועדות מנצחות, וסתירות נרשמות

\`matches.json\` מחזיק ${input.curatedMatches} שורות שנבדקו ידנית מול מקור נקוב. שורת
ויקי שמתארת את אותו משחק **נופלת לטובתן**, ואיפה שהשתיים חלוקות — הסתירה נרשמת
ב-\`fact-conflicts.json\` ואינה מוכרעת (כלל 60 §3).

* שורות ויקי שנפלו לטובת שורה מתועדת: **${m.curatedWins.length}**
* סתירות שנרשמו: **${input.conflicts.length}**
* שורות ב-\`fact-conflicts.json\` לפני: ${input.conflictsBefore} · אחרי: ${input.conflictsBefore + input.conflicts.length}

${table([
  ['משחק', 'שדה', 'הארכיון המתועד', 'ויקיפועל'],
  ...input.conflicts.map((row) => [
    row.entityKey,
    `\`${row.field}\``,
    row.claimA.replace(/\|/gu, '\\|'),
    row.claimB.replace(/\|/gu, '\\|'),
  ]),
])}

## 8 · משחקים לפי עשור — לפני ואחרי

${table([
  ['עשור', 'לפני', 'אחרי', 'תוספת'],
  ...decades.map((d) => {
    const before = input.beforeByDecade.get(d) ?? 0
    const after = input.afterByDecade.get(d) ?? 0
    return [d, String(before), String(after), String(after - before)]
  }),
  [
    '**סה"כ**',
    `**${input.curatedMatches}**`,
    `**${input.curatedMatches + input.wikiMatches}**`,
    `**+${input.wikiMatches}**`,
  ],
])}

## 9 · סגלים

כלל 37: שורת סגל נקראת מדף **השחקן**, מהקטגוריות שלו עצמו, ולא מקובץ הקטגוריה. הענף
נמצא **בתוך** המחרוזת שנושאת את העונה (\`סגל הפועל ת"א (<ענף>) <עונה>\`), ולכן כלל 6
נאכף באותה קריאה שמוצאת את העונה.

| מה | כמה |
| --- | --- |
| דפי שחקנים שנקראו | ${s.pagesRead} |
| קטגוריות "סגל" שנמצאו | ${s.squadCategories} |
${Object.entries(s.bySport)
  .sort((a, b) => b[1] - a[1])
  .map(([name, n]) => `| · ענף \`${name}\` | ${n} |`)
  .join('\n')}
| קטגוריות כדורגל | ${s.footballCategories} |
| נדחו (תווית עונה) | ${s.skipped.length} |
| כבר קיימות כשורה מתועדת | ${s.alreadyCurated.length} |
| **שורות סגל חדשות** | **${input.wikiSquads}** |
| שחקנים שנפתרו מול \`players-roster.json\` / \`people.json\` | ${s.playersResolved} |
| **שחקנים שנטבעו כשורות רוסטר חדשות** | **${s.playersMinted.length}**${s.playersMinted.length > 0 ? ` (${s.playersMinted.map((row) => row.fullNameHe).join(', ')})` : ''} |
| שורות מתועדות שנשמרו | ${input.curatedSquads} |
| **סה"כ ב-squads.json** | **${input.curatedSquads + input.wikiSquads}** |
| עונות שונות | ${s.seasons} |
| שחקנים ש-\`player-facts.json\` מכיר בשם מדויק | ${s.playersWithFacts} |
| שחקנים שאינו מכיר | ${s.playersWithoutFacts.length}${s.playersWithoutFacts.length > 0 ? ` (${s.playersWithoutFacts.join(', ')})` : ''} |

\`shirtNumber\` נשאר \`null\` בכל שורה (כלל 37): \`מספר בהפועל\` הוא ערך אחד על דף
שמכסה עשרות עונות, וכתיבתו לכל עונה הייתה קובעת עשרות עובדות ממקור אחד.
\`nationalityHe\` הוא \`null\` בכל שורה: \`player-facts.json\` נושא \`origin\`
(\`israeli\`/\`foreign\`) ולא לאום, ולאום שנגזר מקטגוריית ייחוס הוא ניחוש.

### תוויות עונה שנדחו

${table(groupReasons(s.skipped))}

## 10 · הרצה חוזרת

הסקריפט מזהה את השורות שהוא עצמו כתב לפי \`sourceTitle\`, מוחק אותן ובונה אותן מחדש;
כל שורה אחרת נשמרת כפי שהיא. לכן הרצה שנייה אינה מכפילה דבר ואינה יכולה לדרוס שורה
מתועדת. השורות שנטבעו נושאות את שמן שלהן ב-\`aliases\`, ולכן ההרצה הבאה **פותרת** אותן
במקום לטבוע אותן שוב.

## 11 · מה לא הוכרע כאן

${m.notes.map((line) => `* ${line}`).join('\n')}
${s.notes.map((line) => `* ${line}`).join('\n')}
`
}

main()
