'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { COLS, LANDMARKS, PITCH, ROWS, zoneCenter, zoneRect, type ZoneId } from '@/lib/game/goal-zones'
import type { Draft } from '@/lib/game/replay/draft'
import { normalise, type Envelope, type ReplayPoint, type TruthTouch, type UserTouch } from '@/lib/game/replay/envelope'
import { inMouth, inferVerb, nearestMan } from '@/lib/game/replay/gesture'
import type { TouchGrade } from '@/lib/game/replay/judge'
import {
  cameraFor,
  curvePath,
  easeInOut,
  easeOut,
  flightMs,
  liftAt,
  pointAt,
  pushFor,
  toBoard,
  type Pt,
} from '@/lib/game/replay/motion'
import type { ReplayAction } from '@/lib/game/replay/vocab'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { ACTION_LABEL } from '@/components/replay/ReplayBuilder'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { t } from '@/lib/i18n'

/**
 * הדשא — the pitch שחזור השער is played on, rebuilt as a PLACE (delta 88).
 *
 * Maor, 24.9.2026, about the previous round: *"נורא 'לחיצה' משעממת, שום תנועה, שום אווירה,
 * שום רגש לא מצליח להתבטא"*. Four rows of buttons asked who / what / from / to, and the
 * pitch was a target to tap twice. So the pitch is now the whole game:
 *
 *   · **The men stand on the grass in their real shirts** (`lib/kit/playerShirt.ts` — the
 *     photograph of their season, the engine's drawing only where none exists), the other
 *     side's man in navy. You DRAG them: the one who started it to where he got the ball;
 *     then the BALL — onto a team-mate (a pass, and now he has it), into space (in behind),
 *     into the net (the finish). Drag the man on the ball and he carries it. The verb is
 *     read off the gesture (`lib/game/replay/gesture.ts`) and shown at the finger while
 *     it is still in the air, so the drop is a decision you can see before you make it.
 *   · **Every touch moves.** The ball flies a curve (a cross hangs, a pass skids, a dribble
 *     bobbles — `lib/game/replay/motion.ts`), a trail draws behind it, the man it reaches
 *     leans into it, and the camera follows and pushes in as the ball nears the goal.
 *   · **The ground is there.** A stand of people behind the goal (the gate-7 crowd sheet,
 *     printed as a single navy plate so no photographic colour lands on the grass), a
 *     floodlit variant for a European night, and the crowd rising row by row as the move
 *     gets closer to the goal.
 *   · **After the whistle the move is played back** — yours in vermilion, then the
 *     archive's in navy — at speed, end to end, into a net that ripples.
 *
 * What did NOT change, and must not: the geometry (`lib/goal-zones.ts`), the envelopes and
 * bridges the reveal draws, and the twenty-one real zone buttons laid over the drawing.
 * Those buttons are the TAP path — WCAG 2.5.7 says a drag must have a single-pointer
 * alternative, and here it is the same board: tap a man, tap the grass. A keyboard places
 * the zone's centre, which is exactly the precision the archive holds.
 *
 * **Rule 8 on this board.** Nothing on the grass animates its opacity — everything that
 * appears or leaves MOVES (transform, or a stroke being drawn). Every vermilion mark is
 * closed with an ink keyline, because red antialiased straight into printed green passes
 * through yellow. And the only glow is the lamp's.
 */

/** The board's visible box: a stand, the air behind the goal, and the half. */
export const VIEW_TOP = -96
const STAND_BOTTOM = -34
/** the goal's tap target reaches up into the stand — a finish is a place, not a pixel */
const MOUTH_TOP = -64
export const VIEW_H = PITCH.h - VIEW_TOP
/** width / height of the whole board, for the `FitBox` that holds it */
export const BOARD_RATIO = PITCH.w / VIEW_H

const VIEW = { top: VIEW_TOP, height: VIEW_H, width: PITCH.w }

/** see the header: the ink under every coloured mark */
const KEYLINE = 6

export type PitchMan = {
  name: string
  look: ShirtLook | null
  opponent: boolean
}

export type Flight = {
  key: number
  from: ReplayPoint
  to: ReplayPoint
  action: ReplayAction
  /** the man it reaches, who leans into it */
  receiver: string | null
  /** somebody has it at his feet when it lands (a pass received, a carry) */
  keeps: boolean
}

export type ReplayLeg = { from: ReplayPoint; to: ReplayPoint; action: ReplayAction; actor: string | null }

export type ReplayScript = {
  key: number
  mine: ReplayLeg[]
  /** the archive's move — null until the server has answered */
  truth: ReplayLeg[] | null
  /** the archive's last touch ends in the net */
  goal: boolean
}

type DragState = {
  kind: 'man' | 'ball'
  name: string
  at: ReplayPoint
  over: string | null
  /** frame-relative px, for the label at the finger */
  px: { x: number; y: number }
}

function pct(p: Pt): { insetInlineStart: string; top: string } {
  return { insetInlineStart: `${(p.x / PITCH.w) * 100}%`, top: `${((p.y - VIEW_TOP) / VIEW_H) * 100}%` }
}

/** where a flight starts and lands: beside the feet of whoever has the ball */
export function flightEnds(flight: Flight): { a: Pt; b: Pt } {
  const b = toBoard(flight.to)
  return { a: besideFeet(toBoard(flight.from)), b: flight.keeps ? besideFeet(b) : b }
}

function usePrefersStill(): boolean {
  const [still, setStill] = useState(false)
  useEffect(() => {
    const query = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    setStill(query?.matches ?? false)
  }, [])
  return still
}

/** yours is always vermilion (the legend says so); a near touch prints deeper, a bad one dashed */
function colourFor(grade: TouchGrade | undefined): string {
  if (grade === 'near' || grade === 'bad') return 'rgb(var(--p-red-deep))'
  return 'rgb(var(--p-red))'
}

/** The ball's drawn place beside a man's feet — so the man and the ball are both grabbable. */
function besideFeet(p: Pt): Pt {
  return { x: p.x + 13, y: p.y + 9 }
}

export function GoalPitch({
  men,
  spots,
  touches,
  draft,
  armed = null,
  disabled = false,
  caption = null,
  hintEnvelope = null,
  night = false,
  tension = 0,
  heartbeat = false,
  flight = null,
  replay = null,
  reveal = null,
  plate,
  overlay,
  onDragMan,
  onDragBall,
  onTapMan,
  onTapPoint,
  onLanded,
  onReplayLeg,
  onReplayGoal,
  onReplayDone,
  onSkip,
}: {
  men: PitchMan[]
  /** where every man stands now (normalised) */
  spots: Record<string, ReplayPoint>
  touches: UserTouch[]
  draft: Draft
  armed?: string | null
  disabled?: boolean
  caption?: { lead: string; text: string } | null
  hintEnvelope?: Envelope | null
  night?: boolean
  /** 0..1 — the crowd rises with it */
  tension?: number
  /** the frame beats — the clock is nearly out, or the ball is in the box */
  heartbeat?: boolean
  /** one touch, just committed: fly it */
  flight?: Flight | null
  /** the whistle: play both moves back */
  replay?: ReplayScript | null
  /** after the replay: the archive's move, the grades and the pairs, drawn to stay */
  reveal?: {
    truth: TruthTouch[]
    grades: Array<TouchGrade | undefined>
    pairs: Array<{ user: number | null; truth: number | null }>
  } | null
  /** the TV caption — fixed over the stand, never zoomed */
  plate?: ReactNode
  /** the goal moment and anything else that sits over the whole frame */
  overlay?: ReactNode
  onDragMan: (name: string, at: ReplayPoint) => void
  onDragBall: (at: ReplayPoint, receiver: string | null) => void
  onTapMan: (name: string) => void
  onTapPoint: (at: ReplayPoint) => void
  /** a committed touch's ball has landed */
  onLanded?: (key: number) => void
  onReplayLeg?: (phase: 'mine' | 'truth', index: number) => void
  onReplayGoal?: () => void
  onReplayDone?: () => void
  onSkip?: () => void
}) {
  const still = usePrefersStill()
  const frame = useRef<HTMLDivElement>(null)
  const cam = useRef<HTMLDivElement>(null)
  const ballG = useRef<SVGGElement>(null)
  const ballShadow = useRef<SVGEllipseElement>(null)
  const flightTrail = useRef<SVGPathElement>(null)
  const netG = useRef<SVGGElement>(null)
  const crowdG = useRef<SVGGElement>(null)
  const legPaths = useRef<Array<SVGPathElement | null>>([])
  const legKeys = useRef<Array<SVGPathElement | null>>([])
  const animating = useRef(false)
  const camNow = useRef({ s: 1, tx: 0, ty: 0 })
  const camRaf = useRef<number | null>(null)
  const [flyingKey, setFlyingKey] = useState<number | null>(null)
  /** the last flight that has landed — until then its committed trail stays hidden */
  const [landedKey, setLandedKey] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const byPointer = useRef(false)
  const suppressClick = useRef(false)

  const opponents = new Set(men.filter((man) => man.opponent).map((man) => man.name))
  const live = !replay && !reveal
  const holder = live && draft.actorHe && draft.origin ? draft.actorHe : null
  const cbs = useRef({ onReplayLeg, onReplayGoal, onReplayDone, onLanded })
  cbs.current = { onReplayLeg, onReplayGoal, onReplayDone, onLanded }
  const lastTarget = touches[touches.length - 1]?.target ?? null
  const ballRest: Pt | null = holder && draft.origin
    ? besideFeet(toBoard(draft.origin))
    : lastTarget
      ? toBoard(lastTarget)
      : null
  const loose = !holder && lastTarget !== null

  /** where each man is drawn: the draft's man at his origin, else his spot */
  const placeOf = useCallback(
    (name: string): Pt | null => {
      if (drag?.kind === 'man' && drag.name === name) return toBoard(drag.at)
      if (holder === name && draft.origin) return toBoard(draft.origin)
      const spot = spots[name]
      return spot ? toBoard(spot) : null
    },
    [drag, holder, draft.origin, spots],
  )

  /* ------------------------------------------------------------ the camera */

  const applyCam = useCallback((c: { s: number; tx: number; ty: number }) => {
    camNow.current = c
    const el = cam.current
    if (!el) return
    el.style.transform = `translate(${(c.tx * 100).toFixed(3)}%, ${(c.ty * 100).toFixed(3)}%) scale(${c.s.toFixed(4)})`
  }, [])

  /** ease the camera to a target over ms (or at once) */
  const easeCam = useCallback(
    (to: { s: number; tx: number; ty: number }, ms: number) => {
      if (camRaf.current !== null) cancelAnimationFrame(camRaf.current)
      if (still || ms <= 0) {
        applyCam(to)
        return
      }
      const from = { ...camNow.current }
      const start = performance.now()
      const step = (now: number) => {
        const k = easeInOut(Math.min(1, (now - start) / ms))
        applyCam({ s: from.s + (to.s - from.s) * k, tx: from.tx + (to.tx - from.tx) * k, ty: from.ty + (to.ty - from.ty) * k })
        if (k < 1) camRaf.current = requestAnimationFrame(step)
        else camRaf.current = null
      }
      camRaf.current = requestAnimationFrame(step)
    },
    [applyCam, still],
  )

  const HOME = { s: 1, tx: 0, ty: 0 }

  /* ------------------------------------------------------------ the ball at rest */

  const placeBall = useCallback((p: Pt | null, lift = 0) => {
    const g = ballG.current
    const shadow = ballShadow.current
    if (!g || !shadow) return
    if (!p) {
      g.setAttribute('transform', 'translate(-100 -100)')
      shadow.setAttribute('transform', 'translate(-100 -100)')
      return
    }
    g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${(p.y - lift).toFixed(1)})`)
    shadow.setAttribute('transform', `translate(${(p.x + 2).toFixed(1)} ${(p.y + 3).toFixed(1)}) scale(${(1 - Math.min(0.5, lift / 60)).toFixed(3)})`)
  }, [])

  useLayoutEffect(() => {
    if (animating.current) return
    if (drag?.kind === 'ball') placeBall(toBoard(drag.at))
    else if (drag?.kind === 'man' && drag.name === holder) placeBall(besideFeet(toBoard(drag.at)))
    else placeBall(ballRest)
  })

  /* ------------------------------------------------------------ lean: the man it reaches */

  const lean = useCallback(
    (name: string | null) => {
      if (!name || still) return
      const el = frame.current?.querySelector<HTMLElement>(`[data-token="${CSS.escape(name)}"] [data-lean]`)
      el?.animate(
        [
          { transform: 'translateY(0) rotate(0deg) scale(1)' },
          { transform: 'translateY(-7px) rotate(-9deg) scale(1.12)' },
          { transform: 'translateY(0) rotate(3deg) scale(1)' },
          { transform: 'none' },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,0,0,1)' },
      )
    },
    [still],
  )

  const ripple = useCallback(() => {
    if (still) return
    netG.current?.animate(
      [
        { transform: 'scale(1,1)' },
        { transform: 'scale(1.08,1.3) skewX(-5deg)' },
        { transform: 'scale(.97,.9) skewX(3deg)' },
        { transform: 'scale(1.02,1.08)' },
        { transform: 'none' },
      ],
      { duration: 820, easing: 'ease-out' },
    )
    crowdG.current?.animate(
      [
        { transform: 'translateY(0)' },
        { transform: 'translateY(-12px)' },
        { transform: 'translateY(0)' },
        { transform: 'translateY(-8px)' },
        { transform: 'translateY(0)' },
        { transform: 'translateY(-5px)' },
        { transform: 'none' },
      ],
      { duration: 1500, easing: 'ease-out' },
    )
  }, [still])

  /* ------------------------------------------------------------ one leg in the air */

  const fly = useCallback(
    (
      a: Pt,
      b: Pt,
      action: ReplayAction,
      trailList: Array<SVGPathElement | null>,
      options: { speed?: number; camera: 'soft' | 'full'; onEnd: () => void },
    ) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y)
      const trails = trailList.filter((path): path is SVGPathElement => path !== null)
      const total = trails[0] ? trails[0].getTotalLength() : 0
      const draw = (k: number) => {
        for (const trail of trails) trail.style.strokeDashoffset = `${total * (1 - k)}`
      }
      for (const trail of trails) trail.style.strokeDasharray = `${total} ${total}`
      draw(0)
      if (still) {
        draw(1)
        placeBall(b)
        options.onEnd()
        return () => undefined
      }
      placeBall(a)
      const ms = flightMs(a, b, action, options.speed ?? 1)
      const start = performance.now()
      let raf = 0
      const step = (now: number) => {
        const raw = Math.min(1, (now - start) / ms)
        const k = action === 'shot' || action === 'header' ? easeOut(raw) : easeInOut(raw)
        const p = pointAt(a, b, action, k)
        placeBall(p, liftAt(action, k, len))
        draw(k)
        // the camera rides with the ball and leans in as it nears the goal
        const want = options.camera === 'full' ? pushFor(p, 1.55) : pushFor(p, 1.18)
        const target = cameraFor(p, want, VIEW)
        const c = camNow.current
        const lerp = options.camera === 'full' ? 0.14 : 0.1
        applyCam({ s: c.s + (target.s - c.s) * lerp, tx: c.tx + (target.tx - c.tx) * lerp, ty: c.ty + (target.ty - c.ty) * lerp })
        if (raw < 1) raf = requestAnimationFrame(step)
        else options.onEnd()
      }
      raf = requestAnimationFrame(step)
      return () => cancelAnimationFrame(raf)
    },
    [applyCam, placeBall, still],
  )

  /* ------------------------------------------------------------ a committed touch flies */

  useLayoutEffect(() => {
    if (!flight || replay) return
    animating.current = true
    setFlyingKey(flight.key)
    const { a, b } = flightEnds(flight)
    let hold = 0
    const cancel = fly(a, b, flight.action, [flightTrail.current], {
      camera: 'soft',
      onEnd: () => {
        animating.current = false
        setFlyingKey(null)
        setLandedKey(flight.key)
        cbs.current.onLanded?.(flight.key)
        lean(flight.receiver)
        if (inMouth(flight.to)) ripple()
        hold = window.setTimeout(() => easeCam(HOME, 620), 260)
      },
    })
    return () => {
      cancel()
      window.clearTimeout(hold)
      animating.current = false
      setLandedKey(flight.key)
    }
    // one flight per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight?.key])

  /* ------------------------------------------------------------ the whistle: both moves */

  const script = useRef(replay)
  script.current = replay
  const skipRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    if (!replay) return
    animating.current = true
    let cancelled = false
    let cancelLeg: () => void = () => undefined
    let timer = 0
    const legs = () => {
      const s = script.current
      return s ? [...s.mine.map((leg) => ({ ...leg, phase: 'mine' as const })), ...(s.truth ?? []).map((leg) => ({ ...leg, phase: 'truth' as const }))] : []
    }

    const finish = () => {
      if (cancelled) return
      cancelled = true
      cancelLeg()
      window.clearTimeout(timer)
      for (const path of [...legPaths.current, ...legKeys.current]) if (path) path.style.strokeDashoffset = '0'
      animating.current = false
      easeCam(HOME, 500)
      cbs.current.onReplayDone?.()
    }
    skipRef.current = finish

    const run = (index: number) => {
      if (cancelled) return
      const s = script.current
      const all = legs()
      const mineCount = s?.mine.length ?? 0
      if (index === mineCount && !s?.truth) {
        // the archive has not answered yet: hold the frame on the last touch
        timer = window.setTimeout(() => run(index), 120)
        return
      }
      const leg = all[index]
      if (!leg) {
        // the end of the archive's move
        if (s?.goal) {
          ripple()
          cbs.current.onReplayGoal?.()
          const net = cameraFor({ x: 150, y: 0 }, 1.5, VIEW)
          easeCam(net, 500)
          timer = window.setTimeout(finish, still ? 600 : 2600)
        } else finish()
        return
      }
      const phase = leg.phase
      const local = phase === 'mine' ? index : index - mineCount
      cbs.current.onReplayLeg?.(phase, local)
      const between = phase === 'truth' && local === 0 ? (still ? 0 : 700) : still ? 0 : 200
      if (phase === 'truth' && local === 0) easeCam(HOME, 500)
      timer = window.setTimeout(() => {
        if (cancelled) return
        cancelLeg = fly(toBoard(leg.from), toBoard(leg.to), leg.action, [legPaths.current[index] ?? null, legKeys.current[index] ?? null], {
          camera: 'full',
          speed: 1.2,
          onEnd: () => {
            lean(all[index + 1]?.actor ?? null)
            run(index + 1)
          },
        })
      }, between)
    }
    // start every leg's trail undrawn
    for (const path of [...legPaths.current, ...legKeys.current]) {
      if (!path) continue
      const total = path.getTotalLength()
      path.style.strokeDasharray = `${total} ${total}`
      path.style.strokeDashoffset = `${total}`
    }
    run(0)
    return () => {
      cancelled = true
      cancelLeg()
      window.clearTimeout(timer)
      animating.current = false
    }
    // one replay per key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay?.key])

  /** a truth that arrives mid-replay adds its legs' trails — undrawn, until they fly */
  useLayoutEffect(() => {
    if (!replay?.truth) return
    const from = replay.mine.length
    for (let i = from; i < legPaths.current.length; i += 1) {
      for (const path of [legPaths.current[i], legKeys.current[i]]) {
        if (!path || path.dataset.armed === 'true') continue
        const total = path.getTotalLength()
        path.style.strokeDasharray = `${total} ${total}`
        path.style.strokeDashoffset = `${total}`
        path.dataset.armed = 'true'
      }
    }
  }, [replay?.truth, replay?.mine.length])

  /* ------------------------------------------------------------ the crowd and the heart */

  useEffect(() => {
    const g = crowdG.current
    if (!g) return
    g.style.transition = still ? 'none' : 'transform 900ms cubic-bezier(.2,0,0,1)'
    g.style.transform = `translateY(${((1 - tension) * 16).toFixed(1)}px)`
  }, [tension, still])

  useEffect(() => {
    if (!heartbeat || still || !frame.current) return
    const beat = frame.current.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.012)' }, { transform: 'scale(1)' }, { transform: 'scale(1.006)' }, { transform: 'scale(1)' }],
      { duration: 900, iterations: Infinity },
    )
    return () => beat.cancel()
  }, [heartbeat, still])

  /* ------------------------------------------------------------ the hands */

  const boardPoint = useCallback((clientX: number, clientY: number): ReplayPoint | null => {
    const rect = cam.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    const x = ((clientX - rect.left) / rect.width) * PITCH.w
    const y = VIEW_TOP + ((clientY - rect.top) / rect.height) * VIEW_H
    return { x: Math.max(0.02, Math.min(0.98, x / PITCH.w)), y: Math.max(-0.2, Math.min(0.98, y / PITCH.h)) }
  }, [])

  const framePx = useCallback((clientX: number, clientY: number) => {
    const rect = frame.current?.getBoundingClientRect()
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 }
  }, [])

  const spotsForDrop = useCallback(() => {
    const out: Record<string, ReplayPoint> = {}
    for (const man of men) {
      const p = holder === man.name && draft.origin ? draft.origin : spots[man.name]
      if (p) out[man.name] = p
    }
    return out
  }, [men, spots, holder, draft.origin])

  function grab(kind: 'man' | 'ball', name: string) {
    return (event: React.PointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return
      const el = event.currentTarget
      const startX = event.clientX
      const startY = event.clientY
      const id = event.pointerId
      let lifted = false
      el.setPointerCapture?.(id)
      if (camRaf.current !== null) cancelAnimationFrame(camRaf.current)

      const move = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        if (!lifted) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 8) return
          lifted = true
          applyCam(HOME)
        }
        ev.preventDefault()
        const at = boardPoint(ev.clientX, ev.clientY)
        if (!at) return
        const over = kind === 'ball' ? (inMouth(at) ? 'mouth' : nearestMan(at, spotsForDrop(), holder)) : null
        setDrag({ kind, name, at, over, px: framePx(ev.clientX, ev.clientY) })
      }
      const up = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        cleanup()
        if (!lifted) return
        suppressClick.current = true
        window.setTimeout(() => (suppressClick.current = false), 0)
        const at = boardPoint(ev.clientX, ev.clientY)
        setDrag(null)
        if (!at) return
        if (kind === 'man') onDragMan(name, at)
        else {
          const receiver = inMouth(at) ? null : nearestMan(at, spotsForDrop(), holder)
          onDragBall(receiver ? spotsForDrop()[receiver] ?? at : at, receiver)
        }
      }
      const cancel = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return
        cleanup()
        setDrag(null)
      }
      function cleanup() {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', cancel)
      }
      el.addEventListener('pointermove', move, { passive: false })
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', cancel)
    }
  }

  function swallowDraggedClick(event: React.MouseEvent) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    }
  }

  /** a zone tap: a pointer places where it landed, a keyboard the zone's centre */
  const fromPointer = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return
      const at = boardPoint(event.clientX, event.clientY)
      if (!at) return
      byPointer.current = true
      onTapPoint(at)
    },
    [boardPoint, disabled, onTapPoint],
  )
  const fromKeyboard = useCallback(
    (point: { x: number; y: number }) => {
      if (byPointer.current) {
        byPointer.current = false
        return
      }
      if (disabled) return
      onTapPoint(normalise(point))
    },
    [disabled, onTapPoint],
  )

  /* ------------------------------------------------------------ what the finger means */

  let fingerLabel: string | null = null
  if (drag?.kind === 'ball' && holder && draft.origin) {
    const verb =
      draft.action ??
      inferVerb({
        origin: draft.origin,
        target: drag.over && drag.over !== 'mouth' ? spotsForDrop()[drag.over] ?? drag.at : drag.at,
        receiver: drag.over && drag.over !== 'mouth' ? drag.over : null,
        previous: touches[touches.length - 1]?.action ?? null,
        opponent: opponents.has(holder),
      })
    fingerLabel = drag.over && drag.over !== 'mouth' ? `${t(ACTION_LABEL[verb])} ← ${drag.over}` : t(ACTION_LABEL[verb])
  } else if (drag?.kind === 'man') {
    fingerLabel = drag.name === holder ? t(ACTION_LABEL.dribble) : drag.name
  }

  /* ------------------------------------------------------------ drawing */

  const flightPath = flight ? (({ a, b }) => curvePath(a, b, flight.action))(flightEnds(flight)) : ''
  const replayLegs = replay ? [...replay.mine.map((leg) => ({ leg, truth: false })), ...(replay.truth ?? []).map((leg) => ({ leg, truth: true }))] : []
  const showMyTrails = !replay && !reveal
  const ballAway = !ballRest && !drag && !replay

  return (
    <div
      ref={frame}
      data-goal="board"
      className={`relative h-full w-full overflow-hidden border-plate border-ink ${night ? 'bg-ink' : 'bg-paper'}`}
      onPointerDownCapture={replay ? () => (animating.current && script.current?.truth ? skipRef.current() : onSkip?.()) : undefined}
    >
      {/* the lamps — the one glow the brand allows, and only on a floodlit night */}
      {night && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex justify-end gap-[22%] pe-[6%] pt-[2%]">
          {[0, 1].map((lamp) => (
            <span key={lamp} className="grid grid-cols-3 gap-[2px] bg-ink p-[3px] shadow-lamp">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="block h-[5px] w-[6px] bg-paper" />
              ))}
            </span>
          ))}
        </div>
      )}

      <div ref={cam} data-goal="camera" className="absolute inset-0 origin-top-left [container-type:inline-size] will-change-transform">
        <svg viewBox={`0 ${VIEW_TOP} ${PITCH.w} ${VIEW_H}`} className="block h-full w-full" aria-hidden="true">
          <defs>
            <symbol id="figGuard" viewBox="0 0 70 80">
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="34" cy="12" r="8" />
                <path d="M28 20 L40 20 L42 42 L26 42 Z" />
                <path d="M41 24 L54 30" />
                <path d="M27 24 L14 30" />
                <path d="M30 42 L25 60 L26 70" />
                <path d="M39 42 L45 60 L44 70" />
              </g>
            </symbol>
            <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgb(var(--p-grass-dark))" />
              <stop offset=".55" stopColor="rgb(var(--p-grass))" />
              <stop offset="1" stopColor="rgb(var(--p-grass-dark))" />
            </linearGradient>
            <radialGradient id="turfVignette" cx=".5" cy=".42" r=".75">
              <stop offset=".55" stopColor="rgb(var(--p-ink))" stopOpacity="0" />
              <stop offset="1" stopColor="rgb(var(--p-ink))" stopOpacity=".18" />
            </radialGradient>
            <marker id="truthHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M0 1 L9 5 L0 9 z" fill="rgb(var(--p-tekhelet))" />
            </marker>
          </defs>

          {/* the stand — the gate-7 crowd sheet, one navy plate on the sky */}
          <rect x="0" y={VIEW_TOP} width={PITCH.w} height={STAND_BOTTOM - VIEW_TOP + 2} fill={night ? 'rgb(var(--p-ink))' : 'rgb(var(--p-paper-deep))'} />
          <g ref={crowdG}>
            <image
              href="/life/art/standCrowd.webp"
              x="-20"
              y={VIEW_TOP + 4}
              width={PITCH.w + 40}
              height={STAND_BOTTOM - VIEW_TOP + 14}
              preserveAspectRatio="xMidYMid slice"
              style={{ filter: night ? 'grayscale(1) contrast(1.2) brightness(.95)' : 'grayscale(1) contrast(1.2) brightness(1)' }}
            />
            <rect x="-20" y={VIEW_TOP} width={PITCH.w + 40} height={STAND_BOTTOM - VIEW_TOP + 14} fill="rgb(var(--sign))" style={{ mixBlendMode: 'multiply' }} opacity={night ? 0.6 : 0.45} />
          </g>
          {/* the hoarding in front of the stand */}
          <rect x="0" y={STAND_BOTTOM - 6} width={PITCH.w} height="8" fill="rgb(var(--p-red-deep))" />
          <rect x="0" y={STAND_BOTTOM + 2} width={PITCH.w} height="2" fill="rgb(var(--p-ink))" />

          {/* behind the goal */}
          <rect x="0" y={STAND_BOTTOM + 4} width={PITCH.w} height={PITCH.goalY - STAND_BOTTOM} fill="rgb(var(--p-ink))" />

          <rect width={PITCH.w} height={PITCH.h} fill="url(#turf)" />
          <g fill="rgb(var(--p-grass-dark))" opacity=".34">
            {[0, 80, 160, 240, 320].map((y) => (
              <rect key={y} y={y} width={PITCH.w} height="40" />
            ))}
          </g>
          <rect width={PITCH.w} height={PITCH.h} fill="url(#turfVignette)" />
          {night && <rect width={PITCH.w} height={PITCH.h} fill="rgb(var(--p-ink))" opacity=".2" />}

          <g stroke="rgb(var(--p-line))" fill="none" strokeWidth="2.4">
            <path d="M12 12 H288 M12 12 V388 M288 12 V388 M12 388 H288" />
            <rect x="68" y="12" width="164" height="67" />
            <rect x="113" y="12" width="74" height="22" />
            <path d="M120.3 79 A 37 37 0 0 0 179.7 79" />
            <path d="M113 388 A 37 37 0 0 1 187 388" />
          </g>
          <g fill="rgb(var(--p-line))">
            <circle cx={LANDMARKS.penaltySpot.x} cy={LANDMARKS.penaltySpot.y} r="2.6" />
            <circle cx="150" cy="388" r="2.6" />
          </g>
          {/* the zone rules, faint: guidance, not a table */}
          <g stroke="rgb(var(--p-line))" strokeWidth=".7" opacity=".16" strokeDasharray="3 5" fill="none">
            <path d="M68 12 V340 M123 12 V340 M178 12 V340 M233 12 V340" />
            <path d="M13 94 H288 M13 176 H288 M13 258 H288" />
          </g>

          {/* the net — it ripples */}
          <g ref={netG} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
            <rect x="126" y="-22" width="48" height="34" fill="rgb(var(--p-net))" stroke="rgb(var(--p-line))" strokeWidth="2.4" />
            <path
              d="M134 -22 V12 M142 -22 V12 M150 -22 V12 M158 -22 V12 M166 -22 V12 M126 -14 H174 M126 -6 H174 M126 2 H174"
              stroke="rgb(var(--p-net-line))"
              strokeWidth=".8"
              fill="none"
            />
          </g>

          {/* the other side's shape, in chalk — decoration, never a target */}
          <g pointerEvents="none">
            {[
              { x: 92, y: 34 },
              { x: 176, y: 88 },
              { x: 104, y: 120 },
            ].map((guard) => (
              <use key={`${guard.x}`} href="#figGuard" x={guard.x} y={guard.y} width="34" height="40" strokeWidth={3} style={{ color: 'rgb(var(--p-line))' }} opacity=".7" />
            ))}
            {opponents.size === 0 && (
              <use href="#figGuard" x="134" y="12" width="34" height="40" strokeWidth={3.4} style={{ color: 'rgb(var(--p-tekhelet))' }} />
            )}
          </g>

          {/* the reception hint — one envelope, bought */}
          {hintEnvelope && !reveal && (
            <g pointerEvents="none" data-goal="reception">
              <ellipse cx={hintEnvelope.x * PITCH.w} cy={hintEnvelope.y * PITCH.h} rx={Math.max(4, hintEnvelope.rx * PITCH.w)} ry={Math.max(4, hintEnvelope.ry * PITCH.h)} fill="none" stroke="rgb(var(--p-ink))" strokeWidth="4" opacity=".55" />
              <ellipse cx={hintEnvelope.x * PITCH.w} cy={hintEnvelope.y * PITCH.h} rx={Math.max(4, hintEnvelope.rx * PITCH.w)} ry={Math.max(4, hintEnvelope.ry * PITCH.h)} fill="none" stroke="rgb(var(--p-line))" strokeWidth="2.2" strokeDasharray="6 5" />
            </g>
          )}

          {/* the reveal, drawn to stay: envelopes, the archive in navy, yours in vermilion */}
          {reveal && (
            <g pointerEvents="none">
              {reveal.truth.map((touch, index) => (
                <g key={`env-${index}`}>
                  <TruthEllipse envelope={touch.origin} />
                  {index === reveal.truth.length - 1 && <TruthEllipse envelope={touch.target} />}
                </g>
              ))}
              {reveal.truth.map((touch, index) => {
                const a = toBoard(touch.origin)
                const b = toBoard(touch.target)
                return (
                  <g key={`route-${index}`}>
                    <path d={curvePath(a, b, touch.action)} fill="none" stroke="rgb(var(--p-ink))" strokeWidth="5.4" strokeLinecap="round" opacity=".5" />
                    <path d={curvePath(a, b, touch.action)} fill="none" stroke="rgb(var(--p-tekhelet))" strokeWidth="3" strokeLinecap="round" markerEnd="url(#truthHead)" />
                    <path d={`M${a.x - 5} ${a.y} H${a.x + 5} M${a.x} ${a.y - 5} V${a.y + 5}`} stroke="rgb(var(--p-tekhelet))" strokeWidth="2.4" strokeLinecap="round" />
                  </g>
                )
              })}
              <g data-goal="bridges">
                {reveal.pairs.map((pair, index) => {
                  if (pair.user === null || pair.truth === null) return null
                  const mine = touches[pair.user]
                  const theirs = reveal.truth[pair.truth]
                  if (!mine || !theirs) return null
                  const a = toBoard(mine.origin)
                  const b = toBoard(theirs.origin)
                  if (Math.hypot(a.x - b.x, a.y - b.y) < 4) return null
                  const d = `M${a.x} ${a.y} L${b.x} ${b.y}`
                  return (
                    <g key={`bridge-${index}`} data-goal="bridge">
                      <path d={d} fill="none" stroke="rgb(var(--p-ink))" strokeWidth="4.4" strokeLinecap="round" opacity=".85" />
                      <path d={d} fill="none" stroke="rgb(var(--p-line))" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 5" />
                    </g>
                  )
                })}
              </g>
              {touches.map((touch, index) => {
                const d = curvePath(toBoard(touch.origin), toBoard(touch.target), touch.action)
                return (
                  <g key={`mine-${index}`}>
                    <path d={d} fill="none" stroke="rgb(var(--p-ink))" strokeWidth={KEYLINE} strokeLinecap="round" />
                    <path d={d} fill="none" stroke={colourFor(reveal.grades[index])} strokeWidth="3" strokeLinecap="round" strokeDasharray={reveal.grades[index] === 'bad' ? '6 5' : undefined} />
                  </g>
                )
              })}
              {reveal.pairs.map((pair, index) => {
                if (pair.user !== null && pair.truth === null) {
                  const touch = touches[pair.user]
                  if (!touch) return null
                  const p = toBoard(touch.origin)
                  const x = Math.min(PITCH.w - 9, p.x + 15)
                  const y = p.y - 16
                  return (
                    <g key={`extra-${index}`} data-goal="extra">
                      <rect x={x - 7} y={y - 7} width="14" height="14" fill="rgb(var(--p-ink))" />
                      <path d={`M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4}`} stroke="rgb(var(--p-line))" strokeWidth="2.2" />
                    </g>
                  )
                }
                if (pair.user === null && pair.truth !== null) {
                  const touch = reveal.truth[pair.truth]
                  if (!touch) return null
                  const p = toBoard(touch.origin)
                  return (
                    <g key={`missing-${index}`} data-goal="missing">
                      <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="rgb(var(--p-ink))" strokeWidth="5" />
                      <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="rgb(var(--p-line))" strokeWidth="2.2" />
                    </g>
                  )
                }
                return null
              })}
            </g>
          )}

          {/* the replay's trails — drawn as the ball flies them */}
          {replay && (
            <g pointerEvents="none" data-goal="rolling">
              {replayLegs.map(({ leg, truth }, index) => {
                const d = curvePath(toBoard(leg.from), toBoard(leg.to), leg.action)
                return (
                  <g key={`leg-${index}`}>
                    <path
                      ref={(el) => {
                        legKeys.current[index] = el
                      }}
                      d={d}
                      fill="none"
                      stroke="rgb(var(--p-ink))"
                      strokeWidth={KEYLINE}
                      strokeLinecap="round"
                      opacity={truth ? 0.5 : 1}
                    />
                    <path
                      ref={(el) => {
                        legPaths.current[index] = el
                      }}
                      d={d}
                      fill="none"
                      stroke={truth ? 'rgb(var(--p-tekhelet))' : 'rgb(var(--p-red))'}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* the move so far, while it is being built — chalk on an ink keyline */}
          {showMyTrails && (
            <g pointerEvents="none">
              {touches.map((touch, index) => {
                const d = curvePath(toBoard(touch.origin), toBoard(touch.target), touch.action)
                const hidden = flight !== null && landedKey !== flight.key && index === touches.length - 1
                return (
                  <g key={`trail-${index}`} style={hidden ? { visibility: 'hidden' } : undefined}>
                    <path d={d} fill="none" stroke="rgb(var(--p-ink))" strokeWidth="5" strokeLinecap="round" opacity=".32" transform="translate(2,3)" />
                    <path d={d} fill="none" stroke="rgb(var(--p-line))" strokeWidth="3" strokeLinecap="round" strokeDasharray="8 6" />
                  </g>
                )
              })}
              {flight && (
                <path
                  ref={flightTrail}
                  d={flightPath}
                  fill="none"
                  stroke="rgb(var(--p-line))"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  style={flyingKey === flight.key ? undefined : { visibility: 'hidden' }}
                />
              )}
              {touches.map((touch, index) => {
                const p = toBoard(touch.origin)
                return (
                  <g key={`num-${index}`}>
                    <rect x={p.x - 19} y={p.y - 3} width="11" height="11" fill="rgb(var(--p-ink))" />
                    <text x={p.x - 13.5} y={p.y + 5.4} textAnchor="middle" fill="rgb(var(--p-line))" style={{ fontSize: 9, fontWeight: 800 }} className="font-latin">
                      {index + 1}
                    </text>
                  </g>
                )
              })}
            </g>
          )}

          {/* the live curve: where the ball will go if you let go now */}
          {drag?.kind === 'ball' && draft.origin && (
            <path
              pointerEvents="none"
              d={curvePath(
                besideFeet(toBoard(draft.origin)),
                toBoard(drag.over && drag.over !== 'mouth' ? spotsForDrop()[drag.over] ?? drag.at : drag.at),
                'pass',
              )}
              fill="none"
              stroke="rgb(var(--p-line))"
              strokeWidth="2.6"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {/* the ball: a shadow on the grass and the ball above it */}
          <ellipse ref={ballShadow} cx="0" cy="0" rx="5.5" ry="2.6" fill="rgb(var(--p-ink))" opacity=".35" pointerEvents="none" />
          <g ref={ballG} pointerEvents="none" style={ballAway ? { visibility: 'hidden' } : undefined}>
            {loose && !replay && !still && (
              <rect x="-11" y="-11" width="22" height="22" fill="none" stroke="rgb(var(--p-line))" strokeWidth="1.8" strokeDasharray="3 3">
                <animateTransform attributeName="transform" type="rotate" from="0" to="90" dur="2.4s" repeatCount="indefinite" />
              </rect>
            )}
            <circle r="5.6" fill="rgb(var(--p-line))" stroke="rgb(var(--p-ink))" strokeWidth="1.8" />
            <path d="M-2.2 -1.4 L0 -3 L2.2 -1.4 L1.4 1.3 L-1.4 1.3 Z" fill="rgb(var(--p-ink))" />
          </g>
        </svg>

        {/* the tap path — twenty-one real, labelled controls over the drawing */}
        <div dir="ltr" role="group" aria-label={t('goal.pitchAria')} className="pointer-events-none absolute inset-0" style={{ touchAction: 'none' }}>
          <button
            type="button"
            disabled={disabled}
            onPointerDown={fromPointer}
            onClick={() => fromKeyboard(LANDMARKS.goalMouth)}
            aria-label={t('goal.goalAria')}
            data-goal="mouth"
            className="pointer-events-auto absolute disabled:cursor-default"
            style={{
              insetInlineStart: `${(100 / PITCH.w) * 100}%`,
              // down from the foot of the stand's first rows to the goal line: a target is
              // not a drawing, and at 360×640 the air alone measured 38px
              top: `${((MOUTH_TOP - VIEW_TOP) / VIEW_H) * 100}%`,
              width: `${(100 / PITCH.w) * 100}%`,
              height: `${((PITCH.goalY - MOUTH_TOP) / VIEW_H) * 100}%`,
            }}
          />
          {ROWS.flatMap((row) =>
            COLS.map((col) => {
              const id: ZoneId = `${col}${row}`
              const rect = zoneRect(id)
              const centre = zoneCenter(id)
              if (!rect || !centre) return null
              return (
                <button
                  key={id}
                  type="button"
                  disabled={disabled}
                  onPointerDown={fromPointer}
                  onClick={() => fromKeyboard(centre)}
                  aria-label={t('goal.zoneAria', { zone: id, col, row: String(row) })}
                  data-goal="zone"
                  data-zone={id}
                  className="pointer-events-auto absolute disabled:cursor-default"
                  style={{
                    insetInlineStart: `${(rect.x / PITCH.w) * 100}%`,
                    top: `${((rect.y - VIEW_TOP) / VIEW_H) * 100}%`,
                    width: `${(rect.w / PITCH.w) * 100}%`,
                    height: `${(rect.h / VIEW_H) * 100}%`,
                  }}
                />
              )
            }),
          )}
        </div>

        {/* the men, standing on the grass in their shirts */}
        <div dir="ltr" className="pointer-events-none absolute inset-0" style={{ touchAction: 'none' }}>
          {men.map((man) => {
            const p = placeOf(man.name)
            if (!p) return null
            const isHolder = holder === man.name
            const lifted = drag?.kind === 'man' && drag.name === man.name
            const target = drag?.kind === 'ball' && drag.over === man.name
            const hot = armed === man.name || isHolder || target
            return (
              <button
                key={man.name}
                type="button"
                data-goal="player"
                data-token={man.name}
                data-opponent={man.opponent ? 'true' : undefined}
                data-holder={isHolder ? 'true' : undefined}
                aria-pressed={armed === man.name || isHolder}
                aria-label={man.opponent ? t('goal.pool.opponentAria', { name: man.name }) : man.name}
                disabled={disabled}
                onPointerDown={grab('man', man.name)}
                onClickCapture={swallowDraggedClick}
                onClick={() => onTapMan(man.name)}
                className={`pointer-events-auto absolute flex min-h-tap min-w-[44px] -translate-x-1/2 -translate-y-[58%] flex-col items-center disabled:cursor-default ${
                  lifted ? 'z-20' : hot ? 'z-10' : ''
                } ${lifted || drag ? '' : 'transition-[inset-inline-start,top] duration-300 ease-stamp motion-reduce:transition-none'}`}
                style={{ ...pct(p), touchAction: 'none' }}
              >
                <span
                  data-lean
                  className={`flex flex-col items-center transition-transform duration-press ${lifted ? '-translate-y-2 scale-110' : target ? 'scale-[1.18]' : ''} ${
                    armed === man.name && !lifted ? 'animate-fx-wobble motion-reduce:animate-none' : ''
                  }`}
                >
                  {/* no boxes: a soft ground shadow, a thin ring under the active man, the name printed straight on the grass */}
                  <span className="relative block">
                    <svg viewBox="0 0 60 16" aria-hidden="true" className="absolute inset-x-[-12%] bottom-[-14%] block h-auto w-[124%]">
                      <ellipse cx="30" cy="8" rx="22" ry="5" fill="rgb(var(--p-ink))" opacity=".3" />
                      {hot && <ellipse data-goal-active="true" cx="30" cy="8" rx="27" ry="6.5" fill="none" stroke="rgb(var(--p-line))" strokeWidth="1.6" />}
                    </svg>
                    <span className="relative block [filter:drop-shadow(0_2px_1.5px_rgb(var(--p-ink)/.45))]">
                      {man.look && !man.opponent ? (
                        <PlayerShirt look={man.look} eager title={man.name} className="aspect-[5/6] w-[10.5cqw] max-w-[54px]" />
                      ) : (
                        <AwayShirt opponent={man.opponent} />
                      )}
                    </span>
                  </span>
                  <span
                    className={`mt-[3px] block max-w-[27cqw] truncate font-body text-[10px] font-extrabold leading-[1.3] [paint-order:stroke] [-webkit-text-stroke:3px_rgb(var(--p-ink))] ${
                      hot ? 'text-paper' : 'text-paper/95'
                    }`}
                  >
                    {man.name}
                  </span>
                </span>
              </button>
            )
          })}

          {/* the ball, as a thing you can pick up — only while a man has it */}
          {holder && ballRest && !replay && (
            <button
              type="button"
              data-goal="ball"
              aria-label={t('goal88.ballAria', { name: holder })}
              disabled={disabled}
              onPointerDown={grab('ball', holder)}
              onClickCapture={swallowDraggedClick}
              onClick={() => onTapMan(holder)}
              className="pointer-events-auto absolute z-30 grid min-h-tap min-w-[44px] -translate-x-1/2 -translate-y-1/2 place-items-center disabled:cursor-default"
              style={{ ...pct(ballRest), touchAction: 'none', visibility: drag?.kind === 'ball' ? 'hidden' : undefined }}
            >
              <span aria-hidden="true" className="block h-[26px] w-[26px] border-[2px] border-dashed border-press-line" />
            </button>
          )}
        </div>
      </div>

      {/* the label at the finger: what this drop will be */}
      {fingerLabel && drag && (
        <div
          dir="ltr"
          aria-hidden="true"
          className="pointer-events-none absolute z-40 -translate-x-1/2"
          style={{ insetInlineStart: drag.px.x, top: Math.max(4, drag.px.y - 64) }}
        >
          <span dir="rtl" className="block whitespace-nowrap border-plate border-ink bg-ink px-2 py-1 font-display text-[15px] leading-none text-paper">
            {fingerLabel}
          </span>
        </div>
      )}

      {plate}

      {caption && (
        <div
          data-goal="caption"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex items-center gap-2 bg-ink/85 px-2 py-1"
        >
          <span className="shrink-0 bg-paper px-1.5 font-body text-[11px] font-extrabold leading-[1.5] text-ink">{caption.lead}</span>
          <span className="min-w-0 truncate font-body text-[12px] font-extrabold leading-snug text-paper">{caption.text}</span>
        </div>
      )}

      {overlay}
    </div>
  )
}

/** the other side's man, or a man with no shirt to hand: a flat printed jersey */
function AwayShirt({ opponent }: { opponent: boolean }) {
  return (
    <svg viewBox="0 0 50 60" className="block aspect-[5/6] w-[10.5cqw] max-w-[54px]" aria-hidden="true">
      <path
        d="M17 4 L33 4 L47 13 L41 25 L37 23 L37 56 L13 56 L13 23 L9 25 L3 13 Z"
        fill={opponent ? 'rgb(var(--sign))' : 'rgb(var(--p-red))'}
        stroke="rgb(var(--p-ink))"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M20 4 Q25 11 30 4" fill="none" stroke="rgb(var(--p-line))" strokeWidth="2.4" />
    </svg>
  )
}

function TruthEllipse({ envelope }: { envelope: Envelope }) {
  return (
    <ellipse
      cx={envelope.x * PITCH.w}
      cy={envelope.y * PITCH.h}
      rx={envelope.rx * PITCH.w}
      ry={envelope.ry * PITCH.h}
      fill="rgb(var(--p-tekhelet) / 0.12)"
      stroke="rgb(var(--p-tekhelet))"
      strokeWidth="1.6"
      strokeDasharray="5 5"
    />
  )
}
