import 'server-only'

import competitionsFile from '@/content/manual/competitions.json'
import { archive, nameOf } from '@/lib/game/archive'
import { rosterIndex, type RosterIndex } from '@/lib/game/allTimeXI'

/**
 * ה-פועל — the club itself, assembled for the wing that carries its name.
 *
 * Until now the club had no front door. `/` is the GROUND (a gate plan), `/ussishkin`
 * is the hall, and every fact about Hapoel Tel Aviv itself — the trophies, the crests,
 * the kits, the songs, the 637 players, the 305 shirt numbers — was reachable only by
 * walking into a quiz about it. The archive is the core asset of this project and it
 * sat behind the games rather than in front of them.
 *
 * So this module reads the football side of the archive the way a supporter asks about
 * it: what did we win, what did the badge look like, what do we sing, who wore the
 * shirt. Everything is COUNTED rather than typed — the same discipline as
 * `countTitles()` in the 1986 finale — because a number that is typed is a number that
 * goes stale the day a row is added.
 *
 * Rule 14: everything here is football. The basketball lives at `/ussishkin`, and the
 * two never share a table.
 */

export type HonourLine = {
  slug: string
  nameHe: string
  won: string[]
  runnerUp: string[]
  type: string
}

/** Every competition the club has a recorded result in, most-won first. */
export function honours(): HonourLine[] {
  const football = archive.trophies.filter((row) => row.sport === 'football')
  const bySlug = new Map<string, HonourLine>()
  // `competitions` is loaded without a `type` on its row shape, so the kind of trophy
  // is read from the file the archive loaded rather than re-declared here.
  const kindOf = new Map(
    (competitionsFile as { records: Array<{ slug: string; type?: string }> }).records.map(
      (row) => [row.slug, row.type ?? 'other'] as const,
    ),
  )
  for (const row of football) {
    const line: HonourLine = bySlug.get(row.competitionSlug) ?? {
      slug: row.competitionSlug,
      nameHe: nameOf.competition(row.competitionSlug),
      won: [],
      runnerUp: [],
      type: kindOf.get(row.competitionSlug) ?? 'other',
    }
    if (row.result === 'won') line.won.push(row.seasonLabel)
    else line.runnerUp.push(row.seasonLabel)
    bySlug.set(row.competitionSlug, line)
  }
  return [...bySlug.values()]
    .map((line) => ({
      ...line,
      won: [...line.won].sort(),
      runnerUp: [...line.runnerUp].sort(),
    }))
    .sort((a, b) => b.won.length - a.won.length || a.nameHe.localeCompare(b.nameHe, 'he'))
}

/** The badge, stage by stage, oldest first. `imageKey` is null where none was supplied. */
export function crestStages() {
  return [...archive.crests]
    .filter((row) => row.sport === 'football')
    .sort((a, b) => a.fromYear - b.fromYear)
}

/**
 * The songs, split the way the terrace splits them.
 *
 * No verse is printed anywhere — rule 12: a song is used through its METADATA, its
 * title, its tune and who it is about. That constraint is also why this reads well:
 * "על הלחן של Bella Ciao" is more interesting than the words would have been.
 */
export function songbook() {
  const football = archive.songs.filter((row) => row.sport === 'football')
  return {
    terrace: football.filter((row) => row.songType !== 'player_song'),
    player: football.filter((row) => row.songType === 'player_song'),
  }
}

/** The people who wore it, with whatever the archive can say about each. */
export function players(): RosterIndex {
  return rosterIndex()
}

/** Counted once here, so no screen prints a total it worked out for itself. */
export function clubCounts() {
  const football = archive.trophies.filter((row) => row.sport === 'football')
  return {
    trophies: football.filter((row) => row.result === 'won').length,
    kits: archive.kitDesigns.length,
    songs: archive.songs.filter((row) => row.sport === 'football').length,
    shirtNumbers: archive.shirtNumbers.length,
    euroTies: archive.euroTies.length,
  }
}
