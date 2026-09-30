'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AdSlot } from '@/components/ads/AdSlot'
import { Burst } from '@/components/play/Burst'
import { Confetti, NO_RED_TONES } from '@/components/play/Confetti'
import { PlayLink } from '@/components/play/PlayLink'
import { Punch } from '@/components/play/Punch'
import { RecordRun } from '@/components/play/RecordRun'
import { RevealBar, useReveal } from '@/components/play/Reveal'
import {
  BOARD_RATIO,
  GoalPitch,
  VIEW_H,
  VIEW_TOP,
  type Flight,
  type PitchMan,
  type ReplayLeg,
  type ReplayScript,
} from '@/components/press/GoalPitch'
import { ACTION_LABEL, VerbStrip } from '@/components/replay/ReplayBuilder'
import { ReplayVerdict } from '@/components/replay/ReplayVerdict'
import { CrossLinks } from '@/components/links/CrossLinks'
import { ShareCardChips } from '@/components/links/ShareCard'
import { ShareRow } from '@/components/share/ShareRow'
import { FitBox } from '@/components/stage/FitBox'
import { firePickFx, firePickFxAt } from '@/components/stage/PickFx'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { SlideSheet } from '@/components/stage/SlideSheet'
import { Num } from '@/components/ui/Num'
import { GOAL_SECONDS, GOALS_PER_RUN, MAX_TOUCHES, MIN_TOUCHES, PITCH, zoneCentre100, zoneIndexAt } from '@/lib/game/goal-zones'
import { useCrowd } from '@/lib/game/replay/crowd'
import { EMPTY_BUILD, EMPTY_DRAFT, type BuildState } from '@/lib/game/replay/draft'
import type { Envelope, ReplayPoint, TruthTouch, UserTouch } from '@/lib/game/replay/envelope'
import {
  RECEIVE_RADIUS,
  ballAt,
  ballLoose,
  focusedVerb,
  holderOf,
  inBox,
  inMouth,
  openingSpots,
  reopen,
  sendBall,
  setVerb,
  standAt,
  tension as tensionOf,
} from '@/lib/game/replay/gesture'
import { GOOD_SCORE } from '@/lib/game/replay/judge'
import { goalTier, keyMismatch, mismatchLine } from '@/lib/game/replay/mismatch'
import { ExitEmotion, ExitNext, ExitShare } from '@/components/result/UniversalExit'
import { readCompletedChapters } from '@/lib/life/memoryPassport'
import type { NextAction } from '@/lib/results/types'
import { voice, type ResultTier } from '@/lib/voice'
import type { ReplayAction } from '@/lib/game/replay/vocab'
import { LIVES } from '@/lib/game/session'
import { t, type MessageKey } from '@/lib/i18n'
import { markStep, track } from '@/lib/analytics/meter'
import type { CrossLink } from '@/lib/links/types'
import { goalCardQuery } from '@/lib/og/params'
import { haptic } from '@/lib/play/haptics'
import { SITE_URL } from '@/lib/brand'
import { collect } from '@/lib/profile/store'
import { freezeCard } from '@/lib/share/artefacts'
import { entityHash } from '@/lib/challenges/wire'
import type { ChallengeResult } from '@/lib/challenges/contract'
import { CompareCard } from '@/components/share/CompareCard'
import type { GoalChallenge, GoalVerdict } from '@/lib/game/goal'
import type { Wardrobe } from '@/lib/kit/playerShirt'
import type { Embedded } from '@/lib/mechanics/types'
import { useWide } from '@/app/xi/useWide'
import { askGoalHint, askReceptionHint, nextAfterGoalRun, submitGoal } from './actions'

/**
 * שחזור השער — three famous moves, rebuilt with the hands (delta 88).
 *
 * Maor, 24.9.2026, on the round before: *"זה עדיין לא נוח, לא עונה על בקשותיי, לא מאפשר שום
 * חוויה אמיתית. נורא 'לחיצה' משעממת, שום תנועה, שום אווירה, שום רגש"*. So the loop is now a
 * piece of football rather than a form:
 *
 *   ACTION   drag the man who started it onto the grass; drag the ball to a team-mate, into
 *            space, into the net; drag the man on the ball and he carries it
 *   FEEDBACK the ball flies a curve, the receiver leans into it, the camera follows and pushes
 *            in, the crowd rises and gets louder as the ball nears the box, the frame beats
 *            when the clock is nearly out
 *   REWARD   the whistle plays BOTH moves back at speed — yours in vermilion, then the
 *            archive's in navy — into a net that ripples, the ground roars, the scorer's
 *            real shirt and the reporter's own line of commentary; then the score
 *
 * What is unchanged, and is the contract: the server grades (`submitGoal`), the answer never
 * reaches the client before the whistle, a hint is fetched and paid for, a life is lost only
 * for a touch you placed and got wrong, a good move is collected for the worker card, the
 * run is recorded and shared, and inside THE WORKER LIFE (`embedded`) the verdict is handed
 * back instead. The tap path is the same board (tap a man, tap the grass), and the keyboard
 * reaches all of it — the drag is added, never required (WCAG 2.5.7).
 *
 * **The reveal is a beat, not a hold** — it now starts when the replay ENDS, not when the
 * server answers, so the ten seconds are ten seconds of reading and not of watching.
 */

type Played = {
  /** delta 89: which goal — the result's cross-links and the share card name it */
  goalId: string
  overall: number
  continuity: number
  touches: number
  matched: number
  good: number
  /** ONE RED WORLD §17 — the key mismatch in words ("המסירה השנייה ברחה קצת"), null when there was none */
  miss: string | null
  /** the player's route as zone indices — what a challenge compares (§44), never the archive's */
  zones: number[]
}

type Run = {
  goal: number
  lives: number
  score: number
  hints: number
  played: Played[]
  over: boolean
}

const NEW_RUN: Run = { goal: 0, lives: LIVES, score: 0, hints: 0, played: [], over: false }

const HINT_COST = 120
const REVEAL_MS = 10000

function pointsFor(overall: number, continuity: number): number {
  return Math.round(overall * 12 + continuity * 2)
}

type Stage = { build: BuildState; spots: Record<string, ReplayPoint> }
type Phase = 'build' | 'replay' | 'reveal'

/**
 * European nights are played under the lights — a UEFA Cup or a Champions League tie
 * (the competition's own words, "אופ״א" / "אלופות", spelled by code point so no Hebrew
 * literal sits outside the catalogue).
 */
const EUROPEAN = /\u05d0\u05d5\u05e4"\u05d0|\u05d0\u05dc\u05d5\u05e4\u05d5\u05ea/
function isNight(challenge: GoalChallenge): boolean {
  return EUROPEAN.test(challenge.competitionHe)
}

function minuteOf(challenge: GoalChallenge): string | null {
  // "דקה 88" in the fixture line
  const hit = /\u05d3\u05e7\u05d4\s+(\d{1,3})/.exec(challenge.subtitleHe)
  return hit ? hit[1] ?? null : null
}

function clockText(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function firstSentence(text: string): string {
  const cut = text.split(/(?<=[.!?])\s/)[0] ?? text
  return cut.length > 150 ? `${cut.slice(0, 147)}…` : cut
}

function legsOf(touches: UserTouch[]): ReplayLeg[] {
  return touches.map((touch) => ({ from: touch.origin, to: touch.target, action: touch.action, actor: touch.actorHe }))
}

function truthLegs(truth: TruthTouch[], pool: string[]): ReplayLeg[] {
  return truth.map((touch) => ({
    from: { x: touch.origin.x, y: touch.origin.y },
    to: { x: touch.target.x, y: touch.target.y },
    action: touch.action,
    actor: pool.includes(touch.actorHe) ? touch.actorHe : null,
  }))
}

/** board point → screen point, off the camera layer, for the pick effect */
function fxAtBoard(point: ReplayPoint, opts: Parameters<typeof firePickFx>[2]) {
  const cam = document.querySelector('[data-goal="camera"]')
  if (!cam) return
  const rect = cam.getBoundingClientRect()
  const x = rect.left + point.x * rect.width
  const y = rect.top + ((point.y * PITCH.h - VIEW_TOP) / VIEW_H) * rect.height
  firePickFx(x, y, opts)
}

export function GoalRun({
  goals,
  seed,
  cursor = 0,
  pin = null,
  shirts,
  links,
  embedded,
}: {
  goals: GoalChallenge[]
  seed: number
  cursor?: number
  /** `/goal?g=<goalId>` — the goal dealt first; every server call re-derives with it */
  pin?: string | null
  /** every man's shirt of that season, keyed `goalIndex|name` (the page resolves them) */
  shirts?: Wardrobe
  /** delta 89: each dealt goal's doors into the other gates (`lib/links`), by goalId */
  links?: Record<string, CrossLink[]>
  /**
   * Opened from inside THE WORKER LIFE (`lib/mechanics/types.ts`): one goal, the same judge,
   * and the verdict handed back — no collection, no record, no share, no masthead number.
   */
  embedded?: Omit<Embedded<GoalVerdict>, 'window'>
}) {
  const phone = useWide('(max-width: 767px)')
  const crowd = useCrowd(!embedded)
  const [run, setRun] = useState<Run>(NEW_RUN)
  const challenge = goals[run.goal]
  const [stage, setStage] = useState<Stage>(() => ({
    build: EMPTY_BUILD,
    spots: challenge ? openingSpots(challenge.pool, challenge.opponents) : {},
  }))
  const [history, setHistory] = useState<Stage[]>([])
  const [armed, setArmed] = useState<string | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [phase, setPhase] = useState<Phase>('build')
  const [replay, setReplay] = useState<ReplayScript | null>(null)
  const [goalMoment, setGoalMoment] = useState(false)
  const [sheet, setSheet] = useState<null | 'hints' | 'verdict'>(null)
  const [verdict, setVerdict] = useState<GoalVerdict | null>(null)
  const [grading, setGrading] = useState(false)
  const [burst, setBurst] = useState<{ points: number; combo: number } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(GOAL_SECONDS[0] as number)
  const [hintStart, setHintStart] = useState<string | null>(null)
  const [hintCount, setHintCount] = useState<string | null>(null)
  const [reception, setReception] = useState<{ envelope: Envelope; touch: number } | null>(null)
  const [asking, setAsking] = useState(false)
  const [nudge, setNudge] = useState(0)
  const settled = useRef(false)
  const live = useRef<UserTouch[]>([])
  const spent = useRef(0)
  const flightKey = useRef(0)
  const boxed = useRef(false)
  const gained = useRef(0)
  const landing = useRef<{ key: number; at: ReplayPoint; label: string; scored: boolean } | null>(null)

  const { build, spots } = stage
  const { touches, draft, editing } = build
  const total = GOAL_SECONDS[Math.min(run.goal, GOAL_SECONDS.length - 1)] ?? 60
  const stageLabel = `run.stage.${run.goal + 1}` as MessageKey
  live.current = touches

  const men: PitchMan[] = useMemo(() => {
    if (!challenge) return []
    return challenge.pool.map((name) => {
      const at = shirts?.by[`${run.goal}|${name}`]
      return { name, opponent: challenge.opponents.includes(name), look: at === undefined ? null : shirts?.shirts[at] ?? null }
    })
  }, [challenge, run.goal, shirts])

  const holder = holderOf(build)
  const ball = ballAt(build)
  const building = phase === 'build' && !grading

  /* ------------------------------------------------------------ one gesture = one history step */

  const commit = useCallback(
    (next: Stage) => {
      setHistory((list) => [...list.slice(-30), stage])
      setStage(next)
    },
    [stage],
  )

  const fly = useCallback((touch: UserTouch, receiver: string | null, keeps: boolean) => {
    flightKey.current += 1
    setFlight({ key: flightKey.current, from: touch.origin, to: touch.target, action: touch.action, receiver, keeps })
  }, [])

  /** the ball goes — to a man, into space, into the net */
  const send = useCallback(
    (at: ReplayPoint, receiver: string | null, carried = false) => {
      if (!building || !holder) return
      const receiverAt = receiver ? spots[receiver] ?? at : null
      const result = sendBall(build, receiverAt ?? at, {
        receiver: receiver && receiverAt ? { name: receiver, at: receiverAt } : null,
        opponent: challenge?.opponents.includes(holder),
        carried,
      })
      if (!result) return
      const nextSpots = { ...spots }
      if (result.touch.action === 'dribble' || carried) nextSpots[holder] = result.touch.target
      commit({ build: result.state, spots: nextSpots })
      setArmed(null)
      const keeps = holderOf(result.state) !== null
      fly(result.touch, receiver, keeps)
      const scored = inMouth(result.touch.target)
      // the hit lands WITH the ball, not when the finger lets go
      landing.current = {
        key: flightKey.current,
        at: keeps && receiverAt ? receiverAt : result.touch.target,
        label: receiver ? receiver : t(ACTION_LABEL[result.touch.action]),
        scored,
      }
      haptic('tap')
    },
    [build, building, challenge, commit, fly, holder, spots],
  )

  /** a man steps onto the grass — with the ball, or to take a loose one */
  const stand = useCallback(
    (name: string, at: ReplayPoint) => {
      if (!building) return
      const loose = ballLoose(build) ? ball : null
      const snap =
        loose && Math.hypot((loose.x - at.x) * PITCH.w, (loose.y - at.y) * PITCH.h) < RECEIVE_RADIUS * 1.4 ? loose : at
      const next = standAt(build, name, snap)
      if (next === build) {
        setNudge((n) => n + 1)
        return
      }
      commit({ build: next, spots: { ...spots, [name]: snap } })
      setArmed(null)
      fxAtBoard(snap, { label: name, tone: 'away' })
    },
    [ball, build, building, commit, spots],
  )

  function onDragMan(name: string, at: ReplayPoint) {
    if (!building) return
    if (name === holder) {
      send(at, null, true)
      return
    }
    if (holder) {
      // staging a run: he moves, nobody has touched the ball
      commit({ build, spots: { ...spots, [name]: at } })
      haptic('tap')
      return
    }
    stand(name, at)
  }

  function onDragBall(at: ReplayPoint, receiver: string | null) {
    send(at, receiver)
  }

  function onTapMan(name: string) {
    if (!building) return
    if (holder) {
      if (name === holder) {
        setArmed((current) => (current === holder ? null : holder))
        haptic('tap')
        return
      }
      const at = spots[name]
      if (at) send(at, name)
      return
    }
    if (ballLoose(build) && ball) {
      stand(name, ball)
      return
    }
    setArmed((current) => (current === name ? null : name))
    haptic('tap')
  }

  function onTapPoint(at: ReplayPoint) {
    if (!building) return
    if (holder) {
      send(at, null, armed === holder)
      return
    }
    if (armed) {
      stand(armed, at)
      return
    }
    setNudge((n) => n + 1)
    haptic('miss')
  }

  function onVerb(action: ReplayAction, el: HTMLElement) {
    if (!building) return
    commit({ build: setVerb(build, action), spots })
    firePickFxAt(el, { tone: 'red' })
  }

  function onEdit(index: number) {
    if (!building) return
    if (editing === index) {
      commit({ build: { ...build, draft: EMPTY_DRAFT, editing: null }, spots })
      return
    }
    const next = reopen(build, index)
    const touch = touches[index]
    commit({ build: next, spots: touch ? { ...spots, [touch.actorHe]: touch.origin } : spots })
    haptic('tap')
  }

  function undo() {
    const previous = history[history.length - 1]
    if (!previous || !building) return
    setHistory((list) => list.slice(0, -1))
    setStage(previous)
    setArmed(null)
    haptic('tap')
  }

  function clear() {
    if (!building) return
    commit({ build: { ...build, draft: EMPTY_DRAFT, editing: null }, spots })
    setArmed(null)
  }

  /* ------------------------------------------------------------ the whistle */

  const whistle = useCallback(
    async (placed: UserTouch[]) => {
      if (settled.current || !challenge) return
      settled.current = true
      setGrading(true)
      setArmed(null)
      setPhase('replay')
      setReplay({ key: Date.now(), mine: legsOf(placed), truth: null, goal: false })
      let result: GoalVerdict | null = null
      try {
        result = await submitGoal(seed, run.goal, placed, cursor, pin)
      } catch {
        result = null
      }
      setGrading(false)
      if (!result) {
        // no answer: back to the move, and the whistle works again (rule 42)
        settled.current = false
        setReplay(null)
        setPhase('build')
        return
      }
      setVerdict(result)
      const last = result.truth[result.truth.length - 1]
      setReplay((current) =>
        current
          ? {
              ...current,
              truth: truthLegs(result.truth, challenge.pool),
              goal: last ? last.targetFrom === 'goal' || inMouth(last.target) : false,
            }
          : current,
      )

      const points = Math.max(0, pointsFor(result.metrics.overall, result.metrics.continuity) - spent.current * HINT_COST)
      gained.current = points
      // a life is lost for a touch you PLACED and got wrong — never for one you did not place
      const lost = result.touches.filter((line) => line.kind === 'matched' && line.grade === 'bad').length
      const matched = result.touches.filter((line) => line.kind === 'matched' && line.grade !== 'bad').length
      const good = result.touches.filter((line) => line.kind === 'matched' && line.grade === 'good').length
      if (result.metrics.overall >= GOOD_SCORE && !embedded) collect('goal', [result.goalId])
      setRun((previous) => ({
        ...previous,
        lives: Math.max(0, previous.lives - lost),
        score: previous.score + points,
        played: [
          ...previous.played,
          {
            goalId: result.goalId,
            overall: result.metrics.overall,
            continuity: result.metrics.continuity,
            touches: result.truth.length,
            matched,
            good,
            miss: mismatchLine(keyMismatch(result)),
            zones: placed[0] ? [zoneIndexAt(placed[0].origin), ...placed.map((touch) => zoneIndexAt(touch.target))].slice(0, 16) : [],
          },
        ],
      }))
    },
    [challenge, cursor, embedded, pin, run.goal, seed],
  )

  function onLanded(key: number) {
    const hit = landing.current
    if (!hit || hit.key !== key) return
    landing.current = null
    // over printed grass the hit prints in navy and ink only — vermilion into green is yellow (rule 8)
    fxAtBoard(hit.at, { label: hit.label, tone: 'away', big: hit.scored, haptic: hit.scored ? 'lock' : 'tap' })
    if (hit.scored) crowd.cue('build', 0.6)
  }

  function onReplayLeg(which: 'mine' | 'truth', index: number) {
    const leg = which === 'mine' ? replay?.mine[index] : replay?.truth?.[index]
    if (!leg?.actor) return
    const actor = leg.actor
    setStage((current) => ({ ...current, spots: { ...current.spots, [actor]: leg.from } }))
  }

  function onReplayGoal() {
    setGoalMoment(true)
    crowd.cue('goal', 0.95)
    fxAtBoard({ x: 0.5, y: -0.05 }, { tone: 'away', big: true, haptic: 'lock' })
  }

  function onReplayDone() {
    setGoalMoment(false)
    setReplay(null)
    setPhase('reveal')
    if (!verdict) return
    const overall = verdict.metrics.overall
    const matched = verdict.touches.filter((line) => line.kind === 'matched' && line.grade !== 'bad').length
    if (gained.current > 0) setBurst({ points: gained.current, combo: Math.max(1, matched) })
    if (overall >= 90) setCelebrate(true)
    if (overall < 40) crowd.cue('miss', 0.6)
    else crowd.cue('after', 0.5)
    haptic(overall >= GOOD_SCORE ? 'lock' : 'tap')
    const board = document.querySelector('[data-goal="board"]')
    firePickFxAt(board, { label: `${overall}%`, tone: 'away', big: overall >= GOOD_SCORE, haptic: false })
  }

  /* ------------------------------------------------------------ hints */

  async function ask(which: 'start' | 'count') {
    if (verdict || grading || asking) return
    const goal = run.goal
    setAsking(true)
    try {
      const answer = await askGoalHint(seed, goal, which, cursor, pin)
      if (answer === null || settled.current) return
      if (which === 'start') setHintStart(answer)
      else setHintCount(answer)
      spent.current += 1
      setRun((previous) => ({ ...previous, hints: previous.hints + 1 }))
      haptic('tap')
    } catch {
      // no answer, no charge
    } finally {
      setAsking(false)
    }
  }

  async function askReception() {
    if (verdict || grading || asking || reception) return
    const touch = editing ?? touches.length
    setAsking(true)
    try {
      const envelope = await askReceptionHint(seed, run.goal, touch, cursor, pin)
      if (envelope === null || settled.current) return
      setReception({ envelope, touch })
      spent.current += 1
      setRun((previous) => ({ ...previous, hints: previous.hints + 1 }))
      haptic('tap')
      setSheet(null)
    } catch {
      // no answer, no charge
    } finally {
      setAsking(false)
    }
  }

  /* ------------------------------------------------------------ the clock */

  useEffect(() => {
    if (verdict || run.over || !challenge) return
    setSecondsLeft(total)
    settled.current = false
    const started = Date.now()
    const tick = window.setInterval(() => {
      if (settled.current) {
        window.clearInterval(tick)
        return
      }
      const left = total - Math.floor((Date.now() - started) / 1000)
      setSecondsLeft(Math.max(0, left))
      if (left <= 0) {
        window.clearInterval(tick)
        void whistle(live.current)
      }
    }, 250)
    return () => window.clearInterval(tick)
    // the clock belongs to the GOAL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.goal, challenge, run.over])

  /* ------------------------------------------------------------ the crowd */

  const tension = phase === 'build' ? tensionOf(build) : 1
  useEffect(() => {
    crowd.swell(tension)
    if (phase === 'build' && ball && inBox(ball) && !boxed.current) {
      boxed.current = true
      crowd.cue('build', 0.5)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tension, phase])

  /* ------------------------------------------------------------ the next goal */

  const runRef = useRef(run)
  runRef.current = run
  const advance = useCallback(() => {
    const previous = runRef.current
    const goal = previous.goal + 1
    const over = previous.lives <= 0 || goal >= GOALS_PER_RUN
    const next = goals[goal]
    setBurst(null)
    setCelebrate(false)
    setVerdict(null)
    setHintStart(null)
    setHintCount(null)
    setReception(null)
    setHistory([])
    setArmed(null)
    setFlight(null)
    setReplay(null)
    setPhase('build')
    setSheet(null)
    spent.current = 0
    boxed.current = false
    settled.current = false
    setStage({ build: EMPTY_BUILD, spots: next ? openingSpots(next.pool, next.opponents) : {} })
    if (over) crowd.cue('final', 0.5)
    setRun((current) => ({ ...current, goal, over }))
    if (!over && !embedded) markStep(goal + 1)
  }, [crowd, goals, embedded])

  // the measurement's step is the goal on the pitch (1–3); the opening one is only declared
  useEffect(() => {
    if (!embedded) markStep(1, undefined, true)
  }, [embedded])

  const reveal = useReveal({ ms: REVEAL_MS, onDone: advance, active: phase === 'reveal' && verdict !== null && !embedded && sheet === null })
  const { running: revealRunning, cancel: cancelReveal } = reveal

  useEffect(() => {
    if (phase !== 'reveal' || !revealRunning) return
    const stop = () => cancelReveal()
    window.addEventListener('wheel', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      window.removeEventListener('wheel', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [phase, revealRunning, cancelReveal])

  if (run.over || !challenge) return <Result run={run} seed={seed} cursor={cursor} phone={phone} links={links} pin={pin} />

  /* ------------------------------------------------------------ what the board says */

  const n = String((editing ?? touches.length) + 1)
  const lastInNet = touches.length > 0 && inMouth(touches[touches.length - 1]!.target) && !holder
  const full = touches.length >= MAX_TOUCHES && editing === null
  const caption =
    phase === 'replay'
      ? { lead: t('goal88.replay'), text: verdict ? t('goal.legend.truth') : t('goal.legend.mine') }
      : phase === 'reveal'
        ? null
        : editing !== null
          ? { lead: t('goal.editing', { n: String(editing + 1) }), text: t('goal88.cap.edit') }
          : full
            ? { lead: `${MAX_TOUCHES}/${MAX_TOUCHES}`, text: t('goal.tooMany') }
            : holder && armed === holder
              ? { lead: t('goal.phase.touch', { n }), text: t('goal88.cap.carry', { name: holder }) }
              : holder
                ? { lead: t('goal.phase.touch', { n }), text: t('goal88.cap.holder') }
                : lastInNet
                  ? { lead: t('goal88.inNetLead'), text: t('goal88.cap.inNet') }
                  : ballLoose(build)
                    ? { lead: t('goal.phase.touch', { n }), text: t('goal88.cap.loose') }
                    : armed
                      ? { lead: t('goal.phase.touch', { n }), text: t('goal88.cap.armed', { name: armed }) }
                      : { lead: t('goal.phase.touch', { n }), text: t('goal88.cap.start') }

  const grades = verdict
    ? touches.map((_, index) => {
        const line = verdict.touches.find((item) => item.userIndex === index)
        return line?.kind === 'matched' ? line.grade : line ? ('bad' as const) : undefined
      })
    : []
  const pairs = verdict?.touches.map((line) => ({ user: line.userIndex, truth: line.truthIndex })) ?? []
  const finalBeat = run.goal + 1 >= GOALS_PER_RUN || run.lives <= 0
  // ONE RED WORLD §17: the reveal leads with words — "הרגע היה שם." and the key mismatch
  const miss = verdict ? keyMismatch(verdict) : null
  const missLine = mismatchLine(miss)
  const spokenGoal = verdict ? voice({ gate: 8, moment: 'result', result: goalTier(verdict.metrics.overall, miss), seed: `${seed}:${cursor}:${run.goal}` }) : null
  const night = isNight(challenge)
  const minute = minuteOf(challenge)
  const lowClock = phase === 'build' && secondsLeft <= 15
  const heartbeat = phase === 'build' && (lowClock || (ball !== null && inBox(ball)))

  const scorer = verdict
    ? [...verdict.truth].reverse().find((touch) => (touch.action === 'shot' || touch.action === 'header') && touch.actorKind !== 'unnamed')
    : undefined
  const scorerLook = scorer ? men.find((man) => man.name === scorer.actorHe)?.look ?? null : null

  const plate = (
    <div className="pointer-events-none absolute start-1.5 top-1.5 z-[3] flex max-w-[86%] flex-col items-start">
      <div className="flex max-w-full items-stretch border-rule border-ink bg-ink">
        <span className="grid place-items-center bg-red px-1.5 font-latin text-[9px] font-extrabold tracking-[0.16em] text-paper" dir="ltr">
          {phase === 'replay' ? 'REPLAY' : 'LIVE'}
        </span>
        <span className="min-w-0 truncate px-1.5 py-0.5 font-body text-[10.5px] font-extrabold leading-tight text-paper">
          <bdi>{challenge.opponentHe}</bdi> <Num>{challenge.scoreHe}</Num>
        </span>
        {minute && (
          <span className="grid place-items-center border-s-hair border-paper/30 px-1.5 font-poster text-[15px] leading-none text-concrete">
            <Num>{`${minute}′`}</Num>
          </span>
        )}
        {!embedded && (
          <span
            data-goal="clock"
            className={`grid place-items-center px-1.5 font-mono text-[11px] font-bold tabular-nums ${lowClock ? 'bg-red text-paper' : 'bg-paper text-ink'}`}
          >
            <Num>{clockText(secondsLeft)}</Num>
          </span>
        )}
      </div>
      {phone && (
        <div className="flex max-w-full items-center gap-1.5 border-x-rule border-b-rule border-ink bg-paper px-1.5 py-px">
          {!embedded && (
            <>
              <span className="flex gap-[2px]" aria-label={t('run.lives')}>
                {Array.from({ length: LIVES }, (_, index) => (
                  <span key={index} className={`block h-2 w-2 border-hair border-ink ${index < run.lives ? 'bg-red' : 'bg-transparent'}`} />
                ))}
              </span>
              <span className="font-poster text-[14px] leading-none text-ink">
                <Num>{run.score}</Num>
              </span>
              <span className="font-mono text-[9.5px] tabular-nums text-muted">
                <Num>{`${run.goal + 1}/${GOALS_PER_RUN}`}</Num>
              </span>
            </>
          )}
          <span className="min-w-0 truncate font-sign text-[11px] leading-tight text-ink">{challenge.titleHe}</span>
        </div>
      )}
    </div>
  )

  const overlay = goalMoment ? (
    <div data-goal="celebration" className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-ink/75 px-4 text-center">
      <p className="relative animate-slam-solid font-poster text-[min(34vw,150px)] leading-[0.8]">
        <span className="plate-shift absolute inset-0 text-sign">{t('goal88.goal')}</span>
        <span className="plate-top relative text-red">{t('goal88.goal')}</span>
      </p>
      {scorer && (
        <div className="flex animate-fx-pop items-center gap-2 motion-reduce:animate-none">
          {scorerLook && <PlayerShirt look={scorerLook} eager title={scorer.actorHe} className="aspect-[5/6] w-16" />}
          <span className="border-plate border-ink bg-paper px-2 py-1 font-display text-[18px] leading-none text-ink">
            <bdi>{scorer.actorHe}</bdi>
          </span>
        </div>
      )}
      {verdict && (
        <p className="max-w-[92%] animate-slam-solid border-s-plate border-red bg-ink px-2.5 py-1.5 text-start font-body text-[12.5px] font-bold leading-snug text-paper">
          {firstSentence(verdict.narrativeHe)}
        </p>
      )}
    </div>
  ) : null

  const pitch = (
    <GoalPitch
      men={men}
      spots={spots}
      touches={touches}
      draft={draft}
      armed={armed}
      disabled={!building}
      caption={caption}
      hintEnvelope={reception?.envelope ?? null}
      night={night}
      tension={tension}
      heartbeat={heartbeat}
      flight={flight}
      replay={replay}
      reveal={phase === 'reveal' && verdict ? { truth: verdict.truth, grades, pairs } : null}
      plate={plate}
      overlay={overlay}
      onDragMan={onDragMan}
      onDragBall={onDragBall}
      onTapMan={onTapMan}
      onTapPoint={onTapPoint}
      onLanded={onLanded}
      onReplayLeg={onReplayLeg}
      onReplayGoal={onReplayGoal}
      onReplayDone={onReplayDone}
    />
  )

  const hintsChip = (
    <button
      type="button"
      onClick={() => setSheet('hints')}
      disabled={!building}
      data-goal="hints"
      className="flex min-h-tap shrink-0 items-center border-rule border-ink bg-sheet px-2 font-body text-[11.5px] font-extrabold text-ink disabled:opacity-40"
    >
      {t('goal.hints')}
    </button>
  )
  const muteChip = (
    <button
      type="button"
      onClick={crowd.toggle}
      aria-pressed={!crowd.muted}
      aria-label={crowd.muted ? t('goal88.soundOn') : t('goal88.soundOff')}
      data-goal="mute"
      className="grid min-h-tap w-11 shrink-0 place-items-center border-rule border-ink bg-sheet text-ink"
    >
      <SoundGlyph muted={crowd.muted} />
    </button>
  )

  const hud = (
    <div className="flex h-11 shrink-0 items-center gap-2" data-goal="hud">
      {!embedded && (
        <ol className="flex items-center gap-1" aria-label={t('run.lives')}>
          {Array.from({ length: LIVES }, (_, index) => (
            <li key={index} className={`h-3 w-3 border-hair border-ink ${index < run.lives ? 'bg-red' : 'bg-transparent opacity-40'}`} />
          ))}
        </ol>
      )}
      {!embedded && (
        <p className="font-poster text-[24px] leading-none text-ink">
          <Num>{run.score}</Num>
        </p>
      )}
      <p className="min-w-0 flex-1 truncate font-sign text-[12.5px] leading-tight text-ink">
        {!embedded && (
          <span className="me-1 font-mono text-[10px] tabular-nums text-muted">
            <Num>{`${run.goal + 1}/${GOALS_PER_RUN}`}</Num>
          </span>
        )}
        {challenge.titleHe}
      </p>
      {hintsChip}
      {!embedded && muteChip}
    </div>
  )

  const hints = (
    <div className="grid gap-1.5">
      <p className="font-body text-[11px] font-extrabold tracking-widest text-muted">
        {t('goal.hints')} · {t('goal.hint.cost', { n: String(HINT_COST) })}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => void ask('start')} disabled={hintStart !== null || asking || !building} data-goal="hint-start" className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-1.5 text-center font-body text-[11.5px] font-extrabold leading-tight text-ink disabled:opacity-40">
          {t('goal.hint.start')}
        </button>
        <button type="button" onClick={() => void ask('count')} disabled={hintCount !== null || asking || !building} data-goal="hint-count" className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-1.5 text-center font-body text-[11.5px] font-extrabold leading-tight text-ink disabled:opacity-40">
          {t('goal.hint.count')}
        </button>
        <button type="button" onClick={() => void askReception()} disabled={reception !== null || asking || !building} data-goal="hint-reception" className="flex min-h-tap items-center justify-center border-rule border-ink bg-paper px-1.5 text-center font-body text-[11.5px] font-extrabold leading-tight text-ink disabled:opacity-40">
          {t('goal.hint.reception')}
        </button>
      </div>
      {hintStart && (
        <p className="font-body text-[12px] leading-snug text-ink">
          {t('goal.sourceWords')} <bdi className="font-extrabold">{hintStart}</bdi>
        </p>
      )}
      {hintCount && (
        <p className="font-body text-[12px] leading-snug text-ink">
          <Num>{t('goal.hint.countAnswer', { n: hintCount })}</Num>
        </p>
      )}
      {reception && <p className="font-body text-[12px] leading-snug text-ink">{t('goal.hint.receptionFor', { n: String(reception.touch + 1) })}</p>}
      <p className="font-body text-[11px] leading-snug text-muted">{t('goal.approximate')}</p>
    </div>
  )

  const buildDock = (
    <div className="grid gap-1.5" data-goal="dock">
      <VerbStrip
        touches={touches}
        editing={editing}
        chosen={focusedVerb(build)}
        disabled={!building || (touches.length === 0 && !holder)}
        showVerbs={!building || touches.length > 0 || editing !== null || holder !== null || armed !== null}
        wrap={!phone}
        onVerb={onVerb}
        onEdit={onEdit}
      />
      <div key={nudge} className={`flex gap-1.5 ${nudge > 0 ? 'animate-shake motion-reduce:animate-none' : ''}`}>
        {(history.length > 0 || !phone) && (
        <button
          type="button"
          onClick={undo}
          disabled={!building || history.length === 0}
          aria-label={t('goal.undoStep')}
          data-goal="undo"
          className="flex min-h-tap shrink-0 items-center gap-1 border-rule border-ink bg-sheet px-2.5 font-body text-[12px] font-extrabold text-ink disabled:opacity-40"
        >
          <span aria-hidden="true" className="font-display text-[18px] leading-none">↶</span>
          <span className="max-md:sr-only">{t('goal.undoStep')}</span>
        </button>
        )}
        {(draft.actorHe || editing !== null || !phone) && (
        <button
          type="button"
          onClick={clear}
          disabled={!building || (!draft.actorHe && editing === null)}
          data-goal="clear"
          className="flex min-h-tap shrink-0 items-center border-rule border-ink bg-sheet px-2.5 font-body text-[12px] font-extrabold text-muted disabled:opacity-40"
        >
          {t('goal.clearTouch')}
        </button>
        )}
        {phone && hintsChip}
        {phone && !embedded && muteChip}
        <button
          type="button"
          onClick={() => void whistle(touches)}
          disabled={!building || touches.length < MIN_TOUCHES}
          data-goal="finish"
          className="flex min-h-tap min-w-0 flex-1 items-center justify-center gap-2 bg-red px-3 font-body text-[14px] font-extrabold text-paper transition-transform duration-press ease-stamp active:scale-[.97] disabled:opacity-40 motion-reduce:transition-none"
        >
          <span aria-hidden="true" className="font-poster text-[20px] leading-none">
            <Num>{touches.length}</Num>
          </span>
          <span className="truncate">{touches.length < MIN_TOUCHES ? (phone ? t('goal88.needTwoShort') : t('goal.needTwo')) : t('goal88.whistle')}</span>
        </button>
      </div>
    </div>
  )

  const replayDock = (
    <div className="flex min-h-tap items-center gap-2 border-rule border-ink bg-ink px-3" data-goal="dock">
      <span className="h-2 w-2 shrink-0 animate-pulse bg-red motion-reduce:animate-none" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate font-body text-[12.5px] font-extrabold text-paper">
        {grading ? t('goal.phase.rolling') : verdict ? t('goal.legend.truth') : t('goal.legend.mine')}
      </p>
      <span className="shrink-0 font-body text-[11px] text-concrete">{t('goal88.tapSkip')}</span>
    </div>
  )

  const revealDock = verdict ? (
    <div className="grid gap-1.5" data-goal="dock">
      <div className="flex items-stretch gap-1.5">
        <div className="flex shrink-0 flex-col justify-center border-rule border-ink bg-ink px-3 py-1">
          <p className="font-poster text-[34px] leading-none text-red" aria-live="polite">
            <Num>{`${verdict.metrics.overall}%`}</Num>
          </p>
          <p className="font-body text-[9.5px] tracking-widest text-concrete">{t('goal.overall')}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5" data-goal="words">
          {spokenGoal && <p className="font-display text-[16px] leading-tight text-ink">{spokenGoal.title}</p>}
          {(missLine ?? spokenGoal?.body) && (
            <p className="font-body text-[11.5px] leading-snug text-ink" data-goal="miss">
              {missLine ?? spokenGoal?.body}
            </p>
          )}
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-body text-[10px] leading-tight text-muted">
            <li className="flex items-center gap-1">
              <span className="inline-block h-[4px] w-4 bg-red" aria-hidden="true" />
              {t('goal.legend.mine')}
            </li>
            <li className="flex items-center gap-1">
              <span className="inline-block h-[4px] w-4 bg-sign" aria-hidden="true" />
              {t('goal.legend.truth')}
            </li>
            <li className="flex items-center gap-1">
              <span className="inline-block h-[6px] w-4 border-hair border-dashed border-sign" aria-hidden="true" />
              {t('goal.legend.envelope')}
            </li>
          </ul>
        </div>
        {phone && (
          <button
            type="button"
            onClick={() => {
              cancelReveal()
              setSheet('verdict')
            }}
            data-goal="details"
            className="flex min-h-tap shrink-0 items-center border-rule border-ink bg-sheet px-2.5 font-body text-[12px] font-extrabold text-ink"
          >
            {t('goal88.details')}
          </button>
        )}
      </div>
      <div className="border-rule border-ink bg-ink">
        {revealRunning && <RevealBar progress={reveal.progress} tone="sheet" />}
        <button
          type="button"
          onClick={embedded ? () => embedded.onResult(verdict) : reveal.skip}
          data-goal="continue"
          className="flex min-h-tap w-full items-center justify-center gap-2 px-4 font-body text-step-0 font-extrabold text-paper"
        >
          {embedded ? embedded.doneLabel : finalBeat ? t('goal.reveal.final') : t('goal.reveal.continue')}
          <span aria-hidden="true">←</span>
        </button>
      </div>
    </div>
  ) : null

  const dock = phase === 'build' ? buildDock : phase === 'replay' ? replayDock : revealDock

  return (
    <div className="relative flex min-h-0 flex-1 flex-col md:flex-none md:flex-row md:items-start md:justify-center md:gap-6">
      {celebrate && phase === 'reveal' && <Confetti tones={NO_RED_TONES} />}
      {burst && phase === 'reveal' && <Burst points={burst.points} combo={burst.combo} />}


      {/* THE FIELD — as big as the phone allows; its own fixed box on a desktop */}
      <div className={`flex min-h-0 flex-1 flex-col ${embedded ? 'max-md:h-[min(62dvh,540px)] max-md:flex-none' : ''} md:h-[calc(100dvh-270px)] md:min-h-[460px] md:w-[calc((100dvh-270px)*0.6)] md:min-w-[278px] md:max-w-[62%] md:flex-none`}>
        <FitBox ratio={BOARD_RATIO} always>
          {pitch}
        </FitBox>
      </div>

      {phone ? (
        <div className="mt-1.5 shrink-0">{dock}</div>
      ) : (
        <aside className="grid min-w-0 content-start gap-3 md:w-[360px] md:shrink md:max-h-[max(460px,calc(100dvh-270px))] md:overflow-y-auto md:overscroll-contain">
          <div className="border-rule border-ink bg-red px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2 border-b-hair border-ink pb-1.5">
              <span className="font-body text-[10px] font-extrabold tracking-widest text-ink">{embedded ? challenge.seasonLabel : t(stageLabel)}</span>
              {!embedded && (
                <span className="font-latin text-[9px] font-bold tracking-[0.2em] text-paper" dir="ltr">
                  MATCHDAY SPECIAL · No. 08
                </span>
              )}
            </div>
            <p className="mt-2 font-display text-step-2 leading-[0.95] text-paper">{challenge.titleHe}</p>
            <p className="mt-1 font-mono text-[11px] tabular-nums text-ink">
              <Num>{challenge.subtitleHe}</Num>
            </p>
            <p className="mt-0.5 font-body text-[11px] leading-snug text-ink">
              <bdi>{challenge.competitionHe}</bdi> · <bdi>{challenge.opponentHe}</bdi> · <Num>{challenge.scoreHe}</Num>
            </p>
          </div>
          {hud}
          {caption && phase === 'build' && (
            <p className="border-s-plate border-red ps-2 font-display text-step-0 leading-snug text-ink">{caption.text}</p>
          )}
          {dock}
          {phase === 'build' && <div className="border-rule border-ink bg-sheet p-3">{hints}</div>}
          {phase === 'reveal' && verdict && (
            <div onPointerDown={cancelReveal} onFocus={cancelReveal}>
              <ReplayVerdict metrics={verdict.metrics} touches={verdict.touches} narrativeHe={verdict.narrativeHe} sourceTitle={verdict.sourceTitle} />
            </div>
          )}
        </aside>
      )}

      {phone && (
        <SlideSheet open={sheet === 'hints'} onClose={() => setSheet(null)} title={t('goal.hints')} latin="HINTS">
          {hints}
        </SlideSheet>
      )}
      {phone && verdict && (
        <SlideSheet open={sheet === 'verdict'} onClose={() => setSheet(null)} title={t('goal.overall')} latin="THE VERDICT" size="full">
          <ReplayVerdict metrics={verdict.metrics} touches={verdict.touches} narrativeHe={verdict.narrativeHe} sourceTitle={verdict.sourceTitle} />
        </SlideSheet>
      )}
    </div>
  )
}

function SoundGlyph({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden="true">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" />
      {muted ? <path d="M16 9 L21 15 M21 9 L16 15" /> : <path d="M16 8.5 Q19 12 16 15.5 M18.5 6 Q23 12 18.5 18" />}
    </svg>
  )
}

/**
 * הפסק — what the run came to, on one screen (ONE RED WORLD §6, §17): the emotion first
 * ("הרגע היה שם." and the one thing that slipped, or "ככה זה קרה."), the figures, at most
 * two natural doors from `recommend()` — LIFE only for a chapter this device finished —
 * and "שלח ליציע", closed, holding the gate's own share (rule 19).
 */
function Result({ run, seed, cursor, phone, links, pin = null }: { run: Run; seed: number; cursor: number; phone: boolean; links?: Record<string, CrossLink[]>; pin?: string | null }) {
  const [share, setShare] = useState(false)
  const [next, setNext] = useState<NextAction[]>([])
  const played = run.played
  const average = played.length > 0 ? Math.round(played.reduce((sum, item) => sum + item.overall, 0) / played.length) : 0
  const best = played.reduce((top, item) => Math.max(top, item.overall), 0)
  const continuity = played.length > 0 ? Math.round(played.reduce((sum, item) => sum + item.continuity, 0) / played.length) : 0
  const matched = played.reduce((sum, item) => sum + item.matched, 0)
  const good = played.reduce((sum, item) => sum + item.good, 0)
  const asked = played.reduce((sum, item) => sum + item.touches, 0)
  const goodPct = asked > 0 ? Math.round((good / asked) * 100) : 0
  // delta 89: the best goal of the run names the card, and every played goal its doors
  const top = played.reduce<Played | null>((pick, item) => (!pick || item.overall > pick.overall ? item : pick), null)
  const doors = [...new Map(played.flatMap((item) => links?.[item.goalId] ?? []).map((link) => [link.href, link])).values()].slice(0, 6)
  const cardQuery = top ? goalCardQuery({ goalId: top.goalId, avg: average, best, score: run.score }) : null
  const cardUrl = cardQuery ? `${SITE_URL}/goal?seed=${seed}&r=${cursor}&${cardQuery}` : null

  // the run in words: every goal clean is "ככה זה קרה."; otherwise the best goal's one slip
  const clean = played.length > 0 && played.every((item) => item.miss === null && item.overall >= GOOD_SCORE)
  const tier: ResultTier = clean ? 'perfect' : goalTier(average, top?.miss ? { kind: 'near', action: null, place: null, name: null } : null)
  const spoken = voice({ gate: 8, moment: 'result', result: tier, seed: `${seed}:${cursor}` })
  const words = { ...spoken, body: (tier === 'near' || tier === 'high' || tier === 'mid') && top?.miss ? top.miss : spoken.body }

  useEffect(() => {
    track('run_complete', { detail: 'goal', value: run.score })
    let live = true
    readCompletedChapters()
      .then((lived) =>
        nextAfterGoalRun({
          goalIds: played.map((item) => item.goalId),
          runId: `${seed}:${cursor}`,
          score: run.score,
          lived,
          exclude: doors.map((door) => door.href),
        }),
      )
      .then((answer) => {
        if (live) setNext(answer)
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // one run, one context: the run is final when the result mounts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chips =
    cardQuery && cardUrl ? (
      <ul className="-mx-1 mt-2 flex shrink-0 gap-1.5 overflow-x-auto px-1" data-goal="card-share">
        <ShareCardChips
          imagePath={`/api/card/goal?${cardQuery}`}
          url={cardUrl}
          text={t('goal.shareHeadMove', { pct: String(average) })}
          primary
          onShared={(channel) => track('share_click', { detail: `card-${channel}` })}
        />
      </ul>
    ) : null

  const goalResult: ChallengeResult = { gate: 8, accuracy: played.map((p) => p.overall), routes: played.map((p) => p.zones) }
  const row = (
    <>
      <ShareRow
        kind="goal"
        params={{ h: String(average), s: String(seed), r: String(cursor) }}
        headline={t('goal.shareHeadMove', { pct: String(average) })}
        card={freezeCard({
          match: t('screen.goal.title'),
          route: (played[played.length - 1]?.zones ?? []).map((z) => zoneCentre100(z)),
          accuracy: average,
          clock: `${played.length}/${GOALS_PER_RUN}`,
        })}
        challenge={{ gate: 8, params: { goalHash: pin ? entityHash(pin) : undefined }, result: goalResult }}
      />
      {chips}
    </>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col md:mt-stack md:block">
      <Punch />
      <RecordRun gate="/goal" score={run.score} correct={matched} asked={asked} />
      <CompareCard gate={8} mine={goalResult} />
      <div className="shrink-0 border-b-rule border-ink pb-2" data-goal="words-run">
        <p className="font-latin text-[9px] font-bold tracking-[0.2em] text-red" dir="ltr">
          FULL TIME
        </p>
        <ExitEmotion voice={words} compact />
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 md:flex-none">
        <div className="animate-slam-solid border-plate border-ink bg-ink p-4 text-center motion-reduce:animate-none">
          <p className="relative font-poster text-[60px] leading-none">
            <span className="plate-shift absolute inset-0 text-sign">
              <Num>{run.score}</Num>
            </span>
            <span className="plate-top relative text-red">
              <Num>{run.score}</Num>
            </span>
          </p>
          <p className="mt-1 font-body text-[10px] tracking-widest text-concrete">{t('run.score')}</p>
        </div>
        <div className="border-rule border-ink bg-sheet p-4">
          <p className="font-poster text-[38px] leading-none text-ink">
            <Num>{`${average}%`}</Num>
          </p>
          <p className="mt-1 font-body text-[10px] tracking-widest text-muted">{t('goal.runAverage')}</p>
          <p className="mt-2 font-body text-[11.5px] leading-snug text-muted">
            {t('goal.bestMove')}: <Num>{`${best}%`}</Num>
          </p>
          <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
            {t('goal.continuityAvg')}: <Num>{`${continuity}%`}</Num>
          </p>
          <p className="mt-1 font-body text-[11.5px] leading-snug text-muted" data-goal="good-touches">
            {t('goal.goodTouches')}: <Num>{`${goodPct}%`}</Num>
          </p>
          {run.hints > 0 && (
            <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
              <Num>{t('goal.hint.used', { n: String(run.hints) })}</Num>
            </p>
          )}
        </div>
      </div>

      <CrossLinks links={doors} from="goal" className="mt-2 shrink-0" />
      <div className="mt-2 shrink-0">
        <ExitNext next={next} from="goal" compact />
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-[1fr_auto_auto] gap-2 md:grid-cols-2">
        <PlayLink gate="/goal" className="flex min-h-tap items-center justify-center bg-red px-4 font-body text-step-0 font-extrabold text-paper">
          {t('run.again')}
        </PlayLink>
        {phone && (
          <button
            type="button"
            onClick={() => {
              if (!share) track('share_open', { detail: 'goal' })
              setShare(true)
            }}
            data-goal="share"
            className="flex min-h-tap items-center justify-center border-rule border-ink bg-sheet px-3 font-body text-[13px] font-extrabold text-ink"
          >
            {spoken.ctaShare}
          </button>
        )}
        <a href="/" className="flex min-h-tap items-center justify-center bg-ink px-4 font-body text-[13px] font-extrabold text-paper">
          {t('nav.gates')}
        </a>
      </div>

      {!phone && (
        <ExitShare label={spoken.ctaShare} from="goal">
          {row}
        </ExitShare>
      )}
      {phone && (
        <SlideSheet open={share} onClose={() => setShare(false)} title={spoken.ctaShare} latin="SHARE">
          {row}
        </SlideSheet>
      )}
      <div className="max-md:hidden">
        <AdSlot placement="result" />
      </div>
    </div>
  )
}
