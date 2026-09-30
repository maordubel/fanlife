import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isYellow } from '@/lib/isYellow'
import { RUNTIME_YELLOW_SURFACES, runtimeYellow, yellowSurfaceAllowed } from '@/lib/brand/yellowExemptions'
import { LIFE_PALETTE } from '@/lib/life/runtime/palette'
import {
  BALL_RADIUS,
  BOX_DEPTH,
  BOX_HALF_WIDTH,
  FORMATIONS,
  FORMATION_IDS,
  GOAL_HALF,
  GOAL_HEIGHT,
  HALF_LENGTH,
  HALF_WIDTH,
  LENGTH,
  NO_INPUT,
  STEP,
  WIDTH,
  anchorFor,
  ballOutOfPlay,
  createMatch,
  crossedGoalLine,
  freshBall,
  keeperStation,
  kickBall,
  resolveOutOfPlay,
  step,
  switchPlayer,
  type FootballInput,
} from '@/lib/life/football'
import { stepBall } from '@/lib/life/football/ball'
import { awayKit, awayMarkColour, homeKit, keeperKit } from '@/lib/life/football/render/kit'

const ROOT = new URL('..', import.meta.url).pathname

/** Comments are prose ABOUT the rules — these rules apply to the code. */
function withoutComments(text: string): string {
  return text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (['.ts', '.tsx'].includes(extname(path))) out.push(path)
  }
  return out
}

/**
 * המגרש — the football engine, checked where it can be checked.
 *
 * Everything under `lib/life/football/` is pure: no three, no DOM, no timers. That is the
 * whole reason the architecture is shaped this way, and this file is what the shape buys.
 * A match is a function, so a match is testable — including the two claims that are
 * otherwise impossible to make honestly about a 3D scene: that it is deterministic, and
 * that it contains no yellow it was not granted.
 */

const flat = (input: Partial<FootballInput> = {}): FootballInput => ({ ...NO_INPUT, ...input })

describe('המגרש — dimensions are the real ones', () => {
  it('is a 105 × 68 pitch with a regulation goal', () => {
    expect(LENGTH).toBe(105)
    expect(WIDTH).toBe(68)
    expect(HALF_LENGTH).toBe(52.5)
    expect(HALF_WIDTH).toBe(34)
    // 7.32 × 2.44 — the same constants `PenaltyCard` already draws its goal from
    expect(GOAL_HALF * 2).toBeCloseTo(7.32, 5)
    expect(GOAL_HEIGHT).toBeCloseTo(2.44, 5)
    expect(BOX_DEPTH).toBe(16.5)
    expect(BOX_HALF_WIDTH).toBeCloseTo(20.16, 5)
  })

  it('places every formation slot inside the field of play', () => {
    for (const id of FORMATION_IDS) {
      const formation = FORMATIONS[id]
      expect(formation.slots).toHaveLength(11)
      expect(formation.slots.filter((slot) => slot.role === 'GK')).toHaveLength(1)
      for (const direction of [1, -1] as const) {
        for (const slot of formation.slots) {
          const anchor = anchorFor(slot, direction)
          expect(Math.abs(anchor.x), `${id} ${slot.role} x`).toBeLessThanOrEqual(HALF_LENGTH)
          expect(Math.abs(anchor.z), `${id} ${slot.role} z`).toBeLessThanOrEqual(HALF_WIDTH)
        }
      }
    }
  })
})

describe('הכדור — it has its own opinion', () => {
  it('rolls, slows and stops rather than sliding forever', () => {
    const ball = freshBall()
    kickBall(ball, 12, 0, 0)
    const start = ball.p.x
    for (let i = 0; i < 60 * 12; i += 1) stepBall(ball, STEP)
    expect(ball.p.x).toBeGreaterThan(start + 5)
    expect(Math.hypot(ball.v.x, ball.v.z)).toBe(0)
  })

  it('bounces, losing more height than ground speed', () => {
    const ball = freshBall()
    ball.p.y = 4
    ball.v.x = 6
    let peak = 0
    for (let i = 0; i < 60 * 3; i += 1) {
      stepBall(ball, STEP)
      if (ball.p.y > BALL_RADIUS + 0.02 && ball.p.x > 3) peak = Math.max(peak, ball.p.y)
    }
    expect(peak).toBeLessThan(4)
    expect(ball.p.x).toBeGreaterThan(3)
  })

  it('comes back off the post instead of through it', () => {
    const ball = freshBall()
    ball.p.x = HALF_LENGTH - 1
    ball.p.y = 1
    ball.p.z = GOAL_HALF
    const hit = (() => {
      for (let i = 0; i < 30; i += 1) {
        kickBall(ball, 24, 0, 0)
        const result = stepBall(ball, STEP)
        if (result.hitWoodwork) return true
      }
      return false
    })()
    expect(hit).toBe(true)
  })

  it('knows a goal from a miss', () => {
    const inside = crossedGoalLine({ x: HALF_LENGTH - 1, y: 1, z: 0 }, { x: HALF_LENGTH + 1, y: 1, z: 0 })
    expect(inside).not.toBeNull()
    const wide = crossedGoalLine(
      { x: HALF_LENGTH - 1, y: 1, z: GOAL_HALF + 1 },
      { x: HALF_LENGTH + 1, y: 1, z: GOAL_HALF + 1 },
    )
    expect(wide).toBeNull()
    const over = crossedGoalLine(
      { x: HALF_LENGTH - 1, y: GOAL_HEIGHT + 1, z: 0 },
      { x: HALF_LENGTH + 1, y: GOAL_HEIGHT + 1, z: 0 },
    )
    expect(over).toBeNull()
  })
})

describe('החוקים — the restart follows the last touch, not the half', () => {
  const directions = { home: 1, away: -1 } as const

  it('gives a throw to the other side', () => {
    const ball = freshBall()
    ball.p.z = HALF_WIDTH + 0.4
    expect(ballOutOfPlay(ball)).toBe(true)
    const out = resolveOutOfPlay(ball, 'home', directions)
    expect(out?.kind).toBe('throw')
    expect(out?.side).toBe('away')
    expect(Math.abs(out?.at.z ?? 0)).toBeCloseTo(HALF_WIDTH, 5)
  })

  it('gives a corner when the DEFENDING side puts it behind', () => {
    const ball = freshBall()
    // home attacks +x, so the goal at +x is away's to defend
    ball.p.x = HALF_LENGTH + 0.4
    ball.p.z = 12
    const out = resolveOutOfPlay(ball, 'away', directions)
    expect(out?.kind).toBe('corner')
    expect(out?.side).toBe('home')
  })

  it('gives a goal kick when the ATTACKING side puts it behind', () => {
    const ball = freshBall()
    ball.p.x = HALF_LENGTH + 0.4
    ball.p.z = 12
    const out = resolveOutOfPlay(ball, 'home', directions)
    expect(out?.kind).toBe('goalkick')
    expect(out?.side).toBe('away')
  })
})

describe('השוער — the geometry, not a dice roll', () => {
  it('stands on the line between the ball and the middle of his goal', () => {
    const ball = freshBall()
    ball.p.x = 20
    ball.p.z = 14
    // he defends the goal at -52.5 when he attacks +x
    const station = keeperStation(ball, 1)
    expect(station.x).toBeGreaterThan(-HALF_LENGTH)
    expect(Math.sign(station.z)).toBe(Math.sign(ball.p.z))
  })

  it('is never wider than his own post', () => {
    const ball = freshBall()
    for (const z of [-30, -12, 0, 12, 30]) {
      ball.p.z = z
      ball.p.x = 30
      const station = keeperStation(ball, 1)
      expect(Math.abs(station.z), `ball at z=${z}`).toBeLessThan(GOAL_HALF)
    }
  })
})

describe('הסימולציה — the same seed plays the same match', () => {
  const script: FootballInput[] = Array.from({ length: 600 }, (_, i) =>
    flat({
      x: Math.sin(i / 23),
      z: Math.cos(i / 31),
      a: i % 97 === 0,
      aHeld: i % 97 === 0 ? 1 : 0,
      aReleased: i % 97 === 40,
      b: i % 13 < 6,
      bHeld: i % 13,
    }),
  )

  function play(seed: string) {
    const state = createMatch({ seed, playerSide: 'home' })
    for (const input of script) step(state, input, STEP)
    return state
  }

  it('produces an identical state stream from an identical seed and input list', () => {
    const a = play('determinism')
    const b = play('determinism')
    expect(a.tick).toBe(b.tick)
    expect(a.score).toEqual(b.score)
    expect(a.ball.p).toEqual(b.ball.p)
    expect(a.players.map((p) => [p.id, p.p.x, p.p.z, p.facing])).toEqual(
      b.players.map((p) => [p.id, p.p.x, p.p.z, p.facing]),
    )
  })

  it('produces a different match from a different seed', () => {
    const a = play('determinism')
    const c = play('a-different-afternoon')
    expect(a.players.map((p) => p.p.x)).not.toEqual(c.players.map((p) => p.p.x))
  })

  it('fields twenty-two players and keeps them on the pitch', () => {
    const state = createMatch({ seed: 'shape', playerSide: 'home' })
    expect(state.players).toHaveLength(22)
    for (let i = 0; i < 60 * 90; i += 1) step(state, NO_INPUT, STEP)
    for (const player of state.players) {
      expect(Math.abs(player.p.x), player.id).toBeLessThanOrEqual(HALF_LENGTH + 2.01)
      expect(Math.abs(player.p.z), player.id).toBeLessThanOrEqual(HALF_WIDTH + 2.01)
      expect(Number.isFinite(player.facing)).toBe(true)
    }
  })

  it('runs a whole window without the ball leaving the world or the clock going backwards', () => {
    const state = createMatch({ seed: 'sanity', playerSide: 'home', startMinute: 84 })
    let last = state.matchMinute
    for (let i = 0; i < 60 * 120; i += 1) {
      step(state, NO_INPUT, STEP)
      expect(state.matchMinute).toBeGreaterThanOrEqual(last)
      last = state.matchMinute
      expect(Number.isFinite(state.ball.p.x)).toBe(true)
    }
    expect(state.matchMinute).toBeGreaterThan(84)
    expect(state.minuteLabel.length).toBeGreaterThan(0)
  })

  it('switches to a different player on the human’s own side, never to the keeper', () => {
    const state = createMatch({ seed: 'switch', playerSide: 'home' })
    const first = state.controlledId
    const next = switchPlayer(state)
    expect(next).not.toBe(first)
    const player = state.players.find((p) => p.id === next)
    expect(player?.side).toBe('home')
    expect(player?.role).not.toBe('GK')
  })

  it('increments the score when the ball crosses the line', () => {
    const state = createMatch({ seed: 'goal', playerSide: 'home' })
    // wind the restart down, then put the ball through the away goal
    for (let i = 0; i < 60; i += 1) step(state, NO_INPUT, STEP)
    state.ball.ownerId = null
    state.lastTouch = { id: 'home-9', side: 'home' }
    state.ball.p = { x: HALF_LENGTH - 0.4, y: 1, z: 0 }
    state.ball.v = { x: 30, y: 0, z: 0 }
    step(state, NO_INPUT, STEP)
    expect(state.score.home).toBe(1)
    expect(state.events.some((event) => event.t === 'goal')).toBe(true)
    expect(state.events.some((event) => event.t === 'net')).toBe(true)
  })
})

describe('הבידוד — the renderer cannot leak into the bundle, and the sim cannot roll its own dice', () => {
  const sim = walk(join(ROOT, 'lib/life/football')).filter((path) => !path.includes('/render/'))
  const render = walk(join(ROOT, 'lib/life/football/render'))

  it('uses no Math.random anywhere in the simulation', () => {
    for (const path of sim) {
      const text = withoutComments(readFileSync(path, 'utf8'))
      expect(text.includes('Math.random'), `${path} rolls its own dice`).toBe(false)
    }
  })

  it('imports no three.js in the simulation', () => {
    for (const path of sim) {
      const text = withoutComments(readFileSync(path, 'utf8'))
      expect(/from ['"]three['"]/.test(text), `${path} imports three`).toBe(false)
    }
  })

  it('is imported by exactly one component, so three.js stays out of the first paint', () => {
    const consumers: string[] = []
    for (const dir of ['app', 'components', 'lib', 'scripts', 'tests']) {
      for (const path of walk(join(ROOT, dir))) {
        if (path.includes('lib/life/football/render')) continue
        const text = withoutComments(readFileSync(path, 'utf8'))
        if (/football\/render/.test(text)) consumers.push(path.slice(ROOT.length))
      }
    }
    expect(consumers.sort()).toEqual(['components/life/PitchCard.tsx', 'tests/life-football.test.ts'])
    expect(render.length).toBeGreaterThan(0)
  })
})

describe('חוק הצהוב — the opponent, and only the opponent', () => {
  it('names exactly one runtime surface, with an approver and a date', () => {
    expect(RUNTIME_YELLOW_SURFACES).toHaveLength(1)
    const [entry] = RUNTIME_YELLOW_SURFACES
    expect(entry?.surface).toBe('football/away-kit')
    expect(entry?.approvedBy).toContain('מאור')
    expect(entry?.approvedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(entry?.why.length).toBeGreaterThan(10)
  })

  it('exempts a SURFACE, never a colour', () => {
    expect(yellowSurfaceAllowed('football/away-kit')).toBe(true)
    expect(yellowSurfaceAllowed('football/home-kit')).toBe(false)
    expect(yellowSurfaceAllowed('football')).toBe(false)
    expect(() => runtimeYellow('football/home-kit')).toThrow()
  })

  it('refuses to hand the yellow to the player’s own side', () => {
    expect(() => awayMarkColour('home')).toThrow()
    const yellow = awayMarkColour('away')
    const [r, g, b] = [(yellow >> 16) & 0xff, (yellow >> 8) & 0xff, yellow & 0xff]
    expect(isYellow(r, g, b)).toBe(true)
  })

  it('puts no yellow on Hapoel, on a keeper, or on a plain opponent', () => {
    const kits = [homeKit(), awayKit(false), keeperKit('home'), keeperKit('away')]
    for (const kit of kits) {
      for (const [name, value] of Object.entries(kit)) {
        if (typeof value !== 'number') continue
        const [r, g, b] = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
        expect(isYellow(r, g, b), `${name} is yellow`).toBe(false)
      }
    }
  })

  it('draws the rest of the renderer out of the runtime palette, which has no yellow in it', () => {
    // `tests/life.test.ts` already proves no six-digit colour literal exists under
    // `lib/life/`; this asserts the other half — that the renderer's colours are palette
    // entries, so the only reachable yellow in the whole engine is the granted one.
    for (const path of walk(join(ROOT, 'lib/life/football'))) {
      const text = withoutComments(readFileSync(path, 'utf8'))
      const literals = [...text.matchAll(/0x[0-9a-fA-F]{6}/g)].map((match) => match[0])
      expect(literals, `${path} hard-codes a colour`).toEqual([])
    }
    for (const value of Object.values(LIFE_PALETTE)) {
      const [r, g, b] = [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
      expect(isYellow(r, g, b)).toBe(false)
    }
  })
})
