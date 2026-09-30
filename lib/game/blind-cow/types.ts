import type { ShirtLook } from '@/lib/kit/playerShirt'
import type { CrossLink } from '@/lib/links/types'
import type { NextAction, ResultContext } from '@/lib/results/types'

/**
 * פרה עיוורת — the data contracts of gate 10 (spec GATE10-BLINDCOW-AWAYDAYS §5.1).
 *
 * The bank (`content/generated/blind-cow-bank.json`) is a CONSUMER of the two canonical
 * masters: every clue is derived from Player Master / Match Master rows by
 * `scripts/blind-cow/build-bank.ts`, carries the rows it came from (`sourceRefs`), and no
 * clue is written by hand in a component. Types only — safe to import anywhere; the bank
 * itself is read by `lib/game/blind-cow/bank.ts`, which is server-only.
 */

export type ClueType =
  | 'nationality'
  | 'origin'
  | 'birth_year'
  | 'position'
  | 'era'
  | 'season_range'
  | 'shirt_number'
  | 'achievement'
  | 'match'
  | 'lineup'
  | 'goal'
  | 'moment'
  | 'stat'
  | 'song'
  | 'club'

/** A — identity · B — career at the club · C — achievements · D — match · E — goal/moment · F — stat · G — the terrace (his song's tune) */
export type ClueFamily = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export type BlindCowClue = {
  id: string
  type: ClueType
  family: ClueFamily
  /** the small caps line over the clue ("לאום", "עונת בכורה") */
  labelHe: string
  /** the clue itself — never the man's name */
  valueHe: string
  /** the fact this clue states, as a stable key (`debut:1977/78`) */
  factKey: string
  /**
   * Which clues say "the same thing" — two clues of one facet are never shown back to
   * back (`era` then `debut`, spec §5.3 "מניעת כפילות").
   */
  facet: string
  /** where the fact came from: `player-master:<id>#spells`, `match-master:<matchId>#scorers` */
  sourceRefs: string[]
  confidence: number
  difficulty: 1 | 2 | 3 | 4 | 5
  /** 0 = everybody shares it, 1 = only he does (1 − matching / pool) */
  exclusivity: number
}

export type BlindCowMode = 'solo' | 'daily' | 'duel' | 'hardcore'

export type QuestionTags = {
  origin: 'israeli' | 'foreign' | null
  /** decades he played in, `1980` … */
  decades: number[]
  /** 8+ seasons or 3+ titles — the lobby's "אגדות" */
  legend: boolean
}

/** how well the man is known (`recognition.ts`) — the PLAYER's difficulty, separate from any clue's */
export type QuestionRecognition = {
  tier: 'familiar' | 'known' | 'deep'
  score: number
  /** the wiki infobox figure, or null — never estimated */
  appearances: number | null
  basis: 'appearances+price' | 'price'
}

export type BlindCowQuestion = {
  id: string
  version: number
  targetPlayerId: string
  /** server/builder only — never sent before the run is finished */
  targetDisplayNameHe: string
  /** ordered broad → narrow; exactly 10 for the competitive modes */
  clueIds: string[]
  /** how many men of the pool still fit after each clue, same order (§5.3) */
  remaining: number[]
  families: ClueFamily[]
  eligibleModes: BlindCowMode[]
  tags: QuestionTags
  /** server-side only (filters, daily); never sent to a client before the run ends */
  recognition?: QuestionRecognition
  dataFingerprint: string
}

export type BlindCowBank = {
  schemaVersion: 1
  bankVersion: number
  builtFrom: { playerMasterSha: string; matchMasterSha: string }
  /** the rules the builder applied, printed so a reader of the file can check them */
  rules: {
    minConfidence: number
    competitiveClues: number
    competitiveFamilies: number
    soloMinClues: number
    pool: number
  }
  counts: {
    players: number
    withQuestion: number
    solo: number
    daily: number
    duel: number
    hardcore: number
    clues: number
    byType: Record<string, number>
    eligibleMatches: number
    eligibleGoals: number
  }
  clues: Record<string, BlindCowClue>
  questions: BlindCowQuestion[]
}

/* ------------------------------------------------------------------ runtime */

export type RunStatus = 'playing' | 'solved' | 'gave_up' | 'timeout'

/** One clue as the CLIENT sees it: already opened, so it is no secret any more. */
export type OpenClue = { n: number; labelHe: string; valueHe: string; type: ClueType }

/** Everything the screen may know about a run while it is being played. No answer. */
export type RunView = {
  mode: 'solo' | 'daily' | 'duel'
  status: RunStatus
  clues: OpenClue[]
  total: number
  wrong: number
  /** server time the first clue was shown, ms since epoch — the clock runs from here */
  startedAt: number
  /** server time the run closed, when it has */
  finishedAt: number | null
  /** the server's clock when this view was cut — the screen's timer corrects its own by it */
  serverNow: number
  /** the ids already tried and wrong, so the drawer can strike them */
  tried: string[]
  /** present only once the run is over */
  result?: RunResult
  /** the daily's date (`2026-09-24`), so a share can name it */
  day?: string
}

export type RunResult = {
  playerId: string
  nameHe: string
  yearsHe: string
  hintsUsed: number
  wrongGuesses: number
  rawElapsedMs: number
  weightedTimeMs: number
  scoringVersion: number
  /** the clue that was on top when he was solved — "הרמז שתפס אותך" */
  caughtBy: number | null
  /** every clue of the question, opened or not — the whole file after the whistle */
  allClues: OpenClue[]
  archiveHref: string
  /**
   * The other gates he and his clues live in (delta 89, `lib/links`): his archive card,
   * the matches of his match/goal clues — the AWAY DAYS stop where it was abroad — and a
   * gate-8 goal he scored. Resolved after the whistle only, every target checked.
   */
  links: CrossLink[]
  /**
   * ONE RED WORLD (28.9.2026): the run as a ResultContext (§5) — him, the matches his
   * clues name, how many clues — and at most two next doors from `recommend()` (§38),
   * never repeating a chip already in `links`.
   */
  context: ResultContext
  next: NextAction[]
  /** his real shirt where the archive holds a photograph (`lib/kit/playerShirt.ts`) */
  shirt: ShirtLook
  shirtTitle: string
}
