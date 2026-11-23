/**
 * LIFE · the hood — conversations as a small script: nodes, choices, effects (pure).
 *
 * A person's line is a node; a node may offer choices (A / B), each leading to another node or ending the talk, and may carry
 * an effect. The only effect that exists is `accept`: the job opens through a choice, never on first contact. Every talk can be
 * left at any node (`leave`), nothing here locks the player. Words are keys into `words.ts`; `{name}` etc. fill at print time.
 */
import type {PersonId} from './types'
import type {JobState} from './run'

export type Effect = 'accept'
export type TalkChoice = {key: string; to: string | null; effect?: Effect}
export type TalkNode = {id: string; who: PersonId; line: string; choices?: TalkChoice[]; /** the node a tap goes on to (null ends the talk) */ next?: string | null}
export type TalkScript = {who: PersonId; start: string; nodes: Record<string, TalkNode>}
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
