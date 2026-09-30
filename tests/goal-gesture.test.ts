import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { LANDMARKS, MAX_TOUCHES, PITCH } from '@/lib/game/goal-zones'
import { EMPTY_BUILD, type BuildState } from '@/lib/game/replay/draft'
import type { ReplayPoint } from '@/lib/game/replay/envelope'
import {
  ballAt,
  ballLoose,
  focusedVerb,
  holderOf,
  inBox,
  inMouth,
  inferVerb,
  nearestMan,
  openingSpots,
  reopen,
  sendBall,
  setVerb,
  standAt,
  tension,
} from '@/lib/game/replay/gesture'
import { cameraFor, curvePath, flightMs, pointAt, pushFor } from '@/lib/game/replay/motion'

/**
 * שער 8 בידיים (delta 88) — the gesture as data. The pitch is only as honest as the rules
 * that turn a drag into a touch, so they are pinned here, away from any screen.
 */

const at = (x: number, y: number): ReplayPoint => ({ x: x / PITCH.w, y: y / PITCH.h })
const mouth = at(LANDMARKS.goalMouth.x, LANDMARKS.goalMouth.y)

describe('what a drag means', () => {
  it('reads the net as a finish, and a ball met after a cross as a header', () => {
    expect(inMouth(mouth)).toBe(true)
    expect(inferVerb({ origin: at(150, 60), target: mouth })).toBe('shot')
    expect(inferVerb({ origin: at(150, 40), target: mouth, previous: 'cross' })).toBe('header')
  })

  it('reads a short drop by the man himself as a carry', () => {
    expect(inferVerb({ origin: at(150, 250), target: at(160, 240) })).toBe('dribble')
    expect(inferVerb({ origin: at(150, 250), target: at(150, 120), carried: true })).toBe('dribble')
  })

  it('reads a ball from the wing into the box as a cross', () => {
    expect(inBox(at(150, 50))).toBe(true)
    expect(inferVerb({ origin: at(270, 150), target: at(150, 50), receiver: 'x' })).toBe('cross')
  })

  it('reads a ball into space ahead as a ball in behind, and to a man as a pass', () => {
    expect(inferVerb({ origin: at(150, 300), target: at(150, 200) })).toBe('throughBall')
    expect(inferVerb({ origin: at(100, 250), target: at(200, 240), receiver: 'x' })).toBe('pass')
  })

  it('gives the other side its own verb', () => {
    expect(inferVerb({ origin: at(150, 14), target: at(150, 90), opponent: true })).toBe('save')
  })
})

describe('the build after a gesture', () => {
  const start = standAt(EMPTY_BUILD, 'a', at(250, 200))

  it('puts the ball at the feet of the man who stood', () => {
    expect(holderOf(start)).toBe('a')
    expect(ballAt(start)).toEqual(at(250, 200))
    expect(ballAt(EMPTY_BUILD)).toBeNull()
  })

  it('a pass to a team-mate commits a touch and hands him the ball where he stands', () => {
    const sent = sendBall(start, at(120, 120), { receiver: { name: 'b', at: at(120, 120) } })
    expect(sent).not.toBeNull()
    expect(sent!.state.touches).toHaveLength(1)
    expect(sent!.touch).toMatchObject({ actorHe: 'a', action: 'pass' })
    expect(holderOf(sent!.state)).toBe('b')
    expect(ballAt(sent!.state)).toEqual(at(120, 120))
  })

  it('a ball into space leaves it loose, and a finish ends with nobody on it', () => {
    const through = sendBall(start, at(250, 90))!
    expect(through.touch.action).toBe('throughBall')
    expect(ballLoose(through.state)).toBe(true)
    const shot = sendBall(standAt(through.state, 'c', at(250, 90)), mouth)!
    expect(shot.touch.action).toBe('shot')
    expect(holderOf(shot.state)).toBeNull()
  })

  it('a carry keeps the ball with the same man, at the new place', () => {
    const carried = sendBall(start, at(200, 120), { carried: true })!
    expect(carried.touch.action).toBe('dribble')
    expect(holderOf(carried.state)).toBe('a')
    expect(ballAt(carried.state)).toEqual(at(200, 120))
  })

  it('never builds a sixth touch', () => {
    let state: BuildState = standAt(EMPTY_BUILD, 'a', at(150, 300))
    for (let i = 0; i < MAX_TOUCHES; i += 1) state = sendBall(state, at(150, 300 - (i + 1) * 5), { carried: true })?.state ?? state
    expect(state.touches).toHaveLength(MAX_TOUCHES)
    expect(holderOf(state)).toBeNull()
    expect(standAt(state, 'b', at(100, 100))).toBe(state)
  })

  it('the verb strip corrects the last touch, or the one being edited', () => {
    const one = sendBall(start, at(120, 120), { receiver: { name: 'b', at: at(120, 120) } })!.state
    const fixed = setVerb(one, 'cross')
    expect(fixed.touches[0]!.action).toBe('cross')
    expect(focusedVerb(fixed)).toBe('cross')
    const editing = reopen(fixed, 0)
    expect(editing.editing).toBe(0)
    expect(holderOf(editing)).toBe('a')
    const moved = sendBall(editing, at(60, 60))!
    // an edited touch keeps its verb and replaces itself — the move does not grow
    expect(moved.state.touches).toHaveLength(1)
    expect(moved.touch.action).toBe('cross')
    expect(moved.state.editing).toBeNull()
  })

  it('refuses to send a ball nobody has', () => {
    expect(sendBall(EMPTY_BUILD, mouth)).toBeNull()
  })
})

describe('the men on the grass', () => {
  it('stands every man somewhere, the other side on his line', () => {
    const spots = openingSpots(['a', 'b', 'k', 'c'], ['k'])
    expect(Object.keys(spots).sort()).toEqual(['a', 'b', 'c', 'k'])
    expect(spots.k!.y).toBeLessThan(0.1)
    expect(nearestMan(spots.b!, spots, null)).toBe('b')
    expect(nearestMan(spots.b!, spots, 'b')).not.toBe('b')
    expect(nearestMan(at(0, 0), spots, null)).toBeNull()
  })

  it('rises in tension as the ball nears the goal', () => {
    const far = standAt(EMPTY_BUILD, 'a', at(150, 380))
    const near = standAt(EMPTY_BUILD, 'a', at(150, 40))
    expect(tension(near)).toBeGreaterThan(tension(far))
  })
})

describe('the ball in the air', () => {
  it('bends, ends where it was sent, and takes time', () => {
    const a = { x: 270, y: 150 }
    const b = { x: 150, y: 50 }
    expect(pointAt(a, b, 'cross', 0)).toEqual(a)
    const end = pointAt(a, b, 'cross', 1)
    expect(end.x).toBeCloseTo(b.x)
    expect(end.y).toBeCloseTo(b.y)
    const mid = pointAt(a, b, 'cross', 0.5)
    expect(Math.abs(mid.x - (a.x + b.x) / 2) + Math.abs(mid.y - (a.y + b.y) / 2)).toBeGreaterThan(5)
    expect(curvePath(a, b, 'pass')).toMatch(/^M.* Q/)
    expect(flightMs(a, b, 'cross')).toBeGreaterThan(flightMs(a, b, 'shot'))
  })

  it('pushes the camera in near the goal and never past the board', () => {
    expect(pushFor({ x: 150, y: 10 })).toBeGreaterThan(pushFor({ x: 150, y: 350 }))
    const view = { top: -96, height: 496, width: 300 }
    for (const focus of [{ x: 0, y: -96 }, { x: 300, y: 400 }, { x: 150, y: 20 }]) {
      const c = cameraFor(focus, 1.5, view)
      expect(c.tx).toBeLessThanOrEqual(0)
      expect(c.tx).toBeGreaterThanOrEqual(1 - c.s)
      expect(c.ty).toBeLessThanOrEqual(0)
      expect(c.ty).toBeGreaterThanOrEqual(1 - c.s)
    }
  })
})

describe('the screen keeps the contract', () => {
  const run = readFileSync(join(process.cwd(), 'app/goal/GoalRun.tsx'), 'utf8')
  const pitch = readFileSync(join(process.cwd(), 'components/press/GoalPitch.tsx'), 'utf8')

  it('grades on the server and nowhere else', () => {
    expect(run).toContain('submitGoal(seed, run.goal, placed, cursor, pin)')
    // only TYPES come from the server-only goal module — never a function that knows answers
    expect(run).not.toMatch(/^import \{[^}]*\} from '@\/lib\/game\/goal'/m)
  })

  it('keeps the tap path and reduced motion on the board', () => {
    expect(pitch).toContain('data-goal="zone"')
    expect(pitch).toContain('prefers-reduced-motion')
    // nothing fades over grass — rule 8
    expect(pitch).not.toMatch(/fig-pop|animate-slam(?!-solid)/)
  })

  it('plays only the owner’s own ground recording', () => {
    const crowd = readFileSync(join(process.cwd(), 'lib/game/replay/crowd.ts'), 'utf8')
    const files = [...crowd.matchAll(/'\/life\/sfx\/([a-z-]+)\.m4a'/g)].map((m) => m[1])
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(file).toMatch(/^crowd-real-/)
  })
})
