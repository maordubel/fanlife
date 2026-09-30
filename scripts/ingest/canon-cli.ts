/**
 * npm run wiki:canon — turn a corpus already on disk into canonical rows.
 *
 * Reads `data/wiki-corpus/pages/*.json`, routes every page to its parser, and writes a
 * staged bundle plus a coverage report. **It never touches the network**, so it can be
 * re-run after any parser change for free.
 *
 * ```
 * npm run wiki:canon                                  # every season in the corpus
 * npm run wiki:canon -- --seasons 1980/81,1981/82,1982/83
 * npm run wiki:canon -- --out data/canon             # where the bundle lands
 * npm run wiki:canon -- --write-ids                  # persist newly minted match ids
 * ```
 *
 * `--write-ids` is opt-in on purpose. Minting an id is a one-way act: once a life stores
 * `m_9f2c0a41b7d3`, that id has to keep meaning the same match forever. A dry run shows
 * what WOULD be minted; only an explicit flag commits it.
 *
 * ## `--manual` — the curated archive (21.9.2026, `npm run canon:ids`)
 *
 * ```
 * npm run canon:ids                    # dry run: what would be minted, what does not resolve
 * npm run canon:ids -- --write-ids     # mint and write match-ids.json + player-ids.json
 * ```
 *
 * The corpus above is not shipped; the archive every gate reads is `content/manual/`.
 * This mode mints from THAT: one `m_…` per match in `matches.json` and
 * `basketball-matches.json` (with every other key dialect a file uses attached), and one
 * `p_…` per football person in `people.json` ∪ `players-roster.json` after the reviewed
 * merges in `player-aliases.json`. Maor approved the first mint on 21.9.2026. Re-running
 * over the written registries changes nothing (`tests/match-ids.test.ts`).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { canonFromCorpus, readCorpus } from './sources/redfans-canon'
import { loadRegistry, saveRegistry } from './lib/matchIds'
import { planMatchRegistry } from './lib/manualMatchIds'
import {
  loadPlayerRegistry,
  mintPlayerIds,
  planPersons,
  savePlayerRegistry,
} from './lib/playerIds'

function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`)
  return at === -1 ? undefined : process.argv[at + 1]
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`)
}

/** `--manual`: mint over `content/manual/` — see the header. */
function manualMain(root: string): void {
  const write = has('write-ids')
  const on = flag('minted-on') ?? new Date().toISOString().slice(0, 10)

  const matchPlan = planMatchRegistry(root, loadRegistry(root), on)
  const bySport = matchPlan.records.reduce<Record<string, number>>((acc, row) => {
    acc[row.sport] = (acc[row.sport] ?? 0) + 1
    return acc
  }, {})
  const dialects = matchPlan.records.reduce<Record<string, number>>((acc, row) => {
    for (const d of row.dialects ?? []) acc[d.dialect] = (acc[d.dialect] ?? 0) + 1
    return acc
  }, {})
  console.log(
    `matches: ${matchPlan.records.length} ids (${Object.entries(bySport).map(([k, n]) => `${k} ${n}`).join(' · ')})` +
      ` · ${matchPlan.minted} new · ${matchPlan.dialectsAdded} dialect keys added`,
  )
  console.log(`  dialects: ${Object.entries(dialects).map(([k, n]) => `${k}=${n}`).join(' · ')}`)
  const unresolved = matchPlan.unresolvedDialects.reduce<Record<string, number>>((acc, row) => {
    acc[`${row.dialect}: ${row.reason}`] = (acc[`${row.dialect}: ${row.reason}`] ?? 0) + 1
    return acc
  }, {})
  for (const [reason, n] of Object.entries(unresolved)) console.log(`  unresolved ${n} · ${reason}`)
  for (const pair of matchPlan.suspectedDuplicates) console.log(`  SUSPECTED DUPLICATE (not merged): ${pair.a}  ⟷  ${pair.b} — ${pair.why}`)

  const playerPlan = planPersons(root)
  const players = mintPlayerIds(loadPlayerRegistry(root), playerPlan.persons, on)
  console.log(
    `players: ${players.records.length} ids · ${players.minted} new · ${players.grown} grew aliases` +
      ` · ${playerPlan.excluded.length} excluded (rule 14/17)`,
  )
  for (const problem of playerPlan.problems) console.log(`  PROBLEM: ${problem}`)

  if (playerPlan.problems.length > 0) {
    console.error('refusing to write: the reviewed aliases name slugs the archive does not hold')
    process.exitCode = 1
    return
  }
  if (write) {
    saveRegistry(root, matchPlan.records)
    savePlayerRegistry(root, players.records)
    console.log('registries written · content/manual/match-ids.json · content/manual/player-ids.json')
  } else if (matchPlan.minted + matchPlan.dialectsAdded + players.minted + players.grown > 0) {
    console.log('dry run — re-run with --write-ids to commit (one-way: an id is never re-minted)')
  } else {
    console.log('registries are current — nothing to write')
  }
}

async function main(): Promise<void> {
  const root = process.cwd()
  if (has('manual')) {
    manualMain(root)
    return
  }
  const out = flag('out') ?? 'data/canon'
  const seasons = (flag('seasons') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  const pages = readCorpus(root)
  if (pages.length === 0) {
    console.error(
      'No corpus on disk. Fetch it first:\n' +
        '  npm run wiki:corpus -- --dry-run\n' +
        'Nothing was written.',
    )
    process.exitCode = 1
    return
  }

  const registry = loadRegistry(root)
  const result = canonFromCorpus(pages, { seasons, root, registry })

  const dir = join(root, out)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'bundle.json'),
    `${JSON.stringify(result.bundle, null, 2)}\n`,
    'utf8',
  )
  writeFileSync(
    join(dir, 'match-ids.json'),
    `${JSON.stringify(Object.fromEntries(result.matchIds), null, 2)}\n`,
    'utf8',
  )
  writeFileSync(join(dir, 'report.md'), result.report.toMarkdown(), 'utf8')

  if (has('write-ids')) {
    saveRegistry(root, result.registry)
    console.log(`registry written · ${result.minted} newly minted`)
  } else if (result.minted > 0) {
    console.log(`${result.minted} ids WOULD be minted — re-run with --write-ids to commit`)
  }

  console.log(
    [
      `corpus pages read: ${pages.length}`,
      `shapes: ${Object.entries(result.shapes)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}=${n}`)
        .join(' · ')}`,
      `matches: ${result.bundle.matches.length}`,
      `goals: ${result.bundle.matchEvents.length}`,
      `squad rows: ${result.bundle.squadMemberships.length}`,
      `people: ${result.bundle.people.length}`,
      `seasons: ${result.bundle.seasons.length}`,
      `skipped: ${result.report.skipped.length} · rejected: ${result.report.rejected.length}`,
      `written to ${out}/`,
    ].join('\n'),
  )
}

void main()
