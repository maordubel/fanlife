import { GATES } from '@/lib/gates'
import {
  FIRST_VENUES,
  type Began,
  type CardValue,
  type MemberBook,
  type WorkerCardFields,
} from '@/lib/game/member'
import { t, type MessageKey } from '@/lib/i18n'
import type { KitSpec } from '@/lib/kit/spec'
import type { StoryCard } from '@/lib/share/story'

import { gateId, variantStats, wallStat } from './gate-id'
import { rankOf, type Rank } from './standing'
import { activeIn, collected, onIds, streak, type Profile } from './store'

/**
 * כרטיס העובד — everything gate 10 prints, DERIVED, in one pure function (21.9.2026).
 *
 * Brief §20: *"do not make the user manually type information the app already knows."*
 * So the card is two halves and only one of them is typed. The person declares a
 * nickname, a number, a home gate, a year, how it began, a first place, three values
 * (`book.card`, `lib/game/member.ts`). Everything else — how far through the wall they
 * are, what each gate says about them, their DNA, their stamps — is read off the progress
 * record here, and nothing on the card can be bought (`lib/profile/standing.ts`).
 *
 * `workerCard(inputs)` returns a SERIALISABLE `WorkerCardState`: plain numbers, ids and
 * message keys, no functions and no React. That is what lets the same state feed the
 * card on screen, the share card (`cardStory`) and a test fixture.
 *
 * **Every input that belongs to another cluster comes IN** rather than being read here:
 * the kit catalogue's size (server-only), gate 2's Revenge counts (`lib/profile/marks.ts`,
 * the challenge cluster), the favourite's printed name (player-master). A card computed
 * without them prints what it knows and leaves the rest null — never a guess.
 */

/* ------------------------------------------------------------------------------ input */

export type CardInputs = {
  profile: Profile
  book: MemberBook
  /** `readDevice()` from `lib/profile/summary.ts` — the stores the profile predates */
  device?: {
    xi: number
    kitKeys: readonly string[]
    designs: number
    ballot: number
    life: { year: number | null } | null
  } | null
  /** `kitCatalog().length` — server-only, so the page hands it down. Null: no denominator. */
  kitsTotal?: number | null
  /** gate 2's Revenge ledger (`lib/profile/marks.ts`). Null until that cluster lands. */
  revenge?: { pending: number; cleared: number } | null
  /** the favourite's name as the archive prints it, resolved by the caller from player-master */
  favouriteHe?: string | null
  /**
   * gate 2's strongest topic from the Revenge ledger's per-question topics (`strengths()`,
   * resolved on the server) — used when the runs carry no topic variant to rank.
   */
  bestTopic?: string | null
  today?: Date
}

/* ----------------------------------------------------------------------------- output */

export type FigureKey =
  | 'sheets'
  | 'rounds'
  | 'correct'
  | 'asked'
  | 'bestTopic'
  | 'revengePending'
  | 'revengeCleared'
  | 'bestExact'
  | 'kits'
  | 'best'
  | 'designs'
  | 'bestStreak'
  | 'shelf'
  | 'favourite'
  | 'number'
  | 'position'
  | 'reasons'
  | 'goals'
  | 'matches'
  | 'wins'
  | 'walls'
  | 'survivor'
  | 'cards'
  | 'saved'
  | 'routes'

/** One number (or id) the card prints for a gate. `of` is its denominator, when one is honest. */
export type CardFigure = { key: FigureKey; value: number | string | null; of?: number | null }

export type CardLine = {
  gate: number
  /** the plate's route — `/trivia`, `/kits/build` */
  href: string
  lit: boolean
  plays: number
  lastOn: string
  figures: CardFigure[]
}

export const FAMILIES = ['history', 'shirts', 'terrace', 'pitch', 'memory'] as const
export type Family = (typeof FAMILIES)[number]

/** Which gates make up each family — the card's DNA (identity spec §3.5). */
export const FAMILY_GATES: Readonly<Record<Family, readonly number[]>> = {
  history: [2, 12, 13],
  shirts: [4, 5],
  terrace: [7, 11],
  pitch: [1, 3, 8, 9],
  memory: [6],
}

export const STAMPS = ['card', 'shirt', 'ballot', 'wall', 'archive'] as const
export type Stamp = (typeof STAMPS)[number]

export type FirstShown =
  | { kind: 'venue'; slug: string; nameHe: string }
  | { kind: 'match'; id: string }
  /** the free-text fallback: printed on the card, NEVER on a share card */
  | { kind: 'text'; textHe: string }

export type StoryBeat =
  | { kind: 'fan'; year: number | 'new' }
  | { kind: 'began'; id: Began }
  | { kind: 'first'; first: FirstShown }
  | { kind: 'joined'; on: string }
  | { kind: 'issued'; on: string }

export type WorkerCardState = {
  v: 1
  tik: string
  /** the nickname, '' when none was chosen — the card then prints the TIK */
  nameHe: string
  number: number
  declared: {
    homeGate: number | 'none' | null
    fanSince: number | 'new' | null
    began: Began | null
    first: FirstShown | null
    values: CardValue[]
  }
  /** ISO date the card was first issued, '' until then */
  issuedOn: string
  /** ISO date this person first played anything (`profile.since`) */
  since: string
  gates: { lit: number; of: number }
  /** days of activity — `profile.days` and the member book's legacy punches, unioned */
  days: number
  streak: number
  rank: Rank['id']
  /** one line per gate on the wall, in the wall's own order (GATES), gate 10 excluded */
  lines: CardLine[]
  /** up to three families, most played first */
  dna: Family[]
  /** up to three gate numbers, most recently played first */
  recent: number[]
  stamps: Stamp[]
  story: StoryBeat[]
  supporter: {
    favouriteId: string | null
    favouriteHe: string | null
    positionCode: string | null
    reasons: number
    sealedOn: string
  } | null
  ussishkin: { have: number; of: number }
  lifeYear: number | null
}

/** How many Ussishkin cards exist (`app/ussishkin/CardWall.tsx`). */
export const USSISHKIN_CARDS = 45

/* ------------------------------------------------------------------------ derivation */

type Ctx = {
  profile: Profile
  book: MemberBook
  device: NonNullable<CardInputs['device']> | null
  kitsTotal: number | null
  revenge: CardInputs['revenge']
  bestTopic: string | null
}

function stat(ctx: Ctx, href: string) {
  return wallStat(ctx.profile, href)
}

/** Distinct ids across several sets — two ledgers that may hold the same thing. */
function unionSize(...lists: ReadonlyArray<readonly string[]>): number {
  return new Set(lists.flat()).size
}

/**
 * The card's source registry — one row per gate, tested against `GATES` so a gate that
 * opens later cannot be forgotten here. Each row reads ONLY the progress record and the
 * inputs; none of them reaches into another gate's component (brief §24).
 */
export const CARD_SOURCES: Readonly<Record<number, (ctx: Ctx) => CardFigure[]>> = {
  1: (ctx) => [{ key: 'sheets', value: ctx.device?.xi ?? null, of: 2 }],
  2: (ctx) => {
    const line = stat(ctx, '/trivia')
    const topics = variantStats(ctx.profile, '/trivia')
      .filter((row) => row.stat.asked >= 6)
      .sort(
        (a, b) =>
          b.stat.correct / b.stat.asked - a.stat.correct / a.stat.asked || b.stat.asked - a.stat.asked,
      )
    return [
      { key: 'rounds', value: line.plays },
      { key: 'correct', value: line.correct, of: line.asked },
      { key: 'bestTopic', value: topics[0]?.variant ?? ctx.bestTopic },
      { key: 'revengePending', value: ctx.revenge?.pending ?? null },
      { key: 'revengeCleared', value: ctx.revenge?.cleared ?? null },
    ]
  },
  3: (ctx) => [{ key: 'bestExact', value: stat(ctx, '/lineup').best, of: 11 }],
  4: (ctx) => [
    {
      key: 'kits',
      value: unionSize(ctx.device?.kitKeys ?? [], collected(ctx.profile, 'kits')),
      of: ctx.kitsTotal,
    },
    { key: 'best', value: stat(ctx, '/kits/build').best },
  ],
  5: (ctx) => [
    {
      key: 'designs',
      value: Math.max(ctx.device?.designs ?? 0, collected(ctx.profile, 'kit.designs').length),
    },
  ],
  6: (ctx) => [
    { key: 'bestStreak', value: stat(ctx, '/memory').best },
    { key: 'shelf', value: collected(ctx.profile, 'memory').length },
  ],
  7: (ctx) => {
    const seal = ctx.book.supporter
    return [
      { key: 'favourite', value: seal?.favouriteId ?? null },
      { key: 'number', value: ctx.book.number },
      { key: 'position', value: seal?.positionCode ?? null },
      { key: 'reasons', value: seal ? Object.keys(seal.reasons).length : null, of: 8 },
    ]
  },
  8: (ctx) => [
    {
      key: 'goals',
      value: unionSize(collected(ctx.profile, 'goal.rebuilt'), collected(ctx.profile, 'goal')),
    },
    { key: 'best', value: stat(ctx, '/goal').best },
  ],
  9: (ctx) => {
    const line = stat(ctx, '/royal-rumble')
    return [
      { key: 'matches', value: line.plays },
      // Gate 9 reports a win as correct=1 of asked=1 (`RoyalRumbleRun.tsx`).
      { key: 'wins', value: line.correct },
    ]
  },
  10: () => [],
  11: (ctx) => {
    const last = ctx.profile.latest['derby.wall']?.v ?? null
    const survivor = last === null ? null : last.slice(last.indexOf(':') + 1) || null
    return [
      { key: 'walls', value: collected(ctx.profile, 'derby.walls').length },
      { key: 'survivor', value: survivor },
    ]
  },
  12: (ctx) => [
    { key: 'cards', value: activeIn(ctx.profile, 'archive').length },
    { key: 'saved', value: onIds('archive.mine', ctx.profile).length },
  ],
  13: (ctx) => [{ key: 'routes', value: collected(ctx.profile, 'thread.routes').length }],
}

/** The label every figure prints under — typed, so a missing key is a compile error. */
export const FIGURE_LABEL: Readonly<Record<FigureKey, MessageKey>> = {
  sheets: 'core.fig.sheets',
  rounds: 'core.fig.rounds',
  correct: 'core.fig.correct',
  asked: 'core.fig.asked',
  bestTopic: 'core.fig.bestTopic',
  revengePending: 'core.fig.revengePending',
  revengeCleared: 'core.fig.revengeCleared',
  bestExact: 'core.fig.bestExact',
  kits: 'core.fig.kits',
  best: 'core.fig.best',
  designs: 'core.fig.designs',
  bestStreak: 'core.fig.bestStreak',
  shelf: 'core.fig.shelf',
  favourite: 'core.fig.favourite',
  number: 'core.fig.number',
  position: 'core.fig.position',
  reasons: 'core.fig.reasons',
  goals: 'core.fig.goals',
  matches: 'core.fig.matches',
  wins: 'core.fig.wins',
  walls: 'core.fig.walls',
  survivor: 'core.fig.survivor',
  cards: 'core.fig.cards',
  saved: 'core.fig.saved',
  routes: 'core.fig.routes',
}

export const FAMILY_LABEL: Readonly<Record<Family, MessageKey>> = {
  history: 'core.dna.history',
  shirts: 'core.dna.shirts',
  terrace: 'core.dna.terrace',
  pitch: 'core.dna.pitch',
  memory: 'core.dna.memory',
}

export const STAMP_LABEL: Readonly<Record<Stamp, MessageKey>> = {
  card: 'core.stamp.card',
  shirt: 'core.stamp.shirt',
  ballot: 'core.stamp.ballot',
  wall: 'core.stamp.wall',
  archive: 'core.stamp.archive',
}

export const BEGAN_LABEL: Readonly<Record<Began, MessageKey>> = {
  father: 'core.began.father',
  friends: 'core.began.friends',
  alone: 'core.began.alone',
  born: 'core.began.born',
}

export const VALUE_LABEL: Readonly<Record<CardValue, MessageKey>> = {
  moments: 'core.value.moments',
  shirts: 'core.value.shirts',
  archive: 'core.value.archive',
  story: 'core.value.story',
  terrace: 'core.value.terrace',
  players: 'core.value.players',
}

/** Days of activity: the profile's days and the book's legacy punches, as one set. */
export function activityDays(profile: Profile, book: MemberBook | null): string[] {
  return [...new Set([...profile.days, ...(book?.punches ?? [])])].sort()
}

function shownFirst(first: WorkerCardFields['first']): FirstShown | null {
  if (first === null) return null
  if ('venueSlug' in first) {
    const venue = FIRST_VENUES.find((row) => row.slug === first.venueSlug)
    return venue ? { kind: 'venue', slug: venue.slug, nameHe: venue.nameHe } : null
  }
  if ('matchId' in first) return { kind: 'match', id: first.matchId }
  return { kind: 'text', textHe: first.textHe }
}

/** Derive the whole card. Pure. */
export function workerCard(inputs: CardInputs): WorkerCardState {
  const { profile, book } = inputs
  const ctx: Ctx = {
    profile,
    book,
    device: inputs.device ?? null,
    kitsTotal: inputs.kitsTotal ?? null,
    revenge: inputs.revenge ?? null,
    bestTopic: inputs.bestTopic ?? null,
  }
  const card = book.card ?? null

  const wall = GATES.filter((gate) => gate.href !== null)
  const lines: CardLine[] = wall.map((gate) => {
    const href = gateId(gate.href as string)
    const line = stat(ctx, href)
    return {
      gate: gate.number,
      href,
      lit: line.plays > 0,
      plays: line.plays,
      lastOn: line.lastOn,
      figures: (CARD_SOURCES[gate.number] ?? (() => []))(ctx),
    }
  })
  const playable = GATES.filter((gate) => gate.playable && gate.href !== null).map((gate) => gate.number)
  const lit = lines.filter((line) => line.lit && playable.includes(line.gate)).length

  const plays = new Map(lines.map((line) => [line.gate, line.plays]))
  const dna = FAMILIES.map((family) => ({
    family,
    plays: FAMILY_GATES[family].reduce((sum, gate) => sum + (plays.get(gate) ?? 0), 0),
  }))
    .filter((row) => row.plays > 0)
    .sort((a, b) => b.plays - a.plays || FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family))
    .slice(0, 3)
    .map((row) => row.family)

  const recent = lines
    .filter((line) => line.lit && line.lastOn !== '')
    .sort((a, b) => (a.lastOn < b.lastOn ? 1 : a.lastOn > b.lastOn ? -1 : a.gate - b.gate))
    .slice(0, 3)
    .map((line) => line.gate)

  const kitsLine = lines.find((line) => line.gate === 4)?.figures.find((f) => f.key === 'kits')
  const stamps: Stamp[] = []
  if (card !== null && card.issuedOn !== '') stamps.push('card')
  if (typeof kitsLine?.value === 'number' && kitsLine.value > 0) stamps.push('shirt')
  if (book.supporter !== undefined || (plays.get(7) ?? 0) > 0) stamps.push('ballot')
  if (lit === playable.length && playable.length > 0) stamps.push('wall')
  if (onIds('archive.mine', profile).length > 0) stamps.push('archive')

  const first = shownFirst(card?.first ?? null)
  const story: StoryBeat[] = []
  if (card?.fanSince !== null && card?.fanSince !== undefined) story.push({ kind: 'fan', year: card.fanSince })
  if (card?.began) story.push({ kind: 'began', id: card.began })
  if (first !== null) story.push({ kind: 'first', first })
  if (profile.since !== '') story.push({ kind: 'joined', on: profile.since })
  if (card !== null && card.issuedOn !== '') story.push({ kind: 'issued', on: card.issuedOn })

  const seal = book.supporter
  const days = activityDays(profile, book)

  return {
    v: 1,
    tik: book.tik,
    nameHe: book.nameHe.replace(/\s+/g, ' ').trim(),
    number: book.number,
    declared: {
      homeGate: card?.homeGate ?? null,
      fanSince: card?.fanSince ?? null,
      began: card?.began ?? null,
      first,
      values: card?.values ?? [],
    },
    issuedOn: card?.issuedOn ?? '',
    since: profile.since,
    gates: { lit, of: playable.length },
    days: days.length,
    streak: streak({ ...profile, days }, inputs.today ?? new Date()),
    rank: rankOf(profile).now.id,
    lines,
    dna,
    recent,
    stamps,
    story,
    supporter: seal
      ? {
          favouriteId: seal.favouriteId,
          favouriteHe: inputs.favouriteHe ?? null,
          positionCode: seal.positionCode,
          reasons: Object.keys(seal.reasons).length,
          sealedOn: seal.sealedOn,
        }
      : null,
    ussishkin: { have: collected(profile, 'ussishkin').length, of: USSISHKIN_CARDS },
    lifeYear: inputs.device?.life?.year ?? null,
  }
}

/* ------------------------------------------------------------------------------ share */

/**
 * The Worker Card as a story, on the existing `kit` template (rule 19 — one share
 * system). Kicker, the nickname or the TIK as the hero, at most three stamped facts, and
 * the home shirt with the person's number on its back.
 *
 * **No free text.** The nickname is the one thing a person typed that is meant to be
 * printed; everything else on the card is a number, a gate or a year. The free-text
 * "first game" fallback is deliberately absent — a sentence somebody wrote for their own
 * card is not something the app republishes to a group chat.
 */
export function cardStory(state: WorkerCardState, shirt: KitSpec): StoryCard {
  const stats: StoryCard['stats'] = [
    { k: t('core.card.gates'), v: `${state.gates.lit}/${state.gates.of}` },
  ]
  if (state.declared.fanSince !== null) {
    stats.push({
      k: t('core.card.fanSince'),
      v: state.declared.fanSince === 'new' ? t('core.card.fanNew') : String(state.declared.fanSince),
    })
  }
  if (state.declared.homeGate !== null) {
    stats.push({
      k: t('core.card.homeGate'),
      v:
        state.declared.homeGate === 'none'
          ? t('core.card.homeNone')
          : t('core.card.homeGateN', { n: String(state.declared.homeGate) }),
    })
  }
  return {
    template: 'kit',
    kicker: 'GATE 10 · WORKER CARD',
    label: t('screen.tik.title'),
    eyebrow: t('core.card.eyebrow'),
    hero: state.nameHe !== '' ? state.nameHe : state.tik,
    stats: stats.slice(0, 3),
    cta: t('tik.cta'),
    challenge: t('core.card.challenge'),
    kit: { ...shirt, number: state.number },
  }
}
