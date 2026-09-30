import 'server-only'

import { archive, nameOf, rng, shuffle } from './archive'
import { currentSeasonStartYear, seasonsInSpell, spellCoversSeason } from './seasons'

/**
 * אתגר החולצה — rebuild a season's kit from the component bank.
 *
 * Follows the HistoricalKitChallenge schema: a target season, a bank of allowed
 * choices, and grading against the real kit. It asks only what the archive can
 * actually verify — manufacturer and sponsor — because a colour or a collar we never
 * sourced would be a guess dressed as a question.
 *
 * The competition matters: 2010/11 carried Keter in the Champions League and Bonei
 * HaTichon in the league, so a challenge is a (season, competition) pair, not a season.
 */

export type KitChallenge = {
  challengeId: string
  season: string
  /** null when the sponsor applied to every competition that season */
  competition: string | null
  makers: string[]
  sponsors: string[]
  sourceTitle: string
  sourceUrl: string | null
}

type Target = {
  challengeId: string
  season: string
  competition: string | null
  maker: string
  sponsor: string
  noteHe: string | null
  sourceTitle: string
  sourceUrl: string | null
}

/** Every (season, competition) pair where BOTH the maker and a sponsor are verified. */
function targets(): Target[] {
  const openThrough = currentSeasonStartYear()
  const out: Target[] = []

  // A supply spell covers many seasons; a sponsor deal covers its own range. The pair
  // worth asking about is the INTERSECTION, so 2010/11 — mid-way through the Umbro
  // spell — yields two questions, one per competition.
  for (const supply of archive.kitSupply) {
    for (const season of seasonsInSpell(supply, openThrough)) {
      for (const deal of archive.sponsorDeals) {
        if (!spellCoversSeason(deal, season)) continue
        const competition = deal.competitionSlug ? nameOf.competition(deal.competitionSlug) : null
        out.push({
          challengeId: `${season}:${deal.competitionSlug ?? 'all'}`,
          season,
          competition,
          maker: nameOf.manufacturer(supply.manufacturerSlug),
          sponsor: nameOf.sponsor(deal.sponsorSlug),
          noteHe: deal.noteHe ?? null,
          sourceTitle: `${supply.sourceTitle} · ${deal.sourceTitle}`,
          sourceUrl: deal.sourceUrl ?? supply.sourceUrl,
        })
      }
    }
  }

  // A (season, competition) pair carrying two different sponsors is not a question —
  // it is a fact the archive holds honestly and the game must not ask about. 2019/20
  // is the real case: Arkia ended early and Hachshara came in mid-season, so both
  // deals cover it and both are true. Drop the pair rather than pick a winner.
  const bySponsor = new Map<string, Set<string>>()
  for (const target of out) {
    const seen = bySponsor.get(target.challengeId) ?? new Set<string>()
    seen.add(target.sponsor)
    bySponsor.set(target.challengeId, seen)
  }

  const unambiguous = out.filter((target) => (bySponsor.get(target.challengeId)?.size ?? 0) === 1)

  // One target per pair, in a stable order, so a seed always deals the same challenge.
  const unique = new Map<string, Target>()
  for (const target of unambiguous) {
    if (!unique.has(target.challengeId)) unique.set(target.challengeId, target)
  }

  return [...unique.values()].sort((a, b) => a.challengeId.localeCompare(b.challengeId))
}

function pickTarget(seed: number): Target | undefined {
  const all = targets()
  return all[Math.floor(rng(seed)() * all.length)]
}

export function dealKitChallenge(seed: number): KitChallenge | null {
  const target = pickTarget(seed)
  if (!target) return null
  const random = rng(seed * 5 + 3)

  return {
    challengeId: target.challengeId,
    season: target.season,
    competition: target.competition,
    makers: shuffle([...new Set(archive.manufacturers.map((row) => row.nameHe))], random),
    sponsors: shuffle([...new Set(archive.sponsors.map((row) => row.nameHe))], random),
    sourceTitle: target.sourceTitle,
    sourceUrl: target.sourceUrl,
  }
}

export type KitVerdict = {
  makerCorrect: boolean
  sponsorCorrect: boolean
  maker: string
  sponsor: string
  noteHe: string | null
  sourceTitle: string
  sourceUrl: string | null
}

/** Graded on the server. The right answer is never in the dealt payload. */
export function gradeKitChallenge(
  seed: number,
  answer: { maker: string | null; sponsor: string | null },
): KitVerdict | null {
  const target = pickTarget(seed)
  if (!target) return null
  return {
    makerCorrect: answer.maker === target.maker,
    sponsorCorrect: answer.sponsor === target.sponsor,
    maker: target.maker,
    sponsor: target.sponsor,
    noteHe: target.noteHe,
    sourceTitle: target.sourceTitle,
    sourceUrl: target.sourceUrl,
  }
}

export function kitChallengeCount(): number {
  return targets().length
}
