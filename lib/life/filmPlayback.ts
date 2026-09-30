/**
 * מדיניות ההקרנה — the ONE playback policy both films obey (upgrade plan §6–7).
 *
 * `OpeningFilm` (a native <video>, retried by `lib/life/openingAttempt.ts`) and
 * `HistoricalCutscene` (a YouTube embed driven through the iframe API) start their media in
 * completely different ways, and until this file each decided on its own what a refusal
 * meant. The machinery stays where it is; the DECISION — given what the last attempt said,
 * what happens next — lives here, so the two cannot drift:
 *
 *   1. the film mounts → playback is attempted at once (no intro button)
 *   2. autoplay WITH sound refused → retry muted
 *   3. muted started → it runs
 *   4. only when even muted is refused → the "▶ להתחיל" gate (a gesture)
 *   5. a media error, or YouTube / the network blocked → the fallback
 *   6. skip is always available — the policy never produces a state without it
 *
 * A refusal AFTER the gesture is a real failure: the finger was the last thing that could
 * change the browser's mind, so nothing is asked twice.
 *
 * Pure on purpose — `tests/life-film-playback.test.ts` walks every row without a browser.
 */

/** what one attempt to start the film reported */
export type FilmOutcome =
  /** the media's clock moved — the only proof a film is playing */
  | 'started'
  /** `play()` refused while the film had sound on */
  | 'refused-with-sound'
  /** `play()` refused even muted */
  | 'refused-muted'
  /** a media error: every source failed, no codec, a YouTube player error */
  | 'error'
  /** the player could not be had at all: YouTube API blocked, offline */
  | 'blocked'

/** what the film does next */
export type FilmNext = 'run' | 'retry-muted' | 'gate' | 'fallback'

export type FilmContext = {
  /** the refused attempt was the gate's own gesture */
  gestured?: boolean
}

export function nextFilmStep(outcome: FilmOutcome, context: FilmContext = {}): FilmNext {
  switch (outcome) {
    case 'started':
      return 'run'
    case 'refused-with-sound':
      return 'retry-muted'
    case 'refused-muted':
      return context.gestured ? 'fallback' : 'gate'
    case 'error':
    case 'blocked':
      return 'fallback'
  }
}

/**
 * A rejected `play()` promise, read as an outcome. `AbortError` is only `load()` interrupting
 * its own attempt and says nothing — null.
 */
export function outcomeForPlayError(error: unknown, muted: boolean): FilmOutcome | null {
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotAllowedError') return muted ? 'refused-muted' : 'refused-with-sound'
  if (name === 'NotSupportedError') return 'error'
  return null
}

/** the one key that skips a film, in both films */
export const FILM_SKIP_KEY = 'Escape'

export function isSkipKey(event: { key?: string } | null | undefined): boolean {
  return event?.key === FILM_SKIP_KEY
}
