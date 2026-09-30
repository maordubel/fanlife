/**
 * הסרט קודם — the retry state machine that decides whether the film plays.
 *
 * Owner spec 25.9.2026 (OPENING DOCUMENTARY HYBRID, §34–37, §57–58): the film is always the
 * first choice, it gets a FAIR retry, and nobody sits in front of a black screen to save a
 * video. Before this file the film had one two-second timer: if `currentTime` had not moved,
 * the slideshow took over — which lost the film on every slow phone that would have started
 * it at 2.3 s.
 *
 * Five states, and only two of them are an answer:
 *
 *   initial        attempt 1 — autoplay muted, preload auto, WebM first and MP4 second
 *   retry-load     attempt 2 — `load()` + `play()` once, silently
 *   gesture-ready  attempt 3 — the media is fine but the browser refused to start it by
 *                  itself (iOS Low Power Mode, a strict autoplay policy): "▶ להתחיל" in the
 *                  middle of the poster, for a short window or until the tap
 *   rolling        COMMITTED to the film
 *   failed         COMMITTED to the documentary
 *
 * Nothing loops: two automatic attempts, one gesture, and a hard ceiling on the wait
 * (`FILM_CLOCK.first + FILM_CLOCK.retry` ≈ 4.3 s before anything but a live prompt). Once a
 * path is committed it is never left for the other one because something finished loading
 * in the background (§58) — with ONE exception that is not a change of mind but a rescue: a
 * film that was rolling and then froze for `FILM_CLOCK.stall` ms (the network died under it)
 * hands over to the documentary at the matching beat instead of leaving a frozen frame.
 *
 * Pure on purpose: `tests/life-opening-film.test.ts` walks every row of the §66 failure
 * matrix through `step()` without a browser.
 */

export type FilmAttempt = 'initial' | 'retry-load' | 'gesture-ready' | 'rolling' | 'failed'

export type FilmSignal =
  /** the film's own clock moved — the only proof a video is playing */
  | 'playing'
  /** `canplay` / `loadeddata`: the media is decodable, whatever autoplay thinks */
  | 'data'
  /** `play()` rejected with NotAllowedError: the media may be fine, the policy is not */
  | 'refused'
  /** a media error, every <source> failed, or no codec this browser knows */
  | 'broken'
  /** the current attempt's clock ran out */
  | 'deadline'
  /** the player pressed ▶ */
  | 'tap'
  /** rolling, and then nothing moved for `FILM_CLOCK.stall` */
  | 'stalled'

export type FilmState = {
  attempt: FilmAttempt
  /** the media has shown it can decode (canplay / loadeddata) */
  hasData: boolean
  /** autoplay was refused at least once */
  refused: boolean
  /** ▶ was pressed; the gesture's `play()` is in flight */
  tapped: boolean
}

/** the clocks, in ms — the whole of "never make the user wait too long" (§36) */
export const FILM_CLOCK = {
  /** attempt 1: how long autoplay gets before the silent retry */
  first: 2500,
  /** attempt 2 — and the grace a tapped ▶ gets before we call it */
  retry: 1800,
  /** how long ▶ waits for a finger before the documentary simply begins */
  gesture: 7000,
  /** rolling but frozen this long = the network died under the film */
  stall: 6000,
  /** film → ink before the documentary takes the glass (§37: 300–500 ms) */
  handover: 420,
} as const

export const FILM_START: FilmState = { attempt: 'initial', hasData: false, refused: false, tapped: false }

/** the two answers; nothing leaves them except the `stalled` rescue */
export function committed(state: FilmState): boolean {
  return state.attempt === 'rolling' || state.attempt === 'failed'
}

export function step(state: FilmState, signal: FilmSignal): FilmState {
  const { attempt } = state
  if (attempt === 'failed') return state
  if (attempt === 'rolling') {
    // a film that was playing and froze, or broke mid-reel, is rescued — never re-tried
    return signal === 'stalled' || signal === 'broken' ? { ...state, attempt: 'failed' } : state
  }

  switch (signal) {
    case 'playing':
      return { ...state, attempt: 'rolling' }
    case 'data':
      return state.hasData ? state : { ...state, hasData: true }
    case 'broken':
      return { ...state, attempt: 'failed' }
    case 'refused':
      // Autoplay policy does not change between two automatic tries, so a refusal skips
      // straight to the one thing that can change it: a finger. After a tap, a refusal
      // means even a gesture could not start it — that is a real failure.
      if (attempt === 'gesture-ready') return state.tapped ? { ...state, attempt: 'failed' } : state
      return { ...state, refused: true, attempt: 'gesture-ready' }
    case 'tap':
      return attempt === 'gesture-ready' ? { ...state, tapped: true } : state
    case 'deadline':
      if (attempt === 'initial') return { ...state, attempt: 'retry-load' }
      if (attempt === 'retry-load') {
        // the media answered (or the policy did) — a tap can still win it; otherwise the
        // network or the codec is the problem and a prompt would only be a second wait
        return state.hasData || state.refused ? { ...state, attempt: 'gesture-ready' } : { ...state, attempt: 'failed' }
      }
      return { ...state, attempt: 'failed' }
    case 'stalled':
      return state
  }
}

/** how long the current state may last before `deadline` — null once committed */
export function clockFor(state: FilmState): number | null {
  switch (state.attempt) {
    case 'initial':
      return FILM_CLOCK.first
    case 'retry-load':
      return FILM_CLOCK.retry
    case 'gesture-ready':
      return state.tapped ? FILM_CLOCK.retry : FILM_CLOCK.gesture
    default:
      return null
  }
}

/** what a rejected `play()` promise means — AbortError is just `load()` interrupting it */
export function signalForPlayError(error: unknown): FilmSignal | null {
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotAllowedError') return 'refused'
  if (name === 'NotSupportedError') return 'broken'
  return null
}

/** the longest a player can look at a poster before SOMETHING is on the glass that moves */
export function worstAutomaticWaitMs(): number {
  return FILM_CLOCK.first + FILM_CLOCK.retry
}

/** which opening is on the glass — `pending` is the instant before the browser is asked */
export type OpeningPath = 'pending' | 'film' | 'documentary'

/**
 * The first decision, before anything can fail: the film, unless the player asked for less
 * motion — then the documentary in its reduced mode (§38). Everything after this is `step()`.
 */
export function choosePath(reducedMotion: boolean): Exclude<OpeningPath, 'pending'> {
  return reducedMotion ? 'documentary' : 'film'
}
