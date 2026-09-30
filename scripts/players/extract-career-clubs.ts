/**
 * npm run players:career-clubs — reads the `מועדונים` infobox field (the clubs a man played for, in the order
 * the page writes them) from content/raw/vikipoel-player-wikitext.json and writes
 * content/manual/player-career-clubs.json.
 *
 *  · Hapoel Tel Aviv itself is dropped; what remains is "the OTHER clubs".
 *  · a club enters only when it is in content/manual/club-name-variants.json (rule 7: no fuzzy grouping) —
 *    the rest are counted in `unreviewed` so the gap is visible, not hidden.
 *  · the player is found by the page title through the alias table.
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
const norm = (s: string) => s.replace(/[’‘״]/g, '"').replace(/[”“]/g, '"').replace(/''+/g, '').replace(/\s+/g, ' ').trim()
const HAPOEL_TA = /^הפועל ת(?:"|''|'')?א$|^הפועל תל אביב$|^הפועל ת\.א\.?$/

async function main() {
  const { resolvePlayer } = await import('../../lib/archive/player-master')
  const pages = JSON.parse(readFileSync(join(ROOT, 'content/raw/vikipoel-player-wikitext.json'), 'utf8')) as Array<{ title: string; revisions: Array<{ slots: { main: { content: string } } }> }>
  const variants = JSON.parse(readFileSync(join(ROOT, 'content/manual/club-name-variants.json'), 'utf8')) as { clubs: Array<{ nameHe: string; variants: string[] }> }
  const canon = new Map<string, string>()
  for (const c of variants.clubs) for (const v of c.variants) canon.set(norm(v), c.nameHe)
  const records: Array<{ playerId: string; slug: string; clubs: string[]; unreviewedClubs: string[] }> = []
  const unresolved: string[] = []
  const unreviewedCount = new Map<string, number>()
  const seen = new Set<string>()
  for (const page of pages) {
    const text = page.revisions[0]?.slots.main.content ?? ''
    // two spellings of the field occur across the wiki's templates: `מועדונים` and `מועדונים כשחקן`
    const m = text.match(/\n\|\s*מועדונים(?: כשחקן)?\s*=(.*?)(?=\n\|[^\n=]{1,30}=|\n\}\})/s)
    if (!m) continue
    let raw = m[1]!.trim()
    if (!raw || raw === '-') continue
    raw = raw.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
    const player = resolvePlayer(page.title)
    if (!player) { unresolved.push(page.title); continue }
    if (seen.has(player.id)) continue
    seen.add(player.id)
    const clubs: string[] = []
    const unreviewedClubs: string[] = []
    for (const part of raw.split(/[,،]/)) {
      const name = norm(part.replace(/\([^)]*\)/g, ''))
      if (!name || name === '-' || HAPOEL_TA.test(name)) continue
      const c = canon.get(name)
      if (c) { if (!clubs.includes(c)) clubs.push(c) }
      else { unreviewedClubs.push(name); unreviewedCount.set(name, (unreviewedCount.get(name) ?? 0) + 1) }
    }
    if (clubs.length || unreviewedClubs.length) records.push({ playerId: player.id, slug: player.slug, clubs, unreviewedClubs })
  }
  records.sort((a, b) => a.slug.localeCompare(b.slug))
  const top = [...unreviewedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
  writeFileSync(
    join(ROOT, 'content/manual/player-career-clubs.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        source: 'wiki.red-fans.com player pages, infobox field מועדונים (raw wikitext: content/raw/vikipoel-player-wikitext.json)',
        note: 'clubs = reviewed clubs other than Hapoel Tel Aviv, in page order. unreviewedClubs are listed but never used in the game (rule 7).',
        counts: { players: records.length, withReviewedClub: records.filter((r) => r.clubs.length).length, unresolvedPages: unresolved.length },
        topUnreviewed: top.map(([name, n]) => ({ name, n })),
        unresolved,
        records,
      },
      null,
      1,
    ) + '\n',
  )
  console.log(`career clubs: ${records.length} players · ${records.filter((r) => r.clubs.length).length} with a reviewed club · unresolved pages ${unresolved.length}`)
}
main()
