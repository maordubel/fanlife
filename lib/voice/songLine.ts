import { hashSeed } from './hash'
import { SONGS, type SongContext, type SongSurface } from './songs'
import type { Mood } from './types'

/**
 * Songs in context (ONE RED WORLD §3) — the ONE small line a screen may carry.
 *
 * What a line holds is the registry's METADATA and nothing else: the title, the attribution
 * "מהיציע", and the wiki page it came from (rule 12, §3.2: no verse is stored, shown or
 * shared — `SongLineData` has no field that could carry one, and `tests/songs-context.test.ts`
 * asserts that).
 *
 *   · **One per screen.** A surface has exactly one slot, and the three screens that carry it
 *     (the daily recap, the archive landing, a LIFE chapter recap) each render `SongLine` once.
 *   · **Deterministic.** The same date (daily, archive) or the same chapter (LIFE) always
 *     names the same song — a line that changes on reload reads as noise, not as the terrace.
 *   · **The floor is the registry's.** A song below confidence 2 is surfaced on `archive`
 *     only (`songs.ts` sets its surfaces); this file never widens that.
 *   · **Where the mood fits.** Each surface names the mood it speaks in; a surface whose mood
 *     has no song falls back to any song the registry allows there, never to another surface.
 */

export type SongLineSurface = Extract<SongSurface, 'daily' | 'archive' | 'life'>

export type SongLineData = {
  id: string
  title: string
  /** always a ויקיפועל `index.php?title=` page — the song's own, or the category it sits in */
  sourceUrl: string
}

export const SONG_LINE_MOOD: Readonly<Record<SongLineSurface, Mood>> = {
  // the day's three are done: belonging — we were here today
  daily: 'belonging',
  // the archive's front door: identity — who we are, a hundred years of it
  archive: 'identity',
  // a chapter of a life closed: love — of one man, of the club, of a Saturday
  life: 'love',
}

function poolFor(surface: SongLineSurface, songs: readonly SongContext[]): SongContext[] {
  const allowed = songs.filter((song) => song.surfaces.includes(surface))
  const fitting = allowed.filter((song) => song.moods.includes(SONG_LINE_MOOD[surface]))
  return fitting.length ? fitting : allowed
}

export function songLine(surface: SongLineSurface, seed: string | number, songs: readonly SongContext[] = SONGS): SongLineData | null {
  const pool = poolFor(surface, songs)
  if (pool.length === 0) return null
  const song = pool[hashSeed(`${seed}|songline:${surface}`) % pool.length]
  return song ? { id: song.id, title: song.title, sourceUrl: song.sourceUrl } : null
}
