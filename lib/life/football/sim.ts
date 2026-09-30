/**
 * הסימולציה — one fixed step, and the only place anything changes.
 *
 * `step()` is the whole game: give it a state, an input and a fixed `dt`, and it returns
 * the next state. Nothing else in `lib/life/football/` mutates a `FootballState`, and
 * nothing anywhere reaches into three or the DOM from here. Two consequences are worth
 * the discipline on their own:
 *
 *  · **The same seed and the same inputs always produce the same match.** Randomness is
 *    `rollAt(seed, cursor)` from `lib/life/rng.ts`, and the cursor is derived from the
 *    TICK — so there is no hidden mutable stream to get out of order, a replay is the
 *    input list played back, and a reload cannot re-roll a shot until the player likes it.
 *  · **The renderer can be behind.** The sim runs at a fixed sixty steps a second and the
 *    picture interpolates between the last two, so a phone that draws at thirty is a phone
 *    with a smooth picture rather than a phone with different physics.
 *
 * The scoreboard minute is not accumulated here. It is asked of `lib/life/match.ts`,
 * which already owns the ninety minutes and the fifteen in the middle where the clock does
 * not move, and which is tested minute by minute. Two clocks would drift; there is one.
 */
import { dayMinuteOf, matchClock } from '../match'
import { rollAt } from '../rng'
import {
  attemptTackle,
  choosePassTarget,
  laneBlocked,
  playClearance,
  playPass,
  playShot,
} from './actions'
import { ballOutOfPlay, crossedGoalLine, freshBall, interceptPoint, stepBall } from './ball'
import { anchorFor, FORMATIONS } from './formations'
import { keeperIntent, keeperSave } from './keeper'
import {
  clamp,
  clampToPitch,
  dist,
  directionFor,
  targetGoalX,
} from './pitch'
import { arrive, drive, separate, topSpeedFor, toward, updateStamina } from './players'
import { carry, claimLooseBall, loseControl, ownerOf } from './possession'
import { kickoffRestart, kickoffSideAfterGoal, resolveOutOfPlay, restartFor } from './rules'
import { choosePresser, offBallEffort, offBallMove, type TeamContext } from './teamAI'
import type {
  FootballEvent,
  FootballInput,
  FootballState,
  FormationId,
  MatchSetup,
  PlayerState,
  Side,
  Vec2,
} from './types'

/** The fixed step. Sixty a second, everywhere, on every device. */
export const STEP = 1 / 60
/** Match minutes per real second of play — a sixty-second window covers a quarter of an hour. */
export const MINUTES_PER_SECOND = 0.25
/** Inside this distance from the target goal, the ball button shoots instead of passing. */
export const SHOOTING_RANGE = 32
/** Ticks: longer than this and a press of B was a sprint, not a switch. */
const TAP_TICKS = 12

const KICKOFF_MINUTE = 0

/** Every random number this simulation takes has a name, so two of them can never collide. */
const ROLL = { shot: 1, tackle: 2, save: 3, clearance: 4, ai: 5 } as const

function roll(state: FootballStateInternal, kind: keyof typeof ROLL, salt = 0): number {
  return rollAt(state.seed, state.tick * 8 + ROLL[kind] + salt * 97)
}

export type FootballStateInternal = FootballState & {
  seed: string
  lastTouch: { id: string | null; side: Side }
  formations: Record<Side, FormationId>
  presser: Record<Side, string | null>
  /**
   * Who a pass was played to, and by which side.
   *
   * Without this the passing side re-picks its man for the ball the tick after the pass
   * leaves the foot — and the nearest man to a ball that has just left a foot is the
   * PASSER. So he turned round and chased his own pass while the intended receiver went
   * back to holding his shape, the ball rolled between them, and possession sat at
   * twenty-two per cent with nobody ever reaching the final third. It is cleared the
   * moment somebody has the ball or the ball stops.
   */
  passTo: { side: Side; id: string } | null
  /** ticks the current owner has had it — a carrier who may pass every fourth of a second never carries */
  heldTicks: number
  lastOwnerId: string | null
  startMinute: number
}

/**
 * Twenty-two players, from the formation tables.
 *
 * Builds are varied off the seed rather than off `Math.random`, so the same match always
 * fields the same silhouettes — a tall centre half stays a tall centre half between a save
 * and a reload, which matters the moment a player learns to recognise him.
 */
function buildTeam(side: Side, formation: FormationId, shirts: (number | null)[] | undefined, seed: string): PlayerState[] {
  const shape = FORMATIONS[formation]
  return shape.slots.map((slot, index) => {
    const jitter = rollAt(seed, 5000 + (side === 'home' ? 0 : 100) + index)
    return {
      id: `${side}-${index}`,
      side,
      role: slot.role,
      slot: index,
      shirt: shirts?.[index] ?? null,
      p: { x: 0, z: 0 },
      v: { x: 0, z: 0 },
      facing: side === 'home' ? 0 : Math.PI,
      stamina: 1,
      recover: 0,
      build: { height: 1.72 + jitter * 0.16, girth: 0.88 + jitter * 0.24 },
    }
  })
}

/** Put both sides on their anchors for a kickoff or a restart from a snapshot. */
export function placeShape(state: FootballStateInternal) {
  for (const player of state.players) {
    const shape = FORMATIONS[state.formations[player.side]]
    const slot = shape.slots[player.slot]
    if (!slot) continue
    const direction = state.direction[player.side]
    player.p = clampToPitch(anchorFor(slot, direction))
    player.v = { x: 0, z: 0 }
    player.facing = direction === 1 ? 0 : Math.PI
  }
}

export function createMatch(setup: MatchSetup): FootballStateInternal {
  const formations: Record<Side, FormationId> = {
    home: setup.homeFormation ?? '4-4-2',
    away: setup.awayFormation ?? '4-4-2',
  }
  const startMinute = setup.startMinute ?? KICKOFF_MINUTE
  const secondHalf = startMinute >= 45

  const state: FootballStateInternal = {
    seed: setup.seed,
    tick: 0,
    phase: 'restart',
    matchMinute: startMinute,
    minuteLabel: '',
    period: secondHalf ? 'second' : 'first',
    score: setup.score ? { ...setup.score } : { home: 0, away: 0 },
    ball: freshBall(),
    players: [
      ...buildTeam('home', formations.home, setup.homeShirts, setup.seed),
      ...buildTeam('away', formations.away, setup.awayShirts, setup.seed),
    ],
    controlledId: null,
    restart: kickoffRestart(setup.playerSide),
    playerSide: setup.playerSide,
    direction: {
      home: directionFor('home', secondHalf),
      away: directionFor('away', secondHalf),
    },
    events: [],
    elapsed: 0,
    lastTouch: { id: null, side: setup.playerSide },
    formations,
    presser: { home: null, away: null },
    passTo: null,
    heldTicks: 0,
    lastOwnerId: null,
    startMinute,
  }

  placeShape(state)
  state.controlledId = pickControlled(state)
  return state
}

/** The outfield player nearest the ball on the human's side. */
function pickControlled(state: FootballStateInternal): string | null {
  const mine = state.players.filter((p) => p.side === state.playerSide && p.role !== 'GK')
  const ballFlat = { x: state.ball.p.x, z: state.ball.p.z }
  let best: PlayerState | null = null
  let bestDistance = Infinity
  for (const player of mine) {
    const d = dist(player.p, ballFlat)
    if (d >= bestDistance) continue
    best = player
    bestDistance = d
  }
  return best?.id ?? null
}

/**
 * Switch to the nearest USEFUL player.
 *
 * Distance alone picks the man standing behind you, so the score also asks whether he is
 * on the ball's side of you and whether he could actually reach the next phase. It is a
 * weighted choice rather than a sort, which is what stops the button from cycling between
 * the same two players.
 */
export function switchPlayer(state: FootballStateInternal): string | null {
  const ballFlat = { x: state.ball.p.x, z: state.ball.p.z }
  const mine = state.players.filter((p) => p.side === state.playerSide && p.role !== 'GK' && p.id !== state.controlledId)
  let best: PlayerState | null = null
  let bestScore = Infinity
  for (const player of mine) {
    const toBall = dist(player.p, ballFlat)
    const ahead = (ballFlat.x - player.p.x) * state.direction[state.playerSide] > 0 ? 2.5 : 0
    const score = toBall + ahead + player.recover * 0.2
    if (score >= bestScore) continue
    best = player
    bestScore = score
  }
  return best?.id ?? state.controlledId
}

function teamOf(state: FootballStateInternal, side: Side): PlayerState[] {
  return state.players.filter((p) => p.side === side)
}

function contextFor(state: FootballStateInternal, side: Side, owner: PlayerState | null): TeamContext {
  return {
    side,
    direction: state.direction[side],
    formation: state.formations[side],
    attacking: owner?.side === side,
    presserId: state.presser[side],
  }
}

/**
 * One fixed step.
 *
 * The order matters and it is the order a football moment actually happens in: decide,
 * move, then let the ball answer. Resolving the ball before the players is how a shot
 * gets saved by a keeper who had not moved yet.
 */
export function step(state: FootballStateInternal, input: FootballInput, dt: number = STEP): FootballStateInternal {
  state.tick += 1
  state.events = []

  if (state.phase === 'over') return state

  const owner = ownerOf(state.players, state.ball)
  state.heldTicks = owner && owner.id === state.lastOwnerId ? state.heldTicks + 1 : 0
  state.lastOwnerId = owner?.id ?? null

  // --- the clock --------------------------------------------------------------------
  if (state.phase === 'live') {
    state.elapsed += dt
    state.matchMinute = clamp(state.startMinute + state.elapsed * MINUTES_PER_SECOND, 0, 90)
  }
  const clock = matchClock(dayMinuteOf(state.matchMinute, 0), 0)
  state.period = clock.phase === 'before' ? 'first' : clock.phase === 'after' ? 'after' : clock.phase
  state.minuteLabel = clock.labelHe

  // --- restarts ---------------------------------------------------------------------
  if (state.phase === 'restart' && state.restart) {
    tickRestart(state, dt)
  }

  // --- one presser per side ----------------------------------------------------------
  const travelling = Math.hypot(state.ball.v.x, state.ball.v.z) > 2.5
  if (state.ball.ownerId || !travelling) state.passTo = null
  for (const side of ['home', 'away'] as Side[]) {
    if (state.passTo?.side === side) {
      state.presser[side] = state.passTo.id
      continue
    }
    state.presser[side] = choosePresser(teamOf(state, side), state.ball, state.presser[side], state.controlledId)
  }

  // --- the human --------------------------------------------------------------------
  const controlled = state.players.find((p) => p.id === state.controlledId) ?? null
  if (controlled && state.phase !== 'goal') {
    driveHuman(state, controlled, input, owner, dt)
  }

  // --- everybody else ----------------------------------------------------------------
  for (const player of state.players) {
    if (player.id === state.controlledId) continue
    if (player.role === 'GK') {
      driveKeeper(state, player, owner, dt)
      continue
    }
    driveAgent(state, player, owner, dt)
  }

  separate(state.players, dt)

  // --- the ball -----------------------------------------------------------------------
  const before = { x: state.ball.p.x, y: state.ball.p.y, z: state.ball.p.z }
  const carrier = ownerOf(state.players, state.ball)
  if (carrier) {
    carry(carrier, state.ball, dt)
    if (loseControl(carrier, state.ball)) state.lastTouch = { id: carrier.id, side: carrier.side }
  }
  const { hitWoodwork } = stepBall(state.ball, dt)
  if (hitWoodwork) state.events.push({ t: 'post' })

  if (!state.ball.ownerId) {
    const claimed = claimLooseBall(state.players, state.ball)
    if (claimed) state.lastTouch = { id: claimed.id, side: claimed.side }
  }

  // --- keepers get their hands to it --------------------------------------------------
  for (const keeper of state.players.filter((p) => p.role === 'GK')) {
    const intent = keeperIntent(keeper, state.ball, state.direction[keeper.side], keeperOwnership(state, keeper.side))
    const result = keeperSave(keeper, state.ball, state.direction[keeper.side], intent, roll(state, 'save'))
    if (!result) continue
    state.events.push({ t: 'save', by: keeper.id, held: result.held })
    state.lastTouch = { id: keeper.id, side: keeper.side }
  }

  // --- did it go in, or out ------------------------------------------------------------
  if (state.phase === 'live' || state.phase === 'restart') {
    const line = crossedGoalLine(before, state.ball.p)
    if (line) {
      scoreGoal(state, line.goalX)
    } else if (ballOutOfPlay(state.ball)) {
      const out = resolveOutOfPlay(state.ball, state.lastTouch.side, state.direction)
      if (out) {
        state.restart = restartFor(out)
        state.phase = 'restart'
        state.ball.ownerId = null
        state.ball.v = { x: 0, y: 0, z: 0 }
        state.ball.p = { x: out.at.x, y: state.ball.p.y, z: out.at.z }
        state.events.push({ t: 'out', restart: out.kind, side: out.side })
      }
    }
  }

  return state
}

function keeperOwnership(state: FootballStateInternal, side: Side): 'own' | 'theirs' | 'loose' {
  const owner = ownerOf(state.players, state.ball)
  if (!owner) return 'loose'
  return owner.side === side ? 'own' : 'theirs'
}

function scoreGoal(state: FootballStateInternal, goalX: number) {
  const scoringSide: Side = state.direction.home === 1 ? (goalX > 0 ? 'home' : 'away') : goalX > 0 ? 'away' : 'home'
  state.score[scoringSide] += 1
  state.phase = 'goal'
  state.events.push({ t: 'net', at: { ...state.ball.p } })
  state.events.push({ t: 'goal', side: scoringSide, by: state.lastTouch.id })
  state.restart = kickoffRestart(kickoffSideAfterGoal(scoringSide))
  state.restart.countdown = 150
}

function tickRestart(state: FootballStateInternal, dt: number) {
  const restart = state.restart
  if (!restart) return
  restart.countdown -= 1

  if (restart.countdown === 140 && state.phase === 'goal') {
    // the celebration is over; put everybody back and hand the ball to the other side
    placeShape(state)
    state.ball = freshBall()
    state.phase = 'restart'
  }

  if (!restart.takerId) {
    const team = teamOf(state, restart.side).filter((p) => p.role !== 'GK' || restart.kind === 'goalkick')
    let best: PlayerState | null = null
    let bestDistance = Infinity
    for (const player of team) {
      const d = dist(player.p, restart.at)
      if (d >= bestDistance) continue
      best = player
      bestDistance = d
    }
    restart.takerId = best?.id ?? null
  }

  const taker = state.players.find((p) => p.id === restart.takerId) ?? null
  if (taker) {
    const spot = restart.at
    drive(taker, arrive(taker.p, spot, 3), topSpeedFor(taker, false), dt)
    if (restart.side === state.playerSide && state.controlledId !== taker.id && restart.countdown < 30) {
      state.controlledId = taker.id
    }
  }

  if (restart.countdown <= 0) {
    state.phase = 'live'
    state.ball.p = { x: restart.at.x, y: state.ball.p.y, z: restart.at.z }
    state.ball.ownerId = taker?.id ?? null
    state.ball.lockout = 0
    if (taker) state.lastTouch = { id: taker.id, side: taker.side }
    state.restart = null
    state.events.push({ t: 'whistle', period: state.period })
  }
}

/**
 * The human's tick.
 *
 * Two buttons, and the meaning of each is read off the world rather than off a mode:
 *
 *  · **A is the ball button.** Without it, a tackle. With it, a pass — or, inside shooting
 *    range of the goal, a shot whose power is how long you held it. That last clause is
 *    the same contextual rule the neighbourhood 2v2 already uses, and it is what lets a
 *    football match run on the arcade controller this game has everywhere.
 *  · **B is the body button.** Held, he sprints — with the ball or without it. Tapped
 *    without the ball, it switches to the nearest useful man.
 */
function driveHuman(
  state: FootballStateInternal,
  player: PlayerState,
  input: FootballInput,
  owner: PlayerState | null,
  dt: number,
) {
  const sprinting = input.b && input.bHeld > TAP_TICKS
  const has = owner?.id === player.id
  const stick = { x: input.x, z: input.z }
  const aim = Math.hypot(stick.x, stick.z) > 0.25 ? Math.atan2(stick.z, stick.x) : null

  updateStamina(player, sprinting, dt)
  drive(player, stick, topSpeedFor(player, sprinting), dt)

  if (input.bReleased && input.bHeld <= TAP_TICKS && !has) {
    state.controlledId = switchPlayer(state)
    return
  }

  if (!has) {
    if (input.a && input.aHeld === 1 && owner && owner.side !== player.side) {
      const won = attemptTackle(player, owner, state.ball, roll(state, 'tackle'))
      state.events.push({ t: 'tackle', by: player.id, on: owner.id, won })
    }
    return
  }

  if (!input.aReleased) return

  const direction = state.direction[player.side]
  const toGoal = dist(player.p, { x: targetGoalX(direction), z: 0 })
  const power = clamp(input.aHeld / 45, 0.18, 1)

  if (toGoal < SHOOTING_RANGE) {
    playShot(state.ball, player, direction, aim === null ? 0 : Math.sin(aim), power, roll(state, 'shot'))
    state.events.push({ t: 'shot', by: player.id, power })
    state.lastTouch = { id: player.id, side: player.side }
    return
  }

  const mates = teamOf(state, player.side)
  const opponents = teamOf(state, player.side === 'home' ? 'away' : 'home')
  const target = choosePassTarget(player, mates, opponents, aim, direction)
  const lofted = input.aHeld > 26
  if (target) {
    playPass(state.ball, player.p, target.p, lofted ? 'lofted' : 'ground', 1)
    state.passTo = { side: player.side, id: target.id }
    state.events.push({ t: 'pass', from: player.id, to: target.id })
  } else {
    playClearance(state.ball, player, direction, roll(state, 'clearance'))
    state.events.push({ t: 'pass', from: player.id, to: null })
  }
  state.lastTouch = { id: player.id, side: player.side }
}

/** An AI outfield player: press, carry, or hold the shape. */
function driveAgent(state: FootballStateInternal, player: PlayerState, owner: PlayerState | null, dt: number) {
  const context = contextFor(state, player.side, owner)
  const ballFlat = { x: state.ball.p.x, z: state.ball.p.z }
  const has = owner?.id === player.id

  if (has) {
    driveCarrier(state, player, dt)
    return
  }

  const isPresser = state.presser[player.side] === player.id
  if (isPresser) {
    const gap = dist(player.p, ballFlat)
    const sprint = gap > 6
    updateStamina(player, sprint, dt)
    // `arrive`, not `toward`: a unit vector at full speed runs THROUGH the ball, and a
    // turning cost that is deliberately high then sends him round it in circles. Easing
    // into the last three metres is the difference between winning a loose ball and
    // orbiting it, and it was visible in the very first smoke run.
    const meet = interceptPoint(player.p, state.ball, topSpeedFor(player, sprint))
    drive(player, arrive(player.p, meet, 3), topSpeedFor(player, sprint), dt)
    if (owner && owner.side !== player.side && dist(player.p, owner.p) < 1.7 && player.recover === 0) {
      const won = attemptTackle(player, owner, state.ball, roll(state, 'tackle', player.slot))
      if (won) state.events.push({ t: 'tackle', by: player.id, on: owner.id, won })
    }
    return
  }

  const effort = offBallEffort(player, state.ball, context)
  updateStamina(player, effort > 0.8, dt)
  drive(player, offBallMove(player, state.ball, context), topSpeedFor(player, effort > 0.8) * effort, dt)
}

/** An AI player who has the ball: shoot if you can see the goal, pass if you cannot, run if neither. */
function driveCarrier(state: FootballStateInternal, player: PlayerState, dt: number) {
  const direction = state.direction[player.side]
  const goal = { x: targetGoalX(direction), z: 0 }
  const toGoal = dist(player.p, goal)
  const opponents = teamOf(state, player.side === 'home' ? 'away' : 'home')
  const mates = teamOf(state, player.side)

  updateStamina(player, true, dt)
  drive(player, toward(player.p, goal), topSpeedFor(player, true), dt)

  /**
   * When a carrier is allowed to reconsider.
   *
   * The first version let him decide every fourteenth tick — a quarter of a second — and
   * since a presser glued to his shoulder always counted as pressure, he passed a quarter
   * of a second after every reception and nobody in a three-minute match ever carried the
   * ball anywhere. A footballer gets a touch, looks up, and then decides. Half a second
   * on the ball before the first option, and near the goal he reconsiders faster.
   */
  const period = toGoal < 26 ? 8 : 16
  if (state.heldTicks < 30) return
  const decide = state.heldTicks % period === 0
  if (!decide) return

  /**
   * When an AI shoots.
   *
   * The first version asked for a clear lane and got none, because inside eighteen metres
   * there is always a defender somewhere in the corridor — so it passed sideways forever
   * and three minutes of football produced no shots at all. Footballers do not wait for a
   * clear lane in the box. Inside twelve metres he hits it; between twelve and twenty-six
   * he hits it if he can see the goal.
   */
  if (toGoal < 12 || (toGoal < 26 && !laneBlocked(player.p, goal, opponents))) {
    const power = clamp(0.45 + toGoal / 40, 0.4, 1)
    playShot(state.ball, player, direction, 0, power, roll(state, 'shot', player.slot))
    state.events.push({ t: 'shot', by: player.id, power })
    state.lastTouch = { id: player.id, side: player.side }
    return
  }

  /**
   * Pressure is a man BETWEEN you and the goal, not a man chasing your shoulder.
   *
   * Counting the chaser made every carrier permanently pressed — the presser runs at the
   * same top speed, so he never falls off — and a permanently pressed carrier passes
   * immediately, every time, forever.
   */
  const pressure = opponents.some((o) => {
    if (dist(o.p, player.p) > 3.4) return false
    return (o.p.x - player.p.x) * direction > -0.6
  })
  if (!pressure) return

  const target = choosePassTarget(player, mates, opponents, null, direction)
  if (target) {
    playPass(state.ball, player.p, target.p, 'ground', 1)
    state.passTo = { side: player.side, id: target.id }
    state.events.push({ t: 'pass', from: player.id, to: target.id })
  } else {
    playClearance(state.ball, player, direction, roll(state, 'clearance', player.slot))
    state.events.push({ t: 'pass', from: player.id, to: null })
  }
  state.lastTouch = { id: player.id, side: player.side }
}

function driveKeeper(state: FootballStateInternal, keeper: PlayerState, owner: PlayerState | null, dt: number) {
  const direction = state.direction[keeper.side]
  const intent = keeperIntent(keeper, state.ball, direction, keeperOwnership(state, keeper.side))
  updateStamina(keeper, intent.urgent, dt)
  drive(keeper, intent.move, topSpeedFor(keeper, intent.urgent) * (intent.urgent ? 1 : 0.7), dt)

  if (owner?.id === keeper.id && state.tick % 40 === 0) {
    const mates = teamOf(state, keeper.side)
    const opponents = teamOf(state, keeper.side === 'home' ? 'away' : 'home')
    const target = choosePassTarget(keeper, mates, opponents, null, direction)
    if (target) {
      playPass(state.ball, keeper.p, target.p, 'lofted', 1)
      state.passTo = { side: keeper.side, id: target.id }
      state.events.push({ t: 'pass', from: keeper.id, to: target.id })
    } else {
      playClearance(state.ball, keeper, direction, roll(state, 'clearance', 11))
      state.events.push({ t: 'pass', from: keeper.id, to: null })
    }
    state.lastTouch = { id: keeper.id, side: keeper.side }
  }
}

/** Ends the match cleanly — a window closing, or full time. */
export function endMatch(state: FootballStateInternal) {
  state.phase = 'over'
  state.events = [{ t: 'whistle', period: 'after' } as FootballEvent]
}

/** The ball's position, interpolated between two states, for the renderer. */
export function lerpVec3(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }
}
