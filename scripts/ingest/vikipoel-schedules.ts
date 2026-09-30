/**
 * `npm run ingest:vikipoel-schedules` — the ויקיפועל season schedules (delta 89, 25.9.2026).
 *
 * The 99 pages of `קטגוריה:לוחות משחקים (כדורגל)` (1927/28–2026/27) hold no fixture rows of
 * their own: each season page links to its league / cup / friendly pages, and those render
 * `{{שליפת לוח משחקים פשוטה}}` — a Cargo query over the `Games` table (read in the owner's
 * browser, 25.9.2026). So the schedules ARE the `Games` table, and the repo already holds
 * that table byte for byte in `content/raw/vikipoel-games.json` (17.9.2026). What the
 * schedules show and the archive did not carry is exactly what `vikipoel-cargo.ts` skipped:
 * the two seasons whose LABEL the archive could not hold — `1955` (28 rows) and `1966-68`
 * (68 rows) — rule 11 recorded them and asked for a human decision. This file is that
 * decision, and the rows it unblocks.
 *
 * **The season labels, decided (DATA agent, delta 89, at the owner's request):**
 *   · `1955` → `1954/55`. The rows run 5.2–15.10.1955, between the archive's 1953/54
 *     (ends 29.5.1954) and 1955/56 (starts 3.12.1955); it is the season the IFA and
 *     Wikipedia call 1954–55. No row of the archive carries that label, so nothing collides.
 *   · `1966-68` → split at 1.8.1967: `1966/67` before, `1967/68` from. The league ran one
 *     double season (60 rounds); the archive's label is one year boundary by construction,
 *     and the Asian final of 19.12.1967 already sits in 1967/68. Every row keeps the wiki's
 *     own label in `sourceSeasonLabel`, so the double season is never lost.
 *
 * NO NETWORK. Deterministic over files. A row whose date already holds a Hapoel match in
 * `matches.json` is a second reading, not a new match: it is compared, never emitted
 * (the 1967 Asian final). Opponents resolve through `clubs.json` aliases only (rule 7);
 * the one name nothing resolves — `ס.כ נס ציונה` — is a new club row, confidence 1, not
 * a merge into מכבי / סקציה נס ציונה.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  cleanText,
  decodeEntities,
  parseFootballMatches,
  readGamesFile,
  type VikipoelGameRow,
} from '@/scripts/ingest/sources/vikipoel-cargo'
import { byCodePoint } from '@/scripts/ingest/lib/playerIds'

export const SCHEDULES_FILE = 'content/manual/matches-vikipoel-2026-09-25.json'
export const SCHEDULES_SOURCE_TITLE = 'ויקיפועל — לוחות המשחקים (כדורגל), עמוד הנתונים של העונה (טבלת Games), נקרא 17.9.2026, קטלוג נבדק 25.9.2026'
const WIKI = 'https://wiki.red-fans.com/index.php?title='
const US = 'הפועל-תל-אביב'

const ROOT = process.cwd()
const read = (file: string): any => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))

/** The label decision, stated once. */
export function decidedSeason(row: VikipoelGameRow): string | null {
  const raw = String(row.ona ?? '')
  if (raw === '1955') return '1954/55'
  if (raw === '1966-68') {
    const date = `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
    return date < '1967-08-01' ? '1966/67' : '1967/68'
  }
  return null
}

type Goal = { nameHe: string | null; minute: number | null; stoppage: number | null; penalty: boolean; ownGoal: boolean; confidence: number; sourceUrl: string }

export function buildSchedules() {
  const games = readGamesFile(join(ROOT, 'content/raw/vikipoel-games.json'))
  const football = games.filter((row) => row.department === 'כדורגל' && decidedSeason(row) !== null)
  const clubs = read('content/manual/clubs.json').records
  const competitions = read('content/manual/competitions.json').records
  const curated = read('content/manual/matches.json').records as Record<string, any>[]
  const ourDates = new Map<string, Record<string, any>[]>()
  for (const row of curated) {
    if (!row.playedOn || (row.homeClubSlug !== US && row.awayClubSlug !== US)) continue
    ourDates.set(row.playedOn, [...(ourDates.get(row.playedOn) ?? []), row])
  }

  const relabelled = football.map((row) => ({ ...row, ona: decidedSeason(row) as string }))
  const parsed = parseFootballMatches({ games: relabelled, clubs, competitions, curated: [] })

  // the scorer lines (`comments`) the scorer pass parsed and could not key, for these seasons
  const scorerDoc = read('content/manual/match-scorers.json')
  const scorerRows = (scorerDoc.records as Record<string, any>[]).filter((r) => ['1955', '1966-68'].includes(String(r.seasonRaw)))

  const pageOf = new Map<string, string>()
  for (const row of football) {
    const d = `${row.year}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`
    pageOf.set(`${d}|${cleanText(row.stage) ?? ''}`, decodeEntities(String(row.page ?? '')))
  }

  const records: Record<string, any>[] = []
  const secondReadings: Record<string, any>[] = []
  for (const m of parsed.matches) {
    const page = pageOf.get(`${m.playedOn}|${m.stage ?? ''}`) ?? null
    const sourceUrl = page ? `${WIKI}${encodeURIComponent(page.replace(/ /g, '_'))}` : 'https://wiki.red-fans.com/index.php?title=Special:CargoTables/Games'
    const existing = m.playedOn ? (ourDates.get(m.playedOn) ?? []) : []
    if (existing.length) {
      const e = existing[0] as Record<string, any>
      const ours = (h: number | null, a: number | null, home: string) => (home === US ? [h, a] : [a, h])
      const [f1, a1] = ours(m.homeScore, m.awayScore, m.homeClubSlug)
      const [f2, a2] = ours(e.homeScore, e.awayScore, e.homeClubSlug)
      secondReadings.push({
        playedOn: m.playedOn,
        wiki: `${m.homeClubSlug} ${m.homeScore}:${m.awayScore} ${m.awayClubSlug} (${m.competitionSlug})`,
        archive: `${e.homeClubSlug} ${e.homeScore}:${e.awayScore} ${e.awayClubSlug} (${e.competitionSlug})`,
        agrees: f1 === f2 && a1 === a2,
        sourceUrl,
      })
      continue
    }
    const hk = m.homeClubSlug
    const scorer = scorerRows.find(
      (r) => r.playedOn === m.playedOn && (r.stage ?? null) === (m.stage ?? null),
    )
    const goals: Goal[] = scorer
      ? (scorer.goals as Record<string, any>[]).map((g) => ({
          nameHe: g.scorerNameHe ?? null,
          minute: g.minute ?? null,
          stoppage: g.stoppage ?? null,
          penalty: g.penalty === true,
          ownGoal: g.ownGoal === true,
          confidence: typeof scorer.confidence === 'number' ? scorer.confidence : 1,
          sourceUrl,
        }))
      : []
    const sourceSeasonLabel = football.find(
      (r) => `${r.year}-${String(r.month).padStart(2, '0')}-${String(r.day).padStart(2, '0')}` === m.playedOn && (cleanText(r.stage) ?? '') === (m.stage ?? ''),
    )?.ona
    records.push({
      seasonLabel: m.seasonLabel,
      sourceSeasonLabel: String(sourceSeasonLabel ?? ''),
      competitionSlug: m.competitionSlug,
      stage: m.stage,
      playedOn: m.playedOn,
      homeClubSlug: hk,
      awayClubSlug: m.awayClubSlug,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      venueSlug: null,
      ...(m.neutralGround !== undefined ? { neutralGround: m.neutralGround } : {}),
      status: m.status,
      confidence: m.confidence,
      sourcePage: page,
      sourceRevision: null,
      sourceUrl,
      sourceTitle: SCHEDULES_SOURCE_TITLE,
      ...(goals.length ? { scorers: goals, scorersAgreeWithScore: scorer?.agreesWithScore === true } : {}),
    })
  }
  records.sort((a, b) => byCodePoint(a.playedOn ?? '', b.playedOn ?? '') || byCodePoint(a.stage ?? '', b.stage ?? ''))

  return {
    note:
      'ויקיפועל — לוחות המשחקים, העונות שהארכיון לא החזיק (1955 → 1954/55; 1966-68 → 1966/67 + 1967/68, מפוצל ב-1.8.1967). ' +
      'מקור יחיד (ויקיפועל) → confidence 2 לשורה שלמה, 1 לשורה חסרה (כמו טבלת Games ב-matches.json). ' +
      'נקרא ע"י keyedMatches ומוזן ל-Match Master; מזהי m_ נמשכים ב-canon:ids. יריבה נפתרת רק דרך clubs.json. ' +
      'sourceRevision=null: ה-API של הוויקי חסם את הקריאה החיה ב-25.9.2026 (אימות Cloudflare) אחרי קריאת הקטלוג — הנתון הוא הייצוא מ-17.9.2026. ' +
      'נבנה ע"י npm run ingest:vikipoel-schedules — לא לערוך ידנית.',
    confidence: 2,
    source: { kind: 'wiki', title: SCHEDULES_SOURCE_TITLE, url: 'https://wiki.red-fans.com/index.php?title=%D7%A7%D7%98%D7%92%D7%95%D7%A8%D7%99%D7%94:%D7%9C%D7%95%D7%97%D7%95%D7%AA_%D7%9E%D7%A9%D7%97%D7%A7%D7%99%D7%9D_(%D7%9B%D7%93%D7%95%D7%A8%D7%92%D7%9C)' },
    seasonLabelDecisions: [
      { sourceSeasonLabel: '1955', seasonLabel: '1954/55', rows: football.filter((r) => String(r.ona) === '1955').length, why: '5.2–15.10.1955, בין 1953/54 (עד 29.5.1954) ל-1955/56 (מ-3.12.1955) — עונת 1954–55 של ההתאחדות' },
      { sourceSeasonLabel: '1966-68', seasonLabel: '1966/67 | 1967/68', rows: football.filter((r) => String(r.ona) === '1966-68').length, why: 'עונה כפולה אחת (60 מחזורים); הארכיון מחזיק גבול שנה אחד, ולכן מפוצל ב-1.8.1967. התווית המקורית נשמרת ב-sourceSeasonLabel' },
    ],
    // clubs this ingest needed: minted now (not yet in clubs.json), or added to clubs.json for it (delta 89)
    clubsForThisIngest: [
      ...parsed.mintedClubs.map((c) => ({ slug: c.slug, nameHe: c.nameHe, inClubsJson: false })),
      ...(clubs as Record<string, any>[])
        .filter((c) => String(c.sourceTitle ?? '').includes('delta 89'))
        .map((c) => ({ slug: c.slug as string, nameHe: c.nameHe as string, inClubsJson: true })),
    ].map((c) => ({ ...c, rows: records.filter((r) => r.homeClubSlug === c.slug || r.awayClubSlug === c.slug).length })),
    secondReadings,
    counts: {
      rowsRead: football.length,
      newMatches: records.length,
      secondReadings: secondReadings.length,
      disagreements: secondReadings.filter((r) => !r.agrees).length,
      scorerListsAdded: records.filter((r) => Array.isArray(r.scorers)).length,
    },
    records,
  }
}

if (process.argv[1]?.endsWith('vikipoel-schedules.ts')) {
  const out = buildSchedules()
  writeFileSync(join(ROOT, SCHEDULES_FILE), `${JSON.stringify(out, null, 1)}\n`)
  console.log(JSON.stringify(out.counts), JSON.stringify(out.clubsForThisIngest), JSON.stringify(out.secondReadings))
}
