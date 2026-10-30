/**
 * LIFE · Season One — how an episode is written.
 *
 * An episode is a short run of STEPS. A step is something he does — walks up to a person or a thing and does it — and
 * the reaction comes after the doing, never before: there is no "pick an intention" menu in front of a pair of hands.
 * When a step asks something, it asks it after the act, as a moment with a clock on it (`ask.timer`), and silence is an
 * answer of its own.
 *
 * Everything here is fiction about one family and one street. A fact about a match belongs to the archive row and is
 * only ever shown by the live board (`LiveDef`); no line written here names a score, an opponent, a minute or a player.
 * Text is English, with the pack's tokens (`{club}`, `{ground}`, `{friend}`…) and `{hero}` — the name he was given.
 */
import type {Cond, Effect, Line, MiniGame, Mood, Verb} from '../types'
import type {MissionAsk} from '../screenplay/types'

/** a line: who says it (`me` is him, `think` is his own voice in a caption, null is the room) */
export type Say = Line
export const say = (who: string, t: string, mood?: Mood): Say => ({who, t, ...(mood ? {mood} : {})})
export const me = (t: string, mood?: Mood): Say => ({who: 'me', t, ...(mood ? {mood} : {})})
/** his own voice — first person, in a caption box, never spoken aloud */
export const think = (t: string, mood?: Mood): Say => ({who: 'think', t, ...(mood ? {mood} : {})})
export const room = (t: string, mood?: Mood): Say => ({who: null, t, ...(mood ? {mood} : {})})

export type Opt = {
  id: string
  text: string
  /** what is said back */
  reply: Say[]
  fx?: Effect[]
  when?: Cond
  /** puts the shirt or the scarf on, keeping what he already wears */
  wear?: 'shirt' | 'scarf'
  /** not an answer yet: says its reply and leaves the step open ("Not yet" at a shop counter) */
  stay?: boolean
  /** played as a RUSH mission (or its fallback game) before the reply */
  mission?: MissionAsk
  game?: MiniGame
}

export type Ask = {
  /** said just before the choice (optional: the reaction lines usually set it up) */
  lines?: Say[]
  options: Opt[]
  /** seconds before the moment passes; then `silent` is taken for him */
  timer?: number
  silent?: string
}

export type Step = {
  id: string
  /** what the HUD says while this is the job */
  goal: string
  /** part of THE mission of the episode (the HUD marks it as such) */
  main?: boolean
  /** a side job: his to take or leave; never blocks the episode */
  side?: boolean
  /** steps that share a hub are open together, in either order */
  hub?: string
  /** steps (ids) done first. Default: the previous step that is not a side job (none for the first) */
  after?: string[]
  /** opens once ANY of these steps is done (two roads meeting again): instead of `after` */
  afterAny?: string[]
  /** the step exists only on the lives where this holds (a branch after a clock ran out, a choice made). Once it does not hold the step is off this road for good */
  when?: Cond
  /** where it happens: at a person (`who`, optionally on a named `slot`) or at a thing in the room (`spot`) */
  at: {room: string; who?: string; slot?: string; spot?: string}
  verb?: Verb
  /** plays by itself as he walks in, instead of waiting for a tap */
  enter?: boolean
  /** a short set-up, said first (two lines is plenty) */
  lines?: Say[]
  /** lines put in front when what they remember happened (all that hold are said, in order) */
  callbacks?: {when: Cond; lines: Say[]; group?: string}[]
  /** hands: a small game, or a RUSH mission, played after the set-up */
  game?: MiniGame
  mission?: MissionAsk
  reward?: {good?: Effect[]; slip?: Effect[]}
  /** what the screen stages between the doing and the reaction: a scene (`cine`), the live night (`live`), an interview (`doc`) */
  show?: Effect[]
  /** what the doing changes (applied as the step is done, before any question) */
  fx?: Effect[]
  /** what is said after the doing: a reaction. With a game, `slip` lines replace these when it got away from him */
  react?: Say[]
  slip?: Say[]
  /** a question after the act — a moment, not a menu */
  ask?: Ask
  /** this step ends the episode: each answer of `ask` is an ending (no ask: one ending, `done`) */
  final?: boolean
  /** after this step the day moves to another room by a cut */
  cut?: {room: string; spawn?: string; night?: boolean}
  /** people who walk with him while this step is open */
  escort?: {who: string; rooms: string[]}[]
  /** while this step is open, the street's east door leads here */
  east?: string
}

/** people who are simply there (a bark, a face): no step needs them */
export type Presence = {who: string; room: string; slot?: string; when?: Cond}

export type EpisodeScript = {
  id: string
  no: number
  age: number
  act: 1 | 2 | 3
  title: string
  logline: string
  /** the next episode's name, for the end card */
  next?: string
  /** the card the chapter opens on: one line, his voice */
  intro: string
  keep: {id: string; name: string; note: string; when?: Cond}
  start: {room: string; spawn?: string; night?: boolean}
  steps: Step[]
  people?: Presence[]
  barks?: {who: string; room: string; when?: Cond; lines: string[]}[]
  clock?: {id: string; s: number; label: string; from?: Cond; until: Cond; fail: string; lines: Say[]; fx?: Effect[]}
  cines?: import('../types').CineDef[]
  docs?: import('../types').DocDef[]
  lives?: import('../types').LiveDef[]
  /** the cold open (an interview, then a staged scene, then the mission banner) and the interviews over the end card */
  open?: {doc?: string; cine?: string; mission?: string}
  close?: string[]
  /** the hooks: see `EpisodeMeta` */
  texts?: {from: string; t: string}[]
  box?: {item: string; line: string}
  flash?: {cine: string; card: string}
  tease?: string
  letter?: {head: string; lines: string[]; sign: string; after: string}
  /** the archive row the episode stands on (set by the season, never by the script) */
  anchor?: import('../types').ArchiveRef
  /** the paper of that week (set by the season): a recorded night from the year of the episode, opened on its first screen */
  paper?: import('../types').ArchiveRef
  when?: Cond
}

export const flag = (k: string, v: string | number | boolean = true): Effect => ({e: 'flag', k, v})
export const is = (k: string, v: string | number | boolean): Cond => ({is: [k, v]})
export const has = (k: string): Cond => ({flag: k})
export const not = (k: string): Cond => ({not: k})
export const all = (...c: Cond[]): Cond => ({all: c})
export const any = (...c: Cond[]): Cond => ({any: c})
export const bond = (who: string, by: number): Effect => ({e: 'bond', who, by})
export const heart = (by: number): Effect => ({e: 'heart', by})
export const coins = (by: number): Effect => ({e: 'coins', by})
export const pay = (order: string, by: number): Effect => ({e: 'pay', order, by})
export const standing = (by: number): Effect => ({e: 'standing', by})
export const cine = (id: string): Effect => ({e: 'cine', id})
export const doc = (id: string): Effect => ({e: 'doc', id})
export const live = (id: string): Effect => ({e: 'live', id})
export const passed = (text: string): Effect => ({e: 'stamp', kind: 'passed', text})
export const failed = (text: string): Effect => ({e: 'stamp', kind: 'failed', text})
export const unlocked = (text: string): Effect => ({e: 'stamp', kind: 'unlocked', text})
/** a line for the episode's end card, in the order it happened (no stamp on the screen) */
export const remember = (id: string, text: string): Effect => ({e: 'flag', k: `s1:log:${id}`, v: `new|${text}`})
export const sound = (cue: import('../types').SoundCue): Effect => ({e: 'sound', cue})
export const opt = (id: string, text: string, reply: Say | Say[], fx: Effect[] = [], more: Partial<Opt> = {}): Opt =>
  ({id, text, reply: Array.isArray(reply) ? reply : [reply], fx, ...more})
