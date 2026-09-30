import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { MediaWikiAdapter, parseXmlDump, backlinkIndex, redirectTarget } from '@/scripts/ingest/adapters/mediawiki'
import { fileCorpusSink } from '@/scripts/ingest/load/wiki-corpus'
import { importCorpus, importFromDump } from '@/scripts/ingest/sources/wiki-corpus'

/**
 * A MediaWiki that behaves like a real one — including the parts that break importers.
 *
 * Testing an API client against a mock that always answers in one page proves nothing:
 * every naive importer passes that. So this one enforces the constraints that actually
 * exist and that a careless client silently loses data to:
 *
 *  · **`aplimit` is capped at 500** however much the client asks for, and the rest is
 *    behind `apcontinue`. A client that reads one response has 500 of 1,200 pages.
 *  · **`prop=links` is capped too**, and continues under `plcontinue`. A page with 700
 *    links answers with 500 and a cursor; a client that ignores it stores a page whose
 *    graph is missing 200 edges and looks perfectly fine.
 *  · **Namespaces are separate walks.** `apnamespace` takes one value.
 *  · **It fails.** The first request to each endpoint returns 429 once, so the retry
 *    path is exercised on every run rather than being dead code nobody has run.
 *
 * 1,200 pages across two namespaces is deliberately more than one 500-page response and
 * not a round multiple of it, so an off-by-one in the continuation shows up.
 */

const NS0_PAGES = 1_200
const NS14_PAGES = 60
const AP_CAP = 500
const PROP_CAP = 500
/** one page carries more links than a single response can hold */
const FAT_PAGE_LINKS = 700

type PageFixture = {
  pageid: number
  ns: number
  title: string
  text: string
  links: string[]
  categories: string[]
  images: string[]
}

const PAGES = new Map<string, PageFixture>()
for (let index = 0; index < NS0_PAGES; index += 1) {
  const title = `דף ${index}`
  PAGES.set(title, {
    pageid: 1000 + index,
    ns: 0,
    title,
    text: `== ${title} ==\nתוכן מקורי של הדף ${index}.\n[[קטגוריה:שירי אוהדים]]`,
    links: index === 0 ? Array.from({ length: FAT_PAGE_LINKS }, (_, n) => `יעד ${n}`) : ['יעד 1'],
    categories: ['קטגוריה:שירי אוהדים'],
    images: index % 7 === 0 ? [`קובץ:תמונה ${index}.jpg`] : [],
  })
}
for (let index = 0; index < NS14_PAGES; index += 1) {
  const title = `קטגוריה:נושא ${index}`
  PAGES.set(title, {
    pageid: 9000 + index,
    ns: 14,
    title,
    text: `תיאור הקטגוריה ${index}`,
    links: [],
    categories: [],
    images: [],
  })
}

const sortedTitles = (ns: number): string[] =>
  [...PAGES.values()]
    .filter((page) => page.ns === ns)
    .map((page) => page.title)
    .sort()

let server: Server
let baseUrl: string
const failedOnce = new Set<string>()
let requestCount = 0
let retryCount = 0

beforeAll(async () => {
  server = createServer((req, res) => {
    requestCount += 1
    const url = new URL(req.url ?? '/', 'http://localhost')
    const p = url.searchParams

    // Fail the first request of each shape exactly once, so the retry path runs.
    // `siprop` is part of the shape: siteinfo is asked twice for different properties,
    // and collapsing them would leave the second one never exercised.
    const shape = `${p.get('list') ?? ''}|${p.get('prop') ?? ''}|${p.get('meta') ?? ''}|${p.get('siprop') ?? ''}`
    if (!failedOnce.has(shape)) {
      failedOnce.add(shape)
      retryCount += 1
      res.writeHead(429, { 'content-type': 'application/json', 'retry-after': '0' })
      res.end(JSON.stringify({ error: { code: 'ratelimited', info: 'slow down' } }))
      return
    }

    const json = (body: unknown): void => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }

    if (p.get('siprop') === 'namespaces') {
      json({ query: { namespaces: { '0': { id: 0, name: '' }, '14': { id: 14, name: 'קטגוריה' } } } })
      return
    }
    if (p.get('siprop')?.startsWith('general')) {
      json({
        query: {
          general: { sitename: 'ויקיפועל', generator: 'MediaWiki 1.39' },
          statistics: { articles: NS0_PAGES },
        },
      })
      return
    }

    if (p.get('list') === 'allpages') {
      const ns = Number(p.get('apnamespace') ?? 0)
      const titles = sortedTitles(ns)
      const from = p.get('apcontinue')
      const start = from ? titles.indexOf(from) : 0
      const slice = titles.slice(start, start + AP_CAP)
      const next = titles[start + AP_CAP]
      json({
        query: {
          allpages: slice.map((title) => {
            const page = PAGES.get(title) as PageFixture
            return { pageid: page.pageid, ns: page.ns, title: page.title }
          }),
        },
        ...(next ? { continue: { apcontinue: next, continue: '-||' } } : {}),
      })
      return
    }

    if (p.get('prop')?.includes('revisions')) {
      const titles = (p.get('titles') ?? '').split('|').filter(Boolean)
      const plFrom = Number(p.get('plcontinue') ?? 0)
      const pages: unknown[] = []
      let next: number | null = null

      for (const title of titles) {
        const page = PAGES.get(title)
        if (!page) {
          pages.push({ title, missing: true })
          continue
        }
        const links = page.links.slice(plFrom, plFrom + PROP_CAP)
        if (page.links.length > plFrom + PROP_CAP) next = plFrom + PROP_CAP
        pages.push({
          pageid: page.pageid,
          ns: page.ns,
          title: page.title,
          fullurl: `${baseUrl}/index.php?title=${encodeURIComponent(page.title)}`,
          // Content only on the FIRST round. A client that re-reads it on a
          // continuation round and overwrites would still pass; one that merges the
          // lists onto the existing record is what we are asserting.
          ...(plFrom === 0
            ? {
                revisions: [
                  {
                    revid: 500000 + page.pageid,
                    timestamp: '2026-01-02T03:04:05Z',
                    user: 'עורך',
                    comment: 'עדכון',
                    size: Buffer.byteLength(page.text, 'utf8'),
                    slots: { main: { content: page.text, contentmodel: 'wikitext' } },
                  },
                ],
                categories: page.categories.map((title) => ({ title })),
                images: page.images.map((title) => ({ title })),
              }
            : {}),
          links: links.map((title) => ({ title })),
        })
      }
      json({
        query: { pages },
        ...(next !== null ? { continue: { plcontinue: String(next), continue: '-||' } } : {}),
      })
      return
    }

    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { code: 'unknown', info: 'no handler' } }))
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

function adapter(): MediaWikiAdapter {
  return new MediaWikiAdapter({
    baseUrl,
    delayMs: 0,
    userAgent: 'TheWorker-test',
    maxPages: 10_000,
    retries: 3,
    onProgress: () => {},
  })
}

describe('ויקיפועל — discovery goes past the API cap', () => {
  it('walks every page in a namespace, not the first 500', async () => {
    const seen: number[] = []
    for await (const entry of adapter().listAllPages([0])) seen.push(entry.pageId)
    expect(seen).toHaveLength(NS0_PAGES)
    expect(new Set(seen).size).toBe(NS0_PAGES)
  })

  it('walks each namespace separately — apnamespace takes one value', async () => {
    const byNamespace = new Map<number, number>()
    for await (const entry of adapter().listAllPages([0, 14])) {
      byNamespace.set(entry.namespace, (byNamespace.get(entry.namespace) ?? 0) + 1)
    }
    expect(byNamespace.get(0)).toBe(NS0_PAGES)
    expect(byNamespace.get(14)).toBe(NS14_PAGES)
  })

  it('reads the wiki its own namespace list', async () => {
    const namespaces = await adapter().listNamespaces()
    expect(namespaces.map((ns) => ns.id).sort((a, b) => a - b)).toEqual([0, 14])
  })
})

describe('ויקיפועל — content and metadata', () => {
  it('returns the complete original text and the revision metadata', async () => {
    const pages = await adapter().fetchPagesFull(['דף 5'])
    const page = pages[0]
    expect(page?.title).toBe('דף 5')
    expect(page?.pageId).toBe(1005)
    expect(page?.revisionId).toBe(501005)
    expect(page?.sourceText).toBe(PAGES.get('דף 5')?.text)
    expect(page?.revUser).toBe('עורך')
    expect(page?.revTimestamp).toBe('2026-01-02T03:04:05Z')
    expect(page?.url).toContain('index.php')
    expect(page?.categories).toContain('קטגוריה:שירי אוהדים')
  })

  it('MERGES a paginated property list instead of storing the first page of it', async () => {
    // The failure this catches is silent: without plcontinue handling the page stores
    // 500 of its 700 links and nothing anywhere reports a problem.
    const pages = await adapter().fetchPagesFull(['דף 0'])
    expect(pages[0]?.links).toHaveLength(FAT_PAGE_LINKS)
    expect(new Set(pages[0]?.links).size).toBe(FAT_PAGE_LINKS)
  })

  it('reports a missing title rather than inventing a page for it', async () => {
    const pages = await adapter().fetchPagesFull(['דף 3', 'לא קיים'])
    expect(pages.map((page) => page.title)).toEqual(['דף 3'])
  })

  it('retried the requests the server refused', () => {
    expect(retryCount).toBeGreaterThan(0)
  })
})

describe('ויקיפועל — the import is idempotent', () => {
  const root = mkdtempSync(join(tmpdir(), 'corpus-'))

  it('imports the whole wiki on the first run', async () => {
    const result = await importCorpus({
      adapter: adapter(),
      sink: fileCorpusSink(root, 'wiki.red-fans.com'),
      namespaces: [0, 14],
      batchSize: 50,
      root,
      resume: false,
      log: () => {},
    })
    expect(result.discovered).toBe(NS0_PAGES + NS14_PAGES)
    expect(result.inserted).toBe(NS0_PAGES + NS14_PAGES)
    expect(result.updated).toBe(0)
    expect(result.failed).toBe(0)

    const files = readdirSync(join(root, 'data/wiki-corpus/pages'))
    expect(files).toHaveLength(NS0_PAGES + NS14_PAGES)
  })

  it('writes the page id, the url and the untouched original content', () => {
    const stored = JSON.parse(
      readFileSync(join(root, 'data/wiki-corpus/pages/1005.json'), 'utf8'),
    ) as Record<string, unknown>
    expect(stored.page_id).toBe(1005)
    expect(stored.url).toContain('index.php')
    expect(stored.source_host).toBe('wiki.red-fans.com')
    expect(stored.wikitext).toBe(PAGES.get('דף 5')?.text)
    expect(stored.content_hash).toHaveLength(64)
  })

  it('changes nothing on a second run — no duplicates, no rewrites', async () => {
    const before = readdirSync(join(root, 'data/wiki-corpus/pages')).length
    const result = await importCorpus({
      adapter: adapter(),
      sink: fileCorpusSink(root, 'wiki.red-fans.com'),
      namespaces: [0, 14],
      batchSize: 50,
      root,
      // resume off, so this is a genuine full second pass rather than a checkpoint skip
      resume: false,
      log: () => {},
    })
    expect(result.discovered).toBe(NS0_PAGES + NS14_PAGES)
    expect(result.inserted).toBe(0)
    expect(result.updated).toBe(0)
    expect(result.unchanged).toBe(NS0_PAGES + NS14_PAGES)
    expect(readdirSync(join(root, 'data/wiki-corpus/pages'))).toHaveLength(before)
  })

  it('updates in place when a page actually changes', async () => {
    const page = PAGES.get('דף 7') as PageFixture
    const original = page.text
    page.text = `${original}\nשורה חדשה.`
    try {
      const result = await importCorpus({
        adapter: adapter(),
        sink: fileCorpusSink(root, 'wiki.red-fans.com'),
        namespaces: [0],
        batchSize: 50,
        root,
        resume: false,
        log: () => {},
      })
      expect(result.inserted).toBe(0)
      expect(result.updated).toBe(1)
      expect(result.unchanged).toBe(NS0_PAGES - 1)
      const stored = JSON.parse(
        readFileSync(join(root, 'data/wiki-corpus/pages/1007.json'), 'utf8'),
      ) as { wikitext: string }
      expect(stored.wikitext).toBe(page.text)
    } finally {
      page.text = original
    }
  })

  it('resumes from a checkpoint instead of re-fetching', async () => {
    const fresh = mkdtempSync(join(tmpdir(), 'corpus-resume-'))
    const partial = await importCorpus({
      adapter: adapter(),
      sink: fileCorpusSink(fresh, 'wiki.red-fans.com'),
      namespaces: [0],
      batchSize: 50,
      root: fresh,
      resume: false,
      limit: 120,
      log: () => {},
    })
    expect(partial.inserted).toBeGreaterThan(0)
    expect(partial.inserted).toBeLessThan(NS0_PAGES)

    const rest = await importCorpus({
      adapter: adapter(),
      sink: fileCorpusSink(fresh, 'wiki.red-fans.com'),
      namespaces: [0],
      batchSize: 50,
      root: fresh,
      resume: true,
      log: () => {},
    })
    // everything already done is skipped, and the total on disk is the whole namespace
    expect(rest.inserted + partial.inserted).toBe(NS0_PAGES)
    expect(readdirSync(join(fresh, 'data/wiki-corpus/pages'))).toHaveLength(NS0_PAGES)
  })
})

describe('ויקיפועל — the offline route', () => {
  const DUMP = `<mediawiki>
  <page>
    <title>שיר של היציע</title>
    <ns>0</ns>
    <id>4242</id>
    <revision>
      <id>99001</id>
      <timestamp>2025-05-04T10:00:00Z</timestamp>
      <contributor><username>עורך</username></contributor>
      <comment>יצירה</comment>
      <model>wikitext</model>
      <text xml:space="preserve">שורה ראשונה &amp; שנייה
[[קטגוריה:שירי אוהדים]]
[[הפועל תל אביב]]
[[קובץ:דגל.jpg]]</text>
    </revision>
  </page>
  <page>
    <title>הפניה</title>
    <ns>0</ns>
    <id>4243</id>
    <redirect title="שיר של היציע" />
    <revision><id>99002</id><text xml:space="preserve">#הפניה [[שיר של היציע]]</text></revision>
  </page>
</mediawiki>`

  it('reads a Special:Export file into the same records the API produces', () => {
    const pages = parseXmlDump(DUMP, 'https://wiki.red-fans.com')
    expect(pages).toHaveLength(2)
    const first = pages[0]
    expect(first?.pageId).toBe(4242)
    expect(first?.revisionId).toBe(99001)
    expect(first?.title).toBe('שיר של היציע')
    // entities decoded, whitespace and newlines preserved exactly
    expect(first?.sourceText).toContain('שורה ראשונה & שנייה')
    expect(first?.revUser).toBe('עורך')
    expect(first?.categories).toContain('קטגוריה:שירי אוהדים')
    expect(first?.links).toContain('הפועל תל אביב')
    expect(first?.images).toContain('דגל.jpg')
    expect(first?.url).toContain('wiki.red-fans.com')
    expect(pages[1]?.isRedirect).toBe(true)
    expect(pages[1]?.redirectTo).toBe('שיר של היציע')
  })

  it('is idempotent from a dump too', async () => {
    const root = mkdtempSync(join(tmpdir(), 'corpus-dump-'))
    const path = join(root, 'export.xml')
    writeDump(path, DUMP)
    const sink = fileCorpusSink(root, 'wiki.red-fans.com')

    const first = await importFromDump(path, sink, 'https://wiki.red-fans.com', () => {})
    expect(first.inserted).toBe(2)

    const second = await importFromDump(path, sink, 'https://wiki.red-fans.com', () => {})
    expect(second.inserted).toBe(0)
    expect(second.unchanged).toBe(2)
  })
})

function writeDump(path: string, xml: string): void {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { writeFileSync } = require('node:fs') as typeof import('node:fs')
  writeFileSync(path, xml, 'utf8')
}

describe('הפניות וקישורים נכנסים — derived, never re-fetched', () => {
  it('reads a redirect target out of the wikitext already stored', () => {
    expect(redirectTarget('#REDIRECT [[הפועל תל אביב (כדורגל)]]')).toBe('הפועל תל אביב (כדורגל)')
    expect(redirectTarget('#הפניה [[עונת 1980/81 (כדורגל)]]')).toBe('עונת 1980/81 (כדורגל)')
    expect(redirectTarget('#redirect:[[Bloomfield]]')).toBe('Bloomfield')
  })

  it('strips a pipe and a fragment — the target is a page, not a section', () => {
    expect(redirectTarget('#REDIRECT [[מגרש|בלומפילד]]')).toBe('מגרש')
    expect(redirectTarget('#REDIRECT [[עונה#גביע]]')).toBe('עונה')
  })

  it('returns null for a page that is not a redirect', () => {
    expect(redirectTarget('הפועל תל אביב היא קבוצת כדורגל.')).toBeNull()
    expect(redirectTarget('')).toBeNull()
    expect(redirectTarget(null)).toBeNull()
  })

  it('inverts the link graph instead of asking the wiki page by page', () => {
    // `list=backlinks` answers one page per request. Every page's outbound links are
    // already stored, so the inverse is exact for the imported set and free.
    const index = backlinkIndex([
      { title: 'עונת 1980/81', links: ['שבתאי לוי', 'בלומפילד'] },
      { title: 'עונת 1981/82', links: ['שבתאי לוי'] },
      { title: 'שבתאי לוי', links: ['בלומפילד'] },
    ])
    expect(index.get('שבתאי לוי')).toEqual(['עונת 1980/81', 'עונת 1981/82'])
    expect(index.get('בלומפילד')).toEqual(['עונת 1980/81', 'שבתאי לוי'])
    expect(index.get('לא קיים')).toBeUndefined()
  })

  it('never lists the same backlink twice', () => {
    const index = backlinkIndex([{ title: 'א', links: ['ב', 'ב', 'ב'] }])
    expect(index.get('ב')).toEqual(['א'])
  })
})
