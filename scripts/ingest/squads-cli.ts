/**
 * `npm run wiki:squads -- <export.xml> [...] [--seasons a,b] [--out dir]`
 *
 * Squad rows from exported player pages. No network, no database.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { parseXmlDump } from './adapters/mediawiki'
import { IngestReport } from './lib/report'
import { squadsFromPlayerPages } from './sources/redfans-squads'

const BASE = process.env.WIKI_BASE_URL ?? 'https://wiki.red-fans.com'
const VALUED = new Set(['--seasons', '--out', '--club'])

function flag(name: string): string | null {
  const withEquals = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (withEquals) return withEquals.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 ? (process.argv[index + 1] ?? null) : null
}

function main(): void {
  const argv = process.argv.slice(2)
  const files: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    if (arg.startsWith('--')) {
      if (VALUED.has(arg) && !arg.includes('=')) index += 1
      continue
    }
    files.push(arg)
  }
  if (files.length === 0) {
    console.error('usage: npm run wiki:squads -- <export.xml> [--seasons 1980/81,1981/82]')
    process.exitCode = 1
    return
  }

  const root = resolve(process.cwd())
  const seasonsArg = flag('seasons')
  const seasons = seasonsArg ? seasonsArg.split(',').map((part) => part.trim()) : undefined
  const report = new IngestReport('redfans-squads')

  // A player exported in three files is one player. Dedupe by title before reading, so
  // the counts describe the wiki rather than how many times a page was downloaded.
  const byTitle = new Map(
    files
      .flatMap((file) => parseXmlDump(readFileSync(file, 'utf8'), BASE))
      .map((page) => [page.title, page] as const),
  )

  const result = squadsFromPlayerPages(
    [...byTitle.values()],
    { sport: 'football', clubSlug: flag('club') ?? 'הפועל-תל-אביב', seasons },
    report,
  )

  console.log(`pages: ${byTitle.size} (from ${files.length} file(s))`)
  console.log(
    `people: ${result.people.length} · memberships: ${result.memberships.length}` +
      ` · shirt numbers: ${result.shirtNumbers.length}`,
  )
  const bySeason = new Map<string, number>()
  for (const entry of result.memberships) {
    bySeason.set(entry.seasonLabel, (bySeason.get(entry.seasonLabel) ?? 0) + 1)
  }
  for (const [label, count] of [...bySeason].sort()) console.log(`  ${label}: ${count} players`)
  console.log(
    `with a birth date: ${result.people.filter((person) => person.birthDate).length}/${result.people.length}`,
  )
  console.log(`skipped: ${report.skipped.length} · rejected: ${report.rejected.length}`)
  for (const entry of report.skipped.slice(0, 8)) {
    console.log(`  skipped ${entry.entity} ${entry.key}: ${entry.reason}`)
  }

  const outDir = join(root, flag('out') ?? 'data/canon')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'squads.json'), JSON.stringify(result, null, 2), 'utf8')
  writeFileSync(join(outDir, 'squads-report.md'), report.toMarkdown(), 'utf8')
  console.log(`\nwritten to ${flag('out') ?? 'data/canon'}/`)
}

main()
