/**
 * כדורגל — the shapes, and the one rule that governs all of them.
 *
 * Everything under `lib/life/football/` is pure TypeScript: no three, no Phaser, no React,
 * no DOM, no `Math.random`. The simulation is a function of a state, an input and a seed,
 * and the renderer only ever READS what comes back. That is not a stylistic preference,
 * it is what buys four things this feature cannot be built without:
 *
 *  · a match that can be unit-tested with fake timers, exactly as `matchDirector` already is;
 *  · a replay for free — a deterministic sim plus a recorded input stream is a replay you
 *    can re-camera and slow down, with no second recording system;
 *  · a save that holds a seed and a situation rather than a `THREE.Object3D`;
 *  · documentary steering that can be PROVEN over a thousand seeds instead of asserted.
 *
 * The unit is the metre and the axis convention is the one a pitch already has: `x` runs
 * along the length toward the opponent's goal, `z` across the width, `y` up. A ball needs
 * three dimensions because a cross that never leaves the floor is not a cross; a player
 * does not, and his `y` is therefore absent rather than always zero.
 */

/** Metres. `x` down the pitch, `y` up, `z` across. */
export type Vec3 = { x: number; y: number; z: number }

/** Metres, on the ground plane. */
export type Vec2 = { x: number; z: number }

export type Side = 'home' | 'away'

/** Which way a side is playing. `+1` attacks positive `x`. */
export type Direction = 1 | -1

export type PlayerRole =
  | 'GK'
  | 'CB'
  | 'FB'
  | 'DM'
  | 'CM'
  | 'WM'
  | 'AM'
  | 'W'
  | 'ST'

export type PlayerState = {
  /** stable across the whole match — the renderer keys its figure off this */
  id: string
  side: Side
  role: PlayerRole
  /** 1–11 within a side; the index into the formation, not a shirt number */
  slot: number
  /**
   * The number on the back, or null.
   *
   * Null is the honest value and it renders as a blank shirt. An invented number is a
   * claim about a real footballer, and this repository does not make those (CLAUDE.md
   * rule 60, and `lib/life/history/` for why).
   */
  shirt: number | null
  p: Vec2
  v: Vec2
  /** radians; 0 faces +x */
  facing: number
  /** 0–1; drains while sprinting, recovers while walking */
  stamina: number
  /** frames of forced immobility after a tackle or a stumble */
  recover: number
  /** the physical build the renderer varies a figure by — set once, never simulated */
  build: { height: number; girth: number }
}

export type BallState = {
  p: Vec3
  v: Vec3
  /** rad/s about the vertical axis, for the renderer's roll and for swerve */
  spin: number
  /** the player who is carrying it, or null when it is running free */
  ownerId: string | null
  /** ticks until anybody may take possession again — stops a pass being intercepted by its passer */
  lockout: number
}

export type RestartKind = 'kickoff' | 'throw' | 'corner' | 'goalkick' | 'freekick' | 'penalty'

export type RestartState = {
  kind: RestartKind
  side: Side
  at: Vec2
  /** ticks left before the taker plays it; 0 means it is live */
  countdown: number
  takerId: string | null
}

export type ObjectiveType = 'survive' | 'attack' | 'build-up' | 'set-piece' | 'penalty' | 'experience'

export type MatchPeriod = 'first' | 'half' | 'second' | 'after'

export type FootballPhase = 'live' | 'restart' | 'goal' | 'over'

/** What the last tick actually did, so the renderer and the audio can react without diffing state. */
export type FootballEvent =
  | { t: 'kick'; by: string; power: number }
  | { t: 'pass'; from: string; to: string | null }
  | { t: 'shot'; by: string; power: number }
  | { t: 'tackle'; by: string; on: string | null; won: boolean }
  | { t: 'save'; by: string; held: boolean }
  | { t: 'post' }
  | { t: 'goal'; side: Side; by: string | null }
  | { t: 'out'; restart: RestartKind; side: Side }
  | { t: 'whistle'; period: MatchPeriod }
  | { t: 'net'; at: Vec3 }

export type FootballState = {
  /** how many fixed steps have run — the only clock the simulation trusts */
  tick: number
  phase: FootballPhase
  /** minutes 0–90 as a scoreboard would read it, derived, never accumulated by hand */
  matchMinute: number
  /** what the strip prints — `86'` or `מחצית`, straight from `lib/life/match.ts` */
  minuteLabel: string
  period: MatchPeriod
  score: { home: number; away: number }
  ball: BallState
  players: PlayerState[]
  /** the player the human is moving, or null in a cutscene */
  controlledId: string | null
  restart: RestartState | null
  /** which side the human is playing; `home` in every historical reconstruction so far */
  playerSide: Side
  /** the direction each side attacks in this period */
  direction: Record<Side, Direction>
  events: FootballEvent[]
  /** seconds of gameplay elapsed — a window is measured in these, not in match minutes */
  elapsed: number
}

/**
 * One frame of intent. Produced by the arcade controller or by a test, never by the sim.
 *
 * `a` and `b` are the two buttons this game has and the only two it will ever have: one
 * ball-top joystick and A/B, everywhere, with no third button added per mechanic. `aHeld`
 * and `bHeld` are the tick counts, because a tap and a hold are different verbs on the
 * same button and the alternative is a third button.
 */
export type FootballInput = {
  x: number
  z: number
  a: boolean
  b: boolean
  aHeld: number
  bHeld: number
  /** edge-triggered: true only on the tick the button came up */
  aReleased: boolean
  bReleased: boolean
}

export const NO_INPUT: FootballInput = {
  x: 0,
  z: 0,
  a: false,
  b: false,
  aHeld: 0,
  bHeld: 0,
  aReleased: false,
  bReleased: false,
}

export type MatchSetup = {
  /** feeds the seeded roller; the same id always plays out the same way */
  seed: string
  playerSide: Side
  /** what the scoreboard starts at — an archive fact when there is one */
  score?: { home: number; away: number }
  /** the match minute to start from; a window may begin at 84 without simulating 83 */
  startMinute?: number
  homeFormation?: FormationId
  awayFormation?: FormationId
  homeShirts?: (number | null)[]
  awayShirts?: (number | null)[]
}

export type FormationId = '4-4-2' | '4-3-3' | '3-5-2'

/** A role anchor in normalised pitch space: `x` 0 (own goal) → 1 (their goal), `z` -0.5 → 0.5. */
export type FormationSlot = { role: PlayerRole; x: number; z: number }

export type Formation = {
  id: FormationId
  slots: readonly FormationSlot[]
}
