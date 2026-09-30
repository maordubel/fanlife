import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { pickerRoster, resolvePlayer } from '@/lib/archive/player-master'
import { rosterIndex } from '@/lib/game/allTimeXI'
import { filterRoster, NO_FILTER } from '@/lib/game/roster-search'
import {
  BALLOT,
  POSITIONS,
  QUESTION_FILTER,
  isPositionCode,
  legacyNames,
  legacyPositionCode,
  migrateBallot,
  positionLabel,
  type Ballot,
} from '@/lib/polls/ballot'
import { mergeLegacyRows } from '@/lib/polls/board'
import { reasonsFor, type Reasons } from '@/lib/polls/reasons'
import { supporterId, supporterRecord } from '@/lib/polls/supporter'
import { WORN_SHOWN, wornBy } from '@/lib/polls/wore'
import { numberBoard } from '@/lib/polls/wore-server'
import { MESSAGES } from '@/lib/i18n'

const ROOT = join(__dirname, '..')

/**
 * שער 7 · Terrace Vote V3 (21.9.2026) — ids instead of display strings, one question at a
 * time, the pickers pre-filtered by the question, "who wore #N", and the seal that feeds
 * the Worker Card (brief §29 "Gate 7 → Worker Card").
 */

const resolveName = (name: string) => resolvePlayer(name)?.id ?? null

describe('מזהים במקום שמות — a slip stores ids and codes, and an old slip moves', () => {
  it('moves legacy display names to ids through the Player Master, spellings included', () => {
    const legacy: Ballot = {
      favourite: 'משה סיני',
      keeper: 'שביט אלימלך',
      // a spelling the master attached to a merged man — the slip still resolves
      midfield: 'עמרי אפק',
      striker: 'סרגיי קלשצ\'נקו',
      number: '7',
      position: 'בלם',
    }
    const { ballot, changed, unresolved } = migrateBallot(legacy, resolveName)
    expect(ballot.favourite).toBe(resolvePlayer('משה סיני')?.id)
    expect(ballot.midfield).toBe(resolvePlayer('עומרי אפק')?.id)
    expect(ballot.striker).toBe(resolvePlayer('סרגיי קלשנקו')?.id)
    expect(ballot.number).toBe('7')
    expect(ballot.position).toBe('CB')
    expect(changed.sort()).toEqual(['favourite', 'keeper', 'midfield', 'position', 'striker'])
    expect(unresolved).toEqual([])
  })

  it('keeps — and names — a pick it cannot move, rather than dropping a cast vote', () => {
    const { ballot, unresolved } = migrateBallot({ favourite: 'איש שאינו בארכיון', position: 'ליברו' }, resolveName)
    expect(ballot.favourite).toBe('איש שאינו בארכיון')
    expect(ballot.position).toBe('ליברו')
    expect(unresolved.sort()).toEqual(['favourite', 'position'])
  })

  it('leaves an already-migrated slip exactly as it is', () => {
    const id = resolvePlayer('משה סיני')?.id as string
    const current: Ballot = { favourite: id, number: '10', position: 'ST' }
    const again = migrateBallot(current, () => {
      throw new Error('an id must never be sent to be resolved')
    })
    expect(again.ballot).toEqual(current)
    expect(again.changed).toEqual([])
    expect(legacyNames(current)).toEqual([])
    expect(legacyNames({ favourite: 'משה סיני', number: '9' })).toEqual(['משה סיני'])
  })

  it('stores a position as its code and prints it as its label', () => {
    for (const position of POSITIONS) {
      expect(isPositionCode(position.id)).toBe(true)
      const label = positionLabel(position.id)
      expect(label).toBe(MESSAGES[position.he])
      expect(legacyPositionCode(label as string)).toBe(position.id)
    }
    expect(positionLabel('XX')).toBeNull()
  })

  it('folds tally rows cast as names or labels into the id and the code, never losing a vote', () => {
    const id = resolvePlayer('משה סיני')?.id as string
    const legacy = Object.fromEntries(pickerRoster().players.map((player) => [player.nameHe, player.id]))
    const canonical = (pick: string) => (pick.startsWith('p_') ? pick : (legacy[pick] ?? legacyPositionCode(pick)))
    const merged = mergeLegacyRows(
      {
        total: 9,
        rows: [
          { pick: id, votes: 4 },
          { pick: 'משה סיני', votes: 3 },
          { pick: 'מישהו אחר לגמרי', votes: 2 },
        ],
      },
      canonical,
    )
    expect(merged?.total).toBe(9)
    expect(merged?.rows).toEqual([
      { pick: id, votes: 7 },
      { pick: 'מישהו אחר לגמרי', votes: 2 },
    ])
    const positions = mergeLegacyRows({ total: 3, rows: [{ pick: 'שוער', votes: 1 }, { pick: 'GK', votes: 2 }] }, canonical)
    expect(positions?.rows).toEqual([{ pick: 'GK', votes: 3 }])
    expect(mergeLegacyRows(null, canonical)).toBeNull()
  })
})

describe('הבוחר נפתח מסונן — by the question, never by names the app chose', () => {
  const roster = rosterIndex()

  it('opens each player question on its own position, and the foreigner on the foreign-slot record', () => {
    expect(QUESTION_FILTER.keeper).toEqual({ position: 'GK' })
    expect(QUESTION_FILTER.centreback).toEqual({ position: 'DF' })
    expect(QUESTION_FILTER.midfield).toEqual({ position: 'MF' })
    expect(QUESTION_FILTER.striker).toEqual({ position: 'FW' })
    expect(QUESTION_FILTER.foreign).toEqual({ origin: 'foreign' })
    expect(QUESTION_FILTER.favourite).toEqual({})
    for (const question of BALLOT.filter((row) => row.kind === 'roster')) {
      const narrowed = filterRoster(roster.all, { ...NO_FILTER, ...QUESTION_FILTER[question.id] })
      expect(narrowed.length, question.id).toBeGreaterThan(10)
    }
    // the keepers are keepers, by a source's word
    for (const entry of filterRoster(roster.all, { ...NO_FILTER, position: 'GK' })) {
      expect([entry.position, ...(entry.positions ?? [])], entry.nameHe).toContain('GK')
    }
  })

  it('hard-codes no featured name anywhere in the wing', () => {
    const names = new Set(roster.all.map((entry) => entry.nameHe))
    for (const path of [
      'app/polls/BallotSheet.tsx',
      'components/ballot/QuestionStage.tsx',
      'components/ballot/VoteReaction.tsx',
      'components/ballot/Manifesto.tsx',
      'lib/polls/ballot.ts',
    ]) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      for (const name of names) expect(text.includes(`'${name}'`), `${path} names ${name}`).toBe(false)
    }
    const sheet = readFileSync(join(ROOT, 'app/polls/BallotSheet.tsx'), 'utf8')
    expect(sheet).toContain('initialFilter={filter}')
  })
})

describe('מי לבש את המספר — season-bound holders, each with its source', () => {
  const board = numberBoard()

  it('answers every held number with rows that carry a season and a named source', () => {
    let rows = 0
    for (const [n, list] of Object.entries(board.byNumber)) {
      expect(Number(n)).toBeGreaterThanOrEqual(1)
      expect(Number(n)).toBeLessThanOrEqual(99)
      for (const row of list) {
        rows += 1
        expect(row.seasonLabel, `#${n} ${row.nameHe}`).toMatch(/^\d{4}\/\d{2}$/)
        expect(board.sources[row.source]?.title.length, `#${n} ${row.nameHe}`).toBeGreaterThan(5)
      }
      const seasons = list.map((row) => row.seasonLabel)
      expect(seasons, `#${n}`).toEqual([...seasons].sort())
    }
    expect(rows).toBeGreaterThan(200)
    expect(WORN_SHOWN).toBeLessThanOrEqual(6)
  })

  it('says nothing where the archive holds no season-bound record, rather than guessing', () => {
    const empty = Array.from({ length: 99 }, (_, index) => index + 1).filter((n) => wornBy(board, n).length === 0)
    expect(empty.length).toBeGreaterThan(0)
    expect(wornBy(null, 7)).toEqual([])
    expect(MESSAGES['poll.number.worn.none']).toContain('אין מקור')
  })
})

describe('החותמת — the seal feeds the Worker Card through the progress layer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('writes book.supporter with the favourite id, the position code and the reasons — and the number stays on the book', async () => {
    const store = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
      },
      matchMedia: () => ({ matches: true }),
      location: { href: 'http://localhost/polls', search: '' },
    })
    const { emit } = await import('@/lib/profile/events')
    const { readBook, writeBook } = await import('@/lib/game/member')
    const { readProfile } = await import('@/lib/profile/store')

    const favourite = resolvePlayer('משה סיני')?.id as string
    const ballot: Ballot = {
      favourite,
      keeper: resolvePlayer('שביט אלימלך')?.id as string,
      centreback: resolvePlayer('שמעון גרשון')?.id as string,
      midfield: resolvePlayer('גאבור הלמאי')?.id as string,
      striker: resolvePlayer('שייע פייגנבוים')?.id as string,
      foreign: resolvePlayer('מילאן אוסטרץ')?.id as string,
      number: '17',
      position: 'CM',
    }
    const reasons: Reasons = {
      favourite: reasonsFor('favourite')[0]!,
      striker: reasonsFor('striker')[1]!,
    }
    // the number question writes the book's own field, as the screen does
    writeBook({ ...readBook(), number: 17 })

    emit({ type: 'ballot_sealed', supporter: supporterRecord(ballot, reasons, '2026-09-21') })

    const book = readBook()
    expect(book.supporter).toEqual({
      favouriteId: favourite,
      positionCode: 'CM',
      reasons: { favourite: reasons.favourite, striker: reasons.striker },
      sealedOn: '2026-09-21',
    })
    expect(book.number).toBe(17)
    // and the seal is the wing's deed
    expect(readProfile().deeds['/polls']?.on).toBeTruthy()

    // the identity card reads it back as a person
    const id = supporterId(ballot, reasons, book, (question, pick) =>
      question.kind === 'position' ? (positionLabel(pick) ?? pick) : question.kind === 'roster' ? (pickerRoster().players.find((player) => player.id === pick)?.nameHe ?? pick) : pick,
    )
    expect(id.favourite).toBe('משה סיני')
    expect(id.number).toBe(17)
    expect(id.positionHe).toBe(MESSAGES['pos.cm'])
    expect(id.reasons.map((row) => row.questionId)).toEqual(['favourite', 'striker'])
  })

  it('never puts a display name into the record, and leaves a legacy favourite out', () => {
    const record = supporterRecord({ favourite: 'משה סיני', position: 'בלם' }, {}, '2026-09-21')
    expect(record.favouriteId).toBeNull()
    expect(record.positionCode).toBeNull()
  })

  it('is emitted by the screen at the seal, with every vote reported by question only', () => {
    const sheet = readFileSync(join(ROOT, 'app/polls/BallotSheet.tsx'), 'utf8')
    expect(sheet).toContain("type: 'ballot_sealed'")
    expect(sheet).toContain('supporterRecord(')
    expect(sheet).toContain("emit({ type: 'vote_cast', questionId: target.id })")
    expect(sheet).not.toContain('recordDeed')
    // the migrated slip is written back to paper, never cast
    const store = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')
    const rewrite = store.slice(store.lastIndexOf('rewrite(ballot: Ballot)'))
    expect(rewrite).not.toContain('rpc_poll_vote')
  })

  it('advances in 2600ms with an archive row to read and about 1500ms without, and is always skippable', () => {
    const reaction = readFileSync(join(ROOT, 'components/ballot/VoteReaction.tsx'), 'utf8')
    expect(reaction).toContain('export const ADVANCE_MS = 2600')
    expect(reaction).toContain('export const ADVANCE_MS_BARE = 1500')
    expect(reaction).toContain('hasArchive ? ADVANCE_MS : ADVANCE_MS_BARE')
    expect(reaction).toContain('onClick={skip}')
  })

  it('celebrates with the house confetti, which draws nothing under reduced motion', () => {
    const manifesto = readFileSync(join(ROOT, 'components/ballot/Manifesto.tsx'), 'utf8')
    expect(manifesto).toContain("from '@/components/play/Confetti'")
    const confetti = readFileSync(join(ROOT, 'components/play/Confetti.tsx'), 'utf8')
    expect(confetti).toContain('prefers-reduced-motion')
    expect(MESSAGES['poll.manifesto.sentence']).toContain('{favourite}')
  })
})
