/**
 * LIFE · the WATCH LAYER — what a supporter can watch after a mission (owner, 23.11.2026; rule life-story-watch).
 *
 * Three kinds of moment, and one law: a link exists here only because a file in this repository records it.
 *   highlights  a real match's highlights on YouTube, somebody else's upload, cited and linked out
 *   our-film    a FAN LIFE Football Stories film (or Short) the studio published about this club / night / season
 *   transition  a studio interstitial that plays between chapters (a local clip, never a fact)
 * Nothing is guessed: no id built from a title, no search link, no "probably this one". Nothing recorded → null.
 */

/** where in the repository the link is recorded — the id or the file name appears in that file, letter for letter */
export type WatchSource = {file: string; /** what the file says about it, in one line */ note: string}

/** how far the record goes: watched and chosen by the owner, listed by the match report, or only an archive row */
export type HighlightStatus = 'verified' | 'optional' | 'archive-row'

export type HighlightsMoment = {
  kind: 'highlights'
  id: string
  clubId: string
  youtubeId: string
  /** the title as the record gives it, in the record's own language */
  title: string
  titleLocale: string
  /** the day of the match (ISO) when the record ties the film to a day */
  matchDate: string | null
  /** the chapter id the record ties it to (the Worker's chapter ids), or null */
  chapter: string | null
  status: HighlightStatus
  /** the whole match in short, rather than one goal or one interview */
  summary: boolean
  startSeconds?: number
  endSeconds?: number
  source: WatchSource
}

export type OurFilmMoment = {
  kind: 'our-film'
  id: string
  clubId: string
  youtubeId: string
  form: 'film' | 'short'
  title: string
  titleLocale: 'en'
  /** the nights the studio's own record says the film is about (ISO days) */
  matchDates: string[]
  /** the season the studio's dossier files the film under ("2002/03"), or null */
  season: string | null
  publishedOn: string | null
  source: WatchSource
}

export type TransitionMoment = {
  kind: 'transition'
  id: string
  clubId: string
  /** where in a chapter it plays */
  use: 'matchday-opener' | 'into-the-ground' | 'ticket'
  mp4: string
  webm: string
  ms: number
  source: WatchSource
}

export type WatchMoment = HighlightsMoment | OurFilmMoment | TransitionMoment

/** ask by the night, by an archive row id, or by a chapter id — whichever the mission has */
export type WatchQuery = {matchDate?: string | null; matchId?: string | null; chapter?: string | null}

export type WatchAnswer = {
  highlights: HighlightsMoment | null
  /** other recorded films of the same night (a goal, the penalties, an interview) */
  moreHighlights: HighlightsMoment[]
  ourFilm: OurFilmMoment | null
  /** 'night': the studio's record names this very night; 'season': the film is of the season the night falls in;
   *  'club': no film of the night or its season, so our film about the club, labelled as such (`watchForNight`) */
  ourFilmFit: 'night' | 'season' | 'club' | null
  transition: TransitionMoment | null
}
