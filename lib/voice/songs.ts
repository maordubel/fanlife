import songsFile from '@/content/manual/songs.json'

import { hashSeed } from './hash'
import type { Mood } from './types'

/**
 * Song Context Registry (master plan §3) — built ONLY from what the repo already holds.
 *
 * The source is `content/manual/songs.json`: 18 songs, read from ויקיפועל's song
 * categories through the team's research document, stored as METADATA — title, type,
 * the player a song is for, the tune it borrows, a season. Rule 12 and §3.2 are the
 * same rule twice: **no verse is ever stored, shown or shared**, so `shortExcerpt` is
 * declared by the plan's type and stays `undefined` for every row. The validator in
 * `tests/voice.test.ts` fails the build the day one is filled.
 *
 * **What this registry cannot say, and why.** The wiki is closed to this environment
 * (rule 11: the sandbox proxy refuses it, and Cloudflare challenges automated readers),
 * so no song PAGE was ever opened from here. The rows carry the wiki's root as their
 * source, not a page address, and a page title is not guessed from a display title —
 * "Big Big World — גיא צרפתי" may or may not be the page's name. So every row points at
 * the category page the plan itself names (`קטגוריה:שירים`), which is a real page, and
 * says so in `pageKnown: false`. The route to per-song pages is the owner's export:
 * `Special:Export` of `קטגוריה:שירים` (and `שירים מהיציע`, `שירי שחקנים`) through
 * `scripts/ingest/songs-cli.ts` / `sources/wiki-export.ts` — see docs/19-red-voice.md.
 *
 * **Moods and surfaces are a classification, not a fact.** A player song is about love
 * of one man and who we are; a terrace song is belonging and the walk in. That mapping is
 * this file's judgement, stated here, and it claims nothing about any song's content.
 * A row below `confidence 2` (the terrace titles the source names without describing)
 * may be NAMED only in the archive — it never reaches a result, a share or the home.
 */

export type SongSurface = 'home' | 'result' | 'share' | 'archive' | 'life' | 'profile' | 'daily'

export type SongContext = {
  id: string
  title: string
  sourceUrl: string
  /** false: `sourceUrl` is the category page, the song's own page was never read */
  pageKnown: boolean
  eras?: string[]
  moods: Mood[]
  entities?: string[]
  matchIds?: string[]
  playerIds?: string[]
  seasonIds?: string[]
  /** the player the source says the song is for, in the source's words */
  personNameHe?: string
  surfaces: SongSurface[]
  /** §3.2 — never filled here. No lyrics. */
  shortExcerpt?: undefined
  attribution: true
  confidence: number
}

type SongRow = {
  slug: string
  titleHe: string
  songType: string
  sport: string
  personNameHe?: string
  seasonLabel?: string
  confidence: number
}

export const SONG_CATEGORY_URL = `https://wiki.red-fans.com/index.php?title=${encodeURIComponent('קטגוריה:שירים')}`

const MOODS_BY_TYPE: Readonly<Record<string, Mood[]>> = {
  player_song: ['love', 'identity'],
  terrace_song: ['belonging', 'entrance'],
  club_song: ['identity', 'belonging'],
}

const FULL_SURFACES: SongSurface[] = ['home', 'result', 'share', 'archive', 'life', 'profile', 'daily']

function toContext(row: SongRow): SongContext {
  const eras = row.seasonLabel ? [row.seasonLabel] : undefined
  return {
    id: row.slug,
    title: row.titleHe,
    sourceUrl: SONG_CATEGORY_URL,
    pageKnown: false,
    ...(eras ? { eras, seasonIds: eras } : {}),
    moods: MOODS_BY_TYPE[row.songType] ?? ['belonging'],
    ...(row.personNameHe ? { personNameHe: row.personNameHe } : {}),
    // rule 2's floor, applied to surfacing: below confidence 2 a title lives in the archive only
    surfaces: row.confidence >= 2 ? FULL_SURFACES : ['archive'],
    attribution: true,
    confidence: row.confidence,
  }
}

const rows = (songsFile as { records: SongRow[] }).records

/** Football only (rule 6): the registry is the football wing's; basketball has its own. */
export const SONGS: readonly SongContext[] = rows.filter((row) => row.sport === 'football').map(toContext)

/** Every song that may speak for a mood on a surface, in registry order. */
export function songsFor(mood: Mood, surface: SongSurface): SongContext[] {
  return SONGS.filter((song) => song.moods.includes(mood) && song.surfaces.includes(surface))
}

/** One song for the moment — deterministic by seed, like every other voice pick. */
export function songFor(request: { mood: Mood; surface: SongSurface; seed?: number | string }): SongContext | null {
  const pool = songsFor(request.mood, request.surface)
  if (pool.length === 0) return null
  return pool[hashSeed(`${request.seed ?? 0}|song:${request.mood}:${request.surface}`) % pool.length] ?? null
}

/** The registry's contract, as a list of problems — empty means valid. */
export function validateSongs(songs: readonly SongContext[] = SONGS): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const song of songs) {
    if (ids.has(song.id)) problems.push(`${song.id}: duplicate id`)
    ids.add(song.id)
    if (!song.title.trim()) problems.push(`${song.id}: no title`)
    if (!/^https:\/\/wiki\.red-fans\.com\/index\.php\?title=/.test(song.sourceUrl)) problems.push(`${song.id}: sourceUrl is not a wiki index.php?title= page`)
    if (song.attribution !== true) problems.push(`${song.id}: attribution must be true`)
    if (song.shortExcerpt !== undefined) problems.push(`${song.id}: carries an excerpt — no lyrics (rule 12, §3.2)`)
    if (song.moods.length === 0) problems.push(`${song.id}: no mood`)
    if (song.surfaces.length === 0) problems.push(`${song.id}: no surface`)
    if (song.confidence < 2 && song.surfaces.some((s) => s !== 'archive')) problems.push(`${song.id}: below confidence 2 outside the archive`)
  }
  return problems
}
