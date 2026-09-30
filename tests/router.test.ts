import { describe, expect, it } from 'vitest'

import { entity, graph } from '@/lib/archive/graph'
import { matchById } from '@/lib/archive/match-master'
import { allPlayers } from '@/lib/archive/player-master'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { BANK } from '@/lib/game/blind-cow/bank'
import { pinnedGoal } from '@/lib/game/goal'
import { lineupYears } from '@/lib/game/lineup'
import { questionById } from '@/lib/game/question-master'
import { priceForPlayer } from '@/lib/game/royal-rumble'
import { timelineHasDate, timelineHasDateIn } from '@/lib/game/timeline'
import { ROUND_LENGTH, eligible } from '@/lib/game/trivia'
import { kitRecords } from '@/lib/kit/kit-master'
import { actionsFor, type GateAction } from '@/lib/links/actions'

/**
 * CROSS GATE ROUTER (ONE RED WORLD §21) — an action exists only if its gate can serve the
 * entity. Every href the router hands out is resolved back through the gate that receives it.
 */

const roster = new Set(rosterIndex().all.map((row) => row.id))
const lineups = new Set(lineupYears().map((row) => row.id))
const eraDepth = new Map<number, number>()
const depth = (decade: number) => {
  if (!eraDepth.has(decade)) eraDepth.set(decade, eligible({ topic: null, decade, hard: false }).length)
  return eraDepth.get(decade) as number
}

function serves(action: GateAction, id: string): boolean {
  const url = new URL(action.href, 'https://x.test')
  const e = entity(id)!
  switch (action.kind) {
    case 'lineup':
      return url.pathname === '/lineup' && lineups.has(id)
    case 'goal':
      return url.pathname === '/goal' && pinnedGoal(url.searchParams.get('g')) !== null
    case 'trivia': {
      if (url.pathname !== '/trivia/general') return false
      const q = url.searchParams.get('q')
      if (q) return q.split('.').length === ROUND_LENGTH && q.split('.').every((qid) => questionById(qid))
      const era = Number(url.searchParams.get('era'))
      return depth(era) >= ROUND_LENGTH
    }
    case 'timeline': {
      if (url.pathname !== '/timeline/order') return false
      if (e.type === 'match') return timelineHasDate(matchById(id)?.playedOn.value ?? '')
      const start = Number(e.seasonLabel?.slice(0, 4))
      return timelineHasDateIn(`${start}-08-01`, `${start + 1}-08-01`) || timelineHasDateIn(`${start}-01-01`, `${start + 1}-01-01`)
    }
    case 'blind-cow':
      return url.pathname === '/blind-cow' && BANK.questions.some((q) => q.targetPlayerId === id && q.eligibleModes.includes('solo'))
    case 'xi':
      return url.pathname === '/xi' && roster.has(id)
    case 'rumble': {
      const player = allPlayers().find((p) => p.id === id)
      return url.pathname === '/royal-rumble' && Boolean(player && priceForPlayer(player.slug))
    }
    case 'kit': {
      const kits = kitRecords().filter((kit) => kit.seasonLabel === e.seasonLabel)
      if (url.pathname === '/kits/build') return kits.some((kit) => kit.gate4.playable)
      return url.pathname === '/kits' && kits.length > 0
    }
    default:
      return false
  }
}

const matches = graph.entities.filter((e) => e.type === 'match').slice(0, 400)
const people = graph.entities.filter((e) => e.type === 'person').slice(0, 200)
const seasons = graph.entities.filter((e) => e.type === 'season')

describe('every action lands in a gate that can serve the entity', () => {
  it('matches: lineup · goal · trivia · timeline', () => {
    const kinds = new Set<string>()
    for (const e of matches) {
      for (const action of actionsFor(e.id).actions) {
        expect(['lineup', 'goal', 'trivia', 'timeline']).toContain(action.kind)
        expect(serves(action, e.id), `${e.id} ${action.href}`).toBe(true)
        kinds.add(action.kind)
      }
    }
    expect(kinds.has('trivia')).toBe(true)
    expect(kinds.has('timeline')).toBe(true)
  })

  it('a verified XI gets gate 3, a sourced goal gets gate 8', () => {
    const lineup = [...lineups].map((id) => ({ id })).find((row) => entity(row.id))
    expect(lineup).toBeTruthy()
    expect(actionsFor(lineup!.id).actions.some((a) => a.kind === 'lineup')).toBe(true)
    const goalMatch = graph.entities.find((e) => e.type === 'match' && actionsFor(e.id).actions.some((a) => a.kind === 'goal'))
    expect(goalMatch).toBeTruthy()
  })

  it('players: blind-cow · xi · rumble · trivia', () => {
    const kinds = new Set<string>()
    for (const e of people) {
      for (const action of actionsFor(e.id).actions) {
        expect(['blind-cow', 'xi', 'rumble', 'trivia']).toContain(action.kind)
        expect(serves(action, e.id), `${e.id} ${action.href}`).toBe(true)
        kinds.add(action.kind)
      }
    }
    for (const kind of ['blind-cow', 'xi', 'rumble']) expect(kinds.has(kind), kind).toBe(true)
  })

  it('seasons: kit · timeline · trivia', () => {
    const kinds = new Set<string>()
    for (const e of seasons) {
      for (const action of actionsFor(e.id).actions) {
        expect(['kit', 'timeline', 'trivia']).toContain(action.kind)
        expect(serves(action, e.id), `${e.id} ${action.href}`).toBe(true)
        kinds.add(action.kind)
      }
    }
    expect(kinds.has('kit')).toBe(true)
  })

  it('an unknown id has no actions and no LIFE', () => {
    expect(actionsFor('m_000000000000')).toEqual({ actions: [], lifeChapters: [] })
    expect(actionsFor(null)).toEqual({ actions: [], lifeChapters: [] })
  })

  it('LIFE is a chapter id, never a link — the device decides', () => {
    const landau = graph.entities.find((e) => e.type === 'match' && actionsFor(e.id).lifeChapters.includes('1986'))
    expect(landau).toBeTruthy()
    for (const action of actionsFor(landau!.id).actions) expect(action.href.startsWith('/life')).toBe(false)
  })
})
