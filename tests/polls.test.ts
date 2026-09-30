import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { BALLOT, NUMBERS, POSITIONS, ballotComplete, ballotFilled, type Tally } from '@/lib/polls/ballot'
import { boardDisplay, histogramBars, positionBars, rankRows, MIN_BALLOTS_FOR_PERCENT } from '@/lib/polls/board'
import {
  REASONS,
  cleanReasons,
  isReasonOf,
  reasonCount,
  reasonsFor,
  type Reasons,
} from '@/lib/polls/reasons'
import { factIsEmpty, pickFact, spanOf } from '@/lib/polls/pickFact'
import { shirtName, shirtNumber, supporterId } from '@/lib/polls/supporter'
import messages from '@/messages/he.json'

const ROOT = join(__dirname, '..')
const catalogue = messages as Record<string, string>

describe('שער 7 — אגף הסקרים', () => {
  it('asks each question once', () => {
    const ids = BALLOT.map((question) => question.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has every question in the catalogue, in both languages the slip prints', () => {
    for (const question of BALLOT) {
      expect(catalogue[question.ask], `${question.id} has no Hebrew`).toBeTruthy()
      // The Latin line is printed on the share card, so an empty one is a hole in the
      // artwork rather than a missing translation — it is checked here, not in i18n.
      expect(question.latin.trim().length, `${question.id} has no Latin line`).toBeGreaterThan(0)
      expect(question.latin).toMatch(/^[A-Z0-9 ·'-]+$/)
    }
  })

  it('gives every position a Hebrew name and a distinct code', () => {
    for (const position of POSITIONS) {
      expect(catalogue[position.he], `${position.id}`).toBeTruthy()
    }
    expect(new Set(POSITIONS.map((position) => position.id)).size).toBe(POSITIONS.length)
  })

  it('offers a squad number, not a starting eleven', () => {
    expect(NUMBERS[0]).toBe(1)
    expect(NUMBERS[NUMBERS.length - 1]).toBe(99)
    expect(NUMBERS).toHaveLength(99)
  })

  it('counts a partly filled slip and knows when it is finished', () => {
    expect(ballotFilled({})).toBe(0)
    expect(ballotComplete({})).toBe(false)
    const half = Object.fromEntries(
      BALLOT.slice(0, 3).map((question) => [question.id, 'שם'] as const),
    )
    expect(ballotFilled(half)).toBe(3)
    expect(ballotComplete(half)).toBe(false)
    const all = Object.fromEntries(BALLOT.map((question) => [question.id, 'שם'] as const))
    expect(ballotComplete(all)).toBe(true)
  })

  it('ignores a stale key and an empty pick when counting', () => {
    // The local store reads back whatever the browser kept, which may be a ballot from
    // a build with different questions in it. A count that trusted the object's keys
    // would report 9/8 to somebody who last voted a version ago.
    expect(ballotFilled({ retired: 'שם', [BALLOT[0]!.id]: '' })).toBe(0)
  })
})

describe('הקלפי — the storage seam', () => {
  const store = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')

  it('keeps localStorage behind the interface, so the screen never sees it', () => {
    for (const path of [
      'app/polls/BallotSheet.tsx',
      'components/ballot/BallotSlip.tsx',
      'app/polls/board/page.tsx',
      'app/polls/board/CountBoard.tsx',
      'lib/polls/board.ts',
    ]) {
      expect(readFileSync(join(ROOT, path), 'utf8'), path).not.toContain('localStorage')
    }
    expect(store).toContain('localStorage')
  })

  it('is async on every call, so the screen is already written for a round trip', () => {
    for (const signature of [
      'read(): Promise<Ballot>',
      'save(questionId: string, pick: string): Promise<void>',
      'clear(): Promise<void>',
      'tally(questionId: string): Promise<Tally | null>',
      // Sealing is a fifth call, added for the committee-sheet document (B1): a
      // separate fact from the picks, so `read()` never had to change shape to carry
      // it, and the count board's own route can ask for it without touching a picks.
      'sealed(): Promise<boolean>',
      'seal(): Promise<void>',
    ]) {
      expect(store, signature).toContain(signature)
    }
  })

  it('clears the seal along with the picks, so "פתק חדש" is a clean slate', () => {
    // Two keys, so `read()` never had to grow a wrapper shape — but `clear()` has to
    // know about both, or a fresh slip would open already sealed.
    expect(store).toMatch(/SEAL_KEY/)
    const clearBody = store.slice(store.indexOf('async clear'), store.indexOf('async tally'))
    expect(clearBody, 'clear() must drop the seal, not only the picks').toContain('SEAL_KEY')
  })

  it('never wraps a browser API without a catch', () => {
    // A poll that throws during render because the browser blocks site data is a worse
    // failure than a poll that forgets a vote.
    const uses = store.split('\n').filter((line) => line.includes('window.localStorage'))
    expect(uses.length).toBeGreaterThan(0)
    expect(store.match(/catch\s*\{/g)?.length ?? 0).toBeGreaterThanOrEqual(uses.length)
  })

  it('reports honestly that it cannot count a terrace', () => {
    expect(store).toContain('readonly countable = false')
  })
})

describe('הפתק לא ממציא קולות', () => {
  it('ships no seeded or baseline vote anywhere in the wing', () => {
    for (const path of [
      'lib/polls/ballot.ts',
      'lib/polls/store.ts',
      'lib/polls/board.ts',
      'app/polls/BallotSheet.tsx',
      'components/ballot/BallotSlip.tsx',
      'app/polls/board/page.tsx',
      'app/polls/board/CountBoard.tsx',
      'lib/polls/reasons.ts',
      'lib/polls/supporter.ts',
      'lib/polls/pickFact.ts',
      'components/ballot/VoteReaction.tsx',
      'components/ballot/SupporterId.tsx',
    ]) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      // A tally that arrives from anywhere other than a store is a fabricated one. The
      // whole wing is built on there being no such thing (rule 11).
      expect(text, path).not.toMatch(/votes:\s*\d/)
      expect(text, path).not.toMatch(/Math\.random/)
    }
  })

  it('ships no "מוקאפ" badge — there is no demo data to warn anybody about', () => {
    // Checked as the reference's own badge phrase, not the bare word "מוקאפ" — this
    // file's doc comment above uses that word to EXPLAIN the omission, which is not
    // the same thing as shipping the badge it is explaining.
    for (const path of ['app/polls/board/page.tsx', 'app/polls/board/CountBoard.tsx']) {
      const text = readFileSync(join(ROOT, path), 'utf8')
      expect(text, path).not.toContain('נתוני הדגמה')
    }
  })

  it('says out loud, in the catalogue, that there is no count yet', () => {
    expect(catalogue['poll.noCount']).toBeTruthy()
    expect(catalogue['poll.noCountBody']).toContain('ממציאים')
  })
})

/**
 * לוח הספירה — the count board's arithmetic, exercised entirely with fixture tallies.
 *
 * `LocalBallotStore.tally()` always resolves `null` (see the describe block above), so
 * these three shapes never actually render from real data in this build. That is the
 * point: the brief asks for the ≥100 and <100 renderers to be "covered by tests with
 * fixture data rather than by seeded rows in the product", and this is that coverage —
 * `lib/polls/board.ts` never reads a store, so nothing here touches one either.
 */
describe('לוח הספירה — כלל המאה, על נתוני בדיקה בלבד', () => {
  it('shows the honesty plate with no tally at all', () => {
    expect(boardDisplay(null, null).kind).toBe('honest')
  })

  it('shows the honesty plate when the only vote on record is your own', () => {
    const tally: Tally = { total: 1, rows: [{ pick: 'יוסי אבוקסיס', votes: 1 }] }
    expect(boardDisplay(tally, 'יוסי אבוקסיס').kind).toBe('honest')
  })

  it('does not call a single vote "yours" when it belongs to somebody else', () => {
    // one real ballot that is not yours is a raw count of one, not the honesty plate —
    // and never printed as a lonely 100%
    const tally: Tally = { total: 1, rows: [{ pick: 'שמעון גרשון', votes: 1 }] }
    const display = boardDisplay(tally, 'יוסי אבוקסיס')
    expect(display.kind).toBe('raw')
    if (display.kind === 'raw') expect(display.remaining).toBe(MIN_BALLOTS_FOR_PERCENT - 1)
  })

  it('prints exact integers, no bar and no percent, under a hundred ballots', () => {
    const tally: Tally = {
      total: 63,
      rows: [
        { pick: 'ציקי קוטלר', votes: 29 },
        { pick: 'ערן זהבי', votes: 11 },
      ],
    }
    const display = boardDisplay(tally, 'ציקי קוטלר')
    expect(display.kind).toBe('raw')
    if (display.kind === 'raw') {
      expect(display.remaining).toBe(37)
      expect(display.myMajority).toBe(true)
    }
  })

  it('only earns a percentage at a hundred ballots, not at ninety-nine', () => {
    const under: Tally = { total: 99, rows: [{ pick: 'א', votes: 99 }] }
    const over: Tally = { total: 100, rows: [{ pick: 'א', votes: 100 }] }
    expect(boardDisplay(under, 'א').kind).toBe('raw')
    expect(boardDisplay(over, 'א').kind).toBe('percent')
  })

  it('marks your pick with or against the lead once there is a real count', () => {
    const tally: Tally = {
      total: 200,
      rows: [
        { pick: 'יוסי אבוקסיס', votes: 120 },
        { pick: 'שמעון גרשון', votes: 80 },
      ],
    }
    const withLead = boardDisplay(tally, 'יוסי אבוקסיס')
    const against = boardDisplay(tally, 'שמעון גרשון')
    if (withLead.kind === 'percent') expect(withLead.myMajority).toBe(true)
    else throw new Error('expected percent')
    if (against.kind === 'percent') expect(against.myMajority).toBe(false)
    else throw new Error('expected percent')
  })

  it('ranks rows by votes, rounds a percentage and marks only the top three', () => {
    const rows = rankRows(
      [
        { pick: 'א', votes: 31 },
        { pick: 'ב', votes: 22 },
        { pick: 'ג', votes: 17 },
        { pick: 'ד', votes: 11 },
        { pick: 'ה', votes: 8 },
      ],
      89,
    )
    expect(rows.map((row) => row.pick)).toEqual(['א', 'ב', 'ג', 'ד', 'ה'])
    expect(rows[0]!.top).toBe(true)
    expect(rows[2]!.top).toBe(true)
    expect(rows[3]!.top).toBe(false)
    expect(rows[0]!.pct).toBe(35) // 31 / 89, rounded
  })

  it('draws the shirt-number histogram over the full picker range, not only the numbers somebody chose', () => {
    const tally: Tally = {
      total: 3,
      rows: [
        { pick: '7', votes: 2 },
        { pick: '99', votes: 1 },
      ],
    }
    const bars = histogramBars(tally, NUMBERS)
    expect(bars).toHaveLength(NUMBERS.length)
    expect(bars.find((bar) => bar.n === 7)?.votes).toBe(2)
    expect(bars.find((bar) => bar.n === 50)?.votes).toBe(0)
  })

  it('lists every position even when some of the eight never received a vote', () => {
    // keyed by code since 21.9.2026 — a ballot stores `GK`, the board prints the label
    const tally: Tally = { total: 4, rows: [{ pick: 'GK', votes: 4 }] }
    const rows = positionBars(tally, POSITIONS)
    expect(rows).toHaveLength(POSITIONS.length)
    expect(rows.find((row) => row.pick === 'CB')?.votes).toBe(0)
    expect(rows.find((row) => row.pick === 'GK')?.votes).toBe(4)
  })
})


/**
 * שבבי ה"למה" — the reason chips, and the two properties that keep them safe.
 *
 * A reason is a KEY, so nothing typed ever enters storage and no sentence can attach
 * itself to a named footballer; and a reason is never counted, so no screen can print a
 * proportion of something nobody has a hundred ballots of.
 */
describe('למה דווקא זה — the reason chips', () => {
  it('offers reasons for every question on the slip, and only for them', () => {
    for (const question of BALLOT) {
      expect(reasonsFor(question.id).length, question.id).toBeGreaterThanOrEqual(3)
    }
    for (const id of Object.keys(REASONS)) {
      expect(BALLOT.some((question) => question.id === id), `${id} is not a question`).toBe(true)
    }
  })

  it('has every chip in the catalogue, and no two questions sharing a key', () => {
    const seen = new Map<string, string>()
    for (const question of BALLOT) {
      for (const reason of reasonsFor(question.id)) {
        expect(catalogue[reason], reason).toBeTruthy()
        // A key shared by two questions would let one question's saved reason validate
        // against the other, which is exactly what `isReasonOf` exists to refuse.
        expect(seen.has(reason), `${reason} is offered by two questions`).toBe(false)
        seen.set(reason, question.id)
      }
    }
  })

  it('refuses a reason the question does not offer', () => {
    const mine = reasonsFor('striker')[0]!
    expect(isReasonOf('striker', mine)).toBe(true)
    expect(isReasonOf('keeper', mine)).toBe(false)
    expect(isReasonOf('striker', 'poll.why.nothing.like.this')).toBe(false)
  })

  it('drops a retired question and a foreign reason when reading storage back', () => {
    // A slip kept by an older build can carry a question this build no longer asks, or
    // a chip it no longer offers. Printing either would put a sentence on the supporter
    // card that nothing on screen ever offered them.
    const raw = {
      striker: reasonsFor('striker')[0]!,
      keeper: reasonsFor('striker')[1]!, // right shape, wrong question
      retired: reasonsFor('striker')[0]!,
      number: 7,
    }
    const clean = cleanReasons(raw as Record<string, unknown>)
    expect(Object.keys(clean)).toEqual(['striker'])
    expect(reasonCount(clean)).toBe(1)
  })

  it('never leaves the device — no reason is sent to the vote or read from the tally', () => {
    const store = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')
    // `worker_poll_cast` takes exactly three parameters and none of them is a reason. A
    // fourth would need a column on `worker_poll_vote`, and the migration's §3 argues at length
    // that every column on that table is one more thing eight rows sharing a device id
    // can be joined on.
    const cast = store.slice(store.indexOf("rpc('worker_poll_cast'"), store.indexOf('/** Clears this device'))
    expect(cast).toContain('p_device_id')
    expect(cast).toContain('p_question_id')
    expect(cast).toContain('p_pick')
    expect(cast).not.toContain('reason')
    // and the board — the only thing that prints a proportion — never sees one
    expect(readFileSync(join(ROOT, 'lib/polls/board.ts'), 'utf8')).not.toContain('reason')
    expect(readFileSync(join(ROOT, 'app/polls/board/CountBoard.tsx'), 'utf8')).not.toContain('reason')
  })

  it('clears the reasons along with the picks and the seal', () => {
    const store = readFileSync(join(ROOT, 'lib/polls/store.ts'), 'utf8')
    const clearBody = store.slice(store.indexOf('async clear'), store.indexOf('async tally'))
    expect(clearBody).toContain('REASON_KEY')
  })
})

/**
 * תעודת אוהד — the slip read back as a person. Every field is derived; nothing is stored.
 */
describe('תעודת אוהד — the supporter ID', () => {
  const full = Object.fromEntries(
    BALLOT.map((question) => [question.id, question.id === 'number' ? '17' : 'שם'] as const),
  )

  it('reads the number off the ballot, and refuses anything that is not a shirt number', () => {
    expect(shirtNumber({ number: '17' })).toBe(17)
    expect(shirtNumber({ number: '1' })).toBe(1)
    expect(shirtNumber({ number: '99' })).toBe(99)
    expect(shirtNumber({})).toBeNull()
    expect(shirtNumber({ number: '0' })).toBeNull()
    expect(shirtNumber({ number: '100' })).toBeNull()
    expect(shirtNumber({ number: 'שבע' })).toBeNull()
    expect(shirtNumber({ number: '7; drop' })).toBeNull()
  })

  it('trims a name to what a shirt can carry, and calls an empty one null', () => {
    expect(shirtName('  מאור   הראל ')).toBe('מאור הראל')
    expect(shirtName('')).toBeNull()
    expect(shirtName('   ')).toBeNull()
    expect(shirtName(null)).toBeNull()
    expect(shirtName('א'.repeat(40))!.length).toBe(18)
  })

  it('takes the name and the number from the member book, never from a second record', () => {
    // The brief: "do not duplicate these fields separately if the profile already stores
    // them." The book is `lib/game/member.ts`, which gate 10 prints and `lib/portal/sync`
    // already carries up as `worker_profile.display_name`.
    const source = readFileSync(join(ROOT, 'app/polls/BallotSheet.tsx'), 'utf8')
    expect(source).toContain("from '@/lib/game/member'")
    expect(source).not.toContain('localStorage')
    const supporter = readFileSync(join(ROOT, 'lib/polls/supporter.ts'), 'utf8')
    // the derivation itself must stay pure — no storage, no browser. It may name the
    // book's record TYPE (the seal it derives), never import a function that touches it.
    expect(supporter).not.toContain('localStorage')
    expect(supporter).not.toMatch(/import \{[^}]*\} from '@\/lib\/game\/member'/)
    expect(supporter).toContain("import type { SupporterRecord } from '@/lib/game/member'")
  })

  it('prefers the ballot answer over the book, so the card describes one afternoon', () => {
    const id = supporterId(full, {}, { nameHe: 'מאור', number: 9 })
    expect(id.number).toBe(17)
    expect(id.nameHe).toBe('מאור')
    // and falls back to the book when the question has not been answered
    const blank = supporterId({}, {}, { nameHe: null, number: 9 })
    expect(blank.number).toBe(9)
    expect(blank.nameHe).toBeNull()
  })

  it('lists a reason only where there is both a pick and a reason', () => {
    const reasons: Reasons = {
      striker: reasonsFor('striker')[0]!,
      keeper: reasonsFor('keeper')[0]!,
    }
    const partial = { striker: 'שייע פייגנבוים' }
    const id = supporterId(partial, reasons, {})
    expect(id.reasons.map((row) => row.questionId)).toEqual(['striker'])
    expect(id.reasons[0]!.pick).toBe('שייע פייגנבוים')
    // `reasoned` counts what was marked; the LIST prints what can be printed
    expect(id.reasoned).toBe(2)
    expect(id.filled).toBe(1)
  })

  it('says nothing rather than something when the slip is empty', () => {
    const id = supporterId({}, {}, {})
    expect(id.favourite).toBeNull()
    expect(id.positionHe).toBeNull()
    expect(id.number).toBeNull()
    expect(id.reasons).toEqual([])
    expect(catalogue['poll.id.noReasons']).toBeTruthy()
    expect(catalogue['poll.id.noName']).toBeTruthy()
  })
})

/**
 * מה שהארכיון מחזיק עליו — the panel that replaced the reference's crowd quotes.
 */
describe('אחרי הבחירה — sourced rows, never a terrace that was never counted', () => {
  const roster = [
    {
      slug: 'a',
      nameHe: 'משה סיני',
      givenHe: 'משה',
      familyHe: 'סיני',
      initial: 'ס',
      position: 'MF' as const,
      positionFrom: 'squad' as const,
      origin: 'israeli' as const,
      originFrom: 'squad' as const,
      fromYear: 1979,
      toYear: 1992,
    },
    {
      slug: 'b',
      nameHe: 'מי שאין עליו כלום',
      givenHe: 'מי',
      familyHe: 'כלום',
      initial: 'כ',
      position: null,
      positionFrom: null,
      origin: null,
      originFrom: null,
      fromYear: null,
      toYear: null,
    },
  ]
  const shirts = {
    bySlug: { a: { seasonLabel: '1985/86', why: 'trophy' as const } },
    seasons: {
      '1985/86': {
        seasonLabel: '1985/86',
        spec: { seasonLabel: '1985/86' },
        noteHe: '',
        sourceTitle: 'ארכיון החולצות',
        wonHe: ['אליפות'],
      },
    },
    versions: {},
    defaultVersion: {},
    withShirt: 1,
    withoutShirt: 1,
    withVersions: 0,
  }

  it('joins a picked name to the shirt and the facets the archive already holds', () => {
    const fact = pickFact('משה סיני', roster as never, shirts as never)!
    expect(fact.position).toBe('MF')
    expect(fact.seasonLabel).toBe('1985/86')
    expect(fact.sourceTitle).toBe('ארכיון החולצות')
    expect(spanOf(fact)).toBe('1979–1992')
    expect(factIsEmpty(fact)).toBe(false)
  })

  it('stays silent for a man the archive cannot place, and for a name it cannot resolve', () => {
    const blank = pickFact('מי שאין עליו כלום', roster as never, shirts as never)!
    expect(blank.position).toBeNull()
    expect(blank.spec).toBeNull()
    expect(spanOf(blank)).toBeNull()
    expect(factIsEmpty(blank)).toBe(true)
    expect(catalogue['poll.fact.silent']).toBeTruthy()

    // no fuzzy matching: a name that does not resolve exactly answers null (rule 7)
    expect(pickFact('סיני', roster as never, shirts as never)).toBeNull()
    expect(pickFact('', roster as never, shirts as never)).toBeNull()
    expect(pickFact(null, roster as never, shirts as never)).toBeNull()
  })

  it('keeps one span for a single season rather than a range from itself to itself', () => {
    const one = pickFact('משה סיני', [{ ...roster[0]!, toYear: 1979 }] as never, null)!
    expect(spanOf(one)).toBe('1979')
  })

  it('prints no invented crowd line anywhere in the reaction', () => {
    // The reference fills this beat with quoted terrace opinions. A line in quotation
    // marks about what supporters think, with no count behind it, is the fabricated
    // participation figure with the digits taken out (rules 11 and 18).
    const reaction = readFileSync(join(ROOT, 'components/ballot/VoteReaction.tsx'), 'utf8')
    for (const quote of ['“', '”', '„']) {
      expect(reaction.includes(quote), `a quoted line in ${quote}`).toBe(false)
    }
    // and nothing in the wing's own strings puts words in a supporter's mouth either
    const pollKeys = Object.keys(catalogue).filter((key) => key.startsWith('poll.'))
    expect(pollKeys.length).toBeGreaterThan(40)
    for (const key of pollKeys) expect(catalogue[key], key).not.toMatch(/[“”„]/)
  })

  it('reuses one player source and one kit renderer rather than forking either', () => {
    const fact = readFileSync(join(ROOT, 'lib/polls/pickFact.ts'), 'utf8')
    expect(fact).toContain("from '@/lib/game/allTimeXI'")
    expect(fact).toContain("from '@/lib/xi/board'")
    // no second roster, no second shirt table
    expect(fact).not.toMatch(/const\s+(ROSTER|PLAYERS|KITS)\s*=/)
    for (const path of ['components/ballot/VoteReaction.tsx', 'components/ballot/SupporterId.tsx']) {
      expect(readFileSync(join(ROOT, path), 'utf8'), path).toContain("from '@/components/kit/")
    }
  })
})

/**
 * הקצב — the beat between a pick and the next question, and the three ways out of it.
 */
describe('הקצב — auto-advance that can always be left', () => {
  const reveal = readFileSync(join(ROOT, 'components/play/Reveal.tsx'), 'utf8')

  it('is one file, shared by both gates that have a beat', () => {
    for (const path of ['components/ballot/VoteReaction.tsx', 'components/memory/FusionPlate.tsx']) {
      expect(readFileSync(join(ROOT, path), 'utf8'), path).toContain(
        "from '@/components/play/Reveal'",
      )
    }
  })

  it('ends by itself, ends on a tap, and can be cancelled without firing', () => {
    expect(reveal).toContain('skip')
    expect(reveal).toContain('cancel')
    // `cancel` must not call the callback: that is the whole of "שיניתי את דעתי"
    const stop = reveal.slice(reveal.indexOf('const stop ='), reveal.indexOf('useEffect'))
    expect(stop).not.toContain('done.current()')
  })

  it('draws no moving bar for a reader who asked for stillness', () => {
    expect(reveal).toContain('prefers-reduced-motion')
    expect(reveal).toContain('motion-reduce:hidden')
  })

  it('gives the reaction a way back to the picker it came from', () => {
    const reaction = readFileSync(join(ROOT, 'components/ballot/VoteReaction.tsx'), 'utf8')
    expect(reaction).toContain('onRethink')
    expect(catalogue['poll.reaction.rethink']).toBeTruthy()
    // and the dialog sits above the tab bar, like every other one (rule 33)
    expect(reaction).toContain('z-[60]')
  })

  it('lets Escape dismiss without answering the next question', () => {
    // `useDialog` wires Escape. Handing it `skip` would make the key that means "get me
    // out of here" also advance the ballot, which is the one thing a dismissal must not
    // do — so the handler cancels the beat and closes.
    const reaction = readFileSync(join(ROOT, 'components/ballot/VoteReaction.tsx'), 'utf8')
    const wiring = reaction.slice(reaction.indexOf('useDialog<'), reaction.indexOf('const chips'))
    expect(wiring).toContain('cancel()')
    expect(wiring).toContain('onClose()')
    expect(wiring).not.toContain('skip')
  })
})
