/**
 * `npm run wiki:import -- <file.xml> [more.xml]`
 *
 * Reads Special:Export XML into the corpus store, then prints the WANTED list — every
 * page the exported pages link to that the export did not contain. That list is the
 * input to the next export, taken from the wiki's own links rather than from a guess.
 */

import { resolve } from 'node:path'

import { fileCorpusSink } from './load/wiki-corpus'
import { importExportFiles, wantedPages } from './sources/wiki-export'
import { parseXmlDump } from './adapters/mediawiki'
import { readFileSync } from 'node:fs'

const BASE = process.env.WIKI_BASE_URL ?? 'https://wiki.red-fans.com'

async function main(): Promise<void> {
  const files = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  if (files.length === 0) {
    console.error('usage: npm run wiki:import -- <export.xml> [more.xml ...]')
    process.exitCode = 1
    return
  }

  const root = resolve(process.cwd())
  const sink = fileCorpusSink(root, BASE)
  const result = await importExportFiles(files, sink, BASE)

  console.log(`site: ${result.sitename ?? 'unknown'} (${result.generator ?? 'unknown'})`)
  console.log(`files: ${result.files.length} · pages read: ${result.pagesRead}`)
  console.log(
    `stored: inserted=${result.outcomes.inserted} updated=${result.outcomes.updated}` +
      ` unchanged=${result.outcomes.unchanged} failed=${result.outcomes.failed}`,
  )
  if (result.duplicates.length > 0) {
    console.log(`repeated titles across files: ${result.duplicates.join(' · ')}`)
  }
  if (result.empty.length > 0) {
    console.log(`empty pages stored (not skipped): ${result.empty.join(' · ')}`)
  }

  const all = files.flatMap((file) => parseXmlDump(readFileSync(file, 'utf8'), BASE))
  const wanted = wantedPages(all)
  if (wanted.length > 0) {
    console.log(`\nlinked but not exported (${wanted.length}):`)
    for (const title of wanted) console.log(`  ${title}`)
  }
}

void main()
