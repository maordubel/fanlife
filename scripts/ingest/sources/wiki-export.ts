/**
 * The human route into the corpus: a `Special:Export` XML file.
 *
 * Established on 2.9.2026 and it is not a fallback — it is THE route. The sandbox
 * proxy denies `wiki.red-fans.com` outright, and every automated path that does reach
 * the host is answered by Cloudflare with a JS challenge that a human passes and an
 * agent must not (rule 11). What is left is the one door MediaWiki gives every reader:
 * `Special:Export` renders a form, a person ticks a box, and the wiki hands them an XML
 * file containing the exact wikitext of the pages they asked for.
 *
 * That file is worth more than it looks. It carries page id, namespace, revision id,
 * revision timestamp and the complete unrendered source — which is every field the
 * corpus row needs, so an export lands in the SAME store, with the same idempotency on
 * the wiki's own `page_id`, as a live API walk would have. Nothing downstream can tell
 * the difference, and nothing downstream should.
 *
 * What an export cannot carry is the API's RESOLVED lists: categories, links and images
 * come from parsing the wikitext, so a category added by a template is invisible here.
 * That is a real gap and it is reported rather than hidden — `viaExport: true` on every
 * row, so a later live walk can be told apart from this.
 */

import { readFileSync } from 'node:fs'

import { parseXmlDump, type WikiPageRecord } from '../adapters/mediawiki'
import type { CorpusSink, PageOutcome } from './wiki-corpus'

export type ExportImportResult = {
  files: string[]
  pagesRead: number
  /** Titles that appeared in more than one file; the last one read wins. */
  duplicates: string[]
  /** Pages whose `<text>` was empty — stored, counted, never skipped (rule 11). */
  empty: string[]
  outcomes: Record<PageOutcome, number>
  sitename: string | null
  generator: string | null
}

/** `<siteinfo>` is stated by the file, so it is read rather than assumed. */
export function siteInfoFromXml(xml: string): { sitename: string | null; generator: string | null } {
  const read = (name: string): string | null => {
    const match = new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml)
    return match?.[1]?.trim() || null
  }
  return { sitename: read('sitename'), generator: read('generator') }
}

/**
 * Read one or more export files into the corpus store.
 *
 * Files are read in the order given and a repeated title is reported, not silently
 * merged: two exports of the same page at different revisions is a fact about the
 * import that the operator should see.
 */
export async function importExportFiles(
  paths: readonly string[],
  sink: CorpusSink,
  baseUrl: string,
): Promise<ExportImportResult> {
  const seen = new Map<string, string>()
  const duplicates: string[] = []
  const empty: string[] = []
  const collected: WikiPageRecord[] = []
  let sitename: string | null = null
  let generator: string | null = null

  for (const path of paths) {
    const xml = readFileSync(path, 'utf8')
    const info = siteInfoFromXml(xml)
    sitename ??= info.sitename
    generator ??= info.generator

    for (const page of parseXmlDump(xml, baseUrl)) {
      if (seen.has(page.title)) duplicates.push(page.title)
      seen.set(page.title, path)
      if (page.sourceText.trim() === '') empty.push(page.title)
      collected.push(page)
    }
  }

  // Last one wins, matching the read order the caller asked for.
  const byTitle = new Map<string, WikiPageRecord>()
  for (const page of collected) byTitle.set(page.title, page)
  const pages = [...byTitle.values()]

  const outcomes = await sink.write(pages)

  return {
    files: [...paths],
    pagesRead: pages.length,
    duplicates: [...new Set(duplicates)],
    empty,
    outcomes,
    sitename,
    generator,
  }
}

/**
 * Every page a set of exported pages LINKS to but that the export does not contain.
 *
 * This is the export's own to-do list. `לוח משחקים (כדורגל) 1980/81` turned out to be a
 * hub of five words and three links; the schedule it names is a different page. Reading
 * the wanted list out of what was exported is how the next export is decided from the
 * SOURCE rather than from a guess about what the source is called.
 */
export function wantedPages(
  pages: ReadonlyArray<{ title: string; links: string[] }>,
): string[] {
  const have = new Set(pages.map((page) => page.title))
  const wanted = new Set<string>()
  for (const page of pages) {
    for (const link of page.links) {
      if (!have.has(link)) wanted.add(link)
    }
  }
  return [...wanted].sort()
}
