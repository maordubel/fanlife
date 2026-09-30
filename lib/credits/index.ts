import 'server-only'

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { HISTORY_DAYS } from '@/lib/life/history/days'
import { MERCH_LINKS, merchLink, type MerchLink } from '@/lib/merch'

import { CREDIT_GROUPS, OWNER_KNOWLEDGE_LABEL, type CreditGroupKey } from './groups'

/**
 * המקורות — every source and credit the product uses, read out of the data (spec §0.3).
 *
 * The owner's rule of 22.9.2026: credits and sources live in ONE place, `/credits`, and a
 * screen that states a fact shows at most `מקור מתועד` pointing here. So this list is not
 * typed by anybody. It is READ, at build time, from every JSON file in `content/manual`
 * plus the historical sources of THE WORKER LIFE — the same fields the facts themselves
 * carry — deduplicated by title and counted, so a file added tomorrow is on the page
 * tomorrow and a source nobody cites any more leaves it on its own (rules 45, 73: a
 * hand-kept list is a claim about the data, and it goes stale exactly like a manifest).
 *
 * What counts as a citation, and why each shape is read the way it is:
 *
 *   · a row with `sourceTitle` (and `sourceUrl`) — the common case, one fact, one source;
 *   · a `source: { title, url }` object — read only when it has an address, or when it is
 *     the owner-knowledge label (a source with no URL by nature, rule 18). Any other
 *     file-level source with no URL is a label for how the FILE was assembled ("Verified
 *     research pass", "Season calendar scaffold"), and the rows inside carry the sources;
 *   · a keyed `sources: [{ key, title, url }]` list — counted through the rows that name
 *     the key (`source: 'fka'`, `sources: ['wiki-he', …]`) and carry no title of their own;
 *   · `credit` / `creditHe` / `photographer` — a person or an archive credited by name,
 *     counted once per row it covers (`kit-photos.json`: the 114 photographs of ישי צבי);
 *   · `researchCreditHe` — research the archive stands on, credited on the record it
 *     changed (the 1923 founding year: ד״ר אייל גרטמן וכפיר פרנקל);
 *   · `content/manual/asset-provenance.json` — the graphics, audio, film and scans, except
 *     what a script generated (`origin: procedural`), which credits nobody.
 *
 * What is never listed: a title that says it is NOT a citation (`לא אומת`, `לא נטען` —
 * rule 18 §1), a pointer to one of our own files (`content/…`, `scripts/…`), a schema
 * placeholder, and a LIFE source of kind `brief` (an internal document is not a source).
 *
 * Server-only: it reads the disk, and `content/manual` never reaches a browser (rule 1).
 */

export type CreditEntry = {
  /** stable within a build — the page keys on it */
  id: string
  title: string
  /** the one address every citation shares; otherwise the site they share; otherwise null */
  url: string | null
  host: string | null
  group: CreditGroupKey
  /** how many rows, records or photographs cite it */
  count: number
  /** the files it was read from, sorted */
  files: string[]
}

export type CreditGroup = { key: CreditGroupKey; entries: CreditEntry[]; count: number }

export type CreditsIndex = {
  groups: CreditGroup[]
  totals: { entries: number; citations: number; files: number }
  /** קהילה, אספנות וקישורים — beside the sources, never counted as one */
  community: CommunityShelf
}

/**
 * A community credit: somebody who keeps the club's memory, thanked by name. It is NOT a
 * source — no fact, asset or scan cites it, it is not in `totals`, and `groupOf` can never
 * put a citation here. `descKey` is the message the page prints under the name (rule 10).
 */
export type CommunityEntry = {
  id: string
  title: string
  url: string
  host: string | null
  descKey: 'credits.community.mishak-hashabbat.desc'
}

export type CommunityShelf = {
  entries: CommunityEntry[]
  /** the purchase links, straight from the merch registry, each carrying its disclosure */
  shops: readonly MerchLink[]
}

const MANUAL = 'content/manual'
const PROVENANCE = 'asset-provenance.json'
const LIFE_FILE = 'lib/life/history/days.ts'

/** rule 18 §1 — a title that says it could not be verified is not a citation */
const NO_CITATION = /לא אומת|לא נטען/
const INTERNAL = /^(content|scripts|lib|public|brand|docs)\//
const CREDIT_KEY = /^(credit|creditHe|photographer|photographerHe)$/
const RESEARCH_KEY = /^researchCredit(He)?$/
/** a schema placeholder, and a match the importer REFUSED, cite nothing */
const SKIP_KEY = /^(schema|refusedMatches)$/

/* ------------------------------------------------------------------ grouping */

const HOSTS: ReadonlyArray<readonly [RegExp, CreditGroupKey]> = [
  [/(^|\.)(htafc\.co\.il|hapoeluta\.com|ultrashapoel\.com|maccabi\.co\.il)$/, 'club'],
  [/(^|\.)(red-fans\.com|wikipedia\.org|maccabipedia\.co\.il)$/, 'wiki'],
  [/(^|\.)(footballkitarchive\.com|colours-of-football\.com)$/, 'photo'],
  [
    /(^|\.)(worldfootball\.net|rsssf\.org|wildstat\.com|uefa\.com|basket\.co\.il|ibasketball\.co\.il|euroleaguebasketball\.net|guidestar\.org\.il)$/,
    'data',
  ],
  [
    /(^|\.)(ynet\.co\.il|walla\.co\.il|one\.co\.il|sport5\.co\.il|maariv\.co\.il|haaretz\.co\.il|israelhayom\.co\.il|calcalist\.co\.il|globes\.co\.il|kan\.org\.il|skysports\.com|espn\.com|eurohoops\.net|ballerz\.co\.il|haokets\.org|schwatzgelb\.de)$/,
    'press',
  ],
]

const TITLES: ReadonlyArray<readonly [RegExp, CreditGroupKey]> = [
  [/ויקיפועל|ויקיפדיה|wikipedia|maccabipedia/i, 'wiki'],
  [/footballkitarchive|colours-of-football|באדיבות|צילום:|צילומים:/i, 'photo'],
  [/rsssf|uefa|worldfootball|wildstat|מנהלת ליגת/i, 'data'],
  [/ynet|walla|וואלה|\bONE\b|ערוץ הספורט|sport1|ספורט1|מעריב|ידיעות|הארץ|haaretz|globes|גלובס|כלכליסט|ישראל היום/i, 'press'],
  [/צוות The Worker|ספריית הפרויקט/, 'team'],
]

function hostOf(url: string | null): string | null {
  if (!url || !/^https?:\/\//.test(url)) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Which shelf a citation goes on. The address decides first; a title without one decides by its words. */
export function groupOf(title: string, url: string | null): CreditGroupKey {
  if (title.startsWith(OWNER_KNOWLEDGE_LABEL)) return 'team'
  const host = hostOf(url)
  if (host) for (const [pattern, group] of HOSTS) if (pattern.test(host)) return group
  for (const [pattern, group] of TITLES) if (pattern.test(title)) return group
  return 'other'
}

/* ------------------------------------------------------------------ reading */

type Citation = { title: string; url: string | null; file: string; group?: CreditGroupKey; count?: number }
type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type Keyed = { title: string; url: string | null; credit: string | null }

const str = (value: Json | undefined): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null)
const address = (value: Json | undefined): string | null => {
  const url = str(value)
  return url && /^https?:\/\//.test(url) ? url : null
}

function readFile(file: string, json: Json, out: Citation[]): void {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return
  const keyed = new Map<string, Keyed>()
  const top = json.sources
  if (Array.isArray(top)) {
    for (const item of top) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const key = str(item.key)
      const title = str(item.title)
      if (key && title) keyed.set(key, { title, url: address(item.url), credit: str(item.credit) })
    }
  }
  // a keyed source earns its place through the rows that name it
  const keyedHits = new Map<string, number>()
  const keyedCredits = new Map<string, number>()

  const visit = (node: Json, depth: number): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1)
      return
    }
    if (!node || typeof node !== 'object') return
    const title = str(node.sourceTitle)
    if (title) out.push({ title, url: address(node.sourceUrl), file })

    const named = typeof node.source === 'string' ? [node.source] : Array.isArray(node.sources) && node.sources.every((s) => typeof s === 'string') ? (node.sources as string[]) : []
    for (const name of named) {
      if (!keyed.has(name)) continue
      if (!title) keyedHits.set(name, (keyedHits.get(name) ?? 0) + 1)
      if (keyed.get(name)?.credit) keyedCredits.set(name, (keyedCredits.get(name) ?? 0) + 1)
    }

    const source = node.source
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      const sourceTitle = str(source.title)
      const url = address(source.url)
      // an address makes it a source; so does the owner-knowledge label (the enemies
      // ranking, the calls) — his knowledge is a source with no URL by nature (rule 18)
      if (sourceTitle && (url || sourceTitle.startsWith(OWNER_KNOWLEDGE_LABEL))) out.push({ title: sourceTitle, url, file })
    }

    for (const [name, value] of Object.entries(node)) {
      const text = str(value)
      if (text && CREDIT_KEY.test(name)) out.push({ title: text, url: address(node.sourceUrl) ?? address(node.url), file, group: 'photo' })
      if (text && RESEARCH_KEY.test(name)) out.push({ title: text, url: address(node.sourceUrl), file, group: 'research' })
      if (SKIP_KEY.test(name) || (depth === 0 && name === 'sources')) continue
      if (value && typeof value === 'object') visit(value, depth + 1)
    }
  }

  visit(json, 0)
  for (const [name, count] of keyedHits) {
    const source = keyed.get(name) as Keyed
    out.push({ title: source.title, url: source.url, file, count })
  }
  for (const [name, count] of keyedCredits) {
    const source = keyed.get(name) as Keyed
    out.push({ title: source.credit as string, url: source.url, file, group: 'photo', count })
  }
}

function readProvenance(file: string, json: Json, out: Citation[]): void {
  if (!json || typeof json !== 'object' || Array.isArray(json) || !Array.isArray(json.records)) return
  for (const row of json.records) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    if (row.origin === 'procedural') continue
    const title = str(row.sourceTitle)
    if (title) out.push({ title, url: address(row.sourceUrl), file, group: 'assets' })
  }
}

function readLife(out: Citation[]): void {
  for (const day of Object.values(HISTORY_DAYS)) {
    for (const source of day.sources) {
      if (source.kind === 'brief') continue
      out.push({ title: source.titleHe, url: source.url ?? null, file: LIFE_FILE })
    }
  }
}

/* ------------------------------------------------------------------ the index */

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function entryId(group: CreditGroupKey, index: number): string {
  return `${group}-${index + 1}`
}

/** Every citation in `content/manual` and LIFE's history, as the page reads it. */
export function collectCitations(root: string = process.cwd()): Citation[] {
  const out: Citation[] = []
  const names = readdirSync(join(root, MANUAL))
    .filter((name) => name.endsWith('.json'))
    .sort(byCodePoint)
  for (const name of names) {
    const file = `${MANUAL}/${name}`
    const json = JSON.parse(readFileSync(join(root, file), 'utf8')) as Json
    if (name === PROVENANCE) readProvenance(file, json, out)
    else readFile(file, json, out)
  }
  readLife(out)
  return out.filter((row) => !NO_CITATION.test(row.title) && !INTERNAL.test(row.title))
}

/**
 * הקהילה — thanked, not cited. Name and address come from the merch registry so the site is
 * spelled once in the product; the description is the page's own words (messages).
 */
const COMMUNITY_ROWS: ReadonlyArray<{ merchId: string; descKey: CommunityEntry['descKey'] }> = [
  { merchId: 'mishak-hashabbat', descKey: 'credits.community.mishak-hashabbat.desc' },
]

export function communityShelf(): CommunityShelf {
  const entries = COMMUNITY_ROWS.flatMap(({ merchId, descKey }): CommunityEntry[] => {
    const link = merchLink(merchId)
    if (!link) return []
    return [{ id: `community-${link.id}`, title: link.nameHe, url: link.url, host: hostOf(link.url), descKey }]
  })
  return { entries, shops: MERCH_LINKS }
}

let cached: CreditsIndex | null = null

/** The page's data: citations deduplicated by title, counted, grouped, in page order. */
export function creditsIndex(root?: string): CreditsIndex {
  if (cached && root === undefined) return cached
  const citations = collectCitations(root)
  type Acc = { title: string; group: CreditGroupKey; count: number; files: Set<string>; urls: Map<string, number> }
  const byTitle = new Map<string, Acc>()
  for (const row of citations) {
    const title = row.title.replace(/\s+/g, ' ')
    const group = row.group ?? groupOf(title, row.url)
    const key = `${group}\u0001${title}`
    const acc = byTitle.get(key) ?? { title, group, count: 0, files: new Set<string>(), urls: new Map<string, number>() }
    acc.count += row.count ?? 1
    acc.files.add(row.file)
    if (row.url) acc.urls.set(row.url, (acc.urls.get(row.url) ?? 0) + 1)
    byTitle.set(key, acc)
  }

  const groups: CreditGroup[] = CREDIT_GROUPS.map((group) => {
    const rows = [...byTitle.values()]
      .filter((acc) => acc.group === group)
      .sort((a, b) => b.count - a.count || byCodePoint(a.title, b.title))
    const entries = rows.map((acc, index): CreditEntry => {
      const urls = [...acc.urls.entries()].sort((a, b) => b[1] - a[1] || byCodePoint(a[0], b[0]))
      const hosts = new Set(urls.map(([url]) => hostOf(url)))
      const first = urls[0]?.[0] ?? null
      // one address → that page; many pages on one site → the site; many sites → no link
      const url = urls.length <= 1 ? first : hosts.size === 1 && first ? new URL(first).origin : null
      return {
        id: entryId(group, index),
        title: acc.title,
        url,
        host: url ? hostOf(url) : hosts.size === 1 ? ([...hosts][0] ?? null) : null,
        group,
        count: acc.count,
        files: [...acc.files].sort(byCodePoint),
      }
    })
    return { key: group, entries, count: entries.reduce((sum, entry) => sum + entry.count, 0) }
  }).filter((group) => group.entries.length > 0)

  const files = new Set(citations.map((row) => row.file))
  const index: CreditsIndex = {
    groups,
    totals: {
      entries: groups.reduce((sum, group) => sum + group.entries.length, 0),
      citations: groups.reduce((sum, group) => sum + group.count, 0),
      files: files.size,
    },
    community: communityShelf(),
  }
  if (root === undefined) cached = index
  return index
}
