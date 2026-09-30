import 'server-only'

import trophiesFile from '@/content/manual/trophies.json'
import { allMatches } from '@/lib/archive/match-master'
import type { MatchRecord } from '@/lib/archive/match-master-types'
import { longDateHe } from '@/lib/archive/wing'
import { CONFIDENCE_FLOOR, DERBY_RIVAL, nameOf } from '@/lib/game/archive'

import { debateRound, type Debate, type DebateOption, type DebateOptionSource, type DebateView } from './debates'

/**
 * The options of a list debate, read from the masters — never typed (ONE RED WORLD §16).
 *
 * "איזה גמר נשאר אצלך?" is an opinion; the list it is answered from is a set of facts, and
 * facts in this project come from the archive or not at all (rule 11). So every option is a
 * row the Match Master or `trophies.json` already holds, at the trivia floor
 * (`confidence ≥ 2`, rule 2), with a day-precise date and no open claim or conflict behind
 * it — a match two readings disagree about is not offered as something to vote for.
 *
 * The option id is the master's own (`m_…` for a match, `season:<label>` for a title), so
 * a corrected label never moves a vote, and the label printed is the archive's spelling of
 * the opponent and the competition. No score is printed: a final that went to penalties or a
 * replay reads wrong as a bare scoreline, and the question is about the evening, not the
 * result.
 */

const EUROPE = new Set(['גביע-אופא', 'הליגה-האירופית', 'ליגת-האלופות', 'קונפרנס-ליג'])
const CUP_FINALS = new Set(['גביע-המדינה', 'גביע-ארץ-ישראל'])

type Trophy = { competitionSlug: string; seasonLabel: string; clubSlug: string; result: string; sport: string; confidence: number }
const trophies = (trophiesFile as { records: Trophy[] }).records

/** the floor every option stands on: football, dated to the day, sourced, undisputed */
function clean(match: MatchRecord): boolean {
  return (
    match.sport === 'football' &&
    match.playedOn.precision === 'day' &&
    match.playedOn.value !== null &&
    match.confidence >= CONFIDENCE_FLOOR &&
    match.claims.length === 0 &&
    match.conflictRefs.length === 0 &&
    match.opponent !== null &&
    match.result !== null &&
    !match.notPlayed
  )
}

function won(match: MatchRecord): boolean {
  return match.result !== null && match.result.hapoel > match.result.opponent
}

function matchOption(match: MatchRecord): DebateOption {
  return {
    id: match.matchId,
    labelHe: nameOf.club(match.opponent as string),
    subHe: `${nameOf.competition(match.competition)} · ${longDateHe(match.playedOn.value as string)}`,
  }
}

function newestFirst(a: MatchRecord, b: MatchRecord): number {
  return (b.playedOn.value as string).localeCompare(a.playedOn.value as string)
}

function titleOptions(competition: string): DebateOption[] {
  return trophies
    .filter((row) => row.sport === 'football' && row.result === 'won' && row.competitionSlug === competition && row.confidence >= CONFIDENCE_FLOOR)
    .sort((a, b) => b.seasonLabel.localeCompare(a.seasonLabel))
    .map((row) => ({ id: `season:${row.seasonLabel}`, labelHe: row.seasonLabel, subHe: nameOf.competition(row.competitionSlug) }))
}

const cache = new Map<DebateOptionSource, DebateOption[]>()

/** every option a source offers, built once per server */
export function debateOptions(source: DebateOptionSource): DebateOption[] {
  const hit = cache.get(source)
  if (hit) return hit
  const matches = () => allMatches().filter(clean)
  let out: DebateOption[]
  switch (source) {
    case 'cup-finals':
      out = matches().filter((m) => m.stage === 'גמר' && CUP_FINALS.has(m.competition)).sort(newestFirst).map(matchOption)
      break
    case 'europe-wins':
      out = matches().filter((m) => EUROPE.has(m.competition) && won(m)).sort(newestFirst).map(matchOption)
      break
    case 'derby-wins':
      // a derby means Maccabi Tel Aviv and nothing else (rule 13) — the flag, not a name
      out = DERBY_RIVAL === null ? [] : matches().filter((m) => m.opponent === DERBY_RIVAL && won(m)).sort(newestFirst).map(matchOption)
      break
    case 'league-titles':
      out = titleOptions('ליגת-העל')
      break
    case 'state-cups':
      out = titleOptions('גביע-המדינה')
      break
  }
  cache.set(source, out)
  return out
}

function view(debate: Debate): DebateView {
  return { ...debate, choices: debate.options ? debateOptions(debate.options) : null }
}

/** the round the route plays: the prompts `(seed, cursor)` deal, each with its options */
export function debateRoundView(seed: number, cursor: number): { debates: DebateView[]; slot: number; slices: number } {
  const round = debateRound(seed, cursor)
  return { debates: round.debates.map(view), slot: round.slot, slices: round.slices }
}
