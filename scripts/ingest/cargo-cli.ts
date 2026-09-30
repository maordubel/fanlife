/**
 * `npm run wiki:cargo -- <export.json> [--seasons a,b] [--write-ids]`
 *
 * Reads a `Special:CargoExport` file into canonical rows. No network, no database.
 * Minting canonical match ids is opt-in because minting is one-way (rule 35).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { IngestReport } from './lib/report'
import {
  MATCH_ID_REGISTRY,
  loadRegistry,
  mintMatchId,
  saveRegistry,
} from './lib/matchIds'
import { cargoToStaged, readCargoFile, resolverFromRecords } from './sources/redfans-cargo'
import type { MatchNaturalKey } from '@/lib/canon/matchId'

const OUT = 'data/canon'

function flag(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  if (found) return found.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index !== -1 ? (process.argv[index + 1] ?? null) : null
}

function main(): void {
  // A flag's VALUE is not a file. `--seasons 1980/81,…` put the seasons list into the
  // file list the first time this ran, and the reader tried to open it.
  const argv = process.argv.slice(2)
  const VALUED = new Set(['--seasons', '--out', '--sport'])
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
    console.error('usage: npm run wiki:cargo -- <export.json> [--seasons 1980/81,1981/82]')
    process.exitCode = 1
    return
  }

  const root = resolve(process.cwd())
  const seasonsArg = flag('seasons')
  const seasons = seasonsArg ? seasonsArg.split(',').map((part) => part.trim()) : []
  const report = new IngestReport('redfans-cargo')

  const manual = JSON.parse(
    readFileSync(join(root, 'content/manual/clubs.json'), 'utf8'),
  ) as { records: Array<{ slug: string; nameHe: string; aliases?: string[]; sport?: string; isUs?: boolean }> }
  const sport = (flag('sport') ?? 'football') as 'football' | 'basketball'
  const us = manual.records.find((record) => record.isUs && record.sport === sport)

  const rows = files.flatMap((file) => readCargoFile(file))
  console.log(`rows read: ${rows.length} from ${files.length} file(s)`)

  const result = cargoToStaged(
    rows,
    {
      sport,
      seasons,
      resolveClub: resolverFromRecords(manual.records, sport),
      usClubSlug: us?.slug,
      source: {
        naturalKey: `cargo:Games@${files.join(',')}`,
        kind: 'wiki',
        title: 'ויקיפועל — Special:CargoExport, tables=Games',
        url: 'https://wiki.red-fans.com/index.php?title=Special:CargoExport',
        pageTitle: null,
        revisionId: null,
        retrievedAt: new Date().toISOString(),
        note: 'exported by the site owner in a browser; the wiki refuses automated reads',
      },
    },
    report,
  )

  console.log(
    `matches: ${result.matches.length} · goals: ${result.matchEvents.length}` +
      ` · clubs new: ${result.clubs.length} · competitions: ${result.competitions.length}` +
      ` · seasons: ${result.seasons.length}`,
  )

  const bySeason = new Map<string, number>()
  for (const match of result.matches) {
    bySeason.set(match.seasonLabel, (bySeason.get(match.seasonLabel) ?? 0) + 1)
  }
  if (bySeason.size <= 12) {
    for (const [label, count] of [...bySeason].sort()) console.log(`  ${label}: ${count}`)
  }

  if (result.unmappedCompetitions.length > 0) {
    console.log(`competitions with no type mapping: ${result.unmappedCompetitions.join(' · ')}`)
  }
  if (result.unknownClubs.length > 0) {
    console.log(
      `clubs not in the manual file (${result.unknownClubs.length}): ${result.unknownClubs
        .slice(0, 20)
        .join(' · ')}${result.unknownClubs.length > 20 ? ' …' : ''}`,
    )
  }

  const registry = loadRegistry(root)
  const before = registry.length
  const ids = new Map<string, string>()
  for (const key of result.keys as MatchNaturalKey[]) {
    const { id } = mintMatchId(registry, key, sport)
    ids.set(key, id)
  }
  const minted = registry.length - before

  if (process.argv.includes('--write-ids')) {
    saveRegistry(root, registry)
    console.log(`${minted} ids minted into ${MATCH_ID_REGISTRY}`)
  } else {
    console.log(`${minted} ids WOULD be minted — re-run with --write-ids to commit`)
  }

  const outDir = join(root, flag('out') ?? OUT)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(
    join(outDir, `cargo-canon-${sport}.json`),
    JSON.stringify({ ...result, ids: Object.fromEntries(ids) }, null, 2),
    'utf8',
  )
  writeFileSync(join(outDir, `cargo-report-${sport}.md`), report.toMarkdown(), 'utf8')
  console.log(`\nwritten to ${flag('out') ?? OUT}/`)
  console.log(
    `skipped: ${report.skipped.length} · rejected: ${report.rejected.length}` +
      ` · notes: ${report.notes.length}`,
  )
  for (const note of report.notes.slice(0, 6)) console.log(`  note: ${note}`)
  for (const entry of report.skipped.slice(0, 6)) {
    console.log(`  skipped ${entry.entity} ${entry.key}: ${entry.reason}`)
  }
}

main()
