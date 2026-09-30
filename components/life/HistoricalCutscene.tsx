'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FilmSkipButton } from '@/components/life/FilmSkipButton'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import { nextFilmStep, type FilmNext, type FilmOutcome } from '@/lib/life/filmPlayback'
import { embedUrl, type CutsceneCard, type CutsceneOutcome, type HistoricalCutscene as Def } from '@/lib/life/cutscenes'
import { SourceNote } from '@/components/ui/SourceNote'

/**
 * הסרט — real footage, inside the game, on a television that is not there.
 *
 * The brief for this screen was one sentence long and worth quoting: it must never feel
 * like the player suddenly opened an external webpage. Everything below follows from that.
 *
 * **The card first, the film second.** Three lines on black — what this is, who played,
 * when and where — held long enough to read, because the cut from a painted terrace
 * straight into 1986 videotape is a cut between two centuries and it needs a breath. The
 * three lines are built from the archive by `cutsceneCard`, so they say only what the
 * archive holds.
 *
 * **A 4:3 frame in a dark room.** The footage is 4:3 and it is shown 4:3 — pillarboxed on
 * a phone in landscape, never stretched — inside a border that reads as a set rather than
 * as a page: a slight inward vignette, a scanline wash at low opacity, and warm bloom at
 * the edges. Not a filter over the video (that would be defacing a document): a frame
 * AROUND it. The film itself is untouched.
 *
 * **Two buttons and no more.** `הפעל את רגע האליפות` appears when the browser refuses to
 * autoplay with sound, which it will on nearly every phone — that is not an error and it
 * is not presented as one, it is the moment the player chooses to start. The skip is the
 * shared `FilmSkipButton`, bottom corner, always there.
 *
 * **One policy with the opening film** (`lib/life/filmPlayback.ts`): try at once; refused
 * with sound → `mute()` and try again; muted and running → it runs (a sound button offers
 * the sound back); refused even muted → the gate; a player error or a blocked API → the
 * slate. After the gate's own gesture, a second refusal is the slate too — nothing is
 * asked twice.
 *
 * ## Failing well
 *
 * The one requirement above every other: this screen may never trap anybody. Four things
 * end it — the video ends, the player skips, YouTube reports an error, or nothing at all
 * happens for long enough to mean something is wrong — and all four call `onDone`, which
 * hands the chapter back to the runtime with the reason. There is no path out of this
 * component that does not go through `onDone`, including unmount.
 *
 * `youtube-nocookie.com` rather than `youtube.com`: the player is a child in a game, and
 * an embed does not need to set an advertising cookie on them to show two minutes of 1986.
 */

type Phase = 'card' | 'gate' | 'playing' | 'failed'

/** How long the black card holds before the film starts. Long enough to read three lines. */
const CARD_MS = 3400
/** If the API has said nothing at all by now, something is wrong and the game moves on. */
const STALL_MS = 12_000
/**
 * Ready and not playing after this long means the browser refused autoplay — which it
 * does on nearly every phone. Twelve seconds of a black frame was dead time (§12): the
 * player is offered the button as soon as the refusal is plain.
 */
const AUTOPLAY_MS = 2_500
/** After ▶ was pressed: a gesture that still produced nothing by now is a real refusal. */
const GESTURE_MS = 6_000

type YTPlayer = {
  destroy(): void
  playVideo(): void
  mute(): void
  unMute(): void
  getCurrentTime(): number
  getDuration(): number
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      events?: {
        onReady?: (event: { target: YTPlayer }) => void
        onStateChange?: (event: { data: number }) => void
        onError?: (event: { data: number }) => void
      }
    },
  ) => YTPlayer
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

/**
 * Load the iframe API once per document, and resolve null rather than throwing when it
 * cannot be had. A blocked script tag is a normal outcome on a locked-down network, and
 * the caller treats it exactly like a pulled video.
 */
let apiPromise: Promise<YTNamespace | null> | null = null

function loadYouTubeApi(): Promise<YTNamespace | null> {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise

  apiPromise = new Promise<YTNamespace | null>((resolve) => {
    let settled = false
    const finish = (value: YTNamespace | null) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      finish(window.YT ?? null)
    }

    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    tag.async = true
    tag.onerror = () => finish(null)
    document.head.appendChild(tag)

    // The script can load and the callback still never fire behind some proxies.
    window.setTimeout(() => finish(window.YT ?? null), 8000)
  })
  return apiPromise
}

export function HistoricalCutscene({
  scene,
  card,
  onDone,
}: {
  scene: Def
  card: CutsceneCard
  onDone: (outcome: CutsceneOutcome) => void
}) {
  const [phase, setPhase] = useState<Phase>('card')
  /** the film is running muted because autoplay with sound was refused */
  const [muted, setMuted] = useState(false)
  const frame = useRef<HTMLIFrameElement | null>(null)
  const player = useRef<YTPlayer | null>(null)
  /** `onDone` exactly once, from wherever it is reached, including unmount. */
  const done = useRef(false)

  /**
   * `onDone` can be a new function on every render of the shell, and two effects below
   * depend on being able to call it. Holding it in a ref instead of in a dependency array
   * is not a style choice here: an effect that lists `finish` as a dependency would tear
   * down and re-run on any parent re-render, which for the cleanup effect means reporting
   * `skipped` in the middle of a video the player is watching, and for the API effect
   * means a second YouTube player inside the same iframe.
   */
  const latest = useRef(onDone)
  latest.current = onDone

  const finish = useCallback((outcome: CutsceneOutcome) => {
    if (done.current) return
    done.current = true
    latest.current(outcome)
  }, [])

  const src = useMemo(() => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin
    return embedUrl(scene, origin)
  }, [scene])

  // --- the card, then the film ------------------------------------------------------
  useEffect(() => {
    if (phase !== 'card') return
    const timer = window.setTimeout(() => setPhase('playing'), CARD_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // --- wire the API to the iframe that is already loading ---------------------------
  useEffect(() => {
    if (phase !== 'playing') return
    // Once, ever. `phase` goes playing → gate → playing when the browser blocks autoplay
    // and the player presses the button, and without this guard that second pass builds a
    // SECOND YouTube player on the same iframe — two state machines, two ENDED events, and
    // a video that cannot be paused.
    if (player.current) return
    let cancelled = false
    let stall: number | undefined

    // no network at all: the answer is already known, and nobody should wait eight seconds for it
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (nextFilmStep('blocked') === 'fallback') setPhase('failed')
      return
    }
    let autoplay: number | undefined
    /** where the shared policy has this film: with sound first, then muted */
    let tryingMuted = false

    const apply = (next: FilmNext, target: YTPlayer | null) => {
      if (cancelled) return
      if (next === 'fallback') {
        setPhase('failed')
        return
      }
      if (next === 'gate') {
        setPhase('gate')
        return
      }
      if (next === 'retry-muted' && target) {
        tryingMuted = true
        setMuted(true)
        try {
          target.mute()
          target.playVideo()
        } catch {
          apply(nextFilmStep('refused-muted'), null)
          return
        }
        window.clearTimeout(autoplay)
        autoplay = window.setTimeout(() => apply(nextFilmStep('refused-muted'), null), AUTOPLAY_MS)
      }
    }
    const judge = (outcome: FilmOutcome, target: YTPlayer | null = null) => apply(nextFilmStep(outcome), target)

    void (async () => {
      const api = await loadYouTubeApi()
      if (cancelled) return
      if (!api || !frame.current) {
        judge('blocked')
        return
      }
      try {
        player.current = new api.Player(frame.current, {
          events: {
            onReady: (event) => {
              // Autoplay with sound is blocked on most phones and on Safari everywhere.
              // Calling play and watching for a state change is how we find out: no PLAYING
              // within AUTOPLAY_MS is a refusal, and the policy says what comes next.
              const target = event.target
              window.clearTimeout(stall)
              try {
                target.playVideo()
              } catch {
                judge('refused-with-sound', target)
                return
              }
              autoplay = window.setTimeout(
                () => judge(tryingMuted ? 'refused-muted' : 'refused-with-sound', target),
                AUTOPLAY_MS,
              )
            },
            onStateChange: (event) => {
              if (event.data === api.PlayerState.PLAYING) {
                window.clearTimeout(stall)
                window.clearTimeout(autoplay)
                if (nextFilmStep('started') === 'run') setPhase('playing')
              }
              if (event.data === api.PlayerState.ENDED) finish('watched')
            },
            // 2 bad id · 5 html5 error · 100 gone · 101/150 embedding disabled
            onError: () => judge('error'),
          },
        })
      } catch {
        judge('blocked')
        return
      }
      stall = window.setTimeout(() => {
        if (!cancelled) setPhase('gate')
      }, STALL_MS)
    })()

    return () => {
      cancelled = true
      window.clearTimeout(stall)
      window.clearTimeout(autoplay)
    }
    // `finish` is stable by construction (see the ref above), so this effect runs once per
    // phase change and never because the shell re-rendered.
  }, [phase, finish])

  // --- nothing leaves this component without telling the runtime --------------------
  /*
   * (delta 90) The unmount is confirmed one tick later. React's strict mode (on in
   * `next.config`) mounts, cleans up and mounts again every effect in development — and
   * this cleanup used to answer that rehearsal with `skipped`, so in `next dev` the film
   * closed itself the instant it opened and the chapter went straight to its fallback
   * (found by `scripts/life/footage-probe.mjs`). A real unmount still reports `skipped`.
   */
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.setTimeout(() => {
        if (mounted.current) return
        try {
          player.current?.destroy()
        } catch {
          /* the iframe is already gone */
        }
        finish('skipped')
      }, 0)
    }
  }, [finish])

  // --- Escape skips, like every other card in this game ------------------------------
  // Folded onto `useDialog` (rule 33's shared contract) rather than kept as this
  // component's own `window` listener: the hook is also what moves focus into the frame
  // on open, traps Tab inside it, and gives focus back to whatever opened the cutscene
  // when it ends — none of which the old listener did.
  const dialogRef = useDialog<HTMLDivElement>(() => finish('skipped'))

  // --- the gate's gesture: with sound, since a finger is what the browser wanted ------------
  const gestured = useRef<number | undefined>(undefined)
  const start = () => {
    try {
      player.current?.unMute()
      player.current?.playVideo()
      setMuted(false)
    } catch {
      setPhase('failed')
      return
    }
    setPhase('playing')
    // a gesture that still starts nothing is the last refusal — the policy says slate
    window.clearTimeout(gestured.current)
    const began = player.current?.getCurrentTime?.() ?? 0
    gestured.current = window.setTimeout(() => {
      let now = began
      try {
        now = player.current?.getCurrentTime() ?? began
      } catch {
        /* treat as not moved */
      }
      if (now <= began && nextFilmStep('refused-muted', { gestured: true }) === 'fallback') setPhase('failed')
    }, GESTURE_MS)
  }
  useEffect(() => () => window.clearTimeout(gestured.current), [])

  const unmute = () => {
    try {
      player.current?.unMute()
      setMuted(false)
    } catch {
      /* the film keeps running muted */
    }
  }

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      data-life="cutscene"
      data-phase={phase}
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-ink outline-none"
      aria-modal="true"
      aria-label={scene.titleHe}
    >
      {/* ---------- the card ---------- */}
      {phase === 'card' ? (
        <div className="px-gutter text-center">
          <p className="font-mono text-[10px] tracking-[0.32em] tabular-nums text-concrete/55">
            {[card.placeHe, card.dateHe].filter(Boolean).join(' · ')}
          </p>
          {card.fixtureHe ? (
            <p className="mt-5 font-display text-[22px] leading-tight text-sheet sm:text-[28px]">
              {card.fixtureHe}
            </p>
          ) : null}
          <p className="mt-2 font-body text-[14px] text-red sm:text-[16px]">{card.titleHe}</p>
          {card.subtitleHe ? (
            <p className="mt-4 font-body text-[11px] text-concrete/45">{card.subtitleHe}</p>
          ) : null}
        </div>
      ) : null}

      {/* ---------- the set ---------- */}
      {phase !== 'card' ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center">
          <div className="relative aspect-[4/3] max-h-[78vh] w-full max-w-[min(96vw,calc(78vh*4/3))] overflow-hidden border-hair border-concrete/25 bg-ink">
            {phase !== 'failed' ? (
              <iframe
                ref={frame}
                src={src}
                title={scene.titleHe}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen={false}
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              /**
               * מסך שלא נפתח הוא עדיין מסך.
               *
               * The first version of this was a black rectangle with one sentence in the
               * middle of it, and it is the screen a player meets when their connection
               * hiccups — the ONLY frame of this sequence some people will ever see. An
               * empty box reads as the game breaking. So the slate the projectionist would
               * have left up stays up: the ground, the date, the fixture, the competition,
               * exactly as the title card printed them, and the apology is a caption under
               * it rather than the whole picture. Nothing here is invented — every line
               * comes from the same archive row the film was going to illustrate.
               */
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-gutter text-center">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.32em] tabular-nums text-concrete/55">
                    {[card.placeHe, card.dateHe].filter(Boolean).join(' · ')}
                  </p>
                  {card.fixtureHe ? (
                    <p className="mt-4 font-display text-[20px] leading-tight text-sheet sm:text-[26px]">
                      {card.fixtureHe}
                    </p>
                  ) : null}
                  <p className="mt-2 font-body text-[13px] text-red sm:text-[15px]">{card.titleHe}</p>
                </div>
                <p className="max-w-[42ch] font-body text-[12px] leading-relaxed text-concrete/70">
                  {scene.fallbackHe}
                </p>
                <button
                  type="button"
                  onClick={() => finish('unavailable')}
                  className="flex min-h-tap items-center border-hair border-red/60 px-6 font-body text-[13px] text-sheet"
                >
                  {t('life.cutscene.continue')}
                </button>
              </div>
            )}

            {/* The set dressing, and never enough of it to alter the film's own pixels: a
                scanline wash at 5% and an inward vignette. A historical document is not
                something to put a filter on. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                background:
                  'repeating-linear-gradient(to bottom, rgb(var(--ink) / 0.28) 0px, rgb(var(--ink) / 0.28) 1px, transparent 1px, transparent 3px)',
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: 'inset 0 0 120px 24px rgb(var(--ink) / 0.72)' }}
            />
          </div>

          {/* ---------- attribution, always — which film, whose, is on /credits (spec §0.3) ---------- */}
          {scene.sourceTitle !== '' && (
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 px-gutter text-center font-body text-[11px] text-concrete/60">
              {/* whose film this is lives on /credits, like every other source in the site (the
                  credits rule: no screen prints a source title of its own) — one note, always */}
              <SourceNote newTab tone="dark" />
            </p>
          )}

          {/* ---------- the gate ---------- */}
          {phase === 'gate' ? (
            <button
              type="button"
              onClick={start}
              className="absolute inset-0 flex min-h-tap items-center justify-center bg-ink/75"
            >
              <span className="border-hair border-red px-6 py-3 font-display text-[15px] tracking-wide text-sheet">
                {t('life.cutscene.play')}
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ---------- sound back, when the film had to start muted ---------- */}
      {muted && phase === 'playing' ? (
        <button
          type="button"
          onClick={unmute}
          className="absolute z-10 flex min-h-tap items-center border-hair border-sheet bg-ink px-4 font-body text-[15px] text-sheet"
          style={{ insetInlineEnd: 12, bottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {t('life.opening.sound.off')}
        </button>
      ) : null}

      {/* ---------- skip, always — the shared control; Escape is `useDialog`'s ---------- */}
      <FilmSkipButton onSkip={() => finish('skipped')} />
    </div>
  )
}
