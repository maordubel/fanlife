import 'server-only'

import { allPlayers, namesOf, type PlayerMasterRecord } from '@/lib/archive/player-master'
import { fold } from './roster-search'

/**
 * סינון השחקנים — position and origin, only where a source says so.
 *
 * Maor: *"אני רוצה שתעשה סינון של כל רשימות השחקנים לפי עמדה. לפי זר/ישראלי… קשה
 * שמופיעים כל רשימות השחקנים בבת אחת."* He is right about the problem — 637 names in
 * one column is a wall — and the honest answer to it is narrower than it looks.
 *
 * **The archive holds 637 names and almost no positions.** `players-roster.json` has
 * exactly four fields and three of them are the name. Rule 24 already recorded the
 * consequence for the polls wing: *"a 'goalkeepers' shortlist would have to be guessed,
 * and one striker in it would make the wing untrustworthy."* Guessing a position from a
 * shirt number, from an era, or from a name is the same mistake wearing a better hat.
 *
 * So the facets are built ONLY from rows that state them, and every one of them says
 * where it came from:
 *
 *   · **`squad`** — `squads.json` carries `position` and `nationalityHe` per player.
 *     That is the strongest evidence there is, and it covers the current squad.
 *   · **`database`** — `player-facts.json`, the merged research file. It is built from
 *     five sources by `scripts/players/pipeline.sh`, and every row says which one
 *     decided it:
 *
 *       vikipoel  · **ויקיפועל**, the club's own encyclopedia (`wiki.red-fans.com`) —
 *                   638 players, and the list our own roster was born from. It is the
 *                   strongest source for two of the three questions: "foreign or
 *                   Israeli", because its `שחקנים זרים (כדורגל)` category is the CLUB's
 *                   own record of who took a foreign slot rather than a guess from
 *                   citizenship; and the years, because every page carries a
 *                   `סגל הפועל ת"א (כדורגל) YYYY/YY` category for each season he was in
 *                   the squad. Cloudflare blocks it to automated access, so it was read
 *                   through Maor's own browser and checked against it by SHA-256.
 *       wiki-he   · ויקיפדיה העברית, קטגוריה "כדורגלני הפועל תל אביב" — 433 articles.
 *                   The position is the man's career position in his own article, and
 *                   the years are the years he is listed at the club.
 *       wiki-en   · English Wikipedia, Category:Hapoel Tel Aviv F.C. players — 418
 *                   articles, of which 58 have no Hebrew article at all.
 *       wf-all    · worldfootball's all-time table — 552 players, position and
 *                   nationality each.
 *       wf-season · worldfootball's 73 season squads, 1933/34 → 2025/26 — the weakest
 *                   for position (one season's squad slot) and the strongest for the
 *                   question of WHICH seasons he was actually in the squad.
 *       archive-qualifier · the archive itself, where it distinguishes two men of the
 *                   same name by naming the position ("עומר פרץ (חלוץ)").
 *
 *     Nothing is guessed. A Hebrew name enters only through a match that was unique in
 *     both directions, and the ones that were not are printed by name — see
 *     `docs/09-player-facts.md` and the `refusedMatches` array in the file. Where the
 *     sources disagree, the strongest wins and the others are kept in `conflicts`
 *     rather than deleted.
 *   · **`lineup`** — `lineups.json` places eleven named men in `GK`/`D`/`M`/`F` slots.
 *     Those files carry `positionsInferred: true`, which the source itself is telling
 *     us: the slot is where he played THAT night, not a career position. It is recorded
 *     as an inference, labelled as one on screen, and any `database` row overrides it.
 *   · **`name`** — `shirt-numbers.json` marks `hebrewIsTransliteration` and sometimes
 *     carries `personNameLatin`. That is a documented fact about the SPELLING, so it
 *     supports "the source wrote this man's name in Latin" and nothing stronger. It is
 *     used for origin at the weakest tier, and a squad row always overrides it.
 *
 * Everything else comes back `null` and is shown as **לא מתועד** — a real bucket with a
 * real count, not a silent omission. That bucket is also the shopping list: it is the
 * exact set of players the archive would gain most from.
 *
 * **Measured over the 663 people the archive knows, before this research and after:**
 * position 64 → **633**, Israeli-or-foreign 103 → **654**, years-worn 137 → **648**, and
 * all three together 32 → **632**. Every one of the 653 players in the roster now has a
 * row. The **20** still without a position are the ones whose `תפקיד` field is empty on
 * ויקיפועל AND whose opening sentence states no role either — they read `לא מתועד`,
 * because that is what is true. (It was 23 until 17.9.2026, when the lead sentence
 * started being read as its own source; see `docs/12-player-roles.md`.)
 *
 * **`positions` is the same fact in its honest shape.** `תפקיד` is a LIST — 48 pages
 * write more than one role in it — so a man who played two positions carries both, with
 * `position` staying the single display value. Asking the sheet for defenders finds
 * שייע פייגנבוים, who was one before he was the club's greatest striker; asking for
 * strikers finds him too, and neither answer throws the other away.
 */

export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export type Origin = 'israeli' | 'foreign'
export type FacetSource = 'squad' | 'lineup' | 'database' | 'name'

export type PlayerFacets = {
  position: Position | null
  /**
   * Every playing position a source states, display value first — only where there is
   * more than one. `player-facts.json` carries it for the men whose ויקיפועל page lists
   * several roles (`מגן שמאלי, חלוץ` — שייע פייגנבוים, a left back who became the club's
   * greatest striker). The display value stays one; the others are not thrown away.
   */
  positions: Position[] | null
  positionFrom: FacetSource | null
  origin: Origin | null
  originFrom: FacetSource | null
  /** first and last season the archive can place him in, as four-digit years */
  fromYear: number | null
  toYear: number | null
}

/**
 * ## Through the Player Master (21.9.2026)
 *
 * The precedence above is unchanged and still decided in ONE place — but that place is
 * now `scripts/players/build-master.ts`, which applies it per PERSON rather than per
 * spelling. The index below is a view: every spelling the master knows for a man points
 * at the same facets, so `facetsFor('עמרי אפק')` and `facetsFor('עומרי אפק')` are one
 * answer, and a shirt-number row filed under `גילי ורמוט` now widens גיל ורמוט's years
 * instead of describing a man who never existed.
 */

/** One person's facets, read off his master record — the view `rosterIndex()` also uses. */
export function facetsOfPlayer(player: PlayerMasterRecord): PlayerFacets {
  const codes = player.positions.codes
  return {
    position: codes[0] ?? null,
    positions: codes.length > 1 ? [...codes] : null,
    positionFrom: player.positions.from,
    origin: player.origin.value,
    originFrom: player.origin.from,
    fromYear: player.years.from,
    toYear: player.years.to,
  }
}

let cache: Map<string, PlayerFacets> | null = null

/** Keyed on the FOLDED name — every spelling of a person maps to his one facets object. */
export function facetIndex(): Map<string, PlayerFacets> {
  if (cache) return cache
  const index = new Map<string, PlayerFacets>()
  const shared = new Set<string>()
  for (const player of allPlayers()) {
    const facets = facetsOfPlayer(player)
    for (const name of namesOf(player)) {
      const key = fold(name)
      const found = index.get(key)
      if (found && found !== facets) shared.add(key)
      else index.set(key, facets)
    }
  }
  // A spelling two people share names nobody (rule 7) — never the first one to arrive.
  for (const key of shared) index.delete(key)
  cache = index
  return index
}

export function facetsFor(nameHe: string): PlayerFacets | undefined {
  return facetIndex().get(fold(nameHe))
}
