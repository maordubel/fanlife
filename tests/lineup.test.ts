import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { microFeedback } from '@/lib/voice'

import lineupsFile from '@/content/manual/lineups.json'
import { matchById } from '@/lib/archive/match-master'
import { resolvePlayer } from '@/lib/archive/player-master'
import {
  coachNote,
  dealChallenge,
  derivedDecoyKind,
  gradeLineup,
  hasVerifiedLineup,
  playableLineups,
} from '@/lib/game/lineup'
import {
  COACH_NOTES,
  FAST_ROW_MS,
  LINES,
  MAX_LOCKS,
  REVEAL_SKIPPED,
  XI_SIZE,
  buildReveal,
  displaySpot,
  ghostsUpTo,
  lineCounts,
  lineOf,
  missingStarters,
  normalise,
  opensAtSummary,
  placeOn,
  takeOff,
  tallyUpTo,
  type CoachNoteKind,
  type Line,
  type Placement,
} from '@/lib/game/lineup-sheet'
import { splitName } from '@/lib/game/roster-search'
import { MESSAGES } from '@/lib/i18n'

/**
 * שער 3 — חדר ההלבשה (V3, 21.9.2026).
 *
 * What this file keeps true, in the order it would hurt if it stopped being true:
 *
 *  1. **No placeholder ever reaches the room**, and every man is an id the Player Master
 *     knows — a name and its id can never part.
 *  2. **A record is dealt only with a match id** (brief §14); the documented XI of
 *     2000/01 names no match and is withheld with its reason.
 *  3. **The bench, the subs and the decoy kinds are restatements**, each quotable from
 *     the record or derivable from `squads.json` — never a new claim.
 *  4. **The board is four bands and the grade is by line, on the server.**
 *  5. **The reveal can always be got past**, and its only timer is the opt-in fast walk.
 */

const ROOT = join(__dirname, '..')
const catalogue = MESSAGES

type LineupRecord = {
  matchId: string
  matchRef?: string
  titleHe: string
  xi: Record<string, string>
  xiIds?: Record<string, string>
  distractors?: string[]
  decoys?: Array<{ id: string; kind: string }>
  subsOn?: Array<{ id: string; minute: number | null; for: string | null }>
  benchHe?: string[]
  noteHe?: string
  playable?: boolean
  withheldHe?: string
  formationStated?: boolean
  confidence?: number
}

const records = (lineupsFile as unknown as { records: LineupRecord[] }).records

/** The seed that deals a given match, found by sweep. */
function seedFor(lineupKey: string): number {
  const matchRef = records.find((record) => record.matchId === lineupKey)?.matchRef
  for (let seed = 1; seed < 400; seed += 1) {
    if (dealChallenge(seed)?.matchId === matchRef) return seed
  }
  throw new Error(`no seed deals ${lineupKey}`)
}

const recordOf = (lineupKey: string) => records.find((record) => record.matchId === lineupKey) as LineupRecord

/** The perfect board for a record: every starter in the band he started in. */
function perfectBoard(record: LineupRecord): Placement[] {
  const board: Placement[] = []
  for (const [slot, id] of Object.entries(record.xiIds ?? {})) {
    const line = lineOf(slot) as Line
    board.push({ playerId: id, line, order: board.filter((row) => row.line === line).length })
  }
  return board
}

describe('אין מציין מקום בחדר — every name in a record is a person', () => {
  /**
   * The words a placeholder is made of. A real name is a given name and a family name;
   * "קשר נוסף", "שוער מחליף" and "מגן נוסף" are a ROLE and a qualifier, which is what a
   * slot looks like when somebody could not find out who filled it.
   */
  const ROLE_WORDS = ['שוער', 'מגן', 'בלם', 'קשר', 'חלוץ', 'כנף', 'מאמן']
  const QUALIFIERS = ['נוסף', 'נוספת', 'מחליף', 'שני', 'שלישי', 'אלמוני', 'לא ידוע']

  const everyName = records.flatMap((record) => [
    ...Object.values(record.xi),
    ...(record.distractors ?? []),
    ...(record.benchHe ?? []),
  ])

  it('has names to check', () => {
    expect(everyName.length).toBeGreaterThan(60)
  })

  it('never names a slot instead of a man', () => {
    const bad = everyName.filter((name) => {
      const words = name.split(/\s+/).filter(Boolean)
      if (words.length === 0) return true
      const leadsWithRole = ROLE_WORDS.includes(words[0] as string)
      const endsWithQualifier = QUALIFIERS.includes(words[words.length - 1] as string)
      return leadsWithRole && (endsWithQualifier || words.length === 1)
    })
    expect(bad, bad.join(' · ')).toEqual([])
  })

  it('keeps the prototype placeholder out of the archive, by name', () => {
    // Named explicitly as well as caught by the rule above, because this exact string is
    // what `docs/16-gates-upgrade.md` warns about and a reader of that file should be
    // able to find the guard by searching for it.
    const raw = readFileSync(join(ROOT, 'content/manual/lineups.json'), 'utf8')
    expect(raw).not.toContain('קשר נוסף')
  })

  it('gives every playable record eleven men and no repeat', () => {
    for (const record of records) {
      const xi = Object.values(record.xi)
      expect(xi, record.matchId).toHaveLength(11)
      expect(new Set(xi).size, record.matchId).toBe(11)
    }
  })
})

describe('הספסל — a restatement of the record, never a new claim', () => {
  const withBench = records.filter((record) => (record.benchHe ?? []).length > 0)

  it('has records that name a bench, and records that do not', () => {
    expect(withBench.length).toBeGreaterThan(0)
    expect(withBench.length).toBeLessThan(records.length)
  })

  it('can quote every bench name from the record it sits in', () => {
    // The family name, not the full string: a match report writes "לנדאו ויאני נכנסו
    // כמחליפים" and the archive row writes "גילי לנדאו (נכנס בדקה 48)". The claim being
    // checked is that the source named this man as a substitute in this match, and the
    // family name is how the source names him.
    const unquoted: string[] = []
    for (const record of withBench) {
      const said = `${record.noteHe ?? ''} ${record.titleHe}`
      for (const entry of record.benchHe ?? []) {
        if (!said.includes(splitName(entry).familyHe)) {
          unquoted.push(`${record.matchId}: ${entry}`)
        }
      }
    }
    expect(unquoted, unquoted.join('\n')).toEqual([])
  })

  it('never puts the same man on the bench and in the XI', () => {
    for (const record of withBench) {
      const xi = new Set(Object.values(record.xi))
      for (const entry of record.benchHe ?? []) {
        expect(xi.has(splitName(entry).familyHe), `${record.matchId}: ${entry}`).toBe(false)
        expect([...xi].some((name) => name === entry), `${record.matchId}: ${entry}`).toBe(false)
      }
    }
  })

  it('offers at least one of them in the bank, or the trap cannot be sprung', () => {
    for (const record of withBench) {
      const bank = new Set(record.distractors ?? [])
      const reachable = (record.benchHe ?? []).filter((entry) =>
        bank.has(entry.replace(/\s*\(.*$/, '')),
      )
      expect(reachable.length, record.matchId).toBeGreaterThan(0)
    }
  })
})

describe('מזהים — every man an id, every record a match', () => {
  it('pins every XI name, bench name and decoy to the Player Master id stored beside it', () => {
    for (const record of records) {
      for (const [slot, name] of Object.entries(record.xi)) {
        expect(record.xiIds?.[slot], `${record.matchId} ${slot}`).toBe(resolvePlayer(name)?.id)
      }
      const decoyIds = (record.decoys ?? []).map((decoy) => decoy.id)
      if (decoyIds.length > 0) {
        expect(decoyIds, record.matchId).toEqual((record.distractors ?? []).map((name) => resolvePlayer(name)?.id))
      }
    }
  })

  it('links every dealt record to its canonical match, and the match back to the record', () => {
    for (const record of playableLineups()) {
      expect(record.matchRef, record.matchId).toMatch(/^m_[0-9a-f]{12}$/)
      const match = matchById(record.matchRef as string)
      expect(match, record.matchId).not.toBeNull()
      expect(match?.lineupRef, record.matchId).toBe(record.matchId)
      expect(record.formationStated, record.matchId).toBe(false)
    }
  })

  it('withholds the documented XI of 2000/01, which names no match — with its reason', () => {
    const season = recordOf('2000-01-documented-xi')
    expect(season.matchRef).toBeUndefined()
    expect(season.playable).toBe(false)
    expect(season.withheldHe).toContain('§14')
    expect(playableLineups().map((record) => record.matchId)).not.toContain('2000-01-documented-xi')
    // five records are dealt: Chelsea at home, Milan, both Salzburg legs, Haifa 1986
    expect(playableLineups()).toHaveLength(5)
    expect(hasVerifiedLineup()).toBe(true)
  })

  it('keeps every scorer of a dealt match inside the XI or the men the source brought on', () => {
    // The free cross-check players.md §3.2 names: a goal scored by somebody who neither
    // started nor came on would mean the XI or the subs are wrong.
    for (const record of playableLineups()) {
      const onPitch = new Set([...Object.values(record.xiIds ?? {}), ...(record.subsOn ?? []).map((sub) => sub.id)])
      for (const scorer of matchById(record.matchRef as string)?.scorers ?? []) {
        if (scorer.playerId === null || scorer.ownGoal) continue
        expect(onPitch.has(scorer.playerId), `${record.matchId}: ${scorer.nameHe}`).toBe(true)
      }
    }
  })
})

describe('שלושה סוגים של "לא פתח" — each one sourced', () => {
  it('stores for every decoy the kind the sources derive, and only the three kinds', () => {
    for (const record of playableLineups()) {
      for (const decoy of record.decoys ?? []) {
        expect(['sub-on', 'season-squad', 'other'], record.matchId).toContain(decoy.kind)
        expect(derivedDecoyKind(record, decoy.id), `${record.matchId} ${decoy.id}`).toBe(decoy.kind)
      }
    }
  })

  it("restates every sub from the record's own note or bench, minute included", () => {
    for (const record of records) {
      const said = `${record.noteHe ?? ''} ${(record.benchHe ?? []).join(' ')}`
      for (const sub of record.subsOn ?? []) {
        const name = resolvePlayer(sub.id)?.displayName as string
        const spelled = [name, ...(resolvePlayer(sub.id)?.aliases.he ?? [])]
        expect(spelled.some((spelling) => said.includes(splitName(spelling).familyHe)), `${record.matchId} ${name}`).toBe(true)
        if (sub.minute !== null) expect(said, `${record.matchId} ${name}`).toContain(String(sub.minute))
      }
    }
  })

  it('offers each kind somewhere, so every sentence the reveal can print is reachable', () => {
    const kinds = new Set(playableLineups().flatMap((record) => (record.decoys ?? []).map((decoy) => decoy.kind)))
    expect([...kinds].sort()).toEqual(['other', 'season-squad', 'sub-on'])
  })
})

describe('הקלף — what the deal hands the screen, and what it does not', () => {
  it('deals the eleven and the decoys as an id and a name each — no line, no kind, no slot', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const challenge = dealChallenge(seed)
      expect(challenge).not.toBeNull()
      const ids = challenge!.bank.map((locker) => locker.id)
      expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length)
      expect(ids.length).toBeGreaterThanOrEqual(XI_SIZE + 5)
      for (const locker of challenge!.bank) expect(Object.keys(locker).sort()).toEqual(['id', 'nameHe'])
      expect(JSON.stringify(challenge)).not.toContain('"line"')
      expect(JSON.stringify(challenge)).not.toContain('sub-on')
      expect(JSON.stringify(challenge)).not.toContain('xiIds')
    }
  })

  it('hangs the season\'s real kit on the lockers, with no number — or none where the archive has none', () => {
    const haifa = dealChallenge(seedFor('1985-86-league-final-haifa'))!
    expect(haifa.kitSeason).toBe('1985/86')
    expect(haifa.kit?.number).toBeNull()
    const milan = dealChallenge(seedFor('2001-02-uefa-qf-milan'))!
    expect(milan.kit).toBeNull()
    expect(milan.kitSeason).toBeNull()
  })

  it('introduces the match from the Match Master, and prints a decided date (no longer disputed)', () => {
    const chelsea = dealChallenge(seedFor('2001-02-uefa-r2-chelsea'))!
    expect(chelsea.intro.playedOn).toBe('2001-10-18')
    expect(chelsea.intro.matchSourceTitle).toBeTruthy()
    // disputed (17.8 / 18.8) until delta 89; decided for UEFA's match record 2002389 — 18.8.2010
    const salzburg = dealChallenge(seedFor('2010-11-ucl-po-salzburg-1'))!
    expect(salzburg.intro.playedOn).toBe('2010-08-18')
    expect(salzburg.intro.dateDisputed).toBe(false)
  })

  it('walks all five matches before any comes back', () => {
    const walked = new Set(Array.from({ length: 5 }, (_, cursor) => dealChallenge(500, cursor)?.matchId))
    expect(walked.size).toBe(5)
  })
})

describe('ארבעה קווים — the board holds {playerId, line, order} and nothing else', () => {
  it('places, moves and takes off, closing up each band', () => {
    let board = placeOn([], 'a', 'D')
    board = placeOn(board, 'b', 'D')
    board = placeOn(board, 'c', 'M')
    expect(board).toEqual([
      { playerId: 'a', line: 'D', order: 0 },
      { playerId: 'b', line: 'D', order: 1 },
      { playerId: 'c', line: 'M', order: 0 },
    ])
    board = placeOn(board, 'a', 'F')
    expect(board).toEqual([
      { playerId: 'b', line: 'D', order: 0 },
      { playerId: 'c', line: 'M', order: 0 },
      { playerId: 'a', line: 'F', order: 0 },
    ])
    expect(takeOff(board, 'c')).toEqual([
      { playerId: 'b', line: 'D', order: 0 },
      { playerId: 'a', line: 'F', order: 0 },
    ])
    expect(lineCounts(board)).toEqual({ GK: 0, D: 1, M: 1, F: 1 })
  })

  it('takes any number in a band, and refuses a twelfth man on the pitch', () => {
    let board: Placement[] = []
    for (let index = 0; index < XI_SIZE; index += 1) board = placeOn(board, `m${index}`, 'M')
    expect(lineCounts(board).M).toBe(11)
    expect(placeOn(board, 'extra', 'F')).toEqual(board)
    // moving a man who is already on the pitch is not a twelfth
    expect(lineCounts(placeOn(board, 'm3', 'F'))).toEqual({ GK: 0, D: 0, M: 10, F: 1 })
    expect(normalise([...board].reverse())).toEqual(board)
  })

  it('keeps display spots inside the pitch and never lets them into the grade', () => {
    for (const line of LINES) {
      for (let of = 1; of <= 7; of += 1) {
        for (let order = 0; order < of; order += 1) {
          const spot = displaySpot(order, of, line)
          expect(spot.x).toBeGreaterThanOrEqual(11)
          expect(spot.x).toBeLessThanOrEqual(89)
        }
      }
    }
    const lib = readFileSync(join(ROOT, 'lib/game/lineup.ts'), 'utf8')
    expect(lib).not.toContain('displaySpot')
  })
})

describe('הבדיקה — graded by line, on the server', () => {
  const milanKey = '2001-02-uefa-qf-milan'
  const milan = seedFor(milanKey)
  const record = recordOf(milanKey)
  const perfect = perfectBoard(record)
  const toama = resolvePlayer('סלים טועמה')!.id
  const hillel = resolvePlayer('יעקב הלל')!.id
  const keeper = record.xiIds?.GK as string

  it('grades a perfect board as eleven in the right band', () => {
    const verdict = gradeLineup(milan, perfect)!
    expect(verdict.exact).toBe(11)
    expect(verdict.starters).toBe(11)
    expect(verdict.missing).toEqual([])
    expect(verdict.rows.every((row) => row.decoy === null)).toBe(true)
  })

  it('marks a starter in the wrong band as the wrong line, not a miss', () => {
    const board = placeOn(perfect, keeper, 'F')
    const verdict = gradeLineup(milan, board)!
    const row = verdict.rows.find((placed) => placed.playerId === keeper)
    expect(row?.status).toBe('wrong_line')
    expect(row?.belongsToLine).toBe('GK')
    expect(verdict.exact).toBe(10)
  })

  it('says why a non-starter was in the room: came on at 69, or in the squad by name of the source', () => {
    const board = placeOn(placeOn(takeOff(takeOff(perfect, keeper), record.xiIds?.D1 as string), toama, 'M'), hillel, 'D')
    const verdict = gradeLineup(milan, board)!
    const sub = verdict.rows.find((row) => row.playerId === toama)
    expect(sub?.status).toBe('not_in_xi')
    expect(sub?.decoy).toMatchObject({ kind: 'sub-on', minute: 69 })
    const squad = verdict.rows.find((row) => row.playerId === hillel)
    expect(squad?.decoy?.kind).toBe('season-squad')
    expect(squad?.decoy?.sourceTitle).toBeTruthy()
    // the two starters left behind are named, with the band they started in — the ghosts
    expect(verdict.missing.map((man) => man.line).sort()).toEqual(['D', 'GK'])
  })

  it('says when the source does not name a bench at all, rather than printing zero', () => {
    expect(gradeLineup(milan, [])?.benchKnown).toBe(true)
    expect(gradeLineup(seedFor('2001-02-uefa-r2-chelsea'), [])?.benchKnown).toBe(false)
  })

  it('refuses what was never in the room — a stranger, a repeat, a twelfth man', () => {
    const forged: Placement[] = [
      ...perfect,
      { playerId: 'p_0000000000', line: 'F', order: 9 },
      { playerId: keeper, line: 'F', order: 9 },
      { playerId: toama, line: 'M', order: 9 },
    ]
    const verdict = gradeLineup(milan, forged)!
    expect(verdict.rows).toHaveLength(11)
    expect(verdict.exact).toBe(11)
  })
})

describe('פתק מהמאמן — a number, never a name', () => {
  const milan = seedFor('2001-02-uefa-qf-milan')
  const chelsea = seedFor('2001-02-uefa-r2-chelsea')
  const perfect = perfectBoard(recordOf('2001-02-uefa-qf-milan'))
  const toama = resolvePlayer('סלים טועמה')!.id
  const balili = resolvePlayer('פיני בלילי')!.id

  it('hands out exactly two, and nothing past them', () => {
    expect(COACH_NOTES).toBe(2)
    for (let index = 0; index < COACH_NOTES; index += 1) {
      expect(coachNote(milan, [], 0, index), `note ${index}`).not.toBeNull()
    }
    expect(coachNote(milan, [], 0, COACH_NOTES)).toBeNull()
    expect(coachNote(milan, [], 0, -1)).toBeNull()
  })

  it('carries a kind and two numbers and nothing else', () => {
    const note = coachNote(milan, [], 0, 0)
    expect(note && Object.keys(note).sort()).toEqual(['kind', 'n', 'of'])
  })

  it('counts the starters still hanging up, and reaches zero on a perfect board', () => {
    expect(coachNote(milan, [], 0, 0)).toEqual({ kind: 'stillOut', n: 11, of: 11 })
    expect(coachNote(milan, perfect, 0, 0)?.n).toBe(0)
  })

  it('offers the bench note only where the record names a bench', () => {
    const kinds = (seed: number): CoachNoteKind[] =>
      Array.from({ length: COACH_NOTES }, (_, index) => coachNote(seed, [], 0, index)?.kind).filter(
        (kind): kind is CoachNoteKind => kind !== undefined,
      )
    expect(kinds(milan)).toContain('benchOn')
    expect(kinds(chelsea)).not.toContain('benchOn')
  })

  it('counts a trap the player has already walked into', () => {
    const board = placeOn(placeOn([], toama, 'M'), balili, 'F')
    expect(coachNote(milan, board, 0, 1)).toEqual({ kind: 'benchOn', n: 2, of: 2 })
  })

  it('is deterministic — the same board twice gives the same help', () => {
    const board = placeOn([], perfect[0]!.playerId, 'GK')
    for (let index = 0; index < COACH_NOTES; index += 1) {
      expect(coachNote(milan, board, 0, index)).toEqual(coachNote(milan, board, 0, index))
    }
  })
})

describe('החשיפה — the walk, the ghosts, and the promise that it can be skipped', () => {
  const milanKey = '2001-02-uefa-qf-milan'
  const milan = seedFor(milanKey)
  const record = recordOf(milanKey)
  const perfect = perfectBoard(record)
  const toama = resolvePlayer('סלים טועמה')!.id
  const keeper = record.xiIds?.GK as string

  /** Eight right, one trap, one starter in the wrong band, two starters left behind. */
  function mixedBoard(): Placement[] {
    let board = takeOff(perfect, record.xiIds?.M4 as string)
    board = takeOff(board, record.xiIds?.F2 as string)
    board = placeOn(board, toama, 'F')
    board = placeOn(board, keeper, 'F')
    return board
  }

  it('walks the bands keeper first, and each band in the order it stands', () => {
    const verdict = gradeLineup(milan, mixedBoard())!
    const rows = buildReveal(verdict, [])
    expect(rows.map((row) => row.line)).toEqual(
      [...rows.map((row) => row.line)].sort((a, b) => LINES.indexOf(a) - LINES.indexOf(b)),
    )
    // the keeper was moved up front, so the walk opens on the defence
    expect(rows[0]?.line).toBe('D')
    expect(rows).toHaveLength(10)
  })

  it('starts at nothing and ends at the verdict', () => {
    const verdict = gradeLineup(milan, mixedBoard())!
    const rows = buildReveal(verdict, [])
    expect(tallyUpTo(rows, -1)).toEqual({ exact: 0, wrongLine: 0, bench: 0, locksRight: 0, locksUsed: 0 })
    const final = tallyUpTo(rows, rows.length - 1)
    expect(final.exact).toBe(verdict.exact)
    expect(verdict.exact).toBe(8)
    expect(final.bench).toBe(1)
    expect(final.wrongLine).toBe(1)
  })

  it('reaches the same sheet from every step, and past the end', () => {
    const rows = buildReveal(gradeLineup(milan, mixedBoard())!, [])
    const final = tallyUpTo(rows, rows.length - 1)
    for (let from = -1; from < rows.length; from += 1) {
      expect(tallyUpTo(rows, rows.length - 1), `skipped from ${from}`).toEqual(final)
    }
    expect(tallyUpTo(rows, rows.length + 5)).toEqual(final)
  })

  it('draws a band\'s missed starters once the walk has passed that band', () => {
    // keeper, one midfielder and one striker left in the locker room; a trap up front
    let board = takeOff(perfect, keeper)
    board = takeOff(board, record.xiIds?.M4 as string)
    board = takeOff(board, record.xiIds?.F2 as string)
    board = placeOn(board, toama, 'F')
    const verdict = gradeLineup(milan, board)!
    const rows = buildReveal(verdict, [])
    expect(verdict.missing.map((man) => man.line).sort()).toEqual(['F', 'GK', 'M'])
    // before the first card the keeper band is already passed — nobody was placed in it
    expect(ghostsUpTo(verdict, rows, -1).map((man) => man.line)).toEqual([])
    expect(ghostsUpTo(verdict, rows, 0).map((man) => man.line)).toEqual(['GK'])
    const lastMidfield = rows.map((row) => row.line).lastIndexOf('M')
    expect(ghostsUpTo(verdict, rows, lastMidfield).map((man) => man.line).sort()).toEqual(['GK', 'M'])
    expect(ghostsUpTo(verdict, rows, rows.length - 1)).toEqual(verdict.missing)
    expect(missingStarters(verdict)).toEqual(verdict.missing)
  })

  it('counts a LOCK only where the man really started', () => {
    const verdict = gradeLineup(milan, mixedBoard())!
    const rows = buildReveal(verdict, [toama, record.xiIds?.D1 as string])
    const tally = tallyUpTo(rows, rows.length - 1)
    expect(tally.locksUsed).toBe(2)
    expect(tally.locksRight).toBe(1)
    expect(MAX_LOCKS).toBe(3)
  })

  it('remembers a skip, and only a skip', () => {
    expect(opensAtSummary([])).toBe(false)
    expect(opensAtSummary(['something-else'])).toBe(false)
    expect(opensAtSummary([REVEAL_SKIPPED])).toBe(true)
  })

  it('survives a board nobody filled — every starter is a ghost', () => {
    const verdict = gradeLineup(milan, [])!
    const rows = buildReveal(verdict, [])
    expect(rows).toEqual([])
    expect(verdict.missing).toHaveLength(11)
    expect(ghostsUpTo(verdict, rows, -1)).toHaveLength(11)
  })
})

/** Comments are prose about the rules; the rules apply to the code. */
function withoutComments(text: string): string {
  return text
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('החדר — what the screens are held to', () => {
  const sheet = withoutComments(readFileSync(join(ROOT, 'app/lineup/TeamSheet.tsx'), 'utf8'))
  const board = withoutComments(readFileSync(join(ROOT, 'app/lineup/LineupBoard.tsx'), 'utf8'))
  const rack = withoutComments(readFileSync(join(ROOT, 'app/lineup/LockerRack.tsx'), 'utf8'))

  it('holds no timer on the reveal — nobody waits for eleven scans', () => {
    // The brief names this failure by hand: "waiting 850ms × 11 players just to see
    // Gate 3 results". A reveal with no timer in it cannot grow one by accident.
    expect(sheet).not.toContain('setTimeout')
    expect(sheet).not.toContain('setInterval')
    expect(sheet).not.toContain('requestAnimationFrame')
  })

  it('keeps its one timer in the opt-in fast walk: ≤250ms a row, started only by a press', () => {
    expect(FAST_ROW_MS).toBeLessThanOrEqual(250)
    const walk = withoutComments(readFileSync(join(ROOT, 'app/lineup/fastWalk.ts'), 'utf8'))
    expect(walk).toContain('FAST_ROW_MS')
    expect(walk).toContain('clearInterval')
    // the walk is started from a click handler and from nowhere else
    const starts = sheet.split('fast.start()').length - 1
    expect(starts).toBe(1)
    expect(sheet).toMatch(/onClick=\{\(event\) => \{[^}]*fast\.start\(\)/)
    // and any tap on the reveal stops it
    expect(sheet).toContain('onPointerDown={() => fast.running && fast.stop()}')
  })

  it('never disables a control on the reveal or the sheet', () => {
    // The skip has to be pressable at every step, including the first and the last.
    // A blanket rule is stronger than checking one button: nothing on this screen may
    // be unavailable, so the skip cannot become unavailable either.
    expect(sheet).not.toContain('disabled')
  })

  it('hangs one shirt on every locker, with no number', () => {
    expect(rack).toContain('density="mini"')
    // the kit is dealt with `number: null`, and the rack never puts one back
    expect(rack).not.toMatch(/<KitShirt[^>]*number/)
    expect(rack).not.toContain('number:')
  })

  it('does not print a position on a locker', () => {
    // Every record grades by LINE, so a locker that named a man's position would hand
    // over his grade — and a wall of them would hand over the sheet. See the comment at
    // the head of LockerRack.tsx.
    expect(rack).not.toContain('facetsFor')
    expect(rack).not.toContain('position')
    expect(rack).not.toContain('roleHe')
  })

  it('reads the eleven from the archive and never from a list of its own', () => {
    // A second player store in a gate component is the failure `docs/16-gates-upgrade.md`
    // puts first. The board receives a bank; it does not hold one.
    for (const [name, text] of [
      ['LineupBoard', board],
      ['LockerRack', rack],
      ['TeamSheet', sheet],
    ] as const) {
      expect(text, name).not.toContain('content/manual')
      expect(/const\s+[A-Z_]*PLAYERS/.test(text), name).toBe(false)
    }
  })

  it('puts no red edge against the printed grass', () => {
    // Measured, not guessed: a red keyline antialiased against `--p-grass` averages to
    // hue 57° at saturation 0.49, which is inside `lib/isYellow.ts`'s band — seventy-four
    // pixels of it on one phone screen of a full board. Ink goes between them. The
    // affordance did not disappear; it moved to the name plate, which is cream.
    const pitch = withoutComments(readFileSync(join(ROOT, 'app/lineup/BandPitch.tsx'), 'utf8'))
    for (const [name, text] of [
      ['LineupBoard', board],
      ['TeamSheet', sheet],
      ['BandPitch', pitch],
    ] as const) {
      expect(text, name).not.toContain('outline-press-red')
      expect(text, name).not.toContain('outline-red')
      expect(text, name).not.toContain('border-press-red bg-press')
    }
  })

  it('keeps the drawn figure to one ink outline, socks included', () => {
    // The socks were the one shape on the figure drawn `stroke="none"`, which put the
    // club's red straight against whatever the figure stood on. Ten yellow pixels per
    // full pitch, in a component gate 1 shares.
    const figure = readFileSync(join(ROOT, 'components/press/PlayerFigure.tsx'), 'utf8')
    expect(figure).toContain('<g fill={kit.socks}>')
    expect(figure).not.toContain('<g fill={kit.socks} stroke="none">')
  })

  it('persists through the profile store, never through localStorage', () => {
    expect(sheet).toContain("@/lib/profile/store")
    expect(sheet).not.toContain('localStorage')
    expect(board).not.toContain('localStorage')
  })
})

describe('מפתחות שנבנים בזמן ריצה — every one of them exists', () => {
  it('has a sentence for every kind of not starting, and every zone word the board prints', () => {
    for (const key of [
      'lineup.decoy.subOn',
      'lineup.decoy.subOn.minute',
      'lineup.decoy.squad',
      'lineup.decoy.other',
      'lineup.zone.wrongLine',
      'lineup.zone.full',
      'lineup.zone.fast',
      'lineup.zone.fastStop',
      'lineup.zone.intro',
    ]) {
      expect(catalogue[key], key).toBeTruthy()
    }
    expect(catalogue['lineup.decoy.subOn.minute']).toContain('{n}')
    // spec §0.3 (22.9.2026): the squad's source moved to /credits — the sentence no longer
    // names it, and the sheet shows the one indicator instead
    expect(catalogue['lineup.decoy.squad.source']).toBeUndefined()
    expect(catalogue['lineup.decoy.squad']).not.toContain('{source}')
    expect(readFileSync(join(ROOT, 'app/lineup/TeamSheet.tsx'), 'utf8')).toContain('<SourceNote')
  })

  it('has a line label for each of the four bands', () => {
    for (const line of ['GK', 'D', 'M', 'F']) {
      expect(catalogue[`lineup.line.${line}`], line).toBeTruthy()
    }
  })

  it('has a sentence for every coach note kind, and the empty-bench variant', () => {
    for (const kind of ['stillOut', 'benchOn', 'lineRight']) {
      expect(catalogue[`lineup.coach.${kind}`], kind).toBeTruthy()
    }
    expect(catalogue['lineup.coach.benchOn.none']).toBeTruthy()
  })

  it('has a word and a note for every verdict the reveal can print', () => {
    // ONE RED WORLD §12 (28.9.2026): the right man and the man who did not start now speak in
    // the voice's own pools ("עלה איתם." / "לא באותו ערב.", `lib/voice`); the middle verdict —
    // a starter in the wrong band — keeps its own word. Flipped, not softened (rules 65, 80).
    expect(microFeedback(3, 'correct', 1, 0)?.line).toBeTruthy()
    expect(microFeedback(3, 'wrong', 1, 0)?.line).toBeTruthy()
    for (const key of [
      'lineup.reveal.mid',
      'lineup.reveal.ok.note',
      'lineup.reveal.mid.note',
      'lineup.reveal.no.note',
      'lineup.reveal.bench.note',
    ]) {
      expect(catalogue[key], key).toBeTruthy()
    }
  })

  it('fills every placeholder the coach sentences declare', () => {
    expect(catalogue['lineup.coach.stillOut']).toContain('{n}')
    expect(catalogue['lineup.coach.lineRight']).toContain('{of}')
  })
})
