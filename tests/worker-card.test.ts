import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cardExtras, bestTopicOf } from '@/app/tik/actions'
import {
  CODE39_TABLE,
  STAMP_ORDER,
  WALL_REPEATS,
  barcodeBars,
  cardStamps,
  draftBook,
  draftDirty,
  draftOf,
  fanYears,
  figureText,
  hebrewList,
  lineFigures,
  oathLines,
  oathTags,
  patchOf,
  revengeOf,
  storyItems,
  toggleValue,
  type CardDraft,
} from '@/app/tik/cardView'
import { ISSUE_MS } from '@/app/tik/IssueBeat'
import { kitKeyParts } from '@/app/tik/KeptPanel'
import { MemberBook as MemberBookPages } from '@/app/tik/MemberBook'
import { resolvePlayer } from '@/lib/archive/player-master'
import { SHIRT_NUMBERS } from '@/components/profile/NumberPicker'
import { GATES, PLAYABLE_GATES } from '@/lib/gates'
import { applyCardPatch, emptyBook, NAME_MAX, type MemberBook } from '@/lib/game/member'
import { MESSAGES } from '@/lib/i18n'
import { kitCatalog } from '@/lib/kit/catalog'
import { DEFAULT_SPEC } from '@/lib/kit/spec'
import { reasonsFor, type Reasons } from '@/lib/polls/reasons'
import { supporterRecord } from '@/lib/polls/supporter'
import type { Ballot } from '@/lib/polls/ballot'
import { STAMPS, cardStory, workerCard, type CardInputs, type WorkerCardState } from '@/lib/profile/card'
import { applyEvent, type ProgressEvent } from '@/lib/profile/events'
import type { Marks } from '@/lib/profile/marks'
import { emptyProfile, type Profile } from '@/lib/profile/store'

/**
 * שער 10 — כרטיס הפועל, as the screen draws it (21.9.2026).
 *
 * `tests/progress.test.ts` holds the derivation (`workerCard`) to the progress record.
 * This file holds the SCREEN to the derivation, and the brief's §29 list for gate 10:
 * a fixture per gate on the wall, gate 7's seal reaching the card, an anonymous card that
 * is honest about being empty, a share card with no free text on it, stamps that come out
 * the same whatever order they were earned in, and plate 9 lit by the ids a device
 * already holds. Everything is pure, except one block that stubs `window` and runs the
 * real `emit` → book → card path, as the screen does.
 */

const DAY = '2026-09-21'
const TODAY = new Date('2026-09-21T12:00:00Z')
const ROOT = join(__dirname, '..')

function fresh(over: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), since: '', ...over }
}

function book(over: Partial<MemberBook> = {}): MemberBook {
  return { ...emptyBook(), tik: 'TIK-0417', nameHe: '', number: 17, since: 2026, punches: [], ...over }
}

function feed(events: ProgressEvent[], date = DAY): Profile {
  let profile = fresh()
  for (const event of events) profile = applyEvent(profile, event, { date }).profile
  return profile
}

function card(profile: Profile, over: Partial<CardInputs> = {}): WorkerCardState {
  return workerCard({ profile, book: book(), today: TODAY, ...over })
}

const figure = (state: WorkerCardState, gate: number, key: string) =>
  state.lines.find((line) => line.gate === gate)?.figures.find((f) => f.key === key)

/* ------------------------------------------------------------------ one gate at a time */

describe('כל שער כותב שורה — a fixture per gate on the wall (identity spec §3.5)', () => {
  it('gate 1 — the sheets saved, out of two', () => {
    const state = card(feed([{ type: 'deed', gate: '/xi', mark: 'a1b2c3d4' }]), {
      device: { xi: 1, kitKeys: [], designs: 0, ballot: 0, life: null },
    })
    expect(state.lines.find((l) => l.gate === 1)?.lit).toBe(true)
    expect(figure(state, 1, 'sheets')).toEqual({ key: 'sheets', value: 1, of: 2 })
  })

  it('gate 2 — rounds, right out of asked, the strongest topic from the ledger, and Revenge', () => {
    const profile = feed([
      { type: 'gate_completed', gate: '/trivia', score: 80, correct: 9, asked: 12 },
      { type: 'gate_completed', gate: '/trivia', score: 50, correct: 6, asked: 12 },
    ])
    const marks: Marks = {
      q_a: { t: 2, w: 2, r: 0, last: 'w', at: `${DAY}T10:00:00Z` },
      q_b: { t: 2, w: 1, r: 1, last: 'r', at: `${DAY}T10:00:00Z` },
      q_c: { t: 1, w: 0, r: 1, last: 'r', at: `${DAY}T10:00:00Z` },
    }
    const revenge = revengeOf(marks)
    expect(revenge).toEqual({ pending: 1, cleared: 1 })
    const state = card(profile, { revenge, bestTopic: 'europe' })
    expect(figure(state, 2, 'rounds')?.value).toBe(2)
    expect(figure(state, 2, 'correct')).toEqual({ key: 'correct', value: 15, of: 24 })
    expect(figure(state, 2, 'bestTopic')?.value).toBe('europe')
    expect(figureText(figure(state, 2, 'bestTopic')!, {})).toBe(MESSAGES['trivia.lobby.topic.europe'])
    expect(figure(state, 2, 'revengePending')?.value).toBe(1)
    expect(figure(state, 2, 'revengeCleared')?.value).toBe(1)
  })

  it('gate 3 — the best exact positions, out of eleven', () => {
    const state = card(feed([{ type: 'gate_completed', gate: '/lineup', score: 9, correct: 9, asked: 11 }]))
    expect(figure(state, 3, 'bestExact')).toEqual({ key: 'bestExact', value: 9, of: 11 })
    expect(figureText(figure(state, 3, 'bestExact')!, {})).toBe('9/11')
  })

  it('gate 4 — shirts unlocked out of the Kit Master, never the 33 the screen used to type', () => {
    const total = kitCatalog().length
    expect(total).toBeGreaterThan(0)
    expect(total).not.toBe(33)
    const profile = feed([
      { type: 'kit_unlocked', kitId: '1984/85|home' },
      { type: 'gate_completed', gate: '/kits/build', score: 410, correct: 20, asked: 25 },
    ])
    const state = card(profile, { kitsTotal: total, device: { xi: 0, kitKeys: ['1984/85|home', '2009/10|home'], designs: 0, ballot: 0, life: null } })
    expect(figure(state, 4, 'kits')).toEqual({ key: 'kits', value: 2, of: total })
    expect(figure(state, 4, 'best')?.value).toBe(410)
    expect(state.stamps).toContain('shirt')
    // and the page hands the real count down, and no panel prints a typed denominator
    expect(readFileSync(join(ROOT, 'app/tik/page.tsx'), 'utf8')).toContain('kitCatalog().length')
    for (const file of ['app/tik/Standing.tsx', 'app/tik/KeptPanel.tsx', 'app/tik/CardTabs.tsx']) {
      expect(readFileSync(join(ROOT, file), 'utf8'), file).not.toMatch(/of=\{33\}/)
    }
  })

  it('gate 5 — the designs saved', () => {
    const state = card(feed([{ type: 'kit_design_saved', designId: 'd1' }, { type: 'kit_design_saved', designId: 'd2' }]))
    expect(figure(state, 5, 'designs')?.value).toBe(2)
    expect(state.lines.find((l) => l.gate === 5)?.lit).toBe(true)
  })

  it('gate 6 — the best streak and the shelf', () => {
    const profile = feed([
      { type: 'gate_completed', gate: '/memory', score: 6, correct: 8, asked: 14 },
      { type: 'collected', set: 'memory', ids: ['moment:אליפות-1986', 'euro:1986-intertoto'] },
    ])
    const state = card(profile)
    expect(figure(state, 6, 'bestStreak')?.value).toBe(6)
    expect(figure(state, 6, 'shelf')?.value).toBe(2)
  })

  it('gate 8 — goals rebuilt, by either ledger, and the best', () => {
    const profile = feed([
      { type: 'collected', set: 'goal', ids: ['chelsea-2001-gershon-88'] },
      { type: 'goal_rebuilt', replayId: 'chelsea-2001-gershon-88', score: 81 },
      { type: 'gate_completed', gate: '/goal', score: 81, correct: 5, asked: 8 },
    ])
    const state = card(profile)
    // one goal, known to two ledgers, counts once
    expect(figure(state, 8, 'goals')?.value).toBe(1)
    expect(figure(state, 8, 'best')?.value).toBe(81)
  })

  it('gate 9 — plate 9 lights from the Royal Rumble\'s old slash-less ids', () => {
    const profile = fresh({
      gates: {
        'royal-rumble': { plays: 2, best: 3, bestRate: 0.5, lastOn: DAY, correct: 1, asked: 2 },
        'royal-rumble-live': { plays: 1, best: 3, bestRate: 1, lastOn: DAY, correct: 1, asked: 1 },
      },
    })
    const state = card(profile)
    const nine = state.lines.find((l) => l.gate === 9)
    expect(nine?.lit).toBe(true)
    expect(nine?.plays).toBe(3)
    expect(figure(state, 9, 'matches')?.value).toBe(3)
    expect(figure(state, 9, 'wins')?.value).toBe(2)
    expect(state.gates.lit).toBe(1)
    expect(state.recent).toEqual([9])
  })

  it('gate 11 — the last wall and its survivor', () => {
    const state = card(feed([{ type: 'hate_wall_completed', seed: 41, survivorId: 'p_x' }]))
    expect(figure(state, 11, 'walls')?.value).toBe(1)
    expect(figure(state, 11, 'survivor')?.value).toBe('p_x')
    // printed only by a name the archive gave it — an unresolved id prints nothing
    expect(figureText(figure(state, 11, 'survivor')!, {})).toBeNull()
    expect(figureText(figure(state, 11, 'survivor')!, { p_x: 'שם' })).toBe('שם')
    // the Black Wall files its survivor as `enemy:<slug>` — a row in enemies.json, not a
    // graph entity — and the id still reads back whole through the seed's colon
    const wall = card(feed([{ type: 'hate_wall_completed', seed: 7, survivorId: 'enemy:williams' }]))
    expect(figure(wall, 11, 'survivor')?.value).toBe('enemy:williams')
    expect(readFileSync('app/derby/HateWall.tsx', 'utf8')).toMatch(/type: 'hate_wall_completed'/)
  })

  it('gate 12 — cards turned, items saved, and the first-save stamp', () => {
    const state = card(
      feed([
        { type: 'collected', set: 'archive', ids: ['moment:אליפות-1986', 'm_1'], gate: '/archive' },
        { type: 'archive_saved', entityId: 'moment:אליפות-1986' },
      ]),
    )
    expect(figure(state, 12, 'cards')?.value).toBe(2)
    expect(figure(state, 12, 'saved')?.value).toBe(1)
    expect(state.stamps).toContain('archive')
  })

  it('gate 13 — routes completed', () => {
    const state = card(feed([{ type: 'red_thread_completed', routeId: 'rt-01:abc' }]))
    expect(figure(state, 13, 'routes')?.value).toBe(1)
  })

  it('all — days (with the legacy punches), streak, rank, Ussishkin out of 45, the LIFE year', () => {
    const profile = feed([
      { type: 'gate_completed', gate: '/lineup', score: 5, correct: 5, asked: 11 },
      { type: 'collected', set: 'ussishkin', ids: ['a', 'b'] },
    ])
    const state = workerCard({
      profile,
      book: book({ punches: ['2026-09-20'] }),
      device: { xi: 0, kitKeys: [], designs: 0, ballot: 0, life: { year: 1990 } },
      today: TODAY,
    })
    expect(state.days).toBe(2)
    expect(state.streak).toBe(2)
    expect(state.ussishkin).toEqual({ have: 2, of: 45 })
    expect(state.lifeYear).toBe(1990)
    expect(state.rank).not.toBe('visitor')
  })

  it('the wall line never repeats what the plate already prints', () => {
    const state = card(feed([{ type: 'gate_completed', gate: '/goal', score: 70, correct: 5, asked: 8 }]))
    const shown = lineFigures(state.lines.find((l) => l.gate === 8)!.figures, {})
    for (const key of WALL_REPEATS) expect(shown.map((f) => f.label)).not.toContain(MESSAGES[`core.fig.${key}`])
  })
})

/* ------------------------------------------------------------------------ gate 7 → card */

describe('שער 7 → הכרטיס (brief §29) — the seal, the number, the favourite by name', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('carries favourite, number, position and reasons from the seal to the card, and names the favourite from the archive', async () => {
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
    const member = await import('@/lib/game/member')
    const { readProfile } = await import('@/lib/profile/store')

    const favourite = resolvePlayer('משה סיני')?.id as string
    expect(favourite).toMatch(/^p_/)
    const ballot: Ballot = { favourite, number: '9', position: 'ST' }
    const reasons: Reasons = { favourite: reasonsFor('favourite')[0]! }
    // the number question writes the book's own field — the SAME field the card's picker writes
    member.writeBook({ ...member.readBook(), number: 9 })
    emit({ type: 'ballot_sealed', supporter: supporterRecord(ballot, reasons, DAY) })

    const sealed = member.readBook()
    const extras = await cardExtras({ saved: [], seen: [], reactions: [], shelf: [], goals: [], routes: [], people: [favourite], marks: [] })
    expect(extras.names[favourite]).toBe('משה סיני')

    const state = workerCard({ profile: readProfile(), book: sealed, favouriteHe: extras.names[favourite], today: TODAY })
    expect(state.supporter).toMatchObject({ favouriteId: favourite, favouriteHe: 'משה סיני', positionCode: 'ST', reasons: 1, sealedOn: DAY })
    expect(state.number).toBe(9)
    expect(state.lines.find((l) => l.gate === 7)?.lit).toBe(true)
    expect(state.stamps).toContain('ballot')
    const shown = lineFigures(state.lines.find((l) => l.gate === 7)!.figures, extras.names)
    expect(shown.map((f) => f.text)).toEqual(['משה סיני', '9', MESSAGES['pos.st']])
    // the story dates the seal and names the man
    expect(storyItems(state, extras.names).find((item) => item.id === 'sealed')?.body).toContain('משה סיני')

    // and the card's own save goes through the same layer, issuing the card once
    expect(sealed.card?.issuedOn ?? '').toBe('')
    emit({ type: 'card_edited', patch: patchOf({ ...draftOf(sealed), nameHe: '  אבי  ', homeGate: 5 }) })
    const issued = member.readBook()
    expect(issued.card?.issuedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(issued.nameHe).toBe('אבי')
    expect(issued.number).toBe(9)
    expect(issued.supporter?.favouriteId).toBe(favourite)
    emit({ type: 'card_edited', patch: { values: ['moments'] } })
    expect(member.readBook().card?.issuedOn).toBe(issued.card?.issuedOn)
  })
})

/* ------------------------------------------------------------------- the anonymous card */

describe('כרטיס אנונימי — every tab works with nothing on the device and no account', () => {
  const state = workerCard({ profile: fresh(), book: book(), today: TODAY })

  it('prints the TIK and dashes, stamps nothing, and offers three empty stamp outlines', () => {
    expect(state.nameHe).toBe('')
    expect(state.stamps).toEqual([])
    expect(cardStamps(state.stamps)).toEqual([
      { id: 'wall', earned: false },
      { id: 'card', earned: false },
      { id: 'ballot', earned: false },
    ])
    expect(cardStory(state, DEFAULT_SPEC).hero).toBe('TIK-0417')
  })

  it('writes an oath from what exists and leaves the rest out — no demo facts', () => {
    const lines = oathLines(state, {})
    expect(lines[0]).toBe(MESSAGES['tik.oath.anon']?.replace('{tik}', 'TIK-0417'))
    expect(lines).toContain(MESSAGES['tik.oath.gatesNone'])
    expect(lines.at(-1)).toBe(MESSAGES['tik.oath.close'])
    expect(lines.join(' ')).not.toMatch(/פוגי|1983|בלומפילד|עם אבא/)
    expect(oathTags(state, {})).toEqual([])
  })

  it('tells a story with no invented dates: an untouched device has no "first evening"', () => {
    expect(storyItems(state, {}).map((item) => item.id)).toEqual(['now'])
  })

  it('never ties anything on the card to signing in', () => {
    for (const file of ['app/tik/CardTabs.tsx', 'app/tik/IssueBeat.tsx', 'app/tik/WorkerCard.tsx', 'app/tik/cardView.ts']) {
      const text = readFileSync(join(ROOT, file), 'utf8')
      expect(text, file).not.toMatch(/signInWithGoogle|currentAccount|sessionUserId/)
    }
    expect(STAMPS).not.toContain('account' as never)
  })
})

/* ---------------------------------------------------------------------- the share card */

describe('כרטיס השיתוף — the nickname and figures, never free text', () => {
  const typed = applyCardPatch(
    book({ nameHe: 'אבי מהשכונה' }),
    { first: { textHe: 'עם סבא בשער 11' }, fanSince: 1998, homeGate: 5, began: 'father', values: ['moments', 'terrace'] },
    TODAY,
  ).book
  const state = workerCard({ profile: fresh(), book: typed, today: TODAY })

  it('prints the nickname, gates, fan-since and home gate — and not the first memory, the story or the values', () => {
    const story = cardStory(state, DEFAULT_SPEC)
    const json = JSON.stringify(story)
    expect(story.template).toBe('kit')
    expect(story.kicker).toBe('GATE 10 · WORKER CARD')
    expect(story.hero).toBe('אבי מהשכונה')
    expect(story.stats).toHaveLength(3)
    expect(json).not.toContain('עם סבא')
    expect(json).not.toContain(MESSAGES['core.began.father'] as string)
    expect(json).not.toContain(MESSAGES['core.value.terrace'] as string)
    expect(story.kit?.number).toBe(typed.number)
  })

  it('a first MATCH is an id on the card, printed by the archive\'s name on screen and never on the share', () => {
    const withMatch = applyCardPatch(typed, { first: { matchId: 'm_11050c16ccae' } }, TODAY).book
    const s = workerCard({ profile: fresh(), book: withMatch, today: TODAY })
    expect(s.declared.first).toEqual({ kind: 'match', id: 'm_11050c16ccae' })
    expect(JSON.stringify(cardStory(s, DEFAULT_SPEC))).not.toContain('m_11050c16ccae')
  })

  it('the screen prints the free text on the person\'s own oath', () => {
    expect(oathLines(state, {}).join(' ')).toContain('עם סבא בשער 11')
  })
})

/* -------------------------------------------------------------------------- the stamps */

describe('החותמות — deterministic, at most three, never bought', () => {
  it('orders the earned stamps by one fixed ranking, whatever order they were earned in', () => {
    const a = cardStamps(['archive', 'card', 'shirt', 'ballot'])
    const b = cardStamps(['ballot', 'shirt', 'card', 'archive'])
    expect(a).toEqual(b)
    expect(a).toEqual([
      { id: 'card', earned: true },
      { id: 'ballot', earned: true },
      { id: 'shirt', earned: true },
    ])
    expect(cardStamps([...STAMPS])).toHaveLength(3)
    expect(cardStamps([...STAMPS]).every((slot) => slot.earned)).toBe(true)
  })

  it('fills the empty slots with what is left, earned first', () => {
    expect(cardStamps(['archive'])).toEqual([
      { id: 'archive', earned: true },
      { id: 'wall', earned: false },
      { id: 'card', earned: false },
    ])
  })

  it('ranks every stamp the card can derive, and only those', () => {
    expect([...STAMP_ORDER].sort()).toEqual([...STAMPS].sort())
    for (const id of STAMPS) expect(MESSAGES[`core.stamp.${id}`], id).toBeTruthy()
  })

  it('lights the wall stamp only with all thirteen plates, gate 9 included', () => {
    const gates: Profile['gates'] = {}
    for (const gate of PLAYABLE_GATES) {
      const id = gate.number === 9 ? 'royal-rumble' : gate.href
      gates[id] = { plays: 1, best: 1, bestRate: 1, lastOn: DAY, correct: 1, asked: 1 }
    }
    const state = card(fresh({ gates }))
    expect(state.gates).toEqual({ lit: PLAYABLE_GATES.length, of: PLAYABLE_GATES.length })
    expect(state.gates.of).toBe(13)
    expect(cardStamps(state.stamps)[0]).toEqual({ id: 'wall', earned: true })
  })
})

/* ------------------------------------------------------------------------- the barcode */

describe('הברקוד — Code 39, printed from the TIK', () => {
  it('has a well-formed table: nine elements a character, three of them wide', () => {
    for (const [char, pattern] of Object.entries(CODE39_TABLE)) {
      const runs = pattern.match(/1+|0+/g) ?? []
      expect(runs, char).toHaveLength(9)
      expect(runs.filter((run) => run.length === 2), char).toHaveLength(3)
      expect(pattern.startsWith('1') && pattern.endsWith('1'), char).toBe(true)
    }
    expect(new Set(Object.values(CODE39_TABLE)).size).toBe(Object.keys(CODE39_TABLE).length)
  })

  it('draws the same TIK the same way, and two TIKs differently', () => {
    expect(barcodeBars('TIK-0417')).toEqual(barcodeBars('TIK-0417'))
    expect(barcodeBars('TIK-0417')).not.toEqual(barcodeBars('TIK-0418'))
    // start + 8 characters + stop, 12 modules each, a narrow gap between them
    expect(barcodeBars('TIK-0417').width).toBe(10 * 12 + 9)
  })
})

/* ---------------------------------------------------------------- the editor and preview */

describe('העורך — a draft, a live preview, one save', () => {
  const saved = applyCardPatch(book({ nameHe: 'אבי' }), { homeGate: 5, fanSince: 1998 }, TODAY).book

  it('previews the draft without issuing anything', () => {
    const blank = book()
    const draft: CardDraft = { ...draftOf(blank), nameHe: 'דני', homeGate: 7 }
    const preview = draftBook(blank, draft, TODAY)
    expect(preview.card?.issuedOn).toBe('')
    expect(preview.card?.homeGate).toBe(7)
    const state = workerCard({ profile: fresh(), book: preview, today: TODAY })
    expect(state.nameHe).toBe('דני')
    expect(state.stamps).not.toContain('card')
  })

  it('caps the nickname at NAME_MAX in the preview as in storage', () => {
    const preview = draftBook(book(), { ...draftOf(book()), nameHe: 'א'.repeat(40) }, TODAY)
    expect(preview.nameHe).toHaveLength(NAME_MAX)
    expect(NAME_MAX).toBe(18)
  })

  it('knows a trimmed space from an edit', () => {
    expect(draftDirty(saved, draftOf(saved))).toBe(false)
    expect(draftDirty(saved, { ...draftOf(saved), nameHe: ' אבי ' })).toBe(false)
    expect(draftDirty(saved, { ...draftOf(saved), number: 23 })).toBe(true)
  })

  it('refuses a fourth value chip rather than swapping one out', () => {
    expect(toggleValue(['moments', 'shirts', 'archive'], 'terrace')).toEqual(['moments', 'shirts', 'archive'])
    expect(toggleValue(['moments', 'shirts'], 'shirts')).toEqual(['moments'])
  })

  it('bounds "fan since" by the club\'s founding and the season running now', () => {
    const may = fanYears(new Date('2027-05-10T12:00:00Z'))
    expect(may[0]).toBe(2026)
    expect(may.at(-1)).toBe(1923)
    expect(fanYears(new Date('2027-08-10T12:00:00Z'))[0]).toBe(2027)
  })

  it('offers every home gate lib/gates.ts has, and one number grid shared with gate 7', () => {
    expect(SHIRT_NUMBERS).toHaveLength(99)
    expect(SHIRT_NUMBERS[0]).toBe(1)
    const editor = readFileSync(join(ROOT, 'app/tik/CardEditor.tsx'), 'utf8')
    const stage = readFileSync(join(ROOT, 'components/ballot/QuestionStage.tsx'), 'utf8')
    for (const text of [editor, stage]) expect(text).toContain("from '@/components/profile/NumberPicker'")
    expect(editor).toContain('GATES.map')
    expect(stage).not.toMatch(/NUMBERS\.map/)
    expect(GATES.length).toBeGreaterThanOrEqual(13)
  })

  it('the issue beat is at most ~1.2 s', () => {
    expect(ISSUE_MS).toBeLessThanOrEqual(1200)
  })
})

/* ------------------------------------------------------------------ oath, story, labels */

describe('השבועה והסיפור — derived, never stored', () => {
  const typed = applyCardPatch(
    book({ nameHe: 'אבי' }),
    { homeGate: 'none', fanSince: 'new', began: 'born', first: { venueSlug: 'בלומפילד' }, values: ['moments', 'shirts', 'archive'] },
    TODAY,
  ).book
  const state = workerCard({ profile: fresh({ since: '2026-09-01', days: ['2026-09-01'] }), book: typed, today: TODAY })

  it('writes a line for each declared field, in the catalogue\'s words', () => {
    const lines = oathLines(state, {})
    expect(lines[0]).toContain('אבי')
    expect(lines[0]).toContain('TIK-0417')
    expect(lines).toContain(MESSAGES['tik.oath.gateNone'])
    expect(lines).toContain(MESSAGES['tik.oath.fanNew'])
    expect(lines).toContain(MESSAGES['tik.oath.began.born'])
    expect(lines.join(' ')).toContain('אצטדיון בלומפילד')
    expect(lines.join(' ')).toContain(hebrewList(['רגעים', 'חולצות', 'ארכיון']))
    expect(hebrewList(['רגעים', 'חולצות', 'ארכיון'])).toBe('רגעים, חולצות וארכיון')
  })

  it('stores nothing: the book carries no oath and no story', () => {
    expect(JSON.stringify(typed)).not.toContain('oath')
    expect(Object.keys(typed.card ?? {}).sort()).toEqual(['began', 'editedAt', 'fanSince', 'first', 'homeGate', 'issuedOn', 'values'])
  })

  it('dates only what happened, oldest first, and ends on "the story goes on"', () => {
    const items = storyItems(state, {})
    const dated = items.filter((item) => item.on !== null).map((item) => item.on as string)
    expect(dated).toEqual([...dated].sort())
    expect(items.map((item) => item.id)).toEqual(['fan', 'began', 'first', 'home', 'joined', 'issued', 'now'])
  })

  it('prints a zero only where a denominator gives it meaning', () => {
    expect(figureText({ key: 'designs', value: 0 }, {})).toBeNull()
    expect(figureText({ key: 'sheets', value: 0, of: 2 }, {})).toBe('0/2')
    expect(figureText({ key: 'favourite', value: 'p_nobody' }, {})).toBeNull()
    expect(figureText({ key: 'position', value: 'GK' }, {})).toBe(MESSAGES['pos.gk'])
  })

  it('reads a kit key as a season and a variant, and refuses anything else', () => {
    expect(kitKeyParts('1984/85|home')).toEqual({ season: '1984/85', variant: 'home' })
    expect(kitKeyParts('kit-1984-85-home')).toBeNull()
  })
})

/* -------------------------------------------------------------- the server's one answer */

describe('cardExtras — names for ids, never a guess', () => {
  it('describes the archive saves, the shelf, the goals and the routes it can, and drops the rest', async () => {
    const extras = await cardExtras({
      saved: ['moment:אליפות-1986', 'no-such-thing'],
      seen: ['moment:אליפות-1986'],
      reactions: [],
      shelf: ['euro:1986-intertoto'],
      goals: ['chelsea-2001-gershon-88'],
      routes: ['rt-01:abcd1234', 'nope:1'],
      people: ['p_nobody_here'],
      marks: [],
    })
    expect(extras.archive.saved.map((c) => c.id)).toEqual(['moment:אליפות-1986'])
    expect(extras.archive.unknown).toContain('no-such-thing')
    expect(extras.shelf[0]?.id).toBe('tie:1986-intertoto')
    expect(extras.goals[0]?.id).toBe('goal:chelsea-2001-gershon-88')
    expect(extras.routes).toHaveLength(1)
    expect(extras.names).toEqual({})
    expect(extras.bestTopic).toBeNull()
  })

  it('ranks the ledger\'s topics by the Question Master, and wants six answers behind a verdict', async () => {
    const master = JSON.parse(readFileSync(join(ROOT, 'content/generated/question-master.json'), 'utf8')) as {
      questions: { id: string; topic: string }[]
    }
    const europe = master.questions.filter((q) => q.topic === 'europe').slice(0, 3).map((q) => q.id)
    const numbers = master.questions.filter((q) => q.topic === 'numbers').slice(0, 3).map((q) => q.id)
    const rows: Array<[string, number, number]> = [
      ...europe.map((id) => [id, 2, 0] as [string, number, number]),
      ...numbers.map((id) => [id, 1, 1] as [string, number, number]),
    ]
    expect(await bestTopicOf(rows)).toBe('europe')
    expect(await bestTopicOf(rows.slice(0, 2))).toBeNull()
  })
})

/* ---------------------------------------------------------------------- the book's pages */

describe('פנקס החבר — the corrections print only when there are corrections', () => {
  it('renders no big number for nobody, and the rows when they exist', () => {
    // the app compiles JSX for Next; under vitest's esbuild it is the classic runtime
    vi.stubGlobal('React', React)
    const empty = renderToStaticMarkup(createElement(MemberBookPages, { book: book() }))
    expect(empty).not.toContain('data-book="corrections"')
    const filed = renderToStaticMarkup(
      createElement(MemberBookPages, {
        book: book({ corrections: [{ id: '1', tagHe: 'GATE 7', filedOn: DAY, bodyHe: 'שורה', status: 'pending' }] }),
      }),
    )
    expect(filed).toContain('data-book="corrections"')
    expect(filed).toContain('שורה')
    vi.unstubAllGlobals()
  })
})
