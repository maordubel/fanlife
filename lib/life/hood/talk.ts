/**
 * LIFE · the hood — conversations as a small script: nodes, choices, effects (pure).
 *
 * A person's line is a node; a node may offer choices (A / B), each leading to another node or ending the talk, and may carry
 * an effect. The only effect that exists is `accept`: the job opens through a choice, never on first contact. Every talk can be
 * left at any node (`leave`), nothing here locks the player. Words are keys into `words.ts`; `{name}` etc. fill at print time.
 */
import type {PersonId} from './types'
import type {JobState} from './run'

/** `accept`: the M1 job opens. A story choice: `story:accept:<mission>:<approach>`, `story:answer:<choice>`, `story:end-day`. */
export type Effect = 'accept' | `story:${string}`
export type TalkChoice = {key: string; to: string | null; effect?: Effect}
/** what a line FEELS like: the speaker's face, what his arms and body do with it, how the camera holds it, and how the player's own face answers */
export type TalkMood = 'neutral' | 'warm' | 'smile' | 'laugh' | 'worried' | 'proud' | 'surprised'
export type TalkGesture = 'open' | 'point' | 'shoulder' | 'ruffle' | 'wave' | 'thumb' | 'cheer' | 'nod' | 'laugh' | 'shrug' | 'give' | 'scarfOn'
export type Feel = {mood?: TalkMood; gesture?: TalkGesture; /** `close`: the camera goes in on the faces for a line that matters */ shot?: 'two' | 'close'; /** a moment the picture answers (the scarf goes round his neck) */ beat?: 'scarf'; you?: TalkMood}
export type TalkNode = {id: string; who: PersonId; line: string; choices?: TalkChoice[]; /** the node a tap goes on to (null ends the talk) */ next?: string | null} & Feel
/** `narration`: nobody in the street is speaking (a complication told as it happens); the picture holds no talk shot */
export type TalkScript = {who: PersonId; start: string; nodes: Record<string, TalkNode>; narration?: boolean}
export type TalkCtx = {job: JobState; giver: PersonId; offerKey: string}
export type TalkStep = {node: TalkNode | null; effect: Effect | null}

const single = (who: PersonId, line: string): TalkScript => ({who, start: 'a', nodes: {a: {id: 'a', who, line, next: null}}})

/** the script for what `who` says now. `key` is the line the world picked (`lineFor` in run.ts, or a step's own line). */
export function talkScript(who: PersonId, key: string, ctx: TalkCtx): TalkScript {
  // the giver's offer: A "I'll get them" (accept) / B "Later"
  if (who === ctx.giver && key === ctx.offerKey && ctx.job === 'idle') return {
    who, start: 'offer', nodes: {
      offer: {id: 'offer', who, line: key, choices: [{key: 'hood.talk.accept', to: 'accepted', effect: 'accept'}, {key: 'hood.talk.later', to: 'later'}]},
      accepted: {id: 'accepted', who, line: 'hood.say.dad.accepted', next: null},
      later: {id: 'later', who, line: 'hood.say.dad.later', next: null},
    },
  }
  // small talk with a choice, so a conversation is a conversation
  if (who === 'mate' && key === 'hood.say.mate.idle') return {
    who, start: 'a', nodes: {
      a: {id: 'a', who, line: key, choices: [{key: 'hood.say.mate.q1', to: 'r1'}, {key: 'hood.say.mate.q2', to: null}]},
      r1: {id: 'r1', who, line: 'hood.say.mate.a1', next: null},
    },
  }
  if (who === 'kiosk' && key === 'hood.say.kiosk.idle') return {
    who, start: 'a', nodes: {
      a: {id: 'a', who, line: key, choices: [{key: 'hood.say.kiosk.q1', to: 'r1'}, {key: 'hood.say.kiosk.q2', to: null}]},
      r1: {id: 'r1', who, line: 'hood.say.kiosk.a1', next: null},
    },
  }
  return single(who, key)
}

/** how each line is played, by its words key; a node's own `mood` / `gesture` / `shot` win over it */
const FEEL: Record<string, Feel> = {
  'hood.say.dad.offer': {mood: 'warm', gesture: 'shoulder', you: 'smile'},
  'hood.say.dad.accepted': {mood: 'proud', gesture: 'point', you: 'proud'},
  'hood.say.dad.later': {mood: 'warm', gesture: 'nod', you: 'warm'},
  'hood.say.dad.again': {mood: 'warm', gesture: 'point', you: 'warm'},
  'hood.say.dad.thanks': {mood: 'proud', gesture: 'scarfOn', shot: 'close', beat: 'scarf', you: 'surprised'},
  'hood.say.dad.done': {mood: 'smile', gesture: 'thumb', you: 'smile'},
  'hood.say.dad.idle': {mood: 'warm', gesture: 'nod'},
  'hood.say.mate.scarf': {mood: 'smile', gesture: 'give', you: 'smile'},
  'hood.say.mate.wait': {mood: 'laugh', gesture: 'shrug', you: 'worried'},
  'hood.say.mate.idle': {mood: 'smile', gesture: 'wave', you: 'smile'},
  'hood.say.mate.a1': {mood: 'laugh', gesture: 'point', you: 'smile'},
  'hood.say.mate.done': {mood: 'proud', gesture: 'thumb', you: 'smile'},
  'hood.say.kiosk.idle': {mood: 'warm', gesture: 'open'},
  'hood.say.kiosk.job': {mood: 'smile', gesture: 'point', you: 'smile'},
  'hood.say.kiosk.a1': {mood: 'warm', gesture: 'open'},
  'hood.say.kiosk.done': {mood: 'smile', gesture: 'thumb', you: 'smile'},
  'hood.say.neighbour.idle': {mood: 'worried', gesture: 'shrug', you: 'warm'},
  'hood.say.neighbour.done': {mood: 'laugh', gesture: 'laugh', you: 'smile'},
  // the story's lines that matter: the scarf goes on at the first noise, the box is handed over
  'story.s.first-noise.dad': {mood: 'proud', gesture: 'scarfOn', shot: 'close', beat: 'scarf', you: 'surprised'},
  'story.s.first-noise.mate': {mood: 'smile', gesture: 'give', you: 'smile'},
  'story.s.six-short.shirt': {mood: 'proud', gesture: 'ruffle', shot: 'close', you: 'proud'},
  'story.s.the-way-in.dad': {mood: 'warm', gesture: 'shoulder', you: 'warm'},
  'story.s.no-ticket.home': {mood: 'warm', gesture: 'shoulder', shot: 'close', you: 'worried'},
  'story.s.the-box.dad': {mood: 'proud', gesture: 'give', shot: 'close', you: 'proud'},
  'story.s.her-seat.after': {mood: 'warm', gesture: 'open', shot: 'close', you: 'warm'},
  'story.s.lead-the-way.dad': {mood: 'warm', gesture: 'point', you: 'proud'},
}
/** how a node is played: its line's feeling, with the node's own on top; a plain line is said warmly */
export function feelOf(n: TalkNode): Feel {
  const f = FEEL[n.line] ?? {}
  return {mood: n.mood ?? f.mood ?? 'warm', gesture: n.gesture ?? f.gesture, shot: n.shot ?? f.shot ?? 'two', beat: n.beat ?? f.beat, you: n.you ?? f.you ?? 'warm'}
}

export const nodeOf = (s: TalkScript, id: string): TalkNode | null => s.nodes[id] ?? null

/** a tap on a line without choices: go on to its `next` (null ends) */
export function advance(s: TalkScript, id: string): TalkStep {
  const n = nodeOf(s, id)
  if (!n || n.choices?.length) return {node: n, effect: null}
  return {node: n.next ? nodeOf(s, n.next) : null, effect: null}
}
/** picking choice `i` of a node: its effect and the node it leads to (null ends the talk) */
export function choose(s: TalkScript, id: string, i: number): TalkStep {
  const c = nodeOf(s, id)?.choices?.[i]
  if (!c) return {node: nodeOf(s, id), effect: null}
  return {node: c.to ? nodeOf(s, c.to) : null, effect: c.effect ?? null}
}
/** every words key a script prints (for the test that none is missing) */
export const scriptKeys = (s: TalkScript): string[] => Object.values(s.nodes).flatMap(n => [n.line, ...(n.choices ?? []).map(c => c.key)])
