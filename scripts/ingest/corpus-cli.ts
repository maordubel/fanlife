/**
 * ויקיפועל — the corpus importer's own entry point.
 *
 *   npm run wiki:corpus -- --dry-run                 # everything, to disk, no database
 *   npm run wiki:corpus -- --namespaces 0            # articles only
 *   npm run wiki:corpus -- --limit 40 --dry-run      # smoke test
 *   npm run wiki:corpus                              # everything, into Supabase
 *   npm run wiki:corpus -- --dump export.xml         # from Special:Export, no network
 *   npm run wiki:corpus -- --fresh                   # ignore the checkpoint
 *
 * Separate from `ingest.ts` on purpose. That CLI runs the parse pipeline that turns
 * pages into facts; this one only gets the pages in, completely and repeatably. Mixing
 * them would mean a parser change re-crawls the wiki, which is the thing the raw store
 * exists to prevent.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createLoaderClient } from './load/supabase'
import { fileCorpusSink, supabaseCorpusSink } from './load/wiki-corpus'
import { adapterFromEnv } from './sources/wiki'
import {
  clearCheckpoint,
  importCorpus,
  importFromDump,
  type CorpusResult,
} from './sources/wiki-corpus'

const REPORT_DIR = 'data/reports'

type Options = {
  dryRun: boolean
  namespaces: number[]
  limit?: number
  dump?: string
  fresh: boolean
  batchSize: number
  root: string
}

function parseArgs(argv: readonly string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`)
    return index === -1 ? undefined : argv[index + 1]
  }
  const namespaces = get('namespaces')
  const limit = get('limit')
  return {
    dryRun: argv.includes('--dry-run'),
    // Empty means "ask the wiki for its namespaces and walk all of them".
    namespaces: namespaces ? namespaces.split(',').map(Number).filter(Number.isFinite) : [],
    limit: limit ? Number(limit) : undefined,
    dump: get('dump'),
    fresh: argv.includes('--fresh'),
    batchSize: Number(get('batch') ?? 20),
    root: get('root') ?? process.cwd(),
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const baseUrl = process.env.WIKI_BASE_URL ?? 'https://wiki.red-fans.com'
  const host = new URL(baseUrl).host

  if (options.fresh) clearCheckpoint(options.root)

  const sink = options.dryRun
    ? fileCorpusSink(options.root, host)
    : supabaseCorpusSink(createLoaderClient(), host)

  const log = (line: string): void => {
    process.stdout.write(`${new Date().toISOString().slice(11, 19)}  ${line}\n`)
  }

  let result: CorpusResult
  if (options.dump) {
    result = await importFromDump(options.dump, sink, baseUrl, log)
  } else {
    result = await importCorpus({
      adapter: adapterFromEnv({ onProgress: log }),
      sink,
      namespaces: options.namespaces,
      batchSize: options.batchSize,
      root: options.root,
      resume: !options.fresh,
      limit: options.limit,
      log,
    })
  }

  mkdirSync(join(options.root, REPORT_DIR), { recursive: true })
  const stamp = result.finishedAt.replace(/[:.]/g, '-')
  writeFileSync(
    join(options.root, REPORT_DIR, `wiki-corpus-${stamp}.json`),
    JSON.stringify(result, null, 2),
    'utf8',
  )

  // A run that failed pages is not a successful run, whatever it imported.
  if (result.failed > 0) {
    process.stdout.write(`status: NEEDS REVIEW — ${result.failed} pages failed\n`)
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`)
  process.exitCode = 1
})
