/**
 * The songs — read as METADATA, never as lyrics.
 *
 * 261 pages across five categories: `שירים מהיציע` (the terrace), `שירי שחקנים` (a song
 * for one player), `שירים`, `שירי משטרה` and `שירי שואה`. The page shape is a
 * `{{שיר מהיציע}}` infobox — שם · ביצוע · שיר מקורי · מנגינה · מחבר · שנה · הערות —
 * followed by `==רקע==`, `==מילות השיר==`, sometimes `==אקורדים==`, and the links.
 *
 * **The lyrics section is located in order to be EXCLUDED.** Rule 12 already said a
 * question is built from a song's title, tune, subject and year and never prints verses;
 * this reader is where that becomes structural rather than a habit. `==מילות השיר==` is
 * parsed only to know where the background ends.
 *
 * **On the wiki's own marks, and what the owner decided.** A page opening `{{צנזורה}}`
 * is the site's own content flag, and `שירי שואה` is a category the site maintains. The
 * first version of this reader set `usableInApp: false` for both — 14 of 261 — and that
 * was raised with Maor rather than shipped quietly, because four of the fourteen are the
 * anthems (`אדום עולה בבלומפילד`, `תמיד אנחנו איתך`, `הקבוצה שלי הפועל`,
 * `רק בשבילך הפועל כתבתי שיר`) and a song wing without them is not a song wing.
 * On 2.9.2026 he approved every song, and the language in them, in his own words. So
 * `usableInApp` is true for all 261: a song is a legitimate SUBJECT — its tune, its year,
 * its player, its background — and no question was ever going to print a verse anyway.
 * `lyricsRestricted` is what survives of the flag. It marks the pages the wiki itself
 * marked, and it means one thing: **if a feature is ever built that displays lyrics,
 * these verses are not in it.** Nothing today displays lyrics, and nothing stores them —
 * see the note above. The flag exists so that a later feature cannot quietly acquire
 * them.
 */

import { extractCategories, extractTemplate } from '../adapters/mediawiki'
import { slugify } from '@/scripts/ingest/lib/normalize'
import type { IngestReport } from '@/scripts/ingest/lib/report'
import type {
  Confidence,
  RawPage,
  SourceRef,
  Sport,
  StagedSong,
} from '@/scripts/ingest/lib/types'

const WIKI_CONFIDENCE: Confidence = 1

const SONG_TEMPLATES = ['שיר מהיציע', 'שיר', 'שיר שחקן'] as const

/** The wiki's own content warning, written as the first thing on the page. */
const CENSORED = /\{\{\s*צנזורה\s*\}\}/u

/** Categories whose members are stored but never asked about. */
export const BLOCKED_CATEGORIES = ['שירי שואה'] as const

/** Where the verses start. Everything from here to the next heading is not read. */
const LYRICS_HEADING = /^=+\s*(?:מילות השיר|מילים|הבית|בית המשך|אקורדים[^=]*)\s*=+/mu

export type SongClass = {
  songType: StagedSong['songType']
  categories: string[]
}

/**
 * The category decides the kind. A page in more than one takes the most specific:
 * a song about one player is a player song even when the terrace sings it.
 */
export function classifySong(categories: readonly string[]): SongClass | null {
  const names = categories.map((name) => name.replace(/^קטגוריה:\s*/u, '').trim())
  const has = (name: string): boolean => names.includes(name)

  if (has('שירי שחקנים')) return { songType: 'player_song', categories: names }
  if (has('שירים מהיציע')) return { songType: 'terrace_song', categories: names }
  if (has('שירים')) return { songType: 'club_song', categories: names }
  return null
}

export function isBlocked(sourceText: string, categories: readonly string[]): string | null {
  if (CENSORED.test(sourceText)) return 'the page carries the wiki’s own {{צנזורה}} mark'
  const names = categories.map((name) => name.replace(/^קטגוריה:\s*/u, '').trim())
  const hit = BLOCKED_CATEGORIES.find((blocked) => names.includes(blocked))
  return hit ? `the wiki files it under ${hit}` : null
}

/**
 * The background paragraph — the prose BEFORE the lyrics heading, with the infobox and
 * the templates stripped. This is the only body text that travels, and it is what a
 * question can legitimately be built from.
 */
export function backgroundOf(sourceText: string): string | null {
  const cut = LYRICS_HEADING.exec(sourceText)
  const head = cut ? sourceText.slice(0, cut.index) : sourceText
  const prose = head
    .replace(/\{\{[^{}]*\}\}/gu, ' ')
    .replace(/\{\{[\s\S]*?\}\}/gu, ' ')
    .replace(/^=+[^=]*=+$/gmu, ' ')
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/gu, '$2')
    .replace(/'''?/gu, '')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return prose.length >= 20 ? prose : null
}

/**
 * A player song names both its tune and its player IN THE TITLE.
 *
 * The category's own convention, visible across all 49 pages:
 * `<שם השיר המקורי> - <שם השחקן>`, sometimes with several players after the dash
 * (`מאמי - אבי אזולאי, יואב בר, יניב גרין`) and sometimes with no spaces around it
 * (`16 מלאו לנער-ביברס נאתכו`). Reading it is reading the source; the infobox names a
 * tune on exactly ONE of the 49, so a reader that only looked there threw the pairing
 * away.
 *
 * Split on the LAST dash, because a tune name may contain one. A right-hand side that
 * does not look like a list of personal names is not a player, and then nothing is
 * claimed — the title stays whole.
 */
const NAME_LIKE = /^[\u0590-\u05FFA-Za-z'"’.\- ]+$/u

export function splitPlayerTitle(
  title: string,
): { originalTitle: string; people: string[] } | null {
  const dash = Math.max(title.lastIndexOf(' - '), title.lastIndexOf('-'))
  if (dash <= 0) return null
  const left = title.slice(0, dash).trim()
  const right = title.slice(dash + (title.slice(dash, dash + 3) === ' - ' ? 3 : 1)).trim()
  if (!left || !right) return null

  const people = right
    .split(/[,،]/u)
    .map((part) => part.trim())
    .filter(Boolean)
  const plausible =
    people.length > 0 &&
    people.every(
      (name) =>
        NAME_LIKE.test(name) &&
        name.split(/\s+/u).length >= 2 &&
        name.split(/\s+/u).length <= 4 &&
        name.length <= 32,
    )
  return plausible ? { originalTitle: left, people } : null
}

export type SongRead = {
  songs: StagedSong[]
  /** Songs whose VERSES stay out of any future lyrics feature. Not a game restriction. */
  lyricsRestricted: Array<{ slug: string; titleHe: string; reason: string }>
}

export function songsFromPages(
  pages: readonly RawPage[],
  options: { sport?: Sport; source?: (page: RawPage) => SourceRef },
  report: IngestReport,
): SongRead {
  const songs = new Map<string, StagedSong>()
  const lyricsRestricted: SongRead['lyricsRestricted'] = []

  for (const page of pages) {
    const categories = extractCategories(page.sourceText)
    const kind = classifySong(categories)
    if (!kind) {
      report.skipped.push({
        entity: 'songs',
        key: page.title,
        reason: 'no song category on the page',
      })
      continue
    }

    const fields = firstTemplate(page.sourceText) ?? {}
    const slug = slugify(page.title)
    if (songs.has(slug)) continue

    const reason = isBlocked(page.sourceText, categories)
    if (reason) lyricsRestricted.push({ slug, titleHe: page.title, reason })

    // `שם` is often `{{PAGENAME}}`; the page title is the truth either way.
    const stated = pick(fields, ['שם'])
    const titleHe = stated && !stated.includes('{{') ? stated : page.title

    // A player song's title states the tune and the player; anywhere else, guessing
    // which linked name is the subject would be inventing.
    const split = kind.songType === 'player_song' ? splitPlayerTitle(titleHe) : null
    const first = split?.people[0] ?? null

    songs.set(slug, {
      slug,
      titleHe,
      songType: kind.songType,
      personNameHe: split ? split.people.join(', ') : null,
      // One song, several players: the slug points at the first and the rest stay in
      // `personNameHe`. A single slug cannot honestly represent three people.
      personSlug: split && split.people.length === 1 && first ? slugify(first) : null,
      sport: options.sport ?? 'football',
      fanGroupSlug: null,
      seasonLabel: null,
      lyricsAuthorHe: cleanLink(pick(fields, ['מחבר'])),
      originalTitle: split?.originalTitle ?? cleanLink(pick(fields, ['שיר מקורי', 'מנגינה'])),
      originalArtist: null,
      backgroundHe: backgroundOf(page.sourceText),
      // Every song is a legitimate subject; the owner approved the whole corpus.
      usableInApp: true,
      source: options.source?.(page) ?? pageSource(page),
      confidence: WIKI_CONFIDENCE,
    })
  }

  report.note(
    `${songs.size} songs usable; ${lyricsRestricted.length} carry the wiki's own mark and are lyrics-restricted — no verse of theirs may appear in any future lyrics feature`,
  )

  return { songs: [...songs.values()], lyricsRestricted }
}

/* -------------------------------------------------------------------- utils */

function firstTemplate(sourceText: string): Record<string, string> | null {
  for (const name of SONG_TEMPLATES) {
    const fields = extractTemplate(sourceText, name)
    if (fields) return fields
  }
  return null
}

function pick(fields: Record<string, string>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = fields[key]?.trim()
    // `?` and an empty parameter are how this wiki writes "not known".
    if (value && value !== '?' && !/^https?:\/\/\S+$/u.test(value)) return value
  }
  return null
}

/** A field may hold `[[שם]]` or `[[עמוד|שם]]`; the name is what is wanted. */
function cleanLink(value: string | null): string | null {
  if (!value) return null
  const cleaned = value
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/gu, '$2')
    .replace(/https?:\/\/\S+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return cleaned || null
}

function pageSource(page: RawPage): SourceRef {
  return {
    naturalKey: `wiki:${page.title}@${page.revisionId ?? page.contentHash.slice(0, 12)}`,
    kind: 'wiki',
    title: page.title,
    url: page.url,
    pageTitle: page.title,
    revisionId: page.revisionId,
    retrievedAt: page.fetchedAt,
    note: null,
  }
}
