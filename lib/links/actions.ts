import 'server-only'

import { entity } from '@/lib/archive/graph'
import { matchById } from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { BANK } from '@/lib/game/blind-cow/bank'
import { factById, allQuestions } from '@/lib/game/question-master'
import { priceForPlayer } from '@/lib/game/royal-rumble'
import { timelineHasDate, timelineHasDateIn } from '@/lib/game/timeline'
import { ROUND_LENGTH } from '@/lib/game/trivia'
import type { MessageKey } from '@/lib/i18n'
import { kitRecords } from '@/lib/kit/kit-master'
import { chaptersOfEntity } from '@/lib/life/bridge'

import { eraTriviaHref } from './eraTrivia'
import { gateHref, goalHref, goalIdsOfMatch, lineupHref, playableGoalHref } from './index'

/**
 * CROSS GATE ROUTER — what can this archive entity DO? (ONE RED WORLD §21)
 *
 * The archive is the backbone: an entity page lists the real actions available on it.
 *
 *   Match  → lineup · goal · trivia · timeline · LIFE
 *   Player → blind-cow · xi · rumble · trivia · LIFE
 *   Season → kit · timeline · trivia
 *
 * **An action exists only if its target can actually serve that entity** — gate 3 only for
 * a match it deals, gate 8 only for a goal it deals, gate 10 only for a man its bank asks
 * about, the rumble only for a man its pool prices, gate 1 only for a man its roster holds,
 * the timeline only for a day its pool keeps, trivia only for a full round (twelve
 * questions about him, or twelve of his era), a shirt gate only for a season the Kit Master
 * holds. `tests/router.test.ts` resolves every href back through the gate that receives it.
 *
 * LIFE is returned as chapter ids, never as a link: whether a chapter is unlocked is a fact
 * about THIS DEVICE's save, which the server does not know. The client asks the passport
 * (`lib/life/memoryPassport.ts`) and draws the door only for a lived chapter.
 */

export type GateActionKind = 'lineup' | 'goal' | 'trivia' | 'timeline' | 'blind-cow' | 'xi' | 'rumble' | 'kit'

export type GateAction = {
  kind: GateActionKind
  /** the wall number of the gate it opens */
  gate: number
  href: string
  label: MessageKey
}

export type EntityActions = {
  actions: GateAction[]
  /** LIFE chapters this entity is lived in — offered by the client only when unlocked */
  lifeChapters: string[]
}

const k = (key: string) => key as MessageKey

/* ------------------------------------------------------------------ trivia */

let questionsByEntity: Map<string, string[]> | null = null
function questionsAbout(id: string): string[] {
  if (!questionsByEntity) {
    const index = new Map<string, string[]>()
    for (const question of allQuestions()) {
      for (const factId of question.factIds) {
        for (const entityId of factById(factId)?.entityIds ?? []) {
          const list = index.get(entityId) ?? []
          if (!list.includes(question.id)) list.push(question.id)
          index.set(entityId, list)
        }
      }
    }
    questionsByEntity = index
  }
  return questionsByEntity.get(id) ?? []
}

/** A trivia round that serves the entity: twelve questions about it, or a full round of its era. */
export function triviaHref(id: string, year: number | null): string | null {
  const own = [...questionsAbout(id)].sort()
  if (own.length >= ROUND_LENGTH) return `/trivia/general?q=${own.slice(0, ROUND_LENGTH).join('.')}`
  return eraTriviaHref(year)
}

/* ------------------------------------------------------------------ players */

let rosterIds: Set<string> | null = null
function inRoster(playerId: string): boolean {
  rosterIds ??= new Set(rosterIndex().all.map((entry) => entry.id).filter((id): id is string => Boolean(id)))
  return rosterIds.has(playerId)
}

let bankTargets: Set<string> | null = null
function inBlindCow(playerId: string): boolean {
  bankTargets ??= new Set(BANK.questions.filter((q) => q.eligibleModes.includes('solo')).map((q) => q.targetPlayerId))
  return bankTargets.has(playerId)
}

/* ------------------------------------------------------------------ seasons */

/** `1985/86` → [1985-08-01, 1986-08-01) — the football season as the archive's calendar reads it */
function seasonWindow(label: string): [string, string] | null {
  const m = /^(\d{4})(?:\/(\d{2}))?$/.exec(label)
  if (!m) return null
  const start = Number(m[1])
  if (!m[2]) return [`${start}-01-01`, `${start + 1}-01-01`]
  return [`${start}-08-01`, `${start + 1}-08-01`]
}

function kitHrefOf(seasonLabel: string): string | null {
  const kits = kitRecords().filter((kit) => kit.seasonLabel === seasonLabel)
  if (kits.length === 0) return null
  return kits.some((kit) => kit.gate4.playable) ? gateHref(4) : gateHref(5)
}

/* ------------------------------------------------------------------ the router */

function add(out: GateAction[], kind: GateActionKind, gate: number, href: string | null, label: string) {
  if (!href || out.some((a) => a.href === href)) return
  out.push({ kind, gate, href, label: k(label) })
}

export function actionsFor(anyId: string | null | undefined): EntityActions {
  const e = entity(anyId)
  if (!e) return { actions: [], lifeChapters: [] }
  const out: GateAction[] = []
  const football = e.sport === 'football'

  if (e.type === 'match') {
    add(out, 'lineup', 3, lineupHref(e.id), 'router.lineup')
    const goal = goalIdsOfMatch(e.id).find((id) => playableGoalHref(id))
    if (goal) add(out, 'goal', 8, goalHref(goal), 'router.goal')
    if (football) add(out, 'trivia', 2, triviaHref(e.id, e.year), 'router.trivia')
    const day = matchById(e.id)?.playedOn
    if (football && day?.precision === 'day' && day.value && timelineHasDate(day.value)) add(out, 'timeline', 13, '/timeline/order', 'router.timeline')
  } else if (e.type === 'person' && playerById(e.id)) {
    const player = playerById(e.id)!
    if (inBlindCow(e.id)) add(out, 'blind-cow', 10, gateHref(10), 'router.blindCow')
    if (inRoster(e.id)) add(out, 'xi', 1, gateHref(1), 'router.xi')
    if (priceForPlayer(player.slug)) add(out, 'rumble', 9, gateHref(9), 'router.rumble')
    add(out, 'trivia', 2, triviaHref(e.id, player.years?.from ?? null), 'router.trivia')
  } else if (e.type === 'season' && football && e.seasonLabel) {
    add(out, 'kit', gateOfKit(e.seasonLabel), kitHrefOf(e.seasonLabel), 'router.kit')
    const window = seasonWindow(e.seasonLabel)
    if (window && timelineHasDateIn(window[0], window[1])) add(out, 'timeline', 13, '/timeline/order', 'router.timeline')
    add(out, 'trivia', 2, triviaHref(e.id, e.year), 'router.trivia')
  }

  return { actions: out, lifeChapters: chaptersOfEntity(e.id) }
}

function gateOfKit(seasonLabel: string): number {
  return kitRecords().some((kit) => kit.seasonLabel === seasonLabel && kit.gate4.playable) ? 4 : 5
}
