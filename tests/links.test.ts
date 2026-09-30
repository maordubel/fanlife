import { describe, expect, it } from 'vitest'

import { entity } from '@/lib/archive/graph'
import { awayDaysMaster } from '@/lib/away-days/data'
import { BANK } from '@/lib/game/blind-cow/bank'
import { openClues } from '@/lib/game/blind-cow/bank'
import { goalYears, pinnedGoal } from '@/lib/game/goal'
import {
  archiveHref,
  awayHref,
  blindCowLinks,
  goalIdsOfMatch,
  goalLinks,
  linksForMatch,
  linksForPlayer,
  matchOfClue,
  matchOfGoal,
  venueHref,
} from '@/lib/links'
import type { CrossLink } from '@/lib/links/types'

/**
 * קישורים בין שערים (delta 89) — every chip must open on something that exists.
 * The test resolves each href back through the gate that would receive it.
 */

function landsOn(link: CrossLink): boolean {
  const url = new URL(link.href, 'https://x.test')
  if (url.pathname === '/archive') return entity(url.searchParams.get('at')) !== null
  if (url.pathname === '/away-days') {
    const visit = url.searchParams.get('visit')
    const venue = url.searchParams.get('venue')
    if (visit) return awayDaysMaster.visits.some((v) => v.matchId === visit)
    if (venue) return awayDaysMaster.venues.some((v) => v.id === venue)
    return false
  }
  if (url.pathname === '/goal') return pinnedGoal(url.searchParams.get('g')) !== null
  return false
}

describe('single doors — only when the target exists', () => {
  it('archive: resolves graph ids and refuses unknown ones', () => {
    const visit = awayDaysMaster.visits[0]!
    expect(archiveHref(visit.matchId)).toBe(`/archive?at=${visit.matchId}`)
    expect(archiveHref('m_000000000000')).toBeNull()
    expect(archiveHref(null)).toBeNull()
  })

  it('away: only a published visit', () => {
    for (const visit of awayDaysMaster.visits) expect(awayHref(visit.matchId)).toBe(`/away-days?visit=${visit.matchId}`)
    // a research-queue match (CONFLICT/BLOCKED) is not a stop
    const held = awayDaysMaster.researchQueue.find((row) => !awayDaysMaster.visits.some((v) => v.matchId === row.matchId))
    if (held) expect(awayHref(held.matchId)).toBeNull()
    expect(venueHref(awayDaysMaster.venues[0]!.id)).toContain('/away-days?venue=')
    expect(venueHref('nowhere')).toBeNull()
  })

  it('gate 8: every playable goal with a linked match is found from its match', () => {
    let linked = 0
    for (const { id } of goalYears()) {
      const match = matchOfGoal(id)
      if (!match) continue
      linked += 1
      expect(goalIdsOfMatch(match)).toContain(id)
    }
    expect(linked).toBeGreaterThan(10)
  })
})

describe('sets — every chip lands', () => {
  it('a European night: archive + goal replay, and the stop from anywhere but AWAY DAYS', () => {
    // Benfica 24.11.2010 — two gate-8 goals, a published stop? (Bloomfield: no — it was home)
    for (const { id } of goalYears()) {
      const match = matchOfGoal(id)
      if (!match) continue
      const links = linksForMatch(match)
      expect(links.length).toBeGreaterThan(0)
      for (const link of links) expect(landsOn(link), link.href).toBe(true)
      expect(links.some((l) => l.kind === 'goal')).toBe(true)
    }
  })

  it('AWAY DAYS asks without itself, and gets scorers only where it prints them', () => {
    for (const visit of awayDaysMaster.visits) {
      const links = linksForMatch(visit.matchId, { omit: ['away'], scorers: true })
      expect(links.every((l) => l.kind !== 'away')).toBe(true)
      for (const link of links) expect(landsOn(link), link.href).toBe(true)
      if (!visit.scorers) expect(links.filter((l) => l.target.startsWith('p_'))).toEqual([])
    }
  })

  it('a player: his card and the goals he scored', () => {
    const scorer = goalYears()
      .map(({ id }) => goalLinks(id))
      .flat()
      .find((l) => l.target.startsWith('p_'))
    expect(scorer).toBeTruthy()
    const links = linksForPlayer(scorer!.target)
    expect(links[0]?.kind).toBe('archive')
    for (const link of links) expect(landsOn(link), link.href).toBe(true)
  })

  it('gate 8 result: match card first, every chip lands', () => {
    for (const { id } of goalYears()) {
      const links = goalLinks(id)
      for (const link of links) expect(landsOn(link), link.href).toBe(true)
      if (matchOfGoal(id)) expect(links[0]?.kind).toBe('archive')
    }
  })
})

describe('gate 10 — the clues point at their matches', () => {
  it('a clue on six matches points at none; a clue on one points at it', () => {
    let single = 0
    for (const q of BANK.questions.slice(0, 400)) {
      for (const clue of openClues(q, q.clueIds.length)) {
        const match = matchOfClue(q.targetPlayerId, clue)
        if (!match) continue
        single += 1
        expect(entity(match)?.type).toBe('match')
      }
    }
    expect(single).toBeGreaterThan(0)
  })

  it('the result links start with his card and all land; at most five', () => {
    for (const q of BANK.questions.slice(0, 200)) {
      const links = blindCowLinks(q.targetPlayerId, openClues(q, q.clueIds.length))
      expect(links.length).toBeLessThanOrEqual(5)
      expect(links[0]?.href).toBe(`/archive?at=${q.targetPlayerId}`)
      for (const link of links) expect(landsOn(link), link.href).toBe(true)
    }
  })

  it('an abroad match clue opens its AWAY DAYS stop, not the archive', () => {
    let found = 0
    for (const q of BANK.questions) {
      for (const clue of openClues(q, q.clueIds.length)) {
        const match = matchOfClue(q.targetPlayerId, clue)
        if (!match || !awayHref(match)) continue
        const links = blindCowLinks(q.targetPlayerId, [clue])
        expect(links.some((l) => l.kind === 'away' && l.target === match)).toBe(true)
        found += 1
      }
    }
    expect(found).toBeGreaterThan(0)
  })
})
