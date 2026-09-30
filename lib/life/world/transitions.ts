/**
 * מעברונים — the city between one room and the next, in the decade the life is in.
 *
 * Maor found the film (Meir Mendelssohn, Tel Aviv 1989), found the promenade in it at
 * minute sixteen, and said what it was: the road between Bloomfield and Ussishkin. The
 * clips were cut on 5.9.2026 and then sat in `public/life/film` unplayed, which is the
 * worst state a thing can be in.
 *
 * The rules that keep a transition from becoming an interruption:
 *
 *  1. **Only where the journey means something.** South to north, the walk out of the
 *     house on the morning of a big day, the road to the ground. Not every door.
 *  2. **Once per chapter, per clip.** `own:film:*` survives the day, so a boy who walks
 *     the promenade four times on the same Saturday sees it the first time and remembers
 *     it the other three. The flag prefix is `own:` for exactly that reason.
 *  3. **Four seconds, and it cannot be paused.** It is a breath between rooms, not a
 *     cutscene: the archive film has its own channel and its own rules.
 *  4. **The clip fits the hour.** A morning street in the morning, lights at night. The
 *     window is checked against the clock, so the game never cuts to daylight at ten.
 *  5. **It has to be a door that exists.** The first version of this table routed the
 *     promenade between `route` and `ussishkin-outside` — a journey nobody can make,
 *     because there is no door between them. Three of nine cuts could never have played,
 *     which is the exact failure the clips were sitting in already. `tests/life-keys`
 *     now checks every cut against the world's own door graph.
 *  6. **הסרט הוא של השנה.** 7.9.2026: Maor sent two more films and asked for a proper
 *     spread across the whole set. The answer is not more clips from the same afternoon —
 *     it is that the SAME journey looks different in 1986 and in 1996, because it was.
 *     Every cut below names one clip per decade: the 1989 reel for the eighties, a home
 *     video shot on 5.4.1995 for the nineties. A decade with no clip falls back to the
 *     eighties one rather than playing nothing, so a new chapter is never silent by
 *     omission.
 *
 *     The third film he sent — the Frishman promenade at 720p, the best-looking of the
 *     three — is deliberately not in this table. It is contemporary footage and this game
 *     ends in 2000; a 2015 bicycle between two rooms in 1986 is the one thing this project
 *     does not do. `scripts/life/cut-film.py` records it and why.
 */

import type { LocationId } from '../types'

/** the decades this game has film for */
export type FilmEra = '80s' | '90s' | '00s'

export type FilmCut = {
  /**
   * the clip's key in `public/life/film`, per decade.
   *
   * `'80s'` is required and is the fallback: a chapter in a decade nobody has film for
   * still gets a transition rather than a hard cut.
   */
  clip: { '80s': string; '90s'?: string; '00s'?: string }
  from: LocationId
  to: LocationId
  /** the hours it may play in, as minutes from midnight */
  after?: number
  before?: number
  /** chapters it belongs to; omitted means every chapter */
  eras?: readonly string[]
  /** what the player is looking at, for the caption under it */
  captionHe: string
}

const HOUR = (h: number, m = 0) => h * 60 + m

export const FILM_CUTS: readonly FilmCut[] = [
  // ------------------------------------------------ דרום → צפון, ובחזרה ------------
  //
  // The one journey this film was cut for. Maor found it himself: the promenade at minute
  // sixteen is the road between the south of the city and the Yarkon.
  //
  // 6.9.2026: it moved a door. The walk north used to start on the child's own pavement,
  // because the hall was one turning off it; now it starts where a walk north actually
  // starts, which is town. That is also the better cut — a boy leaving HIS street for the
  // river is a bigger jump than the film can carry, and a boy leaving Allenby for it is
  // exactly the distance the promenade covers.
  {
    clip: { '80s': 'promenade-dusk', '90s': 'promenade-95' },
    from: 'allenby',
    to: 'ussishkin-outside',
    captionHe: 'הטיילת, בדרך צפונה',
  },
  {
    clip: { '80s': 'promenade-walk', '90s': 'boardwalk-95' },
    from: 'ussishkin-outside',
    to: 'allenby',
    captionHe: 'הטיילת, בדרך חזרה',
  },
  // …and the way into town itself: out of the neighbourhood, into the city. `market` is
  // the right four seconds for it — awnings, a pavement, people crossing in front of the
  // lens — and it is free here because the kiosk cut below is capped at three in the
  // afternoon while this one only plays after it.
  {
    clip: { '80s': 'market', '90s': 'promenade-rail-95' },
    from: 'street',
    to: 'allenby',
    after: HOUR(15),
    captionHe: 'לתוך העיר',
  },

  // ------------------------------------------------------- הדרך למגרש -------------
  {
    clip: { '80s': 'sea-wall', '90s': 'breakwater-95' },
    from: 'route',
    to: 'bloomfield-outside',
    captionHe: 'הולכים אל משהו',
  },
  {
    clip: { '80s': 'night-lights', '90s': 'sea-road-95' },
    from: 'street',
    to: 'route',
    after: HOUR(18, 30),
    captionHe: 'הרחוב בערב משחק',
  },
  {
    clip: { '80s': 'palms-evening', '90s': 'jaffa-95' },
    from: 'route',
    to: 'street',
    after: HOUR(19),
    captionHe: 'הדרך הביתה',
  },

  // ------------------------------------------------------- היציאה מהבית -----------
  {
    clip: { '80s': 'street-morning', '90s': 'street-cars-95' },
    from: 'home',
    to: 'street',
    before: HOUR(11),
    captionHe: 'בוקר, בחוץ',
  },
  {
    clip: { '80s': 'market', '90s': 'shops-95' },
    from: 'street',
    to: 'kiosk',
    before: HOUR(15),
    captionHe: 'הדרך לקיוסק',
  },
  {
    clip: { '80s': 'alley-shade', '90s': 'shops-95' },
    from: 'street',
    to: 'pitch',
    captionHe: 'הסמטה',
  },
  {
    clip: { '80s': 'plaza-evening', '90s': 'bus-street-95' },
    from: 'street',
    to: 'bus-station',
    captionHe: 'העיר, בדרך החוצה',
  },
]

/** the flag that says this clip has already played in this chapter */
export const filmFlag = (clip: string, chapter: string) => `own:film:${clip}:${chapter}`

/**
 * Which clip, if any, belongs between these two rooms right now.
 *
 * Returns nothing far more often than it returns something, and that is the design: a
 * transition that plays on every door is a loading screen with a view.
 */
export const eraOfYear = (year: number): FilmEra => (year >= 2000 ? '00s' : year >= 1990 ? '90s' : '80s')

/** which clip this cut plays in this decade — the eighties reel is the fallback */
export const clipOf = (cut: FilmCut, era: FilmEra): string => cut.clip[era] ?? cut.clip['80s']

export function cutFor(
  from: LocationId,
  to: LocationId,
  minute: number,
  chapter: string,
  flags: Record<string, unknown>,
  era: FilmEra = '80s',
): { cut: FilmCut; clip: string } | null {
  for (const cut of FILM_CUTS) {
    if (cut.from !== from || cut.to !== to) continue
    if (cut.eras && !cut.eras.includes(chapter)) continue
    if (cut.after !== undefined && minute < cut.after) continue
    if (cut.before !== undefined && minute >= cut.before) continue
    const clip = clipOf(cut, era)
    if (flags[filmFlag(clip, chapter)]) continue
    return { cut, clip }
  }
  return null
}
