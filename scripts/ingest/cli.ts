/**
 * Ingestion CLI.
 *
 *   npm run ingest -- --source manual --dry-run
 *   npm run ingest -- --source wiki --fetch          # network, writes data/raw
 *   npm run ingest -- --source all                   # loads into Supabase
 *
 * --dry-run stages to data/staging and writes the report, and touches no database.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { IngestReport } from '@/scripts/ingest/lib/report'
import { concatBundles, runPipeline } from './pipeline'
import { loadManualBundle } from './sources/manual'
import { adapterFromEnv, fetchScope, parseRawPages, readRawPages } from './sources/wiki'
import { createLoaderClient, loadBundle } from './load/supabase'
import { emptyBundle, type StagedBundle } from '@/scripts/ingest/lib/types'

const STAGING_DIR = 'data/staging'
const REPORT_DIR = 'data/reports'

type Options = {
  source: 'manual' | 'wiki' | 'all'
  fetch: boolean
  dryRun: boolean
  root: string
}

function parseArgs(argv: readonly string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : argv[index + 1]
  }
  const source = (get('source') ?? 'manual') as Options['source']
  if (!['manual', 'wiki', 'all'].includes(source)) {
    throw new Error(`unknown --source ${source}`)
  }
  return {
    source,
    fetch: argv.includes('--fetch'),
    dryRun: argv.includes('--dry-run'),
    root: get('root') ?? process.cwd(),
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const report = new IngestReport(`${options.source}${options.dryRun ? ' (dry-run)' : ''}`)

  const bundles: StagedBundle[] = []

  if (options.source === 'manual' || options.source === 'all') {
    bundles.push(loadManualBundle(options.root, report))
  }

  if (options.source === 'wiki' || options.source === 'all') {
    if (options.fetch) {
      try {
        const result = await fetchScope(options.root, adapterFromEnv(), report)
        report.note(`wiki fetch: ${result.fetched} pages, ${result.written} new revisions stored`)
      } catch (error) {
        // A blocked source is a documented fact, never a reason to invent data.
        report.rejected.push({
          entity: 'page',
          key: 'wiki:fetch',
          reason: error instanceof Error ? error.message : String(error),
        })
        report.note(
          'wiki fetch failed — no wiki-sourced facts in this run. Nothing was substituted.',
        )
      }
    }
    const raw = readRawPages(options.root)
    bundles.push(raw.length > 0 ? parseRawPages(raw, report) : emptyBundle())
    if (raw.length === 0) report.note('no raw wiki pages on disk — run with --fetch first')
  }

  const { bundle, aliases } = runPipeline(concatBundles(bundles), report)

  mkdirSync(join(options.root, STAGING_DIR), { recursive: true })
  mkdirSync(join(options.root, REPORT_DIR), { recursive: true })
  writeFileSync(
    join(options.root, STAGING_DIR, 'bundle.json'),
    JSON.stringify({ bundle, aliases }, null, 2),
    'utf8',
  )

  if (!options.dryRun) {
    const db = createLoaderClient()
    const counts = await loadBundle(db, bundle, aliases, report)
    report.note(`loaded into Supabase: ${JSON.stringify(counts)}`)
    await db.from('ingest_run').insert({
      kind: report.kind,
      finished_at: new Date().toISOString(),
      ok: report.ok,
      stats: report.toStats(),
      report_md: report.toMarkdown(),
    })
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = join(options.root, REPORT_DIR, `ingest-${stamp}.md`)
  writeFileSync(reportPath, report.toMarkdown(), 'utf8')
  writeFileSync(join(options.root, REPORT_DIR, 'latest.md'), report.toMarkdown(), 'utf8')

  process.stdout.write(`${JSON.stringify(report.toStats(), null, 2)}\n`)
  process.stdout.write(`report: ${reportPath}\n`)

  if (!report.ok) {
    process.stdout.write('status: NEEDS REVIEW — see the report\n')
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
