/**
 * The Match / Moment Master's shape (21.9.2026) — types only, client-safe.
 *
 * Built by `scripts/archive/build-match-master.ts` into
 * `content/generated/match-master.json`; read on the server through
 * `lib/archive/match-master.ts`. See that file for the reader API.
 *
 * Id formats (agreed across the gate clusters):
 *   · match    — `m_` + 12 hex, from `content/manual/match-ids.json` (rule 35)
 *   · person   — `p_` + 10 hex, from `content/manual/player-ids.json`
 *   · moment   — `goal:<goalId>` for a goal in `goals.json`, `moment:<slug>` for `moments.json`
 *   · source   — `ynet:L-<n>`, `walla:<n>`, `one:<n>`, `vikipoel:games`, else `<host>:<hash8>`
 *   · graph    — `season:<label>`, `tie:<euro-ties slug>` as relation endpoints
 */

export type SourceId = string

export type MatchClaim = {
  /** `playedOn` · `home` · `venue` · `result` — a field two readings of the same match disagree on */
  field: string
  values: { value: string | number | null | { hapoel: number; opponent: number }; sourceId: SourceId; file: string }[]
}

export type ScorerEntry = {
  playerId: string | null
  nameHe: string | null
  minute: number | null
  stoppage: number | null
  penalty: boolean
  ownGoal: boolean
  sourceId: SourceId
  /** the scorer row's confidence — 1 where its goals do not add up to the score */
  confidence: number
}

export type MatchEventEntry = {
  seq: number | null
  type: string
  minute: number | null
  minuteExtra: number | null
  clubSlug: string | null
  playerId: string | null
  relatedPlayerId: string | null
  sourceId: SourceId
}

export type MatchRecord = {
  matchId: string
  sport: 'football' | 'basketball'
  /** every key any file uses for this match: natural keys and every dialect (see lib/canon/matchId.ts) */
  aliases: string[]
  /** `disputed` when two readings give two dates — both are in `claims` */
  playedOn: { value: string | null; precision: 'day' | 'unknown' | 'disputed' }
  season: string
  competition: string
  stage: string | null
  /** both clubs, always — sorted, so a disputed home side still names the match */
  clubs: [string, string]
  /** null when the readings disagree on who was at home */
  home: string | null
  away: string | null
  hapoelSide: 'home' | 'away' | null
  /** the other club, when Hapoel played (null for the rare row of a match Hapoel did not play) */
  opponent: string | null
  /** home-away score; null when the home side or the score is disputed */
  score: { home: number; away: number } | null
  /** from Hapoel's side — survives a disputed home side, since the result is not disputed */
  result: { hapoel: number; opponent: number } | null
  neutralGround: boolean
  venue: string | null
  claims: MatchClaim[]
  /** `fact-conflicts.json` natural keys: `entityTable|entityKey|field` */
  conflictRefs: string[]
  scorers: ScorerEntry[]
  /** a scorer row whose goals disagree with the score (confidence 1) — rule 2 keeps it from trivia */
  scorersDisputed: boolean
  events: MatchEventEntry[]
  /** the `lineups.json` record for this match */
  lineupRef: string | null
  momentIds: string[]
  sourceIds: SourceId[]
  confidence: number
  /** why two natural keys share this id — an owner decision */
  mergeNote: string | null
  /** present only on a fixture that was never played on a pitch (a walkover / technical result) */
  notPlayed?: { reason: string; sourceIds: SourceId[] }
  /**
   * present only where a named person decided a claim (`fact-conflicts.json` row with a
   * `resolution` and structured `decisions`, delta 89): the winning value and source, and
   * every reading the claim held — the losing provenance stays here, never deleted.
   */
  decided?: MatchDecision[]
}

export type MatchDecision = {
  field: string
  value: string | number | null | { hapoel: number; opponent: number }
  sourceId: SourceId
  /** `entityTable|entityKey|field` of the fact-conflicts row that carries the decision */
  conflict: string
  resolutionHe: string
  decidedBy: string
  decidedOn: string
  overruled: MatchClaim['values']
}

export type ActorKind = 'player' | 'opponent' | 'unnamed'

export type MoveTouch = {
  step: number
  actor: {
    kind: ActorKind
    playerId: string | null
    nameHe: string
    resolution: 'exact' | 'unresolved' | 'not-a-person'
  }
  action: string
  zone: string
  positionHe: string
  noteHe: string | null
}

export type MomentRecord = {
  momentId: string
  kind: 'goal' | 'moment'
  category: string | null
  titleHe: string
  matchId: string | null
  matchUnresolved: 'not-in-archive' | 'ambiguous' | 'no-match-named' | null
  /** how it was joined — `date±1` only where the day itself is a recorded conflict */
  matchLink: 'date' | 'date±1' | 'key' | null
  playedOn: string | null
  season: string | null
  /** what THIS record says; other readings are in `minuteClaims` */
  minute: number | null
  stoppage: number | null
  minuteClaims: { minute: number; stoppage: number | null; sourceId: SourceId }[]
  scorer: { playerId: string | null; nameHe: string; resolution: 'exact' | 'curated' | 'unresolved' } | null
  /** no `rx/ry` is stored — lib/game/replay/truth.ts derives them from the zones */
  move: { touches: MoveTouch[] } | null
  /** the record's own words; goals.json holds a paraphrase of the report, moments.json a summary */
  text: { he: string | null; kind: 'paraphrase' | 'summary' }
  sourceId: SourceId
  sourceUrl: string | null
  confidence: number
  conflictRefs: string[]
  usable: { replay: boolean; trivia: boolean; archive: boolean }
  usableWhy: { replay: string[]; trivia: string[] }
}

export type MatchRelation = {
  type: 'scored' | 'assisted' | 'happened_in' | 'in_season' | 'started_in' | 'came_on_in' | 'leg_of'
  from: string
  to: string
  sourceIds: SourceId[]
  confidence: number
  /** for `scored` into a match: how many goals the rows record */
  count?: number
}

export type CrossCheck = {
  momentId: string
  field: 'playedOn' | 'opponent' | 'result' | 'minute'
  record: string
  archive: string
  status: 'agree' | 'disagree'
  /** every disagreement must name its `fact-conflicts.json` row — the build fails otherwise */
  conflictRef: string | null
}

export type ResearchItem = {
  matchId: string
  playedOn: string | null
  season: string
  why: 'europe' | 'cup-final' | 'derby'
  scorer: { playerId: string | null; nameHe: string | null }
  minute: number
  stoppage: number | null
  status: 'needs-a-sourced-move'
}

export type UnresolvedItem =
  | { kind: 'moment-match'; momentId: string; reason: string }
  | {
      kind: 'actor'
      momentId: string
      step: number
      nameHe: string
      reason: string
      candidates?: { playerId: string; evidence: string }[]
    }
  | { kind: 'dialect'; dialect: string; key: string; reason: string }
  | { kind: 'suspected-duplicate'; a: string; b: string; reason: string }
  | { kind: 'lineup'; key: string; reason: string }
  | { kind: 'scorer-name'; nameHe: string; count: number; reason: string }
  /** a row of a secondary source (`intl-redfans-2026-09-24.json`) that joins no canonical match */
  | { kind: 'secondary-row'; file: string; key: string; reason: string }

export type MatchMasterFile = {
  schemaVersion: 1
  inputsSha: string
  inputs: string[]
  counts: Record<string, number>
  sources: Record<SourceId, { title: string; url: string | null }>
  matches: MatchRecord[]
  moments: MomentRecord[]
  relations: MatchRelation[]
  crossChecks: CrossCheck[]
  researchQueue: ResearchItem[]
  unresolved: UnresolvedItem[]
}
