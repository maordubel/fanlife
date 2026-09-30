/**
 * The Special:Export route.
 *
 * Every fixture here is a SHAPE. The one thing taken from the real wiki is the STRUCTURE
 * the first export revealed — a hub page whose body is links to the pages that hold the
 * fixtures — because that structure is what the code has to survive. No result, date,
 * club or player from the source appears in this file.
 */

import { describe, expect, it } from 'vitest'

import { parseXmlDump } from '@/scripts/ingest/adapters/mediawiki'
import {
  importExportFiles,
  siteInfoFromXml,
  wantedPages,
} from '@/scripts/ingest/sources/wiki-export'
import type { CorpusSink } from '@/scripts/ingest/sources/wiki-corpus'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = 'https://example.invalid'

function dump(pages: ReadonlyArray<{ title: string; id: number; rev: number; text: string }>): string {
  const blocks = pages
    .map(
      (page) => `<page>
<title>${page.title}</title>
<ns>0</ns>
<id>${page.id}</id>
<revision>
<id>${page.rev}</id>
<timestamp>2011-08-20T11:19:56Z</timestamp>
<model>wikitext</model>
<text bytes="1" xml:space="preserve">${page.text}</text>
</revision>
</page>`,
    )
    .join('\n')
  return `<mediawiki version="0.11" xml:lang="he">
<siteinfo><sitename>אתר בדיקה</sitename><generator>MediaWiki 1.40.1</generator></siteinfo>
${blocks}
</mediawiki>`
}

function write(xml: string): string {
  const path = join(mkdtempSync(join(tmpdir(), 'export-')), 'dump.xml')
  writeFileSync(path, xml, 'utf8')
  return path
}

function recordingSink(): CorpusSink & { written: unknown[] } {
  const written: unknown[] = []
  return {
    written,
    async known() {
      return new Map()
    },
    async write(pages) {
      written.push(...pages)
      return { inserted: pages.length, updated: 0, unchanged: 0, failed: 0 }
    },
    async touch() {},
  }
}

describe('Special:Export — the human route into the corpus', () => {
  it('reads the site it was given rather than assuming one', () => {
    const info = siteInfoFromXml(dump([]))
    expect(info.sitename).toBe('אתר בדיקה')
    expect(info.generator).toBe('MediaWiki 1.40.1')
  })

  it('survives the script tags a browser extension injects into the file', () => {
    const xml = dump([{ title: 'דף אלף', id: 1, rev: 2, text: 'גוף' }]).replace(
      '<siteinfo>',
      '<script id="abc"/><script/><siteinfo>',
    )
    const pages = parseXmlDump(xml, BASE)
    expect(pages).toHaveLength(1)
    expect(pages[0]?.title).toBe('דף אלף')
  })

  it('carries page id, revision id and the complete wikitext into the corpus row', async () => {
    const path = write(dump([{ title: 'דף אלף', id: 77, rev: 404, text: 'שורה [[דף בית]]' }]))
    const sink = recordingSink()
    const result = await importExportFiles([path], sink, BASE)

    expect(result.pagesRead).toBe(1)
    const page = sink.written[0] as { pageId: number; revisionId: number; sourceText: string }
    expect(page.pageId).toBe(77)
    expect(page.revisionId).toBe(404)
    expect(page.sourceText).toContain('שורה')
  })

  it('stores an empty page and counts it, never skips it', async () => {
    const path = write(dump([{ title: 'דף ריק', id: 5, rev: 6, text: '' }]))
    const result = await importExportFiles([path], recordingSink(), BASE)
    expect(result.empty).toEqual(['דף ריק'])
    expect(result.pagesRead).toBe(1)
  })

  it('reports a title that appears in two files instead of merging it silently', async () => {
    const a = write(dump([{ title: 'דף אלף', id: 1, rev: 1, text: 'ישן' }]))
    const b = write(dump([{ title: 'דף אלף', id: 1, rev: 9, text: 'חדש' }]))
    const sink = recordingSink()
    const result = await importExportFiles([a, b], sink, BASE)

    expect(result.duplicates).toEqual(['דף אלף'])
    expect(result.pagesRead).toBe(1)
    // last read wins, which is the order the caller asked for
    expect((sink.written[0] as { revisionId: number }).revisionId).toBe(9)
  })

  it('derives the next export from the links of a hub page, not from a guess', () => {
    const pages = parseXmlDump(
      dump([
        {
          title: 'לוח דמה (ענף) 1900/01',
          id: 1,
          rev: 1,
          text: '* ראה [[לוח דמה ליגה (ענף) 1900/01]] * ראה [[לוח דמה גביע (ענף) 1900/01]]',
        },
        { title: 'לוח דמה ליגה (ענף) 1900/01', id: 2, rev: 2, text: 'גוף' },
      ]),
      BASE,
    )

    // the one it links to and does not contain — and only that one
    expect(wantedPages(pages)).toEqual(['לוח דמה גביע (ענף) 1900/01'])
  })

  it('asks for nothing when the export is already closed under its own links', () => {
    const pages = parseXmlDump(
      dump([{ title: 'דף אלף', id: 1, rev: 1, text: 'בלי קישורים' }]),
      BASE,
    )
    expect(wantedPages(pages)).toEqual([])
  })
})
