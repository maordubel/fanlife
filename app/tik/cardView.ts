import { GATES } from '@/lib/gates'
import { currentSeasonStartYear } from '@/lib/game/seasons'
import {
  FAN_SINCE_MIN,
  FIRST_VENUES,
  capName,
  cleanCard,
  cleanNumber,
  emptyCard,
  type Began,
  type CardPatch,
  type CardValue,
  type FirstMemory,
  type MemberBook,
} from '@/lib/game/member'
import { t, type MessageKey } from '@/lib/i18n'
import { positionLabel } from '@/lib/polls/ballot'
import {
  BEGAN_LABEL,
  FAMILY_LABEL,
  FIGURE_LABEL,
  STAMPS,
  VALUE_LABEL,
  type CardFigure,
  type FirstShown,
  type Stamp,
  type WorkerCardState,
} from '@/lib/profile/card'
import type { Marks } from '@/lib/profile/marks'

/**
 * כרטיס העובד — the screen's own arithmetic, pure (gate 10, 21.9.2026).
 *
 * `lib/profile/card.ts` derives WHAT the card says. This file decides how the screen says
 * it: the editor's draft and the live preview it feeds, which three stamps sit on the
 * card, the barcode printed from the TIK, the oath and the story written out of the
 * derived state, and the one line each gate prints on the wall. Nothing here reads
 * storage, nothing here is random, and nothing here is stored — the oath in particular
 * is a template over the state, rebuilt on every render, so there is nothing to keep in
 * sync and nothing a person typed that the app then republishes.
 */

/* ------------------------------------------------------------------------ the draft */

/** Everything the editor holds — the declared half of the card, all of it, always. */
export type CardDraft = {
  nameHe: string
  number: number
  homeGate: number | 'none' | null
  fanSince: number | 'new' | null
  began: Began | null
  first: FirstMemory | null
  values: CardValue[]
}

/** The draft a saved book opens the editor with. */
export function draftOf(book: MemberBook): CardDraft {
  const card = book.card ?? emptyCard()
  return {
    nameHe: book.nameHe,
    number: book.number,
    homeGate: card.homeGate,
    fanSince: card.fanSince,
    began: card.began,
    first: card.first,
    values: [...card.values],
  }
}

/** The patch a save sends through `emit({ type: 'card_edited' })`. */
export function patchOf(draft: CardDraft): CardPatch {
  return {
    nameHe: draft.nameHe,
    number: draft.number,
    homeGate: draft.homeGate,
    fanSince: draft.fanSince,
    began: draft.began,
    first: draft.first,
    values: draft.values,
  }
}

/**
 * The book as the preview draws it: the draft laid over the saved book and cleaned the
 * way a save would clean it — but WITHOUT issuing anything. `issuedOn` and `editedAt` stay
 * what the saved book says, so the preview never shows the "card issued" stamp for a card
 * nobody has saved yet.
 */
export function draftBook(book: MemberBook, draft: CardDraft, now: Date = new Date()): MemberBook {
  const prior = book.card ?? emptyCard()
  const clean = cleanCard({ ...prior, ...draft }, now)
  return {
    ...book,
    nameHe: capName(draft.nameHe),
    number: cleanNumber(draft.number) ?? book.number,
    card: { ...clean, issuedOn: prior.issuedOn, editedAt: prior.editedAt },
  }
}

/** Has the person changed anything the save would write? Whitespace a save trims is not a change. */
export function draftDirty(book: MemberBook, draft: CardDraft): boolean {
  const saved = draftOf(book)
  const norm = (d: CardDraft) =>
    JSON.stringify([
      d.nameHe.replace(/\s+/g, ' ').trim(),
      d.number,
      d.homeGate,
      d.fanSince,
      d.began,
      d.first,
      [...d.values].sort(),
    ])
  return norm(saved) !== norm(draft)
}

/** Toggle a value chip, keeping at most `max` — a fourth tap is refused, never a silent swap. */
export function toggleValue(values: readonly CardValue[], value: CardValue, max = 3): CardValue[] {
  if (values.includes(value)) return values.filter((v) => v !== value)
  if (values.length >= max) return [...values]
  return [...values, value]
}

/**
 * The years a person can say they became a fan in: from the club's founding to the
 * season running now, newest first. The upper bound is the SEASON, not the calendar — in
 * May 2027 the season is still 2026/27, and a fan "since 2027" has not seen a match yet.
 */
export function fanYears(now: Date = new Date()): number[] {
  const out: number[] = []
  for (let year = currentSeasonStartYear(now); year >= FAN_SINCE_MIN; year -= 1) out.push(year)
  return out
}

/* ---------------------------------------------------------------------- the stamps */

/**
 * Which stamp is worth the most room on the card when there are more than three: the
 * whole wall first, then the card itself, the seal, the first shirt, the first save.
 */
export const STAMP_ORDER: readonly Stamp[] = ['wall', 'card', 'ballot', 'shirt', 'archive']

export type StampSlot = { id: Stamp; earned: boolean }

/**
 * The (up to) three stamps the card prints. Deterministic: the earned ones in
 * `STAMP_ORDER`, whatever order the state listed them in, then — while there is room —
 * the next ones not yet earned, printed as empty outlines so the card says what is left
 * to stamp. Nothing here is tied to an account: `lib/profile/standing.ts` says nothing
 * can be unlocked by signing in, and a stamp is no exception.
 */
export function cardStamps(earned: readonly Stamp[], max = 3): StampSlot[] {
  const have = new Set(earned.filter((id) => STAMPS.includes(id)))
  const got = STAMP_ORDER.filter((id) => have.has(id)).map((id) => ({ id, earned: true }))
  const next = STAMP_ORDER.filter((id) => !have.has(id)).map((id) => ({ id, earned: false }))
  return [...got, ...next].slice(0, max)
}

/** A stamp's lean, fixed per slot — a press stamps at the same angle every time. */
export const STAMP_TILT: readonly number[] = [-4, 3, -2]

/* --------------------------------------------------------------------- the barcode */

/**
 * Code 39 — the barcode printed from the TIK. Each character is nine elements, bar and
 * space alternating from a bar, three of them wide; `1` is a module of ink. The TIK is
 * `TIK-0417`, every character of which is in the set, so the bars on the card are the
 * file number itself and would read back as it.
 */
const CODE39: Readonly<Record<string, string>> = {
  '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
  '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
  '8': '110100101101', '9': '101100101101', A: '110101001011', B: '101101001011',
  C: '110110100101', D: '101011001011', E: '110101100101', F: '101101100101',
  G: '101010011011', H: '110101001101', I: '101101001101', J: '101011001101',
  K: '110101010011', L: '101101010011', M: '110110101001', N: '101011010011',
  O: '110101101001', P: '101101101001', Q: '101010110011', R: '110101011001',
  S: '101101011001', T: '101011011001', U: '110010101011', V: '100110101011',
  W: '110011010101', X: '100101101011', Y: '110010110101', Z: '100110110101',
  '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
}

export const CODE39_TABLE = CODE39

/** The bars for `text`, in modules: `{x, w}` runs of ink, and the total width. */
export function barcodeBars(text: string): { bars: { x: number; w: number }[]; width: number } {
  const chars = ['*', ...text.toUpperCase().split('').filter((c) => c in CODE39), '*']
  const bars: { x: number; w: number }[] = []
  let x = 0
  chars.forEach((char, index) => {
    const pattern = CODE39[char] as string
    let run = 0
    for (let i = 0; i <= pattern.length; i += 1) {
      if (i < pattern.length && pattern[i] === '1') {
        run += 1
        continue
      }
      if (run > 0) bars.push({ x: x + i - run, w: run })
      run = 0
    }
    x += pattern.length
    // the narrow gap between characters
    if (index < chars.length - 1) x += 1
  })
  return { bars, width: x }
}

/* --------------------------------------------------------------------- the ledger */

/** Gate 2's Revenge, off the device ledger: waiting (last answer wrong) and settled. */
export function revengeOf(marks: Marks): { pending: number; cleared: number } {
  let pending = 0
  let cleared = 0
  for (const mark of Object.values(marks)) {
    if (mark.last === 'w') pending += 1
    else if (mark.w > 0) cleared += 1
  }
  return { pending, cleared }
}

/* ---------------------------------------------------------------------- the labels */

/** Names the server resolved for ids the card holds — people, matches. */
export type CardNames = Readonly<Record<string, string>>

const TOPIC_LABEL: Readonly<Record<string, MessageKey>> = {
  europe: 'trivia.lobby.topic.europe',
  players: 'trivia.lobby.topic.players',
  history: 'trivia.lobby.topic.history',
  numbers: 'trivia.lobby.topic.numbers',
  songs: 'trivia.lobby.topic.songs',
  kits: 'trivia.lobby.topic.kits',
  derby: 'trivia.lobby.topic.derby',
  general: 'topic.general',
  'terrace-songs': 'trivia.lobby.topic.songs',
  'player-songs': 'trivia.lobby.topic.songs',
}

export function topicLabel(topic: string): string | null {
  const key = TOPIC_LABEL[topic]
  return key ? t(key) : null
}

/** `2026-09-21` → `21.9.2026`, the way the rest of the app prints a day. */
export function dayLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return iso
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`
}

export function homeGateLabel(gate: number | 'none' | null): string | null {
  if (gate === null) return null
  return gate === 'none' ? t('core.card.homeNone') : t('core.card.homeGateN', { n: String(gate) })
}

export function fanSinceLabel(since: number | 'new' | null): string | null {
  if (since === null) return null
  return since === 'new' ? t('core.card.fanNew') : String(since)
}

export function beganLabel(began: Began | null): string | null {
  return began === null ? null : t(BEGAN_LABEL[began])
}

/** The first place or game, printed — a match by the name the archive gives it, or nothing. */
export function firstLabel(first: FirstShown | null, names: CardNames): string | null {
  if (first === null) return null
  if (first.kind === 'venue') return first.nameHe
  if (first.kind === 'match') return names[first.id] ?? null
  return first.textHe
}

/** The venue's name for a draft's `venueSlug` — the picker's own list, nothing else. */
export function venueName(slug: string): string | null {
  return FIRST_VENUES.find((venue) => venue.slug === slug)?.nameHe ?? null
}

export function gateTitle(number: number): string | null {
  const gate = GATES.find((row) => row.number === number)
  return gate ? t(gate.title) : null
}

/**
 * One figure, printed — or null when there is nothing honest to print: an unresolved
 * id, a missing ledger, or a bare zero with no denominator to give it meaning.
 */
export function figureText(figure: CardFigure, names: CardNames): string | null {
  const { value } = figure
  if (value === null || value === undefined) return null
  switch (figure.key) {
    case 'bestTopic':
      return typeof value === 'string' ? topicLabel(value) : null
    case 'favourite':
    case 'survivor':
      return typeof value === 'string' ? names[value] ?? null : null
    case 'position':
      return typeof value === 'string' ? positionLabel(value) : null
    default:
      if (typeof value !== 'number') return null
      if (typeof figure.of === 'number') return `${value}/${figure.of}`
      return value === 0 ? null : String(value)
  }
}

/**
 * The figures a wall plate already prints on its own line — rounds played and the best
 * score — so the plate's figure row does not say them twice.
 */
export const WALL_REPEATS: ReadonlySet<CardFigure['key']> = new Set(['rounds', 'matches', 'best', 'bestStreak'])

/** A gate's line on the wall: at most three figures, each with its label. */
export function lineFigures(
  figures: readonly CardFigure[],
  names: CardNames,
  max = 3,
  skip: ReadonlySet<CardFigure['key']> = WALL_REPEATS,
): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = []
  for (const figure of figures) {
    if (skip.has(figure.key)) continue
    const text = figureText(figure, names)
    if (text === null) continue
    out.push({ label: t(FIGURE_LABEL[figure.key]), text })
    if (out.length >= max) break
  }
  return out
}

/* ------------------------------------------------------------------------- the oath */

/** "רגעים, חולצות וארכיון" — a Hebrew list, the last item joined with ו. */
export function hebrewList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  const head = items.slice(0, -1).join(', ')
  return `${head} ${t('tik.oath.and', { x: items[items.length - 1] as string })}`
}

const BEGAN_OATH: Readonly<Record<Began, MessageKey>> = {
  father: 'tik.oath.began.father',
  friends: 'tik.oath.began.friends',
  alone: 'tik.oath.began.alone',
  born: 'tik.oath.began.born',
}

/**
 * שבועת האוהד — written out of the card, line by line, and never stored.
 *
 * Every line is a template in the catalogue and every blank in it is a field the person
 * declared or a figure the app derived; a line whose field is empty is left out rather
 * than filled with a default (the prototype's "פוגי, 1983, בלומפילד, עם אבא" were demo
 * facts, §25). The free-text first memory IS printed here — this is the person's own
 * screen — and is still never printed on a share card (`cardStory`).
 */
export function oathLines(state: WorkerCardState, names: CardNames): string[] {
  const d = state.declared
  const lines: string[] = [
    state.nameHe !== ''
      ? t('tik.oath.named', { name: state.nameHe, tik: state.tik })
      : t('tik.oath.anon', { tik: state.tik }),
  ]
  if (d.homeGate === 'none') lines.push(t('tik.oath.gateNone'))
  else if (d.homeGate !== null) lines.push(t('tik.oath.gate', { n: String(d.homeGate) }))
  if (d.fanSince === 'new') lines.push(t('tik.oath.fanNew'))
  else if (d.fanSince !== null) lines.push(t('tik.oath.fan', { year: String(d.fanSince) }))
  if (d.began !== null) lines.push(t(BEGAN_OATH[d.began]))
  const first = firstLabel(d.first, names)
  if (d.first !== null && first !== null) {
    const key: MessageKey =
      d.first.kind === 'venue' ? 'tik.oath.firstPlace' : d.first.kind === 'match' ? 'tik.oath.firstMatch' : 'tik.oath.firstText'
    lines.push(t(key, { first }))
  }
  if (d.values.length > 0) lines.push(t('tik.oath.keep', { list: hebrewList(d.values.map((v) => t(VALUE_LABEL[v]))) }))
  lines.push(
    state.gates.lit > 0
      ? t('tik.oath.gates', { lit: String(state.gates.lit), of: String(state.gates.of) })
      : t('tik.oath.gatesNone'),
  )
  if (state.dna[0]) lines.push(t('tik.oath.dna', { family: t(FAMILY_LABEL[state.dna[0]]) }))
  lines.push(t('tik.oath.close'))
  return lines
}

/** The oath's tags — the three declared facts it rests on, when they exist. */
export function oathTags(state: WorkerCardState, names: CardNames): string[] {
  const d = state.declared
  const since =
    d.fanSince === null ? null : d.fanSince === 'new' ? t('core.card.fanNew') : t('tik.oath.tagSince', { year: String(d.fanSince) })
  return [homeGateLabel(d.homeGate), since, firstLabel(d.first, names), beganLabel(d.began)].filter(
    (tag): tag is string => tag !== null && tag !== '',
  )
}

/* ------------------------------------------------------------------------ the story */

export type StoryItem = {
  id: string
  /** the small line over the title */
  kicker: string
  title: string
  body: string | null
  /** a real ISO date, when the beat has one */
  on: string | null
  /** the red plate — declared beats; the paper plate — what the app recorded */
  tone: 'red' | 'paper'
}

/**
 * הסיפור שלי — the declared fields, then the days the app actually recorded, oldest
 * first. Only real dates: the first evening here (only once something was played — an
 * untouched device's "since" is just today), the day the ballot was sealed, the day the
 * card was issued. The last beat is always "the story goes on", with the gates played
 * most recently.
 */
export function storyItems(state: WorkerCardState, names: CardNames): StoryItem[] {
  const d = state.declared
  const items: StoryItem[] = []
  if (d.fanSince !== null) {
    items.push({
      id: 'fan',
      kicker: t('tik.story.fan'),
      title: fanSinceLabel(d.fanSince) as string,
      body: d.fanSince === 'new' ? t('tik.story.fanNewBody') : t('tik.story.fanBody'),
      on: null,
      tone: 'red',
    })
  }
  if (d.began !== null) {
    items.push({ id: 'began', kicker: t('tik.story.began'), title: beganLabel(d.began) as string, body: null, on: null, tone: 'paper' })
  }
  const first = firstLabel(d.first, names)
  if (d.first !== null && first !== null) {
    items.push({
      id: 'first',
      kicker: t('tik.story.first'),
      title: first,
      body: d.first.kind === 'match' ? t('tik.story.firstMatch') : d.first.kind === 'venue' ? t('tik.story.firstPlace') : null,
      on: null,
      tone: 'red',
    })
  }
  if (d.homeGate !== null) {
    items.push({
      id: 'home',
      kicker: t('tik.story.home'),
      title: homeGateLabel(d.homeGate) as string,
      body: t('tik.story.homeBody'),
      on: null,
      tone: 'paper',
    })
  }
  const dated: StoryItem[] = []
  if (state.days > 0 && state.since !== '') {
    dated.push({ id: 'joined', kicker: t('tik.story.joined'), title: dayLabel(state.since), body: t('tik.story.joinedBody'), on: state.since, tone: 'paper' })
  }
  if (state.supporter !== null) {
    dated.push({
      id: 'sealed',
      kicker: t('tik.story.sealed'),
      title: dayLabel(state.supporter.sealedOn),
      body: state.supporter.favouriteHe ? t('tik.story.sealedFav', { name: state.supporter.favouriteHe }) : t('tik.story.sealedBody'),
      on: state.supporter.sealedOn,
      tone: 'paper',
    })
  }
  if (state.issuedOn !== '') {
    dated.push({ id: 'issued', kicker: t('tik.story.issued'), title: dayLabel(state.issuedOn), body: t('tik.story.issuedBody', { tik: state.tik }), on: state.issuedOn, tone: 'red' })
  }
  dated.sort((a, b) => ((a.on ?? '') < (b.on ?? '') ? -1 : (a.on ?? '') > (b.on ?? '') ? 1 : 0))
  const recent = state.recent.map((n) => gateTitle(n)).filter((title): title is string => title !== null)
  items.push(...dated, {
    id: 'now',
    kicker: t('tik.story.now'),
    title: t('tik.story.nowTitle'),
    body: recent.length > 0 ? t('tik.story.nowRecent', { list: hebrewList(recent) }) : t('tik.story.nowEmpty'),
    on: null,
    tone: 'paper',
  })
  return items
}
