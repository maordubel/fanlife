import 'server-only'

import lineupsFile from '@/content/manual/lineups.json'
import squadsFile from '@/content/manual/squads.json'
import { matchById, sourceOf } from '@/lib/archive/match-master'
import { playerById, pickablePlayers, resolvePlayerId } from '@/lib/archive/player-master'
import { kitForSeason } from '@/lib/kit/seasons'
import type { KitSpec } from '@/lib/kit/spec'
import { positionOf, takeFrom } from '@/lib/rotation/deck'
import type { SlotRole } from '@/lib/xi/roles'
import { nameOf, rng, shuffle } from './archive'
import { nameCore } from './roster-search'
import {
  COACH_NOTES,
  LINES,
  XI_SIZE,
  isLine,
  lineOf,
  type CoachNote,
  type CoachNoteKind,
  type Decoy,
  type DecoyKind,
  type Line,
  type LineupVerdict,
  type LockerName,
  type Placement,
  type PlacementVerdict,
  type SheetMan,
} from './lineup-sheet'

/**
 * Gate 3 — חדר ההלבשה: put the men who started a real match into the four bands, and have
 * the sheet graded by LINE on the server.
 *
 * ## What a record must carry to be dealt (21.9.2026, players.md §3.2)
 *
 *  · confidence ≥ 2 and not marked unverified by its source (`playable: false`);
 *  · **a canonical match id** (`matchRef`, m_…) — brief §14 asks for a match ID, and a
 *    "documented XI of a season" names no match, so it is withheld with a note;
 *  · **eleven player ids** (`xiIds`), pinned to the Player Master — the names stay as the
 *    source wrote them and `tests/lineup.test.ts` fails if a name and its id part;
 *  · at least five decoys, each with its sourced kind (`decoys`).
 *
 * No formation is dealt: every record is `formationStated: false`, so the board is four
 * bands (`lib/game/lineup-sheet.ts`). The formations below serve gate 1 only.
 */

export type PitchSlot = {
  slotId: SlotId
  /** GK · CB · LB · RB · CM · LW · ST … shown under the slot */
  roleHe: string
  /**
   * The slot's detailed role, as a code — what the FORMATION asks of this position and
   * nothing about any player. Gate 1's scouting drawer maps it DOWN to the four canonical
   * positions (`lib/xi/roles.ts`).
   */
  role: SlotRole
  /** percentages, origin at the defensive end */
  x: number
  y: number
}

type SlotId = string

export type Formation = { name: string; slots: PitchSlot[] }

const gk = (y = 94): PitchSlot => ({ slotId: 'GK', roleHe: 'שוער', role: 'GK', x: 50, y })

/**
 * Spread a row around the centre with a fixed gap, narrowing only when a wide row
 * would push a chip past the touchline.
 */
const MAX_GAP = 19
const USABLE = 70

type RowSlot = [roleHe: string, role: SlotRole]

function row(prefix: string, roles: RowSlot[], y: number): PitchSlot[] {
  const count = roles.length
  const gap = count === 1 ? 0 : Math.min(MAX_GAP, USABLE / (count - 1))
  const start = 50 - (gap * (count - 1)) / 2
  return roles.map(([roleHe, role], index) => ({
    slotId: `${prefix}${index + 1}`,
    roleHe,
    role,
    x: Math.round(start + gap * index),
    y,
  }))
}

/*
 * The row order is the pitch's own: index 0 sits at the lowest inline-start, which in
 * an RTL layout is the RIGHT of the screen — so `מגן ימני` leads a back four and the
 * codes follow the same order.
 */
export const FORMATIONS: Record<string, Formation> = {
  '4-4-2': {
    name: '4-4-2',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 72),
      ...row('M', [['כנף ימני', 'RM'], ['קשר', 'CM'], ['קשר', 'CM'], ['כנף שמאלי', 'LM']], 45),
      ...row('F', [['חלוץ', 'ST'], ['חלוץ', 'ST']], 18),
    ],
  },
  '4-3-3': {
    name: '4-3-3',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 72),
      ...row('M', [['קשר', 'CM'], ['קשר', 'CM'], ['קשר', 'CM']], 47),
      ...row('F', [['כנף ימני', 'RW'], ['חלוץ מרכזי', 'ST'], ['כנף שמאלי', 'LW']], 18),
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1',
    slots: [
      gk(),
      ...row('D', [['מגן ימני', 'RB'], ['בלם', 'CB'], ['בלם', 'CB'], ['מגן שמאלי', 'LB']], 74),
      ...row('H', [['קשר הגנתי', 'DM'], ['קשר הגנתי', 'DM']], 55),
      ...row('M', [['כנף ימני', 'RW'], ['קשר התקפי', 'AM'], ['כנף שמאלי', 'LW']], 34),
      ...row('F', [['חלוץ', 'ST']], 14),
    ],
  },
  '3-5-2': {
    name: '3-5-2',
    slots: [
      gk(),
      ...row('D', [['בלם', 'CB'], ['בלם', 'CB'], ['בלם', 'CB']], 74),
      ...row(
        'M',
        [['מגן כנף', 'RWB'], ['קשר', 'CM'], ['קשר', 'CM'], ['קשר', 'CM'], ['מגן כנף', 'LWB']],
        46,
      ),
      ...row('F', [['חלוץ', 'ST'], ['חלוץ', 'ST']], 16),
    ],
  },
}

export const DEFAULT_FORMATION = '4-4-2'

/* ------------------------------------------------------------------ content */

type LineupRecord = {
  /** the record's own key (`2001-02-uefa-qf-milan`) — the `lineup` dialect of the match registry */
  matchId: string
  /** the canonical match id, m_… — absent means the record names no match and is not dealt */
  matchRef?: string
  titleHe: string
  subtitleHe?: string
  formation: string
  /** no source here states a formation; the board is four bands */
  formationStated?: boolean
  /** slotId -> player name, as the source wrote it */
  xi: Record<string, string>
  /** slotId -> the Player Master id of that name */
  xiIds?: Record<string, string>
  /** extra names offered alongside the eleven, as the source wrote them */
  distractors?: string[]
  /** each decoy's id and its sourced kind */
  decoys?: Array<{ id: string; kind: DecoyKind }>
  /** who came on, when, and for whom — a restatement of `noteHe`/`benchHe` */
  subsOn?: Array<{ id: string; minute: number | null; for: string | null }>
  positionsInferred?: boolean
  playable?: boolean
  withheldHe?: string
  benchHe?: string[]
  coachHe?: string
  noteHe?: string
  sourceTitle?: string
  sourceUrl?: string
  confidence?: number
}

type LineupFile = {
  confidence: number
  source: { title: string; url?: string | null }
  records: LineupRecord[]
}

const CONFIDENCE_FLOOR = 2

/** Five spare names, not "some" — what the corpus already does (an XI with none is a sorting exercise). */
const DISTRACTOR_FLOOR = 5

const file = lineupsFile as unknown as LineupFile

function verified(): LineupRecord[] {
  return file.records.filter(
    (record) =>
      (record.confidence ?? file.confidence) >= CONFIDENCE_FLOOR &&
      record.playable !== false &&
      typeof record.matchRef === 'string' &&
      record.matchRef.startsWith('m_') &&
      Object.keys(record.xiIds ?? {}).length === XI_SIZE &&
      (record.decoys?.length ?? 0) >= DISTRACTOR_FLOOR,
  )
}

/** Every playable record, for the tests and the research report — never sent to a screen. */
export function playableLineups(): readonly LineupRecord[] {
  return verified()
}

/** The display name of an id: the Player Master's canonical spelling (never a second roster). */
function displayName(id: string): string {
  return playerById(id)?.displayName ?? id
}

/** The line a starter started in, by id. */
function startersOf(record: LineupRecord): Map<string, Line> {
  const out = new Map<string, Line>()
  for (const [slot, id] of Object.entries(record.xiIds ?? {})) {
    const line = lineOf(slot)
    if (isLine(line)) out.set(id, line)
  }
  return out
}

/** Who the source names coming on — ids, with the minute where stated. */
function subsOf(record: LineupRecord): Map<string, number | null> {
  const out = new Map<string, number | null>()
  for (const sub of record.subsOn ?? []) out.set(sub.id, sub.minute)
  // `benchHe` is the older restatement; any name there that `subsOn` does not carry still counts
  for (const raw of record.benchHe ?? []) {
    const id = resolvePlayerId(nameCore(raw))
    if (id && !out.has(id)) out.set(id, null)
  }
  return out
}

/* ---------------------------------------------------------- the season squad */

type SquadRow = { personName: string; personSlug?: string; seasonLabel: string; sourceTitle?: string | null }

let squadIndex: Map<string, Map<string, string | null>> | null = null

/** season → (player id → the squad row's source title). Built once, server-side. */
function squadsBySeason(): Map<string, Map<string, string | null>> {
  if (squadIndex) return squadIndex
  const index = new Map<string, Map<string, string | null>>()
  for (const row of (squadsFile as unknown as { records: SquadRow[] }).records) {
    const id = resolvePlayerId(row.personSlug ?? row.personName)
    if (!id) continue
    const season = index.get(row.seasonLabel) ?? new Map<string, string | null>()
    if (!season.has(id)) season.set(id, row.sourceTitle ?? null)
    index.set(row.seasonLabel, season)
  }
  squadIndex = index
  return index
}

/**
 * The sourced "didn't start" kind of a decoy. The stored kind is re-derived and has to
 * agree (`tests/lineup.test.ts`); the source travels with it.
 */
function decoyOf(record: LineupRecord, id: string): Decoy {
  const subs = subsOf(record)
  if (subs.has(id)) {
    return {
      kind: 'sub-on',
      minute: subs.get(id) ?? null,
      sourceTitle: record.sourceTitle ?? file.source.title,
    }
  }
  const season = record.matchRef ? matchById(record.matchRef)?.season : null
  const squad = season ? squadsBySeason().get(season) : undefined
  if (squad?.has(id)) return { kind: 'season-squad', minute: null, sourceTitle: squad.get(id) ?? null }
  return { kind: 'other', minute: null, sourceTitle: null }
}

/** The kind a decoy SHOULD carry, derived from the sources — exported for the test. */
export function derivedDecoyKind(record: LineupRecord, id: string): DecoyKind {
  return decoyOf(record, id).kind
}

/* ---------------------------------------------------------------- the deal */

/** What the intro card may say about the match — from the Match Master, disputes kept. */
export type MatchIntro = {
  /** the canonical match id */
  matchId: string
  season: string
  /** ISO day where the sources agree on it; null where they do not (or never said) */
  playedOn: string | null
  dateDisputed: boolean
  /** Hapoel's goals and the opponent's, where the sources agree */
  result: { hapoel: number; opponent: number } | null
  /** where the match record comes from, named on screen */
  matchSourceTitle: string | null
  matchSourceUrl: string | null
}

export type Challenge = {
  /** the canonical match id (m_…) */
  matchId: string
  titleHe: string
  subtitleHe: string | null
  intro: MatchIntro
  /** the lockers: the eleven and the decoys, shuffled; an id and a name each — no line, no kind */
  bank: LockerName[]
  /** the season's real kit, the same on every locker and with no number — null where the archive has none */
  kit: KitSpec | null
  kitSeason: string | null
  sourceTitle: string
  sourceUrl: string | null
}

/**
 * The match this round asks about. A deck, not `records[floor(rng(seed)() * n)]` —
 * `rng()`'s first output is nearly linear in the seed, and the cursor walks the deck one
 * match at a time, so five rounds use all five records before any comes back.
 */
function chosen(seed: number, cursor: number, window?: LineupWindow): LineupRecord | undefined {
  const records = window ? verified().filter((record) => yearOfRecord(record) < window.before) : verified()
  if (window?.pin) return records.find((record) => record.matchRef === window.pin)
  const at = positionOf(seed, cursor, records.length, 1)
  return takeFrom(shuffle(records, rng(at.seed)), at.slot, 1)[0]
}

/**
 * חלון של חיים (21.9.2026, `lib/mechanics/types.ts`) — THE WORKER LIFE asks for a lineup a
 * boy could have known: only matches played before `before`, and `pin` names the one match
 * the life chose, so the deal and every grade re-derive the same round. Absent, the gate's
 * deck is untouched.
 */
export type LineupWindow = { before: number; pin?: string | null }

/** the year a verified record was played in — the day where the sources agree, else the season's start */
function yearOfRecord(record: LineupRecord): number {
  const match = matchById(record.matchRef as string)
  const day = match?.playedOn.precision === 'day' ? match.playedOn.value : null
  const year = Number((day ?? match?.season ?? '').slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : Number.POSITIVE_INFINITY
}

/** every playable match, as an id and a year — what the life may ask about, and nothing of the answer */
export function lineupYears(): Array<{ id: string; year: number }> {
  return verified()
    .map((record) => ({ id: record.matchRef as string, year: yearOfRecord(record) }))
    .filter((row) => Number.isFinite(row.year))
}

function introOf(record: LineupRecord): MatchIntro {
  const match = matchById(record.matchRef as string)
  const source = match?.sourceIds[0] ? sourceOf(match.sourceIds[0]) : null
  return {
    matchId: record.matchRef as string,
    season: match?.season ?? '',
    playedOn: match?.playedOn.precision === 'day' ? match.playedOn.value : null,
    dateDisputed: match?.playedOn.precision === 'disputed',
    result: match?.result ?? null,
    matchSourceTitle: source?.title ?? null,
    matchSourceUrl: source?.url ?? null,
  }
}

/** Null when no verified XI exists — the screen then says exactly that. */
export function dealChallenge(seed: number, cursor = 0, window?: LineupWindow): Challenge | null {
  const record = chosen(seed, cursor, window)
  if (!record) return null
  const ids = [...new Set([...Object.values(record.xiIds ?? {}), ...(record.decoys ?? []).map((decoy) => decoy.id)])]
  const intro = introOf(record)
  const kit = intro.season ? kitForSeason(intro.season) : null
  return {
    matchId: intro.matchId,
    titleHe: record.titleHe,
    subtitleHe: record.subtitleHe ?? null,
    intro,
    bank: shuffle(ids, rng(seed * 3 + 7)).map((id) => ({ id, nameHe: displayName(id) })),
    // The same shirt on every locker, and no number on it: a number would be a clue
    // (`shirt-numbers.json` is season-bound), and a shirt per man would be a claim about
    // which of them wore which cut that night.
    kit: kit ? { ...kit.spec, number: null } : null,
    kitSeason: kit ? kit.seasonLabel : null,
    sourceTitle: record.sourceTitle ?? file.source.title,
    sourceUrl: record.sourceUrl ?? file.source.url ?? null,
  }
}

/* ------------------------------------------------------------------ grading */

/** How much of a submitted array is even read — far above eleven, far below a payload attack. */
const MAX_BOARD_INPUT = 64

/**
 * The placements a client may send: ids from THIS deal's bank, one band each, at most
 * eleven. Anything else is dropped, so a forged request cannot grade a name that was
 * never in the room.
 */
function cleanPlacements(record: LineupRecord, placements: readonly Placement[]): Placement[] {
  const bank = new Set([...Object.values(record.xiIds ?? {}), ...(record.decoys ?? []).map((decoy) => decoy.id)])
  const seen = new Set<string>()
  const out: Placement[] = []
  // a board is at most eleven men; a longer array is a forged request, not a bigger team
  const rows = Array.isArray(placements) ? placements.slice(0, MAX_BOARD_INPUT) : []
  for (const row of rows) {
    if (!row || typeof row.playerId !== 'string' || !isLine(row.line)) continue
    if (!bank.has(row.playerId) || seen.has(row.playerId)) continue
    seen.add(row.playerId)
    out.push({ playerId: row.playerId, line: row.line, order: Number.isFinite(row.order) ? row.order : out.length })
    if (out.length >= XI_SIZE) break
  }
  return out
}

/** Graded on the server against the verified XI, by LINE. The answer is never in the payload. */
export function gradeLineup(
  seed: number,
  placements: readonly Placement[],
  cursor = 0,
  window?: LineupWindow,
): LineupVerdict | null {
  if (!Number.isInteger(seed) || !Number.isInteger(cursor)) return null
  const record = chosen(seed, cursor, window)
  if (!record) return null
  const starters = startersOf(record)
  const board = cleanPlacements(record, placements)

  const rows: PlacementVerdict[] = board.map((row) => {
    const started = starters.get(row.playerId) ?? null
    const status = started === null ? 'not_in_xi' : started === row.line ? 'exact' : 'wrong_line'
    return {
      playerId: row.playerId,
      nameHe: displayName(row.playerId),
      line: row.line,
      order: row.order,
      status,
      belongsToLine: started,
      decoy: started === null ? decoyOf(record, row.playerId) : null,
    }
  })

  const placed = new Set(board.map((row) => row.playerId))
  const solution: SheetMan[] = []
  for (const line of LINES) {
    for (const [slot, id] of Object.entries(record.xiIds ?? {})) {
      if (lineOf(slot) === line) solution.push({ playerId: id, nameHe: displayName(id), line })
    }
  }

  const exact = rows.filter((row) => row.status === 'exact').length
  const missing = solution.filter((man) => !placed.has(man.playerId))
  const counts = {
    correct: exact,
    wrongBand: rows.filter((row) => row.status === 'wrong_line').length,
    wrongPlayer: rows.filter((row) => row.status === 'not_in_xi').length,
    missed: missing.length,
  }
  return {
    exact,
    counts,
    perfect: exact === XI_SIZE && rows.length === XI_SIZE,
    starters: rows.filter((row) => row.status !== 'not_in_xi').length,
    total: XI_SIZE,
    rows,
    solution,
    missing,
    benchKnown: subsOf(record).size > 0,
    sourceTitle: record.sourceTitle ?? file.source.title,
    sourceUrl: record.sourceUrl ?? file.source.url ?? null,
  }
}

/* ------------------------------------------------------------------ the coach */

/**
 * Which notes this match can honestly hand out. `benchOn` only where the record names a
 * bench: for a record that does not, "0" would read as a fact about the match instead of
 * a gap in the source (rule 11). The order is fixed, never drawn.
 */
function coachKindsFor(record: LineupRecord): CoachNoteKind[] {
  const kinds: CoachNoteKind[] = ['stillOut']
  if (subsOf(record).size > 0) kinds.push('benchOn')
  kinds.push('lineRight')
  return kinds
}

/** פתק מהמאמן — computed against the verified XI, on the server; only a NUMBER crosses. */
export function coachNote(
  seed: number,
  placements: readonly Placement[],
  cursor = 0,
  index = 0,
  window?: LineupWindow,
): CoachNote | null {
  const record = chosen(seed, cursor, window)
  if (!record) return null
  if (index < 0 || index >= COACH_NOTES) return null
  const kinds = coachKindsFor(record)
  const kind = kinds[index % kinds.length] as CoachNoteKind
  const starters = startersOf(record)
  const subs = subsOf(record)
  const board = cleanPlacements(record, placements)

  if (kind === 'stillOut') {
    const found = board.filter((row) => starters.has(row.playerId)).length
    return { kind, n: starters.size - found, of: starters.size }
  }
  if (kind === 'benchOn') {
    return { kind, n: board.filter((row) => subs.has(row.playerId)).length, of: board.length }
  }
  const right = board.filter((row) => starters.get(row.playerId) === row.line).length
  return { kind, n: right, of: board.length }
}

/**
 * With no verified XI, the lockers still hold real footballers — pickable players of the
 * Player Master (`kind === 'player'`, football only), never an invented bench.
 */
export function freeBuildBank(): LockerName[] {
  return pickablePlayers().map((player) => ({ id: player.id, nameHe: player.displayName }))
}

export function hasVerifiedLineup(): boolean {
  return verified().length > 0
}

export { nameOf }
