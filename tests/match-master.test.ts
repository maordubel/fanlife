import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  allMatches,
  allMoments,
  isDisputed,
  matchById,
  matchMaster,
  momentForGoal,
  momentsOfMatch,
  relationsOf,
  resolveMatch,
  resolveMatchId,
  usableMoments,
} from '@/lib/archive/match-master'
import { playerById } from '@/lib/archive/player-master'
import { isCanonicalMatchId, type MatchIdEntry } from '@/lib/canon/matchId'
import {
  MATCH_MASTER_INPUTS,
  buildMatchMaster,
  matchInputsSha,
  serialiseMatchMaster,
} from '@/scripts/archive/build-match-master'

/**
 * The Match / Moment Master (21.9.2026). One id per match, every key resolving to it,
 * every goal joined or explained, and every disagreement with the archive a recorded
 * conflict — or the build fails.
 */

const ROOT = join(__dirname, '..')
const read = (file: string) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
const registry = (read('content/manual/match-ids.json') as { records: MatchIdEntry[] }).records
const conflicts = read('content/manual/fact-conflicts.json').records as Record<string, any>[]
const conflictKeys = new Set(conflicts.map((row) => [row.entityTable, row.entityKey ?? '', row.field].join('|')))

describe('matches — ids and keys', () => {
  it('holds one record per registry id, and nothing the registry did not mint', () => {
    const ids = allMatches().map((m) => m.matchId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBe(registry.length)
    const minted = new Set<string>(registry.map((entry) => entry.id))
    for (const id of ids) {
      expect(isCanonicalMatchId(id), id).toBe(true)
      expect(minted.has(id), id).toBe(true)
    }
  })

  it('resolves every alias to its own match and no alias to two', () => {
    const owner = new Map<string, string>()
    for (const match of allMatches()) {
      for (const alias of match.aliases) {
        expect(owner.get(alias) ?? match.matchId, alias).toBe(match.matchId)
        owner.set(alias, match.matchId)
        expect(resolveMatchId(alias), alias).toBe(match.matchId)
      }
    }
    // the dialects a reader will actually hold
    expect(resolveMatch('2001-02-uefa-qf-milan')?.opponent).toBe('מילאן')
    expect(resolveMatch('2001/02|גביע-אופא|הפועל-תל-אביב|מילאן|רבע גמר משחק 1')?.matchId).toBe(
      resolveMatchId('2001-02-uefa-qf-milan'),
    )
  })

  it('keeps sport partitions apart (rule 6)', () => {
    for (const match of allMatches()) {
      for (const alias of match.aliases) {
        if (alias.startsWith('football|') || alias.startsWith('basketball|')) expect(alias.startsWith(`${match.sport}|`)).toBe(true)
      }
    }
  })

  it('files the Salzburg legs as one match each — decided for UEFA, both readings kept in `decided`', () => {
    const leg1 = resolveMatch('2010-11-ucl-po-salzburg-1')!
    const leg2 = resolveMatch('2010-11-ucl-po-salzburg-2')!
    // delta 89: UEFA match 2002389 — 18.8.2010 in Salzburg; 2002390 — 24.8.2010 at Bloomfield
    expect(leg1.playedOn).toEqual({ value: '2010-08-18', precision: 'day' })
    expect(leg1.decided?.find((d) => d.field === 'playedOn')?.overruled.map((v) => v.value).sort()).toEqual(['2010-08-17', '2010-08-18'])
    expect(leg1.home).toBe('זלצבורג')
    expect(leg1.hapoelSide).toBe('away')
    expect(leg1.score).toEqual({ home: 2, away: 3 })
    expect(leg1.decided?.some((d) => d.field === 'home')).toBe(true)
    expect(leg1.result).toEqual({ hapoel: 3, opponent: 2 })
    expect(isDisputed(leg1, 'playedOn')).toBe(false)
    expect(isDisputed(leg1, 'result')).toBe(false)
    expect(leg2.playedOn.value).toBe('2010-08-24')
    expect(leg2.decided?.find((d) => d.field === 'playedOn')?.overruled.map((v) => v.value).sort()).toEqual(['2010-08-24', '2010-08-25'])
    expect(leg2.result).toEqual({ hapoel: 1, opponent: 1 })
    for (const leg of [leg1, leg2]) {
      expect(leg.mergeNote).toMatch(/Maor, 21\.9\.2026/)
      expect(leg.conflictRefs).toEqual([])
      expect(leg.claims).toEqual([])
    }
  })
})

describe('moments — every goal joined or explained', () => {
  it('gives every goal a match id, or a listed reason', () => {
    const goals = read('content/manual/goals.json').records as { goalId: string }[]
    for (const goal of goals) {
      const moment = momentForGoal(goal.goalId)
      expect(moment, goal.goalId).not.toBeNull()
      if (moment!.matchId === null) {
        expect(moment!.matchUnresolved).not.toBeNull()
        expect(matchMaster.unresolved.some((u) => u.kind === 'moment-match' && u.momentId === moment!.momentId)).toBe(true)
      } else {
        expect(matchById(moment!.matchId)?.momentIds).toContain(moment!.momentId)
      }
    }
    expect(allMoments().filter((m) => m.kind === 'goal').every((m) => m.matchId !== null)).toBe(true)
  })

  it('points every actor, scorer and relation id at a person who exists', () => {
    for (const moment of allMoments()) {
      if (moment.scorer?.playerId) expect(playerById(moment.scorer.playerId), moment.momentId).not.toBeNull()
      for (const touch of moment.move?.touches ?? []) {
        if (touch.actor.playerId) expect(playerById(touch.actor.playerId), `${moment.momentId}#${touch.step}`).not.toBeNull()
        if (touch.actor.kind !== 'player') expect(touch.actor.playerId).toBeNull()
      }
    }
    for (const match of allMatches()) {
      for (const s of match.scorers) if (s.playerId) expect(playerById(s.playerId)).not.toBeNull()
      for (const e of match.events) {
        if (e.playerId) expect(playerById(e.playerId)).not.toBeNull()
        if (e.relatedPlayerId) expect(playerById(e.relatedPlayerId)).not.toBeNull()
      }
    }
    for (const relation of matchMaster.relations) {
      for (const end of [relation.from, relation.to]) {
        if (end.startsWith('p_')) expect(playerById(end), end).not.toBeNull()
        if (end.startsWith('m_')) expect(matchById(end), end).not.toBeNull()
      }
      expect(relation.sourceIds.every((id) => matchMaster.sources[id]), relation.type).toBe(true)
    }
  })

  it('never names a non-player actor as a person, and reports every surname it will not resolve', () => {
    const ball = momentForGoal('benfica-2010-zahavi-90-2')!.move!.touches.find((t) => t.actor.nameHe === 'הכדור')!
    expect(ball.actor.kind).toBe('unnamed')
    const altman = momentForGoal('derby-2026-altman-90-2')!
    expect(altman.scorer?.resolution).toBe('unresolved')
    const reported = matchMaster.unresolved.filter((u) => u.kind === 'actor')
    for (const moment of allMoments()) {
      for (const touch of moment.move?.touches ?? []) {
        if (touch.actor.resolution !== 'unresolved') continue
        expect(reported.some((u) => u.kind === 'actor' && u.momentId === moment.momentId && u.step === touch.step)).toBe(true)
      }
    }
  })
})

describe('the cross-check against matches.json — no unlisted disagreement', () => {
  it('names a fact-conflicts row for every disagreement it finds', () => {
    expect(matchMaster.crossChecks.length).toBeGreaterThan(50)
    for (const check of matchMaster.crossChecks) {
      if (check.status === 'agree') continue
      expect(check.conflictRef, `${check.momentId} ${check.field}`).not.toBeNull()
      expect(conflictKeys.has(check.conflictRef!), check.conflictRef!).toBe(true)
    }
  })

  it('records the conflicts the replay spec found, open and unresolved', () => {
    const expected = [
      'match|2010-05-11 הפועל-תל-אביב — בני-יהודה|opponent_club',
      'match|2012-05-15 הפועל-תל-אביב — מכבי-חיפה|opponent_club',
      'match|2026-01-26 מכבי-תל-אביב — הפועל-תל-אביב|played_on',
      'goal|chelsea-2001-gershon-88|minute',
      'goal|cupfinal-2010-vermouth-73|minute',
      'goal|milan-2002-kleschenko-31|minute',
    ]
    for (const key of expected) {
      expect(conflictKeys.has(key), key).toBe(true)
      const row = conflicts.find((r) => [r.entityTable, r.entityKey ?? '', r.field].join('|') === key)!
      expect(row.resolution ?? null, key).toBeNull()
      expect(row.resolvedBy ?? null, key).toBeNull()
    }
    // the two Salzburg rows were decided in delta 89 (UEFA) — resolved by a named decider, with decisions
    for (const key of [
      'match|2010/11 ליגת-האלופות · פלייאוף משחק 1 · הפועל-תל-אביב — זלצבורג|played_on_and_home_away',
      'match|2010/11 ליגת-האלופות · פלייאוף משחק 2 · הפועל-תל-אביב — זלצבורג|played_on',
    ]) {
      const row = conflicts.find((r) => [r.entityTable, r.entityKey ?? '', r.field].join('|') === key)!
      expect(String(row.resolution), key).toMatch(/^הוכרע/)
      expect(String(row.resolvedBy), key).toMatch(/דלתא 89/)
      expect((row.decisions as unknown[]).length, key).toBeGreaterThan(0)
    }
    // the ingest dedupes on this key — it must stay unique
    expect(conflictKeys.size).toBe(conflicts.length)
  })

  it('turns the conflicted goals off for the surfaces that would use the disputed field', () => {
    for (const goalId of ['cupfinal-2010-vermouth-25', 'cupfinal-2010-vermouth-73', 'cupfinal-2012-igiebor-90-2']) {
      const moment = momentForGoal(goalId)!
      expect(moment.usable.replay, goalId).toBe(false)
      expect(moment.usable.trivia, goalId).toBe(false)
      expect(moment.usable.archive, goalId).toBe(true)
    }
    // salzburg-2010-bensahar-44 left this list in delta 89: its match's day and home side were decided (UEFA)
    expect(momentForGoal('salzburg-2010-bensahar-44')!.usable.replay).toBe(true)
    for (const goalId of ['chelsea-2001-gershon-88', 'milan-2002-kleschenko-31', 'derby-2026-altman-90-2']) {
      const moment = momentForGoal(goalId)!
      expect(moment.usable.trivia, goalId).toBe(false)
      expect(moment.usable.replay, goalId).toBe(true)
    }
    for (const moment of usableMoments('trivia')) expect(moment.conflictRefs, moment.momentId).toEqual([])
    for (const moment of allMoments()) {
      expect(moment.usable.replay).toBe(moment.usableWhy.replay.length === 0)
      expect(moment.usable.trivia).toBe(moment.usableWhy.trivia.length === 0)
    }
    // …and enough of the deck survives to deal a run
    expect(usableMoments('replay').filter((m) => m.kind === 'goal').length).toBeGreaterThanOrEqual(15)
  })

  it('links the 2026 derby across the one-day disagreement — and says so', () => {
    const moment = momentForGoal('derby-2026-altman-90-2')!
    expect(moment.matchLink).toBe('date±1')
    const match = matchById(moment.matchId)!
    expect(match.opponent).toBe('מכבי-תל-אביב')
    expect(match.result).toEqual({ hapoel: 2, opponent: 1 })
    expect(momentsOfMatch(match.matchId).map((m) => m.momentId)).toContain(moment.momentId)
  })
})

describe('graph and research', () => {
  it('relates goals, matches, seasons and people with a source on every edge', () => {
    const milan = resolveMatch('2001-02-uefa-qf-milan')!
    const edges = relationsOf(milan.matchId)
    expect(edges.some((e) => e.type === 'happened_in')).toBe(true)
    expect(edges.some((e) => e.type === 'started_in')).toBe(true)
    expect(edges.some((e) => e.type === 'scored')).toBe(true)
    expect(edges.some((e) => e.type === 'assisted')).toBe(true)
  })

  it('queues only real, dated-by-season Hapoel goals since 2000 that no move covers yet', () => {
    const covered = new Set(
      allMoments().filter((m) => m.kind === 'goal').map((m) => `${m.matchId}|${m.scorer?.playerId}|${(m.minute ?? 0) + (m.stoppage ?? 0)}`),
    )
    expect(matchMaster.researchQueue.length).toBeGreaterThan(100)
    for (const item of matchMaster.researchQueue) {
      const match = matchById(item.matchId)!
      expect(match.season >= '2000/01').toBe(true)
      expect(match.clubs).toContain('הפועל-תל-אביב')
      expect(covered.has(`${item.matchId}|${item.scorer.playerId}|${item.minute + (item.stoppage ?? 0)}`)).toBe(false)
    }
  })
})

describe('freshness', () => {
  it('was built from the inputs on disk (npm run matches:master)', () => {
    expect(matchMaster.inputs).toEqual([...MATCH_MASTER_INPUTS])
    expect(matchMaster.inputsSha, 'stale — run `npm run matches:master`').toBe(matchInputsSha(ROOT))
  })

  it('rebuilds byte for byte, with no problem', () => {
    const { out, problems } = buildMatchMaster(ROOT)
    expect(problems).toEqual([])
    expect(
      serialiseMatchMaster(out) === readFileSync(join(ROOT, 'content/generated/match-master.json'), 'utf8'),
      'the builder and the committed master disagree — run `npm run matches:master`',
    ).toBe(true)
  })
})

describe('the ויקיפועל season schedules (delta 89) — the seasons the archive could not label', () => {
  const schedules = read('content/manual/matches-vikipoel-2026-09-25.json') as {
    records: { seasonLabel: string; sourceSeasonLabel: string; playedOn: string; sourceUrl: string; confidence: number; homeClubSlug: string; awayClubSlug: string }[]
    counts: Record<string, number>
  }
  const master = read('content/generated/match-master.json') as { matches: { season: string; sourceIds: string[] }[] }

  it('is what a fresh run of ingest:vikipoel-schedules writes', async () => {
    const { buildSchedules } = await import('@/scripts/ingest/vikipoel-schedules')
    expect(JSON.stringify(buildSchedules())).toBe(JSON.stringify(schedules))
  })

  it('labels 1955 as 1954/55 and splits 1966-68 at 1.8.1967, keeping the wiki label on every row', () => {
    for (const row of schedules.records) {
      expect(row.sourceUrl).toMatch(/^https:\/\/wiki\.red-fans\.com\//)
      expect(['1955', '1966-68']).toContain(row.sourceSeasonLabel)
      if (row.sourceSeasonLabel === '1955') expect(row.seasonLabel).toBe('1954/55')
      else expect(row.seasonLabel).toBe(row.playedOn < '1967-08-01' ? '1966/67' : '1967/68')
      expect([row.homeClubSlug, row.awayClubSlug]).toContain('הפועל-תל-אביב')
    }
    expect(schedules.records.length).toBe(schedules.counts.newMatches)
  })

  it('reaches the master: every row a match with an id, 1954/55 no longer empty', () => {
    expect(master.matches.filter((m) => m.season === '1954/55').length).toBe(28)
    expect(master.matches.filter((m) => m.season === '1966/67').length).toBeGreaterThanOrEqual(25)
  })
})
