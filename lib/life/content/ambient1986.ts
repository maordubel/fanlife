import { at } from '../clock'
import type { LocationId } from '../types'
import type { Condition } from '../world/types'
import { KICKOFF, KOBI_LEAVES } from '../world/scenes'

/**
 * הרחוב החי — people who are not there for you.
 *
 * Nobody in this file can be talked to, and that is the entire point. A world where every
 * figure is a conversation is a world made of buttons; a world where most of the figures
 * are simply going somewhere is a place. The player should notice, without being told,
 * that the street exists when they do nothing.
 *
 * The one thing this file is really for is the drain. Before three o'clock the street has
 * a neighbour on it and somebody carrying shopping. After three it has supporters, and
 * they are all walking the same way, and there are more of them every twenty minutes.
 * That is how the child works out where Bloomfield is — not from an arrow, from traffic.
 *
 * Ambient people are drawn from the crowd sheets and never from the cast: an ambient
 * figure who looked like Ofir would be a bug the player reports as "Ofir was in two
 * places", and reusing a named face to fill a pavement is exactly how a world stops
 * meaning anything.
 *
 * The September delivery replaced the seven interchangeable `fan*` cut-outs with
 * twenty-eight period-dressed people. Nobody now crosses the same street twice in the
 * same shirt, which is the difference between "the street is busy" and "the same four
 * strangers are on a loop".
 */

export type AmbientActor = {
  id: string
  /** a crowd figure key — never a named character */
  figure: string
  location: LocationId
  /** fractions of the backdrop */
  from: number
  to: number
  y: number
  size: number
  /** milliseconds for one crossing */
  ms: number
  /** milliseconds between crossings */
  everyMs: number
  offsetMs?: number
  /** stop for a moment partway across; nobody walks a street at a constant speed */
  pauseAt?: number
  pauseMs?: number
  when?: Condition
}

const AFTER_KOBI: Condition = { afterMinute: KOBI_LEAVES }
const BEFORE_KOBI: Condition = { beforeMinute: KOBI_LEAVES }

export const AMBIENT_1986: AmbientActor[] = [
  // -------------------------------------------------------------------- the street --
  // Quiet afternoon: two people with somewhere ordinary to be.
  {
    id: 'street-shopper',
    figure: 'adultA7',
    location: 'street',
    from: 1.05,
    to: -0.1,
    y: 0.8,
    size: 0.22,
    ms: 26000,
    everyMs: 44000,
    pauseAt: 0.45,
    pauseMs: 3400,
    when: BEFORE_KOBI,
  },
  {
    id: 'street-woman',
    figure: 'adultB3',
    location: 'street',
    from: -0.08,
    to: 1.06,
    y: 0.9,
    size: 0.26,
    ms: 30000,
    everyMs: 61000,
    offsetMs: 12000,
    when: BEFORE_KOBI,
  },

  // Ten past three: the direction of the street changes, and it never changes back.
  {
    id: 'street-fan-1',
    figure: 'adultA6',
    location: 'street',
    from: -0.1,
    to: 1.08,
    y: 0.86,
    size: 0.27,
    ms: 17000,
    everyMs: 21000,
    when: AFTER_KOBI,
  },
  {
    id: 'street-fan-2',
    figure: 'youngB2',
    location: 'street',
    from: -0.14,
    to: 1.1,
    y: 0.92,
    size: 0.31,
    ms: 15000,
    everyMs: 19000,
    offsetMs: 7000,
    when: AFTER_KOBI,
  },
  {
    id: 'street-fan-3',
    figure: 'adultB5',
    location: 'street',
    from: -0.12,
    to: 1.08,
    y: 0.78,
    size: 0.2,
    ms: 22000,
    everyMs: 27000,
    offsetMs: 14000,
    when: AFTER_KOBI,
  },

  // --------------------------------------------------------------------- the kiosk --
  {
    id: 'kiosk-customer',
    figure: 'adultA5',
    location: 'kiosk',
    from: 1.04,
    to: 0.62,
    y: 0.92,
    size: 0.28,
    ms: 9000,
    everyMs: 34000,
    pauseAt: 0.85,
    pauseMs: 9000,
  },

  // ---------------------------------------------------------------------- the pitch --
  {
    id: 'pitch-watcher',
    figure: 'adultB1',
    location: 'pitch',
    from: 0.94,
    to: 0.9,
    y: 0.74,
    size: 0.18,
    ms: 40000,
    everyMs: 40000,
  },

  // ----------------------------------------------------------------------- the road --
  // The road east is the only place where the ambience is the navigation. Everybody
  // moves one way, the density rises with the clock, and nothing points at anything.
  {
    id: 'route-a',
    figure: 'adultA1',
    location: 'route',
    from: -0.1,
    to: 1.1,
    y: 0.8,
    size: 0.24,
    ms: 19000,
    everyMs: 12000,
  },
  {
    id: 'route-b',
    figure: 'youngA5',
    location: 'route',
    from: -0.15,
    to: 1.12,
    y: 0.9,
    size: 0.3,
    ms: 15000,
    everyMs: 10000,
    offsetMs: 4000,
  },
  {
    id: 'route-c',
    figure: 'adultB4',
    location: 'route',
    from: -0.12,
    to: 1.1,
    y: 0.74,
    size: 0.2,
    ms: 24000,
    everyMs: 16000,
    offsetMs: 9000,
  },
  {
    id: 'route-d',
    figure: 'youngB6',
    location: 'route',
    from: -0.1,
    to: 1.1,
    y: 0.94,
    size: 0.33,
    ms: 13000,
    everyMs: 9000,
    offsetMs: 2500,
    when: { afterMinute: at(15, 30) },
  },

  // --------------------------------------------------------------------- the ground --
  {
    id: 'gate-a',
    figure: 'adultA6',
    location: 'bloomfield-outside',
    from: -0.1,
    to: 0.62,
    y: 0.94,
    size: 0.3,
    ms: 14000,
    everyMs: 11000,
  },
  {
    id: 'gate-b',
    figure: 'youngA7',
    location: 'bloomfield-outside',
    from: -0.14,
    to: 0.55,
    y: 0.86,
    size: 0.24,
    ms: 17000,
    everyMs: 13000,
    offsetMs: 5000,
  },
  {
    id: 'gate-c',
    figure: 'adultB7',
    location: 'bloomfield-outside',
    from: 1.06,
    to: 0.48,
    y: 0.9,
    size: 0.27,
    ms: 16000,
    everyMs: 15000,
    offsetMs: 8000,
    when: { beforeMinute: KICKOFF },
  },
  /**
   * ארבעה זרים חדשים — 5.9.2026. Maor sent people and asked for variety, and variety in an
   * ambient system is not more crossings, it is more KINDS of crossing: somebody who
   * strolls, somebody walking away from you, somebody stopping to look in a window, and
   * one person going faster than everybody else. Four bodies, four speeds.
   *
   * Sizes are the street's own metre — an adult is 1.75 m and reads 0.29 at the near
   * line — so nobody here is a different scale from the child standing beside them.
   */
  {
    id: 'street-old-cap',
    figure: 'manCap',
    location: 'street',
    from: 1.05,
    to: -0.1,
    y: 0.79,
    size: 0.255,
    ms: 34000,
    everyMs: 21000,
    offsetMs: 3000,
    pauseAt: 0.62,
    pauseMs: 5200,
  },
  {
    id: 'street-old-back',
    figure: 'manBack',
    location: 'street',
    from: 0.34,
    to: 1.12,
    y: 0.735,
    size: 0.225,
    ms: 30000,
    everyMs: 26000,
    offsetMs: 12000,
  },
  {
    id: 'street-girl',
    figure: 'girlTeen',
    location: 'street',
    from: -0.08,
    to: 1.06,
    y: 0.83,
    size: 0.245,
    ms: 21000,
    everyMs: 17000,
    offsetMs: 7000,
    pauseAt: 0.3,
    pauseMs: 2600,
  },
]

/**
 * הרחוב בשנות ה־90 — the same street, four years on, with one more kind of person in it.
 *
 * A decade shows in a street through who is on it, not only through what is painted on
 * the walls. The eighties list still runs; the nineties add a boy on a skateboard going
 * faster than everybody else, which is exactly the thing a twelve-year-old notices and an
 * eight-year-old had not seen yet.
 */
export const AMBIENT_1990: AmbientActor[] = [
  ...AMBIENT_1986,
  {
    id: 'street-skater',
    figure: 'boySkate',
    location: 'street',
    from: 1.1,
    to: -0.12,
    y: 0.8,
    size: 0.243,
    ms: 11000,
    everyMs: 24000,
    offsetMs: 9000,
  },
]
