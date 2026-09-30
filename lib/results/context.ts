import 'server-only'

import type { MessageKey } from '@/lib/i18n'
import {
  archiveHref,
  awayDaysHref,
  awayHref,
  gateHref,
  lifeHref,
  lineupHref,
  matchOfGoal,
  matchSubject,
  playableGoalHref,
  playerSubject,
} from '@/lib/links'

import type { NextAction, NextActionKind, RecommendState, ResultContext } from './types'

export type { NextAction, NextActionKind, RecommendState, ResultContext } from './types'

/**
 * RECOMMEND — the deterministic next step (master plan §38). No AI, no randomness, no
 * carousel: one primary, at most one secondary, and every href resolved and CHECKED by
 * `lib/links/index.ts` — this file builds no URL of its own. Server-only for that reason:
 * the checks read the archive, the goal deck and the lineup deck, which never ship.
 *
 * The rules, in the order they are asked (the first answer is primary):
 *
 *   1. a goal in the run      → replay it in gate 8 (from gate 8: its match's archive card)
 *   2. a weak topic           → the gate that teaches it (kits → 4, history → 13, …)
 *   3. a match in the run     → gate 3 when a verified XI exists, else its archive card;
 *                               its AWAY DAYS stop when it was played abroad
 *   4. a LIFE anchor          → LIFE, ONLY when `state.lifeUnlocked(chapter)` says so
 *   5. a man in the run       → his archive card; "הוא נכנס להרכב שלך?" (gate 1)
 *   6. any other archive id   → its card
 *
 * A candidate is dropped when it points back at the asking gate, repeats an href, or is in
 * `state.exclude` (a chip the screen already shows). The secondary must be a different
 * KIND from the primary where one exists, so the two doors are two directions.
 */

/** Weak topic → the gate that is about it. Topics with no teaching gate simply do not recommend. */
const TOPIC_GATE: Readonly<Record<string, number | 'away'>> = {
  kits: 4,
  derby: 11,
  history: 13,
  timeline: 13,
  europe: 'away',
  players: 10,
  lineup: 3,
  goals: 8,
  memory: 6,
}

type Candidate = NextAction

function add(out: Candidate[], kind: NextActionKind, href: string | null, label: string, subject: string | null, reason: string) {
  if (!href) return
  out.push({ kind, href, label: label as MessageKey, subject, reason })
}

function candidates(ctx: ResultContext, state: RecommendState): Candidate[] {
  const out: Candidate[] = []
  const gate = ctx.gateId

  // 1 · goals
  for (const goalId of ctx.goalIds ?? []) {
    if (gate === 8) {
      const match = matchOfGoal(goalId)
      if (match) add(out, 'archive', archiveHref(match), 'voice.next.archiveMatch', matchSubject(match), 'goal→archive')
    } else {
      const match = matchOfGoal(goalId)
      add(out, 'goal', playableGoalHref(goalId), 'voice.next.goal', match ? matchSubject(match) : null, 'goal→replay')
    }
  }

  // 2 · weak topics
  for (const topic of ctx.weakTopics ?? []) {
    const target = TOPIC_GATE[topic]
    if (target === undefined) continue
    if (target === 'away') add(out, 'gate', awayDaysHref(), 'voice.next.awayDays', null, `weak:${topic}`)
    else add(out, 'gate', gateHref(target), `voice.next.gate.${target}`, null, `weak:${topic}`)
  }

  // 3 · matches
  for (const matchId of ctx.matchIds ?? []) {
    const subject = matchSubject(matchId)
    add(out, 'gate', lineupHref(matchId), 'voice.next.gate.3', subject, 'match→lineup')
    add(out, 'archive', archiveHref(matchId), 'voice.next.archiveMatch', subject, 'match→archive')
    add(out, 'away', awayHref(matchId), 'voice.next.away', subject, 'match→away')
  }

  // 4 · LIFE — never without the unlock check (§23.2)
  if (state.lifeUnlocked) {
    for (const chapter of ctx.lifeAnchors ?? []) {
      add(out, 'life', lifeHref(chapter, state.lifeUnlocked), 'voice.next.life', null, 'life-anchor')
    }
  }

  // 5 · players
  for (const playerId of ctx.playerIds ?? []) {
    add(out, 'archive', archiveHref(playerId), 'voice.next.archivePlayer', playerSubject(playerId), 'player→archive')
    add(out, 'gate', gateHref(1), 'voice.next.gate.1', playerSubject(playerId), 'player→xi')
  }

  // 6 · anything else the archive knows
  for (const id of ctx.archiveEntityIds ?? []) {
    add(out, 'archive', archiveHref(id), 'voice.next.archive', null, 'entity→archive')
  }

  return out
}

export function recommend(ctx: ResultContext, state: RecommendState = {}): NextAction[] {
  const own = gateHref(ctx.gateId)
  const seen = new Set<string>(state.exclude ?? [])
  const pool: Candidate[] = []
  for (const c of candidates(ctx, state)) {
    const path = c.href.split('?')[0]
    if (seen.has(c.href) || (own && path === own && c.href === path)) continue
    seen.add(c.href)
    pool.push(c)
  }
  const [primary] = pool
  if (!primary) return []
  const secondary = pool.find((c) => c !== primary && c.kind !== primary.kind) ?? pool.find((c) => c !== primary)
  return secondary ? [primary, secondary] : [primary]
}
