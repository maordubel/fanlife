/**
 * LIFE · the hood — the CHALLENGES (feel pass, 24.11.2026): how each way of doing a mission PLAYS, on top of the steps it
 * already has. Data only, club-agnostic. The verbs are RUSH's own: RUN against a clock, SNEAK past somebody watching,
 * CARRY something without a knock, FIND a thing with a clue and a search, and the talk verbs of the hood: SPEND scarce
 * coins, BARGAIN, keep a PROMISE to two people at once.
 *
 * Every challenge is fail-forward: running out of time, being seen, a knock, a broken promise is a SLIP — the story bends
 * (a flag, a line, a bond) and the mission still ends. Nothing here is a game-over and nothing is a wait.
 * A ticking reason (kick-off, Mum's curfew, the last bus, the kiosk shutting) is shown on the HUD with its clock.
 * Children get help: more time, a shorter look from the watcher, fewer places to search (`assist`).
 */
import type {PersonId, PlaceId} from '../../types'
import type {Effect, StageId} from '../types'

export type Reason = 'kickoff' | 'curfew' | 'last-bus' | 'kiosk-shuts' | 'bell' | 'dark' | 'gates' | 'tea'
export type Clock = {reason: Reason; seconds: number}
export type SpendOffer = {id: string; units: number; effects: Effect[]}

export type Challenge =
  /** RUN: the whole mission against its clock */
  | {kind: 'timed'; clock: Clock}
  /** SNEAK: somebody stands watch at `at` and sweeps his look; seen running in it (or right under his nose) is a slip */
  | {kind: 'sneak'; at: PlaceId; clock?: Clock}
  /** FIND: the mission's first thing to collect is hidden in one of a few places near where it should be; a clue says which */
  | {kind: 'find'; clock?: Clock}
  /** SPEND: at `at` the coins in his pocket choose between two or three things (the era's prices) */
  | {kind: 'spend'; at: PlaceId; offers: SpendOffer[]; clock?: Clock}
  /** BARGAIN: at `at` the price is said and he talks it down, or does not */
  | {kind: 'bargain'; at: PlaceId; units: number; clock?: Clock}
  /** PROMISE: two people, each expecting him by a time; the order he does them in is his */
  | {kind: 'promise'; who: [PersonId, PersonId]; seconds: [number, number]}
  /** CARRY: no running with it, and every knock in the street spills a little; `knocks` knocks is a slip */
  | {kind: 'carry'; knocks: number; clock?: Clock}

/** the ways of the written life that play as a challenge, by `mission/approach` */
export const CHALLENGES: Readonly<Record<string, Challenge>> = {
  // childhood
  'first-noise/kiosk-first': {kind: 'timed', clock: {reason: 'kickoff', seconds: 95}},
  'first-noise/scarf-first': {kind: 'promise', who: ['mate', 'dad'], seconds: [45, 95]},
  'first-noise/next-door': {kind: 'timed', clock: {reason: 'kickoff', seconds: 80}},
  'six-short/crates': {kind: 'carry', knocks: 2, clock: {reason: 'kiosk-shuts', seconds: 70}},
  'six-short/car': {kind: 'timed', clock: {reason: 'kiosk-shuts', seconds: 100}},
  'six-short/bottles': {kind: 'timed', clock: {reason: 'kiosk-shuts', seconds: 110}},
  'the-way-in/with-dad': {kind: 'timed', clock: {reason: 'kickoff', seconds: 120}},
  'the-way-in/short-cut': {kind: 'sneak', at: 'pitch', clock: {reason: 'kickoff', seconds: 120}},
  'the-way-in/old-hand': {kind: 'timed', clock: {reason: 'gates', seconds: 110}},
  'monday-colours/open': {kind: 'timed', clock: {reason: 'bell', seconds: 80}},
  'monday-colours/under': {kind: 'sneak', at: 'school', clock: {reason: 'bell', seconds: 90}},
  'monday-colours/badges': {kind: 'spend', at: 'kiosk', offers: [{id: 'two', units: 1, effects: [{rep: 1}]}, {id: 'one', units: 0, effects: [{flag: 'feel:kept-a-coin'}]}], clock: {reason: 'bell', seconds: 90}},
  'the-window/work-it-off': {kind: 'carry', knocks: 2},
  'the-window/own-up': {kind: 'timed', clock: {reason: 'tea', seconds: 70}},
  'missing-square/swap': {kind: 'find'},
  'missing-square/packets': {kind: 'bargain', at: 'kiosk', units: 3},
  'missing-square/play-for-it': {kind: 'timed', clock: {reason: 'dark', seconds: 70}},
  'her-seat/carry': {kind: 'carry', knocks: 2, clock: {reason: 'kickoff', seconds: 120}},
  'her-seat/ahead': {kind: 'timed', clock: {reason: 'kickoff', seconds: 100}},
  'her-seat/sandwiches': {kind: 'spend', at: 'kiosk', offers: [{id: 'two', units: 0, effects: [{bond: 'neighbour', n: 1}]}, {id: 'one-and-drink', units: 1, effects: [{bond: 'neighbour', n: 2}]}], clock: {reason: 'kickoff', seconds: 120}},
  'lead-the-way/main-street': {kind: 'timed', clock: {reason: 'kickoff', seconds: 100}},
  'lead-the-way/sweets': {kind: 'spend', at: 'kiosk', offers: [{id: 'sweets', units: 0, effects: [{flag: 'feel:sweets'}]}, {id: 'programme', units: 1, effects: [{keep: 'programme'}]}], clock: {reason: 'kickoff', seconds: 110}},
  'lead-the-way/the-pitch': {kind: 'promise', who: ['mate', 'dad'], seconds: [50, 110]},
  'the-banner/buy-paint': {kind: 'bargain', at: 'kiosk', units: 3, clock: {reason: 'dark', seconds: 140}},
  'the-banner/art-room': {kind: 'sneak', at: 'school', clock: {reason: 'dark', seconds: 140}},
  'the-banner/old-sheets': {kind: 'find', clock: {reason: 'dark', seconds: 140}},
  'no-ticket/fence': {kind: 'sneak', at: 'ground', clock: {reason: 'kickoff', seconds: 120}},
  'no-ticket/ask-dad': {kind: 'timed', clock: {reason: 'kickoff', seconds: 60}},
  'no-ticket/radio': {kind: 'timed', clock: {reason: 'kickoff', seconds: 60}},
  'the-box/gather': {kind: 'promise', who: ['mate', 'neighbour'], seconds: [50, 100]},
  'the-box/walk-it': {kind: 'timed', clock: {reason: 'dark', seconds: 150}},
  // small jobs and the week's work: a little play, never a chore
  'lost-ball/search': {kind: 'find'},
  'radio-aerial/fix': {kind: 'timed', clock: {reason: 'kickoff', seconds: 90}},
  'papers/round': {kind: 'timed', clock: {reason: 'kiosk-shuts', seconds: 80}},
  'papers/counter': {kind: 'carry', knocks: 2},
  'kickabout/bring-all': {kind: 'timed', clock: {reason: 'tea', seconds: 70}},
  'kickabout/play': {kind: 'timed', clock: {reason: 'curfew', seconds: 60}},
  'radio-check/batteries': {kind: 'bargain', at: 'kiosk', units: 1},
}

/**
 * A way that is not in the table: a matchday chapter later in life still has its kick-off; anything else plays as its
 * steps alone. The clock is generous on purpose (the walk to the ground at a run, with room to look about).
 */
export function challengeFor(mission: {id: string; kind: string; day: string; stage: StageId}, approach: string): Challenge | null {
  const c = CHALLENGES[`${mission.id}/${approach}`]
  if (c) return c
  if (mission.kind === 'main' && mission.day === 'matchday') return {kind: 'timed', clock: {reason: 'kickoff', seconds: 150}}
  // a teenager's evening out is a teenager's evening out: home before Mum notices
  if (mission.kind === 'main' && mission.stage === 'teen') return {kind: 'timed', clock: {reason: 'curfew', seconds: 150}}
  return null
}

/** help for the young: more time, a shorter look, fewer places to search */
export function assist(age: number): {time: number; look: number; decoys: number} {
  if (age < 9) return {time: 1.6, look: 0.6, decoys: 1}
  if (age < 13) return {time: 1.3, look: 0.8, decoys: 2}
  return {time: 1, look: 1, decoys: 2}
}

/** what a slip and a clean finish change, by challenge (on top of the mission's own aftermath) */
export const SLIP: Readonly<Record<Challenge['kind'], Effect[]>> = {
  timed: [{rep: -1}], sneak: [{rep: -1}, {flag: 'feel:seen'}], find: [], spend: [], bargain: [], promise: [], carry: [{rep: -1}],
}
export const CLEAN: Readonly<Record<Challenge['kind'], Effect[]>> = {
  timed: [{rep: 1}], sneak: [{rep: 1}], find: [{rep: 1}], spend: [], bargain: [], promise: [{rep: 1}], carry: [{rep: 1}],
}
