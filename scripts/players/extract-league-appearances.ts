/**
 * npm run players:league-appearances — reads ויקיפועל's page "רשימת הופעות" (a table of every man who
 * wore the red shirt in the LEAGUE, accurate to the end of 2016/17; content/raw/vikipoel-league-appearances-1.txt,
 * copied from the page through the owner's own browser, 29.9.2026) and writes
 * content/manual/player-league-appearances.json.
 *
 * What this is and is not (rule 11):
 *  · league games in every league, up to 2016/17 — NOT a career total and NOT the infobox `הופעות`
 *    (`player-appearances.json`, a different claim on a different page). Both are kept, each under its own name.
 *  · a row resolves to a player through the alias table only (rule 7). A name that resolves to nobody, or whose
 *    debut year sits outside the man's documented years, is reported and gets NO row.
 */
import Module from 'node:module'
import { join } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'

type Resolver = (request: string, ...rest: unknown[]) => string
const loader = Module as unknown as { _resolveFilename: Resolver }
const resolve = loader._resolveFilename
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'server-only') return join(process.cwd(), 'tests/stubs/server-only.ts')
  return resolve.call(this, request, ...rest)
}

const ROOT = process.cwd()
const LINE = /^(.*?) ((?:בלם|מגן|קשר|חלוץ|שוער|התקפה|הגנה|קישור)(?: \/ (?:בלם|מגן|קשר|חלוץ))*) (\d\d)\/(\d\d)\/(\d+) (\d+)(?: (.*))?$/

const clean = (s: string) => s.replace(/[’‘]/g, "'").replace(/[”“]/g, '"').replace(/\s+/g, ' ').trim()

async function main() {
  const { resolvePlayer } = await import('../../lib/archive/player-master')
  const lines = readFileSync(join(ROOT, 'content/raw/vikipoel-league-appearances-1.txt'), 'utf8').split('\n').filter((l) => l.trim())
  const mapFile = JSON.parse(readFileSync(join(ROOT, 'content/manual/league-table-name-map.json'), 'utf8')) as {
    maps: Array<{ name: string; pageTitle: string; debutYear?: number; position?: string }>
    notThisPlayer: Array<{ name: string; debutYear?: number }>
  }
  const nameMap = mapFile.maps
  const skipFor = mapFile.notThisPlayer
  const records: Array<Record<string, unknown>> = []
  const unmatched: Array<{ name: string; games: number; debut: string }> = []
  const rejected: Array<{ name: string; reason: string }> = []
  const seen = new Map<string, string>()
  for (const line of lines) {
    const m = line.match(LINE)
    if (!m) { rejected.push({ name: line, reason: 'unparseable line' }); continue }
    const name = clean(m[1]!)
    const games = Number(m[6])
    const debutYear = Number(m[5])
    const debut = `${m[5]}-${m[4]}-${m[3]}`
    if (skipFor.some((n) => n.name === name && (n.debutYear === undefined || n.debutYear === debutYear))) { unmatched.push({ name, games, debut }); continue }
    // reviewed spelling map first (content/manual/league-table-name-map.json), then the alias table
    const mapped = nameMap.find((e) => e.name === name && (e.debutYear === undefined || e.debutYear === debutYear) && (e.position === undefined || e.position === m[2]))
    // candidates: as written, without a parenthesised nickname, and with the nickname's parentheses removed
    const candidates = [...(mapped ? [mapped.pageTitle] : []), name, name.replace(/\s*\([^)]*\)/g, '').trim(), name.replace(/[()]/g, '').trim()]
    let player = null
    for (const c of candidates) { player = resolvePlayer(c); if (player) break }
    if (!player) { unmatched.push({ name, games, debut }); continue }
    const from = player.years?.from ?? null
    const to = player.years?.to ?? null
    // the debut must not contradict the documented years (a typo like 12/10/146 has no year to check)
    let debutNote: string | null = null
    if (debutYear >= 1920 && from !== null && (debutYear < from - 9 || (to !== null && debutYear > to + 1))) {
      rejected.push({ name, reason: `debut ${debutYear} outside documented years ${from}–${to}` })
      continue
    }
    if (debutYear < 1920) debutNote = 'debut year unreadable in the source'
    if (seen.has(player.id)) { rejected.push({ name, reason: `second row for ${player.slug} (first: ${seen.get(player.id)})` }); continue }
    seen.set(player.id, name)
    records.push({
      playerId: player.id,
      slug: player.slug,
      leagueAppearances: games,
      leagueGoals: m[7] && /^\d+/.test(m[7]) ? Number(m[7]!.match(/^\d+/)![0]) : null,
      debutDate: debutYear >= 1920 ? debut : null,
      debutNote,
      positionRaw: m[2],
      nameOnPage: name,
    })
  }
  records.sort((a, b) => String(a.slug).localeCompare(String(b.slug)))
  writeFileSync(
    join(ROOT, 'content/manual/player-league-appearances.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        source: 'ויקיפועל — הדף "רשימת הופעות": הופעות ושערי ליגה בכל הליגות, מדויק עד תום עונת 2016/17',
        note: 'הופעות ליגה עד 2016/17 בלבד — לא סך קריירה ולא השדה "הופעות" בתיבת המידע. שם שלא נפתר, או בכורה מחוץ לשנות השחקן, אינו כאן (כלל 7, כלל 11).',
        counts: { records: records.length, unmatched: unmatched.length, rejected: rejected.length },
        unmatched,
        rejected,
        records,
      },
      null,
      1,
    ) + '\n',
  )
  console.log(`league appearances: ${records.length} rows · unmatched ${unmatched.length} · rejected ${rejected.length}`)
  for (const u of unmatched) console.log(`  unmatched ${u.name} (${u.games}, ${u.debut})`)
  for (const r of rejected) console.log(`  rejected ${r.name}: ${r.reason}`)
}
void main()
