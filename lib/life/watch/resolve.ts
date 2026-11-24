/**
 * LIFE · the WATCH LAYER — the resolver and the player's URLs. Pure.
 *
 * `watchFor` answers from the curated record and from nothing else. An unknown club, a night no file ties a film
 * to, a malformed id: null. The embed is `youtube-nocookie.com` (the same choice the Worker's cutscene made: the
 * player may be a child) and the card loads it only after a tap; the plain link goes to the film where it lives.
 */
import {HIGHLIGHTS, OUR_FILMS, TRANSITION_CLIPS} from './data'
import type {HighlightsMoment, OurFilmMoment, TransitionMoment, WatchAnswer, WatchMoment, WatchQuery} from './types'

const YT_ID = /^[A-Za-z0-9_-]{11}$/
export const isYoutubeId = (id: unknown): id is string => typeof id === 'string' && YT_ID.test(id)

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const RANK: Record<HighlightsMoment['status'], number> = {verified: 0, optional: 1, 'archive-row': 2}

/** "2002/03" → the days that season holds, read as the dossiers file a season: 1 July to 30 June */
export function inSeason(season: string | null, day: string): boolean {
  const m = season ? /^(\d{4})\/(\d{2})$/.exec(season) : null
  if (!m || !ISO_DAY.test(day)) return false
  const y = Number(m[1])
  return day >= `${y}-07-01` && day <= `${y + 1}-06-30`
}

export function watchFor(clubId: string, q: WatchQuery): WatchAnswer | null {
  const day = q.matchDate && ISO_DAY.test(q.matchDate) ? q.matchDate : q.matchId && ISO_DAY.test(q.matchId) ? q.matchId : null
  const chapter = q.chapter ?? null
  if (!day && !chapter && !q.matchId) return null
  const hs = HIGHLIGHTS.filter(h => h.clubId === clubId && isYoutubeId(h.youtubeId) && ((day && h.matchDate === day) || (chapter && h.chapter === chapter) || (q.matchId && h.id === q.matchId)))
    // the owner's watched choice first, then the whole match before one moment of it
    .sort((a, b) => RANK[a.status] - RANK[b.status] || Number(b.summary) - Number(a.summary) || a.id.localeCompare(b.id))
  const films = OUR_FILMS.filter(f => f.clubId === clubId && f.form === 'film' && isYoutubeId(f.youtubeId))
  const night = day ? films.find(f => f.matchDates.includes(day)) ?? null : null
  const season = !night && day ? films.find(f => inSeason(f.season, day)) ?? null : null
  const ourFilm = night ?? season
  const transition = hs.length || ourFilm ? TRANSITION_CLIPS.find(t => t.clubId === clubId && t.use === 'into-the-ground') ?? null : null
  if (!hs.length && !ourFilm) return null
  return {highlights: hs[0] ?? null, moreHighlights: hs.slice(1), ourFilm, ourFilmFit: night ? 'night' : season ? 'season' : null, transition}
}

/**
 * The watch moment after a mission that stands on a real night: the night's highlights or our film of the night or its
 * season (`watchFor`), otherwise our own film about the club, labelled as a film about the club and not about the night;
 * otherwise nothing. Only recorded ids, as everywhere in this layer.
 */
export function watchForNight(clubId: string, day: string | null): WatchAnswer | null {
  const a = day ? watchFor(clubId, {matchDate: day}) : null
  if (a) return a
  const film = OUR_FILMS.find(f => f.clubId === clubId && f.form === 'film' && isYoutubeId(f.youtubeId))
  return film ? {highlights: null, moreHighlights: [], ourFilm: film, ourFilmFit: 'club', transition: null} : null
}

/** the interstitial for a use, where one exists for this club (today: the Worker's clips, Hapoel Tel Aviv only) */
export const transitionFor = (clubId: string, use: TransitionMoment['use']): TransitionMoment | null => TRANSITION_CLIPS.find(t => t.clubId === clubId && t.use === use) ?? null

/** everything recorded for a club, for a library screen and for the count in a report */
export function watchLibrary(clubId: string): {highlights: HighlightsMoment[]; films: OurFilmMoment[]; shorts: OurFilmMoment[]; transitions: TransitionMoment[]} {
  return {
    highlights: HIGHLIGHTS.filter(h => h.clubId === clubId),
    films: OUR_FILMS.filter(f => f.clubId === clubId && f.form === 'film'),
    shorts: OUR_FILMS.filter(f => f.clubId === clubId && f.form === 'short'),
    transitions: TRANSITION_CLIPS.filter(t => t.clubId === clubId),
  }
}

export const ALL_WATCH: readonly WatchMoment[] = [...HIGHLIGHTS, ...OUR_FILMS, ...TRANSITION_CLIPS]

type Playable = Pick<HighlightsMoment, 'youtubeId'> & {startSeconds?: number; endSeconds?: number}

/** the embed the card loads AFTER the tap. No cookies host, no related videos from elsewhere, inline on a phone. */
export function embedUrl(m: Playable): string | null {
  if (!isYoutubeId(m.youtubeId)) return null
  const p = new URLSearchParams({autoplay: '1', rel: '0', playsinline: '1'})
  if (m.startSeconds) p.set('start', String(Math.round(m.startSeconds)))
  if (m.endSeconds) p.set('end', String(Math.round(m.endSeconds)))
  return `https://www.youtube-nocookie.com/embed/${m.youtubeId}?${p.toString()}`
}

/** the film where it lives */
export const watchUrl = (m: Pick<HighlightsMoment, 'youtubeId'>): string | null => isYoutubeId(m.youtubeId) ? `https://www.youtube.com/watch?v=${m.youtubeId}` : null
