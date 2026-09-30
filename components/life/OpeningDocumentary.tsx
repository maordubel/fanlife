'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'

import { Grain, Letterbox } from '@/components/life/FilmFx'
import { FilmSkipButton } from '@/components/life/FilmSkipButton'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import type { HistoricalAnchor } from '@/lib/life/anchors'
import { captionPieces, OPENING, openingLines, type OpeningDocumentaryMode } from '@/lib/life/opening'
import { OpeningAir } from '@/lib/life/openingAir'

/**
 * הפתיח הדוקומנטרי — the opening that plays when the film cannot (owner spec 25.9.2026,
 * "OPENING DOCUMENTARY HYBRID").
 *
 * Not a fallback that apologises. A second real opening, held up by nothing but text,
 * time, one line, typography, light, grain and rhythm — so it is whole with every image
 * and every video request failing (§1, §43–44). It replaced the five-still slideshow
 * (`OpeningSequence`), whose stills stay on disk as optional polish, never a dependency.
 *
 * ## One composition, not slides (§7)
 *
 * Every layer is mounted once and stays: ink base, vignette, grain, film marks, the red
 * thread, the year, the copy. A beat changes the composition's `data-mode` and the copy
 * crossfades inside it; nothing slides, nothing is paginated, there is no "next".
 *
 * ## The red thread (§5, §24–25, §33)
 *
 * It enters as a point at the start edge, and it is drawn continuously for the whole
 * opening at exactly the beat's own speed — so the thread IS the progress indicator, and
 * there is no second one. Each beat lights a node where the thread arrives. Only the
 * years the opening itself knows are ever labelled (1978, and the anchor's own year): the
 * thread does not reveal the life (§6) — at the handoff it simply runs off the glass.
 *
 * Copy comes from `lib/life/opening.ts` (§15, §48): the canonical captions, cut where a
 * documentary would cut them (`captionPieces`), and the archive's own line. This file owns
 * direction only — no sentence of the story is written here.
 */

/** where each beat's node sits, as a share of the width from the physical left */
const NODE_X = [0.8, 0.64, 0.47, 0.33, 0.2, 0.09] as const
/** the thread's wave, in px of its 64px lane — a hand-drawn line, never a ruler */
const threadY = (x: number) => 32 + 7 * Math.sin(x * Math.PI * 2.1 + 0.7)
/** how much of the width is revealed, from the start (right) edge, when the thread stands at node i */
const revealAt = (i: number) => (i >= NODE_X.length ? 1.08 : 1 - NODE_X[i]!)
/** the point the thread is born at — the same pixel the film's waiting ground shows */
const ORIGIN_X = 0.985
const ORIGIN_P = 0.03

function threadPath(): string {
  const points: string[] = []
  for (let k = 0; k <= 60; k += 1) {
    const x = k / 60
    points.push(`${(x * 1000).toFixed(1)},${threadY(x).toFixed(2)}`)
  }
  return `M${points.join(' L')}`
}
const PATH = threadPath()

/**
 * The ground the film stands on while it is still being asked to play — the same ink base,
 * vignette and the thread's first point. If the poster never arrives, this is what the
 * player sees; if the film fails, the documentary starts on top of the very same pixels, so
 * the handover is a line starting to move rather than a new screen (§36–37).
 */
export function DocumentaryGround({ point = true }: { point?: boolean }) {
  return (
    <div aria-hidden="true" className="odoc pointer-events-none">
      <div className="odoc-base" />
      <div className="odoc-vignette" />
      {point && (
        <div className="odoc-thread">
          <span className="odoc-node" data-lit="true" style={{ left: `${ORIGIN_X * 100}%`, top: threadY(ORIGIN_X) }} />
        </div>
      )}
    </div>
  )
}

type Thread = { p: number; ms: number }

export function OpeningDocumentary({
  anchor,
  onDone,
  startAt = 0,
  sound: soundAtStart = false,
}: {
  /** the prologue's anchor — the archive beat reads the 1983 final off it, or says less */
  anchor: HistoricalAnchor
  onDone: () => void
  /** a film that froze mid-reel hands over at the matching beat (`beatForFilmMs`) */
  startAt?: number
  /** the film's sound choice, carried across the handover */
  sound?: boolean
}) {
  const first = Math.max(0, Math.min(OPENING.length - 1, startAt))
  const [index, setIndex] = useState(first)
  const [lead, setLead] = useState(first === 0 && Boolean(OPENING[0]?.leadMs))
  const [previous, setPrevious] = useState<number | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [sound, setSound] = useState(soundAtStart)
  const [reduced, setReduced] = useState(false)
  const [thread, setThread] = useState<Thread>({ p: first === 0 ? ORIGIN_P : revealAt(first), ms: 0 })

  const done = useRef(false)
  const latest = useRef(onDone)
  latest.current = onDone
  const air = useRef<OpeningAir | null>(null)

  const finish = useCallback(() => {
    if (done.current) return
    done.current = true
    latest.current()
  }, [])
  // Escape, focus-in, Tab trap, focus restore — the one dialog contract (rule 33)
  const dialogRef = useDialog<HTMLDivElement>(finish)

  useEffect(() => {
    setReduced(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
  }, [])

  const beat = OPENING[index]!
  const mode: OpeningDocumentaryMode = beat.mode

  // --- the clock: one timer, paused while the tab is hidden --------------------------
  useEffect(() => {
    if (leaving) return
    const span = lead ? (beat.leadMs ?? 0) : beat.ms - (index === 0 && first === 0 ? (beat.leadMs ?? 0) : 0)
    let remaining = Math.max(0, span)
    let started = Date.now()
    let timer = 0
    const fire = () => {
      if (lead) {
        setLead(false)
        return
      }
      if (index >= OPENING.length - 1) {
        setLeaving(true)
        return
      }
      setPrevious(index)
      setIndex(index + 1)
    }
    const arm = () => {
      started = Date.now()
      timer = window.setTimeout(fire, remaining)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        window.clearTimeout(timer)
        remaining = Math.max(0, remaining - (Date.now() - started))
      } else {
        arm()
      }
    }
    arm()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [beat, index, lead, leaving, first])

  // --- the thread: drawn to the next node over exactly this stretch of time ----------
  useEffect(() => {
    if (reduced) {
      // §38: the line appears, it is not drawn
      // a hair past the node, so the node the beat stands on is whole rather than cut by the edge
      setThread({ p: lead ? ORIGIN_P : revealAt(Math.min(index + (mode === 'handoff' ? 1 : 0), NODE_X.length)) + 0.02, ms: 0 })
      return
    }
    const target = lead ? revealAt(0) : revealAt(index + 1)
    const span = lead ? (beat.leadMs ?? 0) : beat.ms - (index === 0 && first === 0 ? (beat.leadMs ?? 0) : 0)
    // one frame at the current position first, so the transition has somewhere to start
    const id = window.requestAnimationFrame(() => setThread({ p: target, ms: span }))
    return () => window.cancelAnimationFrame(id)
  }, [beat, index, lead, reduced, mode, first])

  // --- the outgoing copy leaves on its own clock, then is gone from the DOM ----------
  useEffect(() => {
    if (previous === null) return
    const id = window.setTimeout(() => setPrevious(null), 520)
    return () => window.clearTimeout(id)
  }, [previous])

  // --- the natural end: the thread leaves, the copy sinks, the glass fades to the game -
  useEffect(() => {
    if (!leaving) return
    air.current?.cue('handoff')
    const id = window.setTimeout(finish, reduced ? 120 : 960)
    return () => window.clearTimeout(id)
  }, [leaving, finish, reduced])

  // --- atmosphere, when asked for --------------------------------------------------
  useEffect(() => {
    if (!sound) return
    if (!air.current) air.current = new OpeningAir()
    air.current.wake()
    air.current.cue(lead ? 'origin' : mode)
  }, [sound, mode, lead])
  useEffect(() => () => air.current?.close(), [])

  const years = useMemo(() => {
    const out: { beat: number; year: string }[] = []
    OPENING.forEach((entry, i) => {
      const year = openingLines(entry, anchor).stampHe
      if (year) out.push({ beat: i, year })
    })
    return out
  }, [anchor])
  const lines = openingLines(beat, anchor)
  const nowYear = years.find((y) => y.beat === index)?.year ?? null
  const identityAt = OPENING.findIndex((entry) => entry.mode === 'identity')

  const reveal = { '--p': thread.p, transitionDuration: `${thread.ms}ms` } as CSSProperties

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('life90g.doc.label')}
      data-life="opening"
      data-path="documentary"
      data-beat={beat.id}
      data-mode={mode}
      data-leaving={leaving}
      className="odoc z-[60] outline-none"
    >
      {/* 1–2 · ink with depth, the mode's light, the vignette */}
      <div aria-hidden="true" className="odoc-base" />
      <div aria-hidden="true" className="odoc-tint odoc-tint-memory" />
      <div aria-hidden="true" className="odoc-tint odoc-tint-archive" />
      <div aria-hidden="true" className="odoc-tint odoc-tint-lights" />
      <div aria-hidden="true" className="odoc-beams">
        <span className="odoc-beam odoc-beam-a" />
        <span className="odoc-beam odoc-beam-b" />
      </div>

      {/* 6 · the years, as architecture — only the ones the opening knows */}
      {years.map((y, k) => (
        <p
          key={y.year}
          aria-hidden="true"
          dir="ltr"
          className={`odoc-year ${k % 2 === 0 ? 'odoc-year-a' : 'odoc-year-b'}`}
          data-on={nowYear === y.year && !lead}
        >
          <span className="odoc-year-ink">{y.year}</span>
          <span className="odoc-year-plate">{y.year}</span>
        </p>
      ))}

      <div aria-hidden="true" className="odoc-vignette" />

      {/* 4 · film language — archive only, a clean frame at the handoff */}
      <div aria-hidden="true" className="odoc-marks">
        <span className="odoc-perf odoc-perf-top" />
        <span className="odoc-perf odoc-perf-bottom" />
        <span className="odoc-frame" />
      </div>

      {/* 5 · the red thread — drawn by transform, and it is the only progress there is */}
      <div aria-hidden="true" className="odoc-thread" data-exit={leaving}>
        <div className="odoc-reveal-out" style={reveal}>
          <div className="odoc-reveal-in" style={reveal}>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 64" preserveAspectRatio="none">
              <path className="odoc-line" d={PATH} />
            </svg>
            <span className="odoc-node" data-lit="true" style={{ left: `${ORIGIN_X * 100}%`, top: threadY(ORIGIN_X) }} />
            {NODE_X.map((x, i) => {
              const year = years.find((y) => y.beat === i)?.year
              const lit = i < index || (i === index && !lead)
              return (
                <span key={i}>
                  <span
                    className="odoc-node"
                    data-lit={lit}
                    data-now={i === index && !lead}
                    style={{ left: `${x * 100}%`, top: threadY(x) }}
                  />
                  {year && lit && (
                    <span className="odoc-year-label" data-now={i === index} style={{ left: `${x * 100}%`, top: threadY(x) }}>
                      {year}
                    </span>
                  )}
                  {i === identityAt && (
                    <>
                      <span className="odoc-mark odoc-mark-1" style={{ left: `${x * 100}%`, top: threadY(x) }} />
                      <span className="odoc-mark odoc-mark-2" style={{ left: `${x * 100}%`, top: threadY(x), '--d': '420ms' } as CSSProperties} />
                      <span className="odoc-mark odoc-mark-3" style={{ left: `${x * 100}%`, top: threadY(x), '--d': '840ms' } as CSSProperties} />
                    </>
                  )}
                </span>
              )
            })}
          </div>
          <span className="odoc-tip" />
        </div>
      </div>

      {/* 7 · the copy: the outgoing beat sinking, the current one arriving */}
      {previous !== null && <Copy key={`out-${OPENING[previous]!.id}`} index={previous} anchor={anchor} out />}
      {!leaving && <Copy key={beat.id} index={index} anchor={anchor} lead={lead} />}
      {leaving && <Copy key={`out-${beat.id}`} index={index} anchor={anchor} out />}

      {/* what a screen reader hears: the beat, once, when it changes — never the visuals */}
      <p className="sr-only" aria-live="polite">
        {lead ? '' : [lines.captionHe, lines.archiveHe].filter(Boolean).join(' · ')}
      </p>

      <Letterbox height={0.045} ms={900} />
      {/* 3 · grain drawn by the browser: no image may be required (§43) */}
      <Grain opacity={0.12} code />

      <button
        type="button"
        onClick={() => {
          setSound((on) => {
            if (on) air.current?.mute()
            return !on
          })
        }}
        aria-pressed={sound}
        className="absolute z-10 flex min-h-tap items-center px-3 font-body text-[12px] text-concrete/60"
        style={{ insetInlineEnd: 12, bottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {sound ? t('life.opening.sound.on') : t('life.opening.sound.off')}
      </button>
      {/* (delta 92, plan §7) the same skip as the film and the archive cutscenes — never a quieter one */}
      <FilmSkipButton onSkip={finish} data-life="opening-skip" />
    </div>
  )
}

/** one beat's words — overline, the caption in its breaths, the archive line, the index */
function Copy({ index, anchor, lead = false, out = false }: { index: number; anchor: HistoricalAnchor; lead?: boolean; out?: boolean }) {
  const beat = OPENING[index]!
  const lines = openingLines(beat, anchor)
  const pieces = captionPieces(lines.captionHe)
  // the first breath waits for the thread to land on the node; each next one follows it
  const base = beat.mode === 'handoff' ? 250 : 320
  const gap = beat.mode === 'archive' ? 900 : 760
  const after = base + pieces.length * gap
  return (
    <div aria-hidden="true" className={`odoc-copy ${out ? 'odoc-out' : ''}`} data-mode={beat.mode}>
      {beat.overlineHe && (
        <p className="odoc-over odoc-piece" style={{ '--d': '0ms' } as CSSProperties}>
          {beat.overlineHe}
        </p>
      )}
      <p className="odoc-caption">
        {pieces.map((piece, k) => {
          const turn = beat.emphasisHe !== undefined && piece.trim() === beat.emphasisHe
          return (
            <span
              key={k}
              className="odoc-piece"
              data-wait={lead}
              data-soft={pieces.length > 1 && k < pieces.length - 1}
              style={{ '--d': `${base + k * gap}ms` } as CSSProperties}
            >
              {turn ? (
                <span className="odoc-paper-wrap">
                  <span className="odoc-paper">{piece.trim()}</span>
                </span>
              ) : (
                piece.trim()
              )}
            </span>
          )
        })}
      </p>
      {lines.archiveHe && (
        <p className="odoc-archive" data-wait={lead} style={{ '--d': `${after}ms` } as CSSProperties}>
          {lines.archiveHe}
        </p>
      )}
      {beat.noteHe && (
        <p className="odoc-note" data-wait={lead} style={{ '--d': `${after}ms` } as CSSProperties}>
          {beat.noteHe}
        </p>
      )}
      {!lead && beat.mode === 'handoff' && (
        <div className="odoc-brand" style={{ '--d': `${after}ms` } as CSSProperties}>
          <span className="odoc-brand-rule" />
          <p className="font-latin text-[13px] font-bold tracking-[0.34em] text-sheet" dir="ltr">
            {t('life90g.brand.worker')}
          </p>
          <p className="mt-1 font-latin text-[11px] font-bold tracking-[0.5em] text-red" dir="ltr">
            {t('life90g.brand.life')}
          </p>
        </div>
      )}
    </div>
  )
}
