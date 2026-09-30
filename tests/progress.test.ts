import { describe, expect, it } from 'vitest'

import { safeParams } from '@/lib/ads'
import { GATES, PLAYABLE_GATES } from '@/lib/gates'
import {
  applyCardPatch,
  cleanCard,
  emptyBook,
  normaliseBook,
  NAME_MAX,
  stampIfEdited,
  type MemberBook,
} from '@/lib/game/member'
import { mergeDeviceProfiles } from '@/lib/portal/merge'
import {
  activityDays,
  CARD_SOURCES,
  cardStory,
  FIGURE_LABEL,
  workerCard,
  type WorkerCardState,
} from '@/lib/profile/card'
import {
  applyEvent,
  deedKey,
  duelArrival,
  gaEvent,
  markOf,
  TELEMETRY_EVENTS,
  type ProgressEvent,
} from '@/lib/profile/events'
import {
  canonicalGate,
  cleanVariant,
  variantStats,
  wallGate,
  wallNumber,
  wallStat,
} from '@/lib/profile/gate-id'
import { cardFigures, stillToDo } from '@/lib/profile/standing'
import {
  activeIn,
  applyDeed,
  applyDuel,
  collectionSize,
  emptyProfile,
  emptyStat,
  gatesTouched,
  isCountedSet,
  isOn,
  isSyncedSet,
  onIds,
  toggleToken,
  type Profile,
} from '@/lib/profile/store'
import { MESSAGES } from '@/lib/i18n'
import { DEFAULT_SPEC } from '@/lib/kit/spec'

/**
 * שכבת ההתקדמות — the reducer, the ids, the sets and the card, settled without a browser.
 *
 * Everything here is a pure function on a profile: the day and the round key come in as
 * arguments, so a sequence of events can be replayed and its answer asserted. The parts
 * that touch storage and the network (`emit`, `syncProfile`) are thin shells over these,
 * and the shells are not what decides anything.
 */

const DAY = '2026-09-21'
const NEXT = '2026-09-22'

function fresh(over: Partial<Profile> = {}): Profile {
  return { ...emptyProfile(), since: '', ...over }
}

function run(profile: Profile, event: ProgressEvent, date = DAY, key?: string) {
  return applyEvent(profile, event, { date, key })
}

describe('מזהה שער — one plate, every id under it', () => {
  it('files a variant as one segment under its gate', () => {
    expect(canonicalGate('/trivia', 'europe')).toBe('/trivia/europe')
    expect(canonicalGate('/trivia?seed=4', 'Europe')).toBe('/trivia/europe')
    expect(canonicalGate('/trivia/europe', 'europe')).toBe('/trivia/europe')
    // a variant that is not one clean slug is dropped, never smuggled into an id
    expect(canonicalGate('/trivia', 'europe/../x')).toBe('/trivia')
    expect(cleanVariant('שירים')).toBeNull()
  })

  it('resolves an id to the LONGEST plate route, by whole segments', () => {
    expect(wallGate('/kits/build')).toBe('/kits/build')
    expect(wallGate('/kits/build/v5')).toBe('/kits/build')
    expect(wallGate('/kits/studio')).toBe('/kits')
    expect(wallGate('/kitsch')).toBeNull()
    expect(wallGate('/trivia/europe')).toBe('/trivia')
    expect(wallGate('/derby/file')).toBe('/derby')
    expect(wallGate('/life')).toBeNull()
    expect(wallNumber('/kits/build')).toBe(4)
    expect(wallNumber('/kits')).toBe(5)
  })

  it('folds a plate from its children: sums for counts, max for bests, later for the day', () => {
    const profile = fresh({
      gates: {
        '/trivia/europe': { plays: 2, best: 80, bestRate: 0.75, lastOn: '2026-09-01', correct: 18, asked: 24 },
        '/trivia/numbers': { plays: 1, best: 120, bestRate: 0.5, lastOn: '2026-09-10', correct: 6, asked: 12 },
        '/trivia': { plays: 1, best: 10, bestRate: 0.25, lastOn: '2026-08-01', correct: 3, asked: 12 },
      },
    })
    expect(wallStat(profile, '/trivia')).toEqual({
      plays: 4,
      best: 120,
      bestRate: 0.75,
      lastOn: '2026-09-10',
      correct: 27,
      asked: 48,
    })
    expect(variantStats(profile, '/trivia').map((row) => row.variant)).toEqual(['europe', 'numbers'])
    expect(gatesTouched(profile)).toBe(1)
  })
})

describe('שער 9 נדלק — the Royal Rumble aliases', () => {
  it('lights plate 9 from the old slash-less ids a device already holds', () => {
    const profile = fresh({
      gates: {
        'royal-rumble': { ...emptyStat(), plays: 2, correct: 1, asked: 2, lastOn: DAY },
        'royal-rumble-live': { ...emptyStat(), plays: 1, correct: 1, asked: 1, lastOn: DAY },
      },
    })
    expect(wallStat(profile, '/royal-rumble').plays).toBe(3)
    expect(stillToDo(profile, 20).map((gate) => gate.href)).not.toContain('/royal-rumble')
    expect(cardFigures(profile).gates).toBe(1)
  })

  it('files NEW rounds under ids worker_gate_run accepts (`gate like \'/%\'`)', () => {
    const solo = run(fresh(), { type: 'gate_completed', gate: 'royal-rumble', score: 3, correct: 1, asked: 1 }, DAY, 'k1')
    const live = run(fresh(), { type: 'gate_completed', gate: 'royal-rumble-live', score: 3, correct: 1, asked: 1 }, DAY, 'k2')
    expect(Object.keys(solo.profile.gates)).toEqual(['/royal-rumble'])
    expect(Object.keys(live.profile.gates)).toEqual(['/royal-rumble/live'])
    for (const op of [...solo.remote, ...live.remote]) {
      if (op.op === 'run') expect(op.gate.startsWith('/')).toBe(true)
    }
  })

  it('can light the whole wall — every playable plate, including 9', () => {
    const gates: Profile['gates'] = {}
    for (const gate of PLAYABLE_GATES) {
      gates[gate.href === '/royal-rumble' ? 'royal-rumble' : gate.href] = { ...emptyStat(), plays: 1 }
    }
    const figures = cardFigures(fresh({ gates }))
    expect(figures.gates).toBe(figures.ofGates)
    expect(stillToDo(fresh({ gates }))).toEqual([])
  })
})

describe('הרדיוסר — applyEvent', () => {
  it('records a round under its variant, with a clamped remote row', () => {
    const out = run(
      fresh(),
      { type: 'gate_completed', gate: '/trivia', variant: 'europe', score: 96, correct: 14, asked: 12, seed: 77 },
      DAY,
      'round-key',
    )
    expect(out.profile.gates['/trivia/europe']?.plays).toBe(1)
    expect(out.profile.gates['/trivia/europe']?.correct).toBe(12)
    expect(out.profile.days).toEqual([DAY])
    expect(out.remote).toEqual([
      { op: 'run', key: 'round-key', gate: '/trivia/europe', score: 96, correct: 12, asked: 12, seed: 77 },
    ])
  })

  it('sends nothing up when there is no key to make the row idempotent', () => {
    expect(run(fresh(), { type: 'gate_completed', gate: '/goal', score: 5 }).remote).toEqual([])
  })

  it('collects idempotently, and only a NEW id goes up', () => {
    const first = run(fresh(), { type: 'kit_unlocked', kitId: '1984/85|home' })
    const again = run(first.profile, { type: 'kit_unlocked', kitId: '1984/85|home' })
    expect(first.profile.collections.kits).toEqual(['1984/85|home'])
    expect(first.remote).toEqual([{ op: 'collect', set: 'kits', ids: ['1984/85|home'] }])
    expect(again.remote).toEqual([])
    expect(again.profile).toBe(first.profile)
  })

  it('a saved design is a collection item AND the studio\'s deed', () => {
    const out = run(fresh(), { type: 'kit_design_saved', designId: 'd-1' })
    expect(out.profile.collections['kit.designs']).toEqual(['d-1'])
    expect(out.profile.gates['/kits']?.plays).toBe(1)
    expect(out.remote.map((op) => op.op)).toEqual(['collect', 'run'])
  })

  it('keeps gate 11\'s last wall and the set of walls', () => {
    const out = run(fresh(), { type: 'hate_wall_completed', seed: 41, survivorId: 'player-x' })
    expect(out.profile.collections['derby.walls']).toEqual(['41:player-x'])
    expect(out.profile.latest['derby.wall']).toEqual({ v: '41:player-x', on: DAY })
  })

  it('a vote changes nothing on the profile — the seal is the deed, not each vote', () => {
    const before = fresh()
    const out = run(before, { type: 'vote_cast', questionId: 'favourite' })
    expect(out.profile).toBe(before)
    expect(out.remote).toEqual([])
  })

  it('a seal is the ballot\'s deed and carries the supporter record up', () => {
    const supporter = { favouriteId: 'player-1', positionCode: 'ST', reasons: {}, sealedOn: DAY }
    const out = run(fresh(), { type: 'ballot_sealed', supporter })
    expect(out.profile.gates['/polls']?.plays).toBe(1)
    expect(out.remote).toEqual([
      { op: 'run', key: deedKey('/polls', DAY), gate: '/polls', score: 0, correct: 0, asked: 0, seed: null, day: DAY },
      { op: 'supporter', record: supporter },
    ])
  })

  it('retires into a tombstone set, which the live view subtracts', () => {
    const grown = run(fresh(), { type: 'collected', set: 'thread.routes', ids: ['r1', 'r2'] })
    const gone = run(grown.profile, { type: 'retired', set: 'thread.routes', ids: ['r1'] })
    expect(activeIn(gone.profile, 'thread.routes')).toEqual(['r2'])
    expect(gone.remote).toEqual([{ op: 'collect', set: 'thread.routes~', ids: ['r1'] }])
    expect(isCountedSet('thread.routes~')).toBe(false)
  })

  it('a collection tap can be a wing\'s deed too (gate 12\'s card)', () => {
    const out = run(fresh(), { type: 'collected', set: 'archive', ids: ['c1'], gate: '/archive' })
    expect(out.profile.gates['/archive']?.plays).toBe(1)
  })
})

describe('מעשה — once per gate per day, and only when something new was made', () => {
  it('a second deed the same day does not inflate plays and sends nothing', () => {
    const one = run(fresh(), { type: 'deed', gate: '/xi' })
    const two = run(one.profile, { type: 'deed', gate: '/xi' })
    expect(two.profile.gates['/xi']?.plays).toBe(1)
    expect(two.counted).toBe(false)
    expect(two.remote).toEqual([])
    expect(one.remote[0]).toMatchObject({ op: 'run', key: 'deed:/xi:2026-09-21', day: DAY })
  })

  it('the next day counts again, under the next day\'s key', () => {
    const one = run(fresh(), { type: 'deed', gate: '/xi' })
    const two = run(one.profile, { type: 'deed', gate: '/xi' }, NEXT)
    expect(two.profile.gates['/xi']?.plays).toBe(2)
    expect(two.remote[0]).toMatchObject({ key: 'deed:/xi:2026-09-22' })
  })

  it('an unchanged sheet reopened tomorrow is not a deed; a changed one is', () => {
    const sheet = { gk: 'p1', cb: 'p2' }
    const mark = markOf(sheet)
    const one = applyDeed(fresh(), '/xi', DAY, mark)
    const reopened = applyDeed(one.profile, '/xi', NEXT, markOf({ cb: 'p2', gk: 'p1' }))
    expect(reopened.counted).toBe(false)
    expect(reopened.profile.gates['/xi']?.plays).toBe(1)
    const changed = applyDeed(reopened.profile, '/xi', NEXT, markOf({ gk: 'p1', cb: 'p3' }))
    expect(changed.counted).toBe(true)
    expect(changed.profile.gates['/xi']?.plays).toBe(2)
  })

  it('a change made the same day updates the mark without counting twice', () => {
    const one = applyDeed(fresh(), '/xi', DAY, 'a')
    const edited = applyDeed(one.profile, '/xi', DAY, 'b')
    expect(edited.counted).toBe(false)
    expect(edited.profile.deeds['/xi']).toEqual({ on: DAY, mark: 'b' })
    // tomorrow, the SAME sheet as this evening's edit is still not new
    expect(applyDeed(edited.profile, '/xi', NEXT, 'b').counted).toBe(false)
  })

  it('merges deeds by the later day, so a laptop deed today blocks the phone today', () => {
    const phone = applyDeed(fresh(), '/xi', '2026-09-20').profile
    const laptop = applyDeed(fresh(), '/xi', DAY).profile
    const merged = mergeDeviceProfiles(phone, laptop)
    expect(merged.deeds['/xi']?.on).toBe(DAY)
    expect(applyDeed(merged, '/xi', DAY).counted).toBe(false)
  })
})

describe('שמור / לא שמור — the parity toggle survives the union merge', () => {
  it('two devices saving the same item agree without talking', () => {
    const a = toggleToken(fresh(), 'archive.mine', 'e1').profile
    const b = toggleToken(fresh(), 'archive.mine', 'e1').profile
    const merged = mergeDeviceProfiles(a, b)
    expect(merged.collections['archive.mine']).toEqual(['e1#1'])
    expect(isOn('archive.mine', 'e1', merged)).toBe(true)
  })

  it('an un-save on one device is not brought back by the other one\'s save', () => {
    const saved = toggleToken(fresh(), 'archive.mine', 'e1').profile
    const phone = toggleToken(saved, 'archive.mine', 'e1').profile // unsaved: e1#2
    const laptop = saved // still e1#1
    const merged = mergeDeviceProfiles(laptop, phone)
    expect(isOn('archive.mine', 'e1', merged)).toBe(false)
    expect(onIds('archive.mine', merged)).toEqual([])
    // and saving again after the merge is a NEW token, so it wins everywhere
    const resaved = toggleToken(merged, 'archive.mine', 'e1')
    expect(resaved.token).toBe('e1#3')
    expect(isOn('archive.mine', 'e1', mergeDeviceProfiles(phone, resaved.profile))).toBe(true)
  })

  it('setting a state is idempotent — a double tap cannot flip it back', () => {
    const one = run(fresh(), { type: 'archive_saved', entityId: 'e1' })
    const two = run(one.profile, { type: 'archive_saved', entityId: 'e1' })
    expect(two.remote).toEqual([])
    expect(collectionSize(two.profile, 'archive.mine')).toBe(1)
    const off = run(two.profile, { type: 'archive_saved', entityId: 'e1', on: false })
    expect(collectionSize(off.profile, 'archive.mine')).toBe(0)
  })
})

describe('העדפה אינה אוסף', () => {
  it('never counts or syncs a preference set', () => {
    expect(isCountedSet('lineup.reveal')).toBe(false)
    expect(isSyncedSet('lineup.reveal')).toBe(false)
    expect(isCountedSet('duel.seeds')).toBe(false)
    expect(isSyncedSet('duel.seeds')).toBe(true)
    expect(isCountedSet('ussishkin')).toBe(true)
  })
})

describe('דו-קרב — counted once per plate and seed', () => {
  it('reads the challenge off the URL `challengeUrl` writes', () => {
    expect(duelArrival('?seed=4471&r=2&from=share')).toBe(4471)
    expect(duelArrival('?seed=4471')).toBeNull()
    expect(duelArrival('?from=share')).toBeNull()
    expect(duelArrival('from=share&seed=-3')).toBeNull()
  })

  it('a reload of the same dared round is not a second duel', () => {
    const one = applyDuel(fresh(), '/trivia/europe', 4471)
    const two = applyDuel(one.profile, '/trivia/europe', 4471)
    expect(one.counted).toBe(true)
    expect(two.counted).toBe(false)
    expect(two.profile.duelsTaken).toBe(1)
    expect(one.token).toBe('/trivia:4471')
  })
})

describe('מדידה — ids and integers only, never free text, never a pick', () => {
  const ID = /^[A-Za-z0-9_./:#|-]{1,64}$/
  const supporter = {
    favouriteId: 'player-ba33af1a9517',
    positionCode: 'ST',
    reasons: { favourite: 'poll.reason.goals' },
    sealedOn: DAY,
  }
  const events: ProgressEvent[] = [
    { type: 'gate_completed', gate: '/trivia', variant: 'europe', score: 90, correct: 10, asked: 12, seed: 5 },
    { type: 'deed', gate: '/xi', mark: 'abcd' },
    { type: 'kit_unlocked', kitId: '1984/85|home' },
    { type: 'kit_design_saved', designId: 'design-1' },
    { type: 'archive_saved', entityId: 'moment-1' },
    { type: 'goal_rebuilt', replayId: 'goal-1', score: 88 },
    { type: 'red_thread_completed', routeId: 'route-1' },
    { type: 'hate_wall_completed', seed: 41, survivorId: 'player-x' },
    { type: 'collected', set: 'ussishkin', ids: ['שם בעברית'] },
    { type: 'toggled', set: 'archive.mine', id: 'x' },
    { type: 'retired', set: 'thread.routes', ids: ['r1'] },
    { type: 'vote_cast', questionId: 'favourite', ...({ pick: 'שייע פייגנבוים' } as object) } as ProgressEvent,
    { type: 'ballot_sealed', supporter },
    { type: 'shared', kind: 'member', channel: 'whatsapp' },
    { type: 'duel_taken', gate: '/trivia', seed: 4471 },
    {
      type: 'card_edited',
      patch: { nameHe: 'פוגי', first: { textHe: 'עם אבא בבלומפילד' }, homeGate: 5, values: ['moments'] },
    },
  ]

  it('covers every event kind', () => {
    expect(new Set(events.map((e) => e.type)).size).toBe(16)
  })

  it('sends only integers and id-shaped strings', () => {
    for (const event of events) {
      const params = safeParams(gaEvent(event).params)
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'number') expect(Number.isInteger(value), `${event.type}.${key}`).toBe(true)
        else expect(value, `${event.type}.${key}`).toMatch(ID)
      }
      expect(JSON.stringify(params), event.type).not.toMatch(/[֐-׿]/)
    }
  })

  it('never lets a ballot pick, a nickname or a typed memory through', () => {
    const all = JSON.stringify(events.map((event) => safeParams(gaEvent(event).params)))
    expect(all).not.toContain('פייגנבוים')
    expect(all).not.toContain('פוגי')
    expect(all).not.toContain('עם אבא')
    expect(all).not.toContain('player-ba33af1a9517')
    expect(Object.keys(gaEvent(events[11] as ProgressEvent).params)).toEqual(['question'])
  })

  it('drops free text however it arrives', () => {
    expect(safeParams({ a: 'two words', b: 'עברית', c: 'id-1', d: 3.6, e: Number.NaN, f: true })).toEqual({
      c: 'id-1',
      d: 4,
      f: 1,
    })
  })

  it('names the telemetry-only events the spec lists, and nothing stores them', () => {
    expect(TELEMETRY_EVENTS).toContain('hint_used')
    expect(TELEMETRY_EVENTS).toContain('hate_wall_shared')
    const stored = new Set(events.map((e) => e.type) as string[])
    for (const name of TELEMETRY_EVENTS) expect(stored.has(name)).toBe(false)
  })
})

describe('סימן — the fingerprint of what a wing made', () => {
  it('ignores key order and undefined fields, and sees one changed man', () => {
    expect(markOf({ a: 1, b: [1, 2] })).toBe(markOf({ b: [1, 2], a: 1, c: undefined }))
    expect(markOf({ gk: 'p1' })).not.toBe(markOf({ gk: 'p2' }))
    expect(markOf({})).toMatch(/^[0-9a-f]{8}$/)
  })
})

/* ---------------------------------------------------------------------- the book */

function book(over: Partial<MemberBook> = {}): MemberBook {
  return { ...emptyBook(), tik: 'TIK-0417', nameHe: '', number: 17, punches: [], ...over }
}

describe('הפנקס — one name cap, the card fields, and when an edit is an edit', () => {
  it('caps the name at 18 everywhere', () => {
    expect(NAME_MAX).toBe(18)
    expect(normaliseBook({ nameHe: 'א'.repeat(30) }).nameHe).toHaveLength(18)
  })

  it('stamps an edit to the name, the number or the card — and not a punch', () => {
    const now = new Date('2026-09-21T12:00:00Z')
    const before = book({ nameHe: 'פוגי' })
    expect(stampIfEdited(before, { ...before, punches: [DAY] }, now).card).toBeUndefined()
    expect(stampIfEdited(before, { ...before, number: 9 }, now).card?.editedAt).toBe(now.toISOString())
    expect(stampIfEdited(before, { ...before, nameHe: 'פוגי ב' }, now).card?.editedAt).toBe(now.toISOString())
  })

  it('issues the card once, on the first save', () => {
    const now = new Date('2026-09-21T12:00:00Z')
    const first = applyCardPatch(book(), { homeGate: 5, fanSince: 1983, nameHe: '  פוגי  ' }, now)
    expect(first.firstIssue).toBe(true)
    expect(first.book.card?.issuedOn).toBe(DAY)
    expect(first.book.nameHe).toBe('פוגי')
    const later = applyCardPatch(first.book, { began: 'father' }, new Date('2026-10-01T09:00:00Z'))
    expect(later.firstIssue).toBe(false)
    expect(later.book.card?.issuedOn).toBe(DAY)
    expect(later.book.card?.homeGate).toBe(5)
    expect(later.book.card?.editedAt).toBe('2026-10-01T09:00:00.000Z')
  })

  it('accepts only what a picker could have offered', () => {
    const now = new Date('2026-09-21T12:00:00Z')
    const card = cleanCard(
      {
        homeGate: 99,
        fanSince: 1900,
        began: 'uncle',
        values: ['moments', 'shirts', 'archive', 'story', 'nonsense'],
        first: { venueSlug: 'היכל-אוסישקין' },
      },
      now,
    )
    expect(card.homeGate).toBeNull()
    expect(card.fanSince).toBeNull()
    expect(card.began).toBeNull()
    expect(card.values).toEqual(['moments', 'shirts', 'archive'])
    // Ussishkin Hall is basketball — rule 6 keeps it off a football card
    expect(card.first).toBeNull()
    expect(cleanCard({ first: { venueSlug: 'בלומפילד' }, homeGate: 'none', fanSince: 'new' }, now)).toMatchObject({
      first: { venueSlug: 'בלומפילד' },
      homeGate: 'none',
      fanSince: 'new',
    })
    expect(cleanCard({ first: { textHe: 'x'.repeat(40) } }, now).first).toEqual({ textHe: 'x'.repeat(24) })
  })
})

/* ---------------------------------------------------------------------- the card */

describe('כרטיס העובד — derived, per gate, and serialisable', () => {
  const TODAY = new Date('2026-09-21T12:00:00Z')

  it('has a source row for every gate on the wall', () => {
    for (const gate of GATES) expect(CARD_SOURCES[gate.number], `gate ${gate.number}`).toBeTypeOf('function')
    for (const key of Object.values(FIGURE_LABEL)) expect(MESSAGES[key], key).toBeTruthy()
  })

  it('an anonymous, empty device gets an honest empty card', () => {
    const state = workerCard({ profile: fresh(), book: book(), today: TODAY })
    expect(state.gates).toEqual({ lit: 0, of: PLAYABLE_GATES.length })
    expect(state.stamps).toEqual([])
    expect(state.dna).toEqual([])
    expect(state.supporter).toBeNull()
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    const story = cardStory(state, DEFAULT_SPEC)
    expect(story.hero).toBe('TIK-0417')
    expect(story.stats).toHaveLength(1)
    expect(story.template).toBe('kit')
  })

  it('Gate 7 → the card: favourite, number, position and reasons, after the seal', () => {
    const sealed = book({
      number: 9,
      supporter: {
        favouriteId: 'player-ba33af1a9517',
        positionCode: 'ST',
        reasons: { favourite: 'poll.reason.goals', number: 'poll.reason.idol' },
        sealedOn: DAY,
      },
    })
    const profile = run(fresh(), { type: 'ballot_sealed', supporter: sealed.supporter! }).profile
    const state = workerCard({ profile, book: sealed, favouriteHe: 'אבדג׳י', today: TODAY })
    expect(state.supporter).toEqual({
      favouriteId: 'player-ba33af1a9517',
      favouriteHe: 'אבדג׳י',
      positionCode: 'ST',
      reasons: 2,
      sealedOn: DAY,
    })
    const line = state.lines.find((row) => row.gate === 7)
    expect(line?.lit).toBe(true)
    expect(line?.figures).toEqual([
      { key: 'favourite', value: 'player-ba33af1a9517' },
      { key: 'number', value: 9 },
      { key: 'position', value: 'ST' },
      { key: 'reasons', value: 2, of: 8 },
    ])
    expect(state.stamps).toContain('ballot')
  })

  it('reads every gate off the progress record, and nothing off a guess', () => {
    let profile = fresh()
    const feed: ProgressEvent[] = [
      { type: 'gate_completed', gate: '/trivia', variant: 'europe', score: 90, correct: 10, asked: 12 },
      { type: 'gate_completed', gate: '/trivia', variant: 'numbers', score: 30, correct: 4, asked: 12 },
      { type: 'gate_completed', gate: '/lineup', score: 9, correct: 9, asked: 11 },
      { type: 'kit_unlocked', kitId: '1984/85|home' },
      { type: 'gate_completed', gate: '/kits/build', score: 400, correct: 20, asked: 25 },
      { type: 'gate_completed', gate: 'royal-rumble', score: 3, correct: 1, asked: 1 },
      { type: 'hate_wall_completed', seed: 41, survivorId: 'player-x' },
      { type: 'archive_saved', entityId: 'moment-1' },
      { type: 'red_thread_completed', routeId: 'route-1' },
    ]
    for (const event of feed) profile = run(profile, event).profile
    const state = workerCard({
      profile,
      book: book(),
      device: { xi: 1, kitKeys: ['1984/85|home', '1999/00|away'], designs: 2, ballot: 0, life: { year: 1990 } },
      kitsTotal: 168,
      revenge: { pending: 5, cleared: 2 },
      today: TODAY,
    })
    const figure = (gate: number, key: string) =>
      state.lines.find((row) => row.gate === gate)?.figures.find((f) => f.key === key)
    expect(figure(2, 'bestTopic')?.value).toBe('europe')
    expect(figure(2, 'correct')).toEqual({ key: 'correct', value: 14, of: 24 })
    expect(figure(2, 'revengePending')?.value).toBe(5)
    expect(figure(3, 'bestExact')).toEqual({ key: 'bestExact', value: 9, of: 11 })
    // the device ledger and the synced set are unioned by key — one shirt counts once
    expect(figure(4, 'kits')).toEqual({ key: 'kits', value: 2, of: 168 })
    expect(figure(5, 'designs')?.value).toBe(2)
    expect(figure(9, 'wins')?.value).toBe(1)
    expect(figure(11, 'survivor')?.value).toBe('player-x')
    expect(figure(12, 'saved')?.value).toBe(1)
    expect(figure(13, 'routes')?.value).toBe(1)
    expect(state.lifeYear).toBe(1990)
    expect(state.stamps).toEqual(expect.arrayContaining(['shirt', 'archive']))
    // pitch = 3 + 9, history = 2 ×2, shirts = 4
    expect(state.dna[0]).toBe('history')
    expect(state.recent).toHaveLength(3)
  })

  it('never puts the free-text "first game" on a share card', () => {
    const typed = applyCardPatch(
      book({ nameHe: 'פוגי' }),
      { first: { textHe: 'עם אבא בשכונה' }, fanSince: 1983, homeGate: 5 },
      TODAY,
    ).book
    const state: WorkerCardState = workerCard({ profile: fresh(), book: typed, today: TODAY })
    expect(state.declared.first).toEqual({ kind: 'text', textHe: 'עם אבא בשכונה' })
    const story = JSON.stringify(cardStory(state, DEFAULT_SPEC))
    expect(story).not.toContain('עם אבא')
    expect(story).toContain('פוגי')
    expect(cardStory(state, DEFAULT_SPEC).stats.map((s) => s.v)).toEqual([
      `0/${PLAYABLE_GATES.length}`,
      '1983',
      MESSAGES['core.card.homeGateN']?.replace('{n}', '5'),
    ])
  })

  it('counts a legacy punch and a played day once', () => {
    expect(activityDays(fresh({ days: [DAY] }), book({ punches: [DAY, '2026-09-01'] }))).toEqual([
      '2026-09-01',
      DAY,
    ])
  })
})
