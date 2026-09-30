/**
 * THE ONLY FILE THAT KNOWS MEDIAWIKI.
 *
 * House rule (football-data): if a provider field name appears outside this file,
 * the provider is no longer replaceable. Everything below returns neutral shapes.
 *
 * Verify before shipping:  grep -R "api.php\|wikitext\|categorymembers" --exclude-dir=node_modules
 *   → hits allowed only in this file and its test.
 */

import { createHash } from 'node:crypto'
import type { RawPage } from '@/scripts/ingest/lib/types'

export type MediaWikiConfig = {
  /** e.g. https://wiki.red-fans.com */
  baseUrl: string
  /** Politeness delay between requests, ms. */
  delayMs: number
  userAgent: string
  /**
   * Ceiling for the SCOPED discovery helpers. The corpus importer deliberately does
   * not use it — "everything" means everything, and a silent cap is how an import
   * looks complete and is not.
   */
  maxPages: number
  /** How many times a failed request is retried before it is given up on. */
  retries?: number
  /** Titles per content request. 20 is the anonymous limit; 50 needs a bot flag. */
  batchSize?: number
  /**
   * Seconds of replication lag the wiki may be behind before it should refuse us.
   * This is the polite half of a bulk read: it tells the server it is allowed to say
   * "not now" instead of being dragged under by a crawl.
   */
  maxLag?: number
  /** Called with a one-line progress string. Defaults to stderr. */
  onProgress?: (line: string) => void
}

/** One page as the API describes it, before anything is parsed out of it. */
export type WikiPageRecord = RawPage & {
  contentModel: string
  isRedirect: boolean
  redirectTo: string | null
  byteSize: number | null
  revTimestamp: string | null
  revUser: string | null
  revComment: string | null
  categories: string[]
  links: string[]
  images: string[]
}

/** What a full-corpus discovery pass found. */
export type AllPagesEntry = { pageId: number; title: string; namespace: number }

export class MediaWikiAccessError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status: number | null,
  ) {
    super(`${message} — ${url}${status === null ? '' : ` (HTTP ${status})`}`)
    this.name = 'MediaWikiAccessError'
  }
}

export class MediaWikiAdapter {
  constructor(private readonly config: MediaWikiConfig) {}

  get apiUrl(): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}/api.php`
  }

  pageUrl(title: string): string {
    return `${this.config.baseUrl.replace(/\/$/, '')}/index.php?title=${encodeURIComponent(
      title.replaceAll(' ', '_'),
    )}`
  }

  /** Titles in a category, following continuation. Namespace filter is caller-supplied. */
  async listCategoryMembers(category: string, namespace = 0): Promise<string[]> {
    const titles: string[] = []
    let cursor: string | undefined

    do {
      const params: Record<string, string> = {
        action: 'query',
        list: 'categorymembers',
        cmtitle: category,
        cmlimit: '500',
        cmnamespace: String(namespace),
        format: 'json',
        formatversion: '2',
      }
      if (cursor) params.cmcontinue = cursor

      const payload = await this.request<{
        query?: { categorymembers?: Array<{ title: string }> }
        continue?: { cmcontinue?: string }
      }>(params)

      for (const member of payload.query?.categorymembers ?? []) titles.push(member.title)
      cursor = payload.continue?.cmcontinue
      if (titles.length >= this.config.maxPages) break
    } while (cursor)

    return titles.slice(0, this.config.maxPages)
  }

  /** Full source text of pages, in batches of 20, with revision ids. */
  async fetchPages(titles: readonly string[]): Promise<RawPage[]> {
    const out: RawPage[] = []

    for (let index = 0; index < titles.length; index += 20) {
      const batch = titles.slice(index, index + 20)
      const payload = await this.request<{
        query?: {
          pages?: Array<{
            pageid?: number
            ns?: number
            title: string
            missing?: boolean
            revisions?: Array<{ revid?: number; slots?: { main?: { content?: string } } }>
          }>
        }
      }>({
        action: 'query',
        prop: 'revisions',
        rvprop: 'ids|content',
        rvslots: 'main',
        titles: batch.join('|'),
        format: 'json',
        formatversion: '2',
      })

      for (const page of payload.query?.pages ?? []) {
        const content = page.revisions?.[0]?.slots?.main?.content
        if (page.missing || content === undefined) continue
        out.push({
          pageId: page.pageid ?? null,
          title: page.title,
          namespace: page.ns ?? 0,
          revisionId: page.revisions?.[0]?.revid ?? null,
          sourceText: content, format: 'wikitext' as const,
          contentHash: createHash('sha256').update(content).digest('hex'),
          fetchedAt: new Date().toISOString(),
          url: this.pageUrl(page.title),
        })
      }
    }

    return out
  }

  /* ------------------------------------------------------- whole-corpus reads */

  /**
   * Every page on the wiki, following `apcontinue` until there is none.
   *
   * `aplimit=max` is 500 for an anonymous client and 5,000 for a bot. **Neither is a
   * stopping point.** The API answers a capped slice plus a cursor, and the only
   * correct read is to keep going until the cursor is gone — which is why this is a
   * generator rather than a function returning an array: a wiki of any size streams
   * through it in constant memory, and the caller can start fetching content before
   * discovery has finished.
   *
   * Namespaces are enumerated one at a time because `apnamespace` takes exactly one.
   * Passing several would silently read only the first, which is the kind of bug that
   * looks like a complete import and is missing four fifths of the wiki.
   */
  async *listAllPages(namespaces: readonly number[] = [0]): AsyncGenerator<AllPagesEntry> {
    for (const namespace of namespaces) {
      let cursor: string | undefined
      let seen = 0

      do {
        const params: Record<string, string> = {
          action: 'query',
          list: 'allpages',
          apnamespace: String(namespace),
          aplimit: 'max',
          apfilterredir: 'all',
          format: 'json',
          formatversion: '2',
        }
        if (cursor) params.apcontinue = cursor

        const payload = await this.request<{
          query?: { allpages?: Array<{ pageid: number; ns: number; title: string }> }
          continue?: { apcontinue?: string }
        }>(params)

        const batch = payload.query?.allpages ?? []
        for (const page of batch) {
          seen += 1
          yield { pageId: page.pageid, title: page.title, namespace: page.ns }
        }
        cursor = payload.continue?.apcontinue
        this.progress(
          `discover ns${namespace}: ${seen} pages${cursor ? ' (more)' : ' — complete'}`,
        )
      } while (cursor)
    }
  }

  /** Every namespace the wiki declares, so "all pages" can mean all of them. */
  async listNamespaces(): Promise<Array<{ id: number; name: string }>> {
    const payload = await this.request<{
      query?: { namespaces?: Record<string, { id: number; name: string; '*'?: string }> }
    }>({
      action: 'query',
      meta: 'siteinfo',
      siprop: 'namespaces',
      format: 'json',
      formatversion: '2',
    })
    return Object.values(payload.query?.namespaces ?? {})
      .filter((ns) => ns.id >= 0)
      .map((ns) => ({ id: ns.id, name: ns.name || ns['*'] || String(ns.id) }))
  }

  async siteInfo(): Promise<{ sitename: string; generator: string; articles: number }> {
    const payload = await this.request<{
      query?: {
        general?: { sitename?: string; generator?: string }
        statistics?: { articles?: number }
      }
    }>({
      action: 'query',
      meta: 'siteinfo',
      siprop: 'general|statistics',
      format: 'json',
      formatversion: '2',
    })
    return {
      sitename: payload.query?.general?.sitename ?? 'unknown',
      generator: payload.query?.general?.generator ?? 'unknown',
      articles: payload.query?.statistics?.articles ?? 0,
    }
  }

  /**
   * Full content and metadata for a batch of titles.
   *
   * The subtlety that breaks naive importers: `prop=categories|links|images` are
   * themselves paginated. A page with 900 links answers with 500 of them and a
   * `plcontinue`, and a client that reads `query.pages` once and moves on stores a
   * page that looks complete and has lost half its graph. So the batch is re-requested
   * with the continuation token and the lists are MERGED, per page, until the API stops
   * offering one.
   *
   * The revision content is not merged — it arrives whole on the first response — so
   * subsequent continuation rounds only add to the lists.
   */
  async fetchPagesFull(titles: readonly string[]): Promise<WikiPageRecord[]> {
    if (titles.length === 0) return []
    const byTitle = new Map<string, WikiPageRecord>()
    let cont: Record<string, string> = {}

    do {
      const payload = await this.request<{
        query?: { pages?: RawApiPage[] }
        continue?: Record<string, string>
      }>({
        action: 'query',
        prop: 'revisions|categories|links|images|info',
        rvprop: 'ids|timestamp|user|comment|size|content',
        rvslots: 'main',
        cllimit: 'max',
        pllimit: 'max',
        imlimit: 'max',
        plnamespace: '0',
        inprop: 'url',
        titles: titles.join('|'),
        format: 'json',
        formatversion: '2',
        ...cont,
      })

      for (const page of payload.query?.pages ?? []) {
        if (page.missing) continue
        const existing = byTitle.get(page.title)
        if (existing) {
          // a continuation round: only the lists grow
          pushUnique(existing.categories, (page.categories ?? []).map((c) => c.title))
          pushUnique(existing.links, (page.links ?? []).map((l) => l.title))
          pushUnique(existing.images, (page.images ?? []).map((i) => i.title))
          continue
        }
        const record = this.toRecord(page)
        if (record) byTitle.set(page.title, record)
      }

      const next = payload.continue ?? {}
      // `continue` always carries a `continue` key alongside the property cursors;
      // passing the whole object back is what the API asks for.
      cont = Object.keys(next).length > 0 ? next : {}
    } while (Object.keys(cont).length > 0)

    return [...byTitle.values()]
  }

  private toRecord(page: RawApiPage): WikiPageRecord | null {
    const revision = page.revisions?.[0]
    const content = revision?.slots?.main?.content
    // A page with no readable content is REPORTED as empty, not dropped: a redirect and
    // a stub are both real pages, and an importer that silently skips them makes the
    // corpus count disagree with the wiki's own.
    const text = content ?? ''
    return {
      pageId: page.pageid ?? null,
      title: page.title,
      namespace: page.ns ?? 0,
      revisionId: revision?.revid ?? null,
      sourceText: text,
      format: 'wikitext' as const,
      contentHash: createHash('sha256').update(text).digest('hex'),
      fetchedAt: new Date().toISOString(),
      url: page.fullurl ?? this.pageUrl(page.title),
      contentModel: revision?.slots?.main?.contentmodel ?? page.contentmodel ?? 'wikitext',
      isRedirect: page.redirect === true,
      redirectTo: redirectTarget(content),
      byteSize: revision?.size ?? (content ? Buffer.byteLength(content, 'utf8') : null),
      revTimestamp: revision?.timestamp ?? null,
      revUser: revision?.user ?? null,
      revComment: revision?.comment ?? null,
      categories: (page.categories ?? []).map((c) => c.title),
      links: (page.links ?? []).map((l) => l.title),
      images: (page.images ?? []).map((i) => i.title),
    }
  }

  private progress(line: string): void {
    if (this.config.onProgress) this.config.onProgress(line)
    else process.stderr.write(`${line}\n`)
  }

  /* ------------------------------------------------------------- transport */

  /**
   * One API request, with the retry behaviour a bulk read actually needs.
   *
   * Retried: network failure, 429, and 5xx — the failures that are about the moment
   * rather than the request. `Retry-After` is honoured when the server sends one,
   * because a server that tells you when to come back has earned being listened to;
   * otherwise the wait doubles, which keeps a struggling wiki from being hammered by
   * the client that is struggling it.
   *
   * NOT retried: 403 and 404. A refusal is an answer. Retrying a 403 is how a polite
   * importer turns into a battering ram, and this project documents a blocked source
   * rather than working around it (rule 11).
   */
  private async request<T>(params: Record<string, string>, attempt = 0): Promise<T> {
    const withLag = this.config.maxLag ? { ...params, maxlag: String(this.config.maxLag) } : params
    const url = `${this.apiUrl}?${new URLSearchParams(withLag).toString()}`
    const retries = this.config.retries ?? 4
    await sleep(this.config.delayMs)

    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'user-agent': this.config.userAgent, accept: 'application/json' },
      })
    } catch (cause) {
      if (attempt < retries) return this.backoff(url, attempt, `network: ${String(cause)}`, params)
      throw new MediaWikiAccessError(`network failure: ${String(cause)}`, url, null)
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < retries) {
        const after = Number(response.headers.get('retry-after'))
        return this.backoff(
          url,
          attempt,
          `HTTP ${response.status}`,
          params,
          Number.isFinite(after) && after > 0 ? after * 1000 : undefined,
        )
      }
    }

    if (!response.ok) {
      throw new MediaWikiAccessError('request rejected', url, response.status)
    }

    const text = await response.text()
    if (text.trimStart().startsWith('<')) {
      // A bot-protection interstitial answers 200 with HTML. Fail loudly.
      throw new MediaWikiAccessError(
        'expected JSON, received HTML (bot protection or wrong endpoint)',
        url,
        response.status,
      )
    }

    const payload = JSON.parse(text) as T & {
      error?: { code?: string; info?: string }
    }

    // `maxlag` is reported as an API error with HTTP 200, so it has to be caught here
    // rather than by the status check above.
    if (payload.error) {
      const code = payload.error.code ?? 'unknown'
      if ((code === 'maxlag' || code === 'readonly') && attempt < retries) {
        return this.backoff(url, attempt, `api error ${code}`, params)
      }
      throw new MediaWikiAccessError(
        `api error ${code}: ${payload.error.info ?? ''}`,
        url,
        response.status,
      )
    }

    return payload as T
  }

  private async backoff<T>(
    url: string,
    attempt: number,
    why: string,
    params: Record<string, string>,
    waitMs?: number,
  ): Promise<T> {
    const wait = waitMs ?? Math.min(30_000, 1000 * 2 ** attempt)
    this.progress(`retry ${attempt + 1} in ${wait}ms — ${why} — ${url}`)
    await sleep(wait)
    return this.request<T>(params, attempt + 1)
  }
}

type RawApiPage = {
  pageid?: number
  ns?: number
  title: string
  missing?: boolean
  redirect?: boolean
  contentmodel?: string
  fullurl?: string
  revisions?: Array<{
    revid?: number
    timestamp?: string
    user?: string
    comment?: string
    size?: number
    slots?: { main?: { content?: string; contentmodel?: string } }
  }>
  categories?: Array<{ title: string }>
  links?: Array<{ title: string }>
  images?: Array<{ title: string }>
}

function pushUnique(target: string[], incoming: readonly string[]): void {
  for (const value of incoming) if (!target.includes(value)) target.push(value)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ------------------------------------------------- the offline route: XML dump */

/**
 * Read a MediaWiki XML export into the same records the API produces.
 *
 * This exists because an API can be closed. `Special:Export` is part of every
 * MediaWiki install and needs nothing but a browser and a logged-in human: paste the
 * page titles (or a category), tick "include only the current revision", save the XML,
 * and the importer takes it from there — same records, same table, same idempotency,
 * and not one network request.
 *
 * The parse is deliberately a hand-rolled scan rather than an XML library. A dump of a
 * whole wiki is hundreds of megabytes and arrives as one document; a DOM parser loads
 * all of it into memory to hand back a tree we would immediately walk once. Scanning
 * `<page>` blocks in order costs one pass and holds one page at a time.
 *
 * What a dump does NOT carry: the API's resolved category, link and image lists. Those
 * are read out of the wikitext instead (`extractCategories`, `extractLinks`), which is
 * a fallback and is marked as one — templates and redirects are not resolved.
 */

/**
 * The target of a redirect, read from the wikitext the importer already stores.
 *
 * Maor's research brief lists `redirect_target` among the fields every imported page
 * must preserve, and this adapter was writing `null` into it. The obvious fix is another
 * API round trip; the right one is that **the answer is already in hand.** A redirect
 * page's entire content is `#REDIRECT [[Target]]`, and this importer stores the complete
 * wikitext of every page — so the target is a parse, not a request. On a wiki of several
 * thousand pages that is the difference between one extra field and several thousand
 * extra HTTP calls.
 *
 * Hebrew MediaWiki accepts `#הפניה` alongside `#REDIRECT`, and the magic word is
 * case-insensitive with an optional colon. A pipe or a fragment in the link is stripped:
 * the target is a page, not a section.
 */
const REDIRECT = /^\s*#\s*(?:REDIRECT|הפניה|הפנייה)\s*:?\s*\[\[([^\]|#]+)/iu

export function redirectTarget(wikitext: string | null | undefined): string | null {
  if (!wikitext) return null
  const match = REDIRECT.exec(wikitext)
  return match?.[1]?.trim() || null
}

/**
 * Backlinks, derived by inverting the link graph rather than fetched.
 *
 * The brief asks for `backlinks[]` per page. `list=backlinks` answers that one page at a
 * time — thousands of requests for information the corpus already contains, because
 * every page's outbound `links[]` is stored. Inverting that map once, after the walk, is
 * exact for every page inside the import and costs nothing.
 *
 * What it cannot know is inbound links from pages that were never imported. That is a
 * real limitation and it is stated rather than papered over: a partial import yields
 * partial backlinks, and a full walk yields complete ones.
 */
export function backlinkIndex(
  pages: ReadonlyArray<{ title: string; links: string[] }>,
): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const page of pages) {
    for (const target of page.links) {
      const list = index.get(target)
      if (list) {
        if (!list.includes(page.title)) list.push(page.title)
      } else {
        index.set(target, [page.title])
      }
    }
  }
  for (const list of index.values()) list.sort()
  return index
}

export function parseXmlDump(xml: string, baseUrl: string): WikiPageRecord[] {
  const out: WikiPageRecord[] = []
  const host = baseUrl.replace(/\/$/, '')
  let cursor = 0

  for (;;) {
    const start = xml.indexOf('<page>', cursor)
    if (start === -1) break
    const end = xml.indexOf('</page>', start)
    if (end === -1) break
    const block = xml.slice(start + 6, end)
    cursor = end + 7

    const title = unescapeXml(tag(block, 'title'))
    if (!title) continue
    const text = unescapeXml(tagRaw(block, 'text'))
    const pageId = Number(tag(block, 'id'))
    const namespace = Number(tag(block, 'ns'))
    // the revision block carries its own <id>, which is the SECOND id in the page block
    const revBlock = block.slice(block.indexOf('<revision>'))
    const revisionId = Number(tag(revBlock, 'id'))
    const redirectMatch = /<redirect title="([^"]*)"/.exec(block)

    out.push({
      pageId: Number.isFinite(pageId) ? pageId : null,
      title,
      namespace: Number.isFinite(namespace) ? namespace : 0,
      revisionId: Number.isFinite(revisionId) ? revisionId : null,
      sourceText: text,
      format: 'wikitext' as const,
      contentHash: createHash('sha256').update(text).digest('hex'),
      fetchedAt: new Date().toISOString(),
      url: `${host}/index.php?title=${encodeURIComponent(title.replaceAll(' ', '_'))}`,
      contentModel: tag(revBlock, 'model') || 'wikitext',
      isRedirect: redirectMatch !== null,
      redirectTo: redirectMatch ? unescapeXml(redirectMatch[1] ?? '') : null,
      byteSize: Buffer.byteLength(text, 'utf8'),
      revTimestamp: tag(revBlock, 'timestamp') || null,
      revUser: tag(revBlock, 'username') || null,
      revComment: unescapeXml(tag(revBlock, 'comment')) || null,
      categories: extractCategories(text).map((name) => `קטגוריה:${name}`),
      links: extractLinks(text),
      images: extractImages(text),
    })
  }

  return out
}

function tag(block: string, name: string): string {
  const open = block.indexOf(`<${name}`)
  if (open === -1) return ''
  const gt = block.indexOf('>', open)
  if (gt === -1) return ''
  if (block[gt - 1] === '/') return ''
  const close = block.indexOf(`</${name}>`, gt)
  if (close === -1) return ''
  return block.slice(gt + 1, close).trim()
}

/** Same as `tag`, but keeps leading and trailing whitespace — wikitext is significant. */
function tagRaw(block: string, name: string): string {
  const open = block.indexOf(`<${name}`)
  if (open === -1) return ''
  const gt = block.indexOf('>', open)
  if (gt === -1) return ''
  if (block[gt - 1] === '/') return ''
  const close = block.indexOf(`</${name}>`, gt)
  if (close === -1) return ''
  return block.slice(gt + 1, close)
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}

/* -------------------------------------------------- wikitext shape helpers */

/** Named parameters of the first template whose name matches. */
export function extractTemplate(
  wikitext: string,
  templateName: string,
): Record<string, string> | null {
  const start = wikitext.indexOf(`{{${templateName}`)
  if (start === -1) return null

  let depth = 0
  let end = -1
  for (let index = start; index < wikitext.length - 1; index += 1) {
    const pair = wikitext.slice(index, index + 2)
    if (pair === '{{') depth += 1
    if (pair === '}}') {
      depth -= 1
      if (depth === 0) {
        end = index
        break
      }
    }
  }
  if (end === -1) return null

  const body = wikitext.slice(start + 2 + templateName.length, end)
  const fields: Record<string, string> = {}

  for (const part of splitTopLevel(body, '|')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue
    const key = part.slice(0, separator).trim()
    const value = stripMarkup(part.slice(separator + 1))
    if (key) fields[key] = value
  }
  return fields
}

/**
 * The name of the first template on a page — `{{שחקן כדורגל|…}}` → `שחקן כדורגל`.
 *
 * A player page's infobox is not one template but five: ויקיפועל writes
 * `שחקן כדורגל`, `שחקן עבר`, `איש כדורגל`, `שחקן` and `כדורגלן` across the corpus, and
 * a reader that hunts for a fixed list finds nothing on the pages whose template it did
 * not think of. שייע פייגנבוים is on `איש כדורגל`, which was not in the list.
 */
export function firstTemplateName(wikitext: string): string | null {
  const start = wikitext.indexOf('{{')
  if (start === -1) return null
  const head = wikitext.slice(start + 2, start + 120)
  const name = head.split(/[|}\n]/)[0]?.trim() ?? ''
  return name === '' ? null : name
}

/**
 * הפסקה הפותחת — the lead section: everything after the opening templates and before
 * the first heading.
 *
 * This is where a ויקיפועל player page states what he played **at Hapoel**, in a
 * sentence: *"חלוץ, שיחק בהפועל בשנים 1979-1965"*. The infobox above it states his
 * whole career — every role he ever held, at every club, in any order — so the two are
 * different claims and the lead is the one this app is about.
 *
 * It stops at the first heading on purpose. Below the first `==` a page is talking
 * about the man's childhood, his other clubs and its own external links, and the words
 * "שוער" and "קישור" appear in all three: a scan that ran past the heading read
 * `קישורים חיצוניים` as a midfielder and a striker's boyhood in goal as a goalkeeper.
 */
export function leadSection(wikitext: string): string {
  let index = 0
  for (;;) {
    while (index < wikitext.length && /\s/.test(wikitext[index] as string)) index += 1
    if (!wikitext.startsWith('{{', index)) break
    let depth = 0
    let cursor = index
    for (; cursor < wikitext.length - 1; cursor += 1) {
      const pair = wikitext.slice(cursor, cursor + 2)
      if (pair === '{{') depth += 1
      else if (pair === '}}') {
        depth -= 1
        if (depth === 0) {
          cursor += 2
          break
        }
      }
    }
    if (cursor <= index) break
    index = cursor
  }
  const rest = wikitext.slice(index)
  const heading = rest.search(/\n\s*==/u)
  return (heading === -1 ? rest : rest.slice(0, heading)).trim()
}

/** Category names declared on a page. */
export function extractCategories(wikitext: string): string[] {
  const out: string[] = []
  const pattern = /\[\[\s*(?:קטגוריה|Category)\s*:\s*([^\]|]+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(wikitext)) !== null) {
    const name = match[1]?.trim()
    if (name) out.push(name)
  }
  return out
}

/** Rows of the first wikitable, as cell arrays. Row 0 is the header row. */
export function extractTableRows(wikitext: string): string[][] {
  const start = wikitext.indexOf('{|')
  if (start === -1) return []
  const end = wikitext.indexOf('|}', start)
  if (end === -1) return []

  // Drop the opening `{|` line, then split on row separators. The block before the
  // first `|-` is the header block, so it is kept as row 0 rather than discarded.
  const body = wikitext.slice(start, end).replace(/^\{\|[^\n]*\n?/, '')
  const rows: string[][] = []

  for (const chunk of body.split(/^\|-.*$/m)) {
    const cells: string[] = []
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('|+')) continue // caption
      if (!trimmed.startsWith('|') && !trimmed.startsWith('!')) continue
      const isHeader = trimmed.startsWith('!')
      for (const cell of trimmed.slice(1).split(isHeader ? '!!' : '||')) {
        cells.push(stripMarkup(cell))
      }
    }
    if (cells.length > 0) rows.push(cells)
  }
  return rows
}

/** Link targets on a page, in order. */
export function extractLinks(wikitext: string): string[] {
  const out: string[] = []
  const pattern = /\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(wikitext)) !== null) {
    const target = match[1]?.trim()
    if (target && !/^(קטגוריה|Category|קובץ|File|תמונה|Image)\s*:/.test(target)) out.push(target)
  }
  return out
}

/** File names embedded in a page, in order. */
export function extractImages(wikitext: string): string[] {
  const out: string[] = []
  const pattern = /\[\[\s*(?:קובץ|File|תמונה|Image)\s*:\s*([^\]|]+)/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(wikitext)) !== null) {
    const name = match[1]?.trim()
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}

/** Plain text of a wikitext fragment: links unwrapped, refs and comments removed. */
export function stripMarkup(fragment: string): string {
  return fragment
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/^[!|]\s*(?:[a-z-]+\s*=\s*"[^"]*"\s*)*\|\s*/i, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''

  for (let index = 0; index < text.length; index += 1) {
    const pair = text.slice(index, index + 2)
    if (pair === '{{' || pair === '[[') depth += 1
    if (pair === '}}' || pair === ']]') depth -= 1

    const char = text[index] as string
    if (char === separator && depth === 0) {
      parts.push(current)
      current = ''
      continue
    }
    current += char
  }
  parts.push(current)
  return parts
}
