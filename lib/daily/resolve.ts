import 'server-only'

import { entity, today as graphToday } from '@/lib/archive/graph'
import type { GraphEntity } from '@/lib/archive/graph-types'
import { allMatches, isDisputed, matchById } from '@/lib/archive/match-master'
import type { MatchRecord } from '@/lib/archive/match-master-types'
import { discoverPool, longDateHe } from '@/lib/archive/wing'
import { CONFIDENCE_FLOOR, DERBY_RIVAL, nameOf } from '@/lib/game/archive'
import { dailyQuestion } from '@/lib/game/blind-cow/bank'
import { dealChallenge } from '@/lib/game/lineup'
import { TOPICS, questionTopic, topicSpec, type Topic } from '@/lib/game/topics'
import { ROUND_LENGTH, dealSeededRun } from '@/lib/game/trivia'
import { t, type MessageKey } from '@/lib/i18n'
import {
  archiveHref,
  gateHref,
  goalIdsOfMatch,
  lineupHref,
  matchSubject,
  playableGoalHref,
  playerSubject,
} from '@/lib/links'
import { debateOptions } from '@/lib/polls/debates-server'
import { DEBATES, debateRound, type Debate, type DebateOptionSource } from '@/lib/polls/debates'

import { eraLabel } from './copy'
import { cycleAt, dayNumber, daySeed } from './rotation'
import type { Daily, DailyItem, DailyKind, DailyTheme, DailyThemeReason } from './types'

/**
 * היום בהפועל — the resolver (ONE RED WORLD §7, §42). Server-only: it reads the masters.
 *
 *   resolveDaily('2026-05-24')  →  { date, theme, items: [remember, choose, discover] }
 *
 * Deterministic per Israel date and nothing else — no clock inside, no randomness, no
 * device: the same date deals the same three things to everybody, which is what lets a
 * daily be "the same one" for two friends before any social layer exists.
 *
 * ## Historical Daily (§7.1)
 *
 * A day is THEMED only when the Match Master holds a reliable anchor for its month-day:
 * a football match at the trivia floor (`confidence ≥ 2`, rule 2), dated to the day, with
 * no open claim, no conflict and no walkover behind it, played in an EARLIER year — and
 * one worth building a day on: a goal gate 8 can replay, an XI gate 3 can deal, a final, a
 * European night, a curated moment, or a derby won. Then all three items come from that
 * one match wherever a gate can serve it (the replay or the lineup, the debate whose list
 * holds it or its scorer for your XI, its archive card), every door checked by
 * `lib/links`. Trophies are not anchors: `trophies.json` carries a season and no day, and
 * "on this day the club won the title" would be a date the archive does not hold.
 *
 * Otherwise the generic rotation. **An anniversary is never invented** — the only
 * "היום לפני" a generic day prints is an archive entity whose own date is today's
 * month-day (`tests/daily.test.ts` walks all 366 days and checks every one).
 *
 * ## The rotation (§1.4)
 *
 * Each slot walks its pool as one fixed permutation by day number (`rotation.ts`), so
 * nothing comes back before the pool is used up. The pinned seeds (`daySeed`) make each
 * link a round everybody plays identically that day — rule 24's "a pinned round is played
 * exactly as written".
 */

const EUROPE = new Set(['גביע-אופא', 'הליגה-האירופית', 'ליגת-האלופות', 'קונפרנס-ליג', 'גביע-האינטרטוטו'])

/** what makes a day worth theming, strongest first */
const REASON_RANK: Readonly<Record<DailyThemeReason, number>> = {
  goal: 6,
  lineup: 5,
  final: 4,
  europe: 3,
  moment: 2,
  derby: 1,
}

/** the fields a day's anniversary stands on — none of them may be open to dispute */
const ANCHOR_FIELDS = ['playedOn', 'result', 'opponent', 'home'] as const

/**
 * The floor an anchor stands on: football, the trivia floor, dated to the day, played, and
 * no claim or open conflict on the date, the result, the opponent or who was at home. A
 * conflict on some OTHER field does not unmake the day — 24.5.1986 carries one on its
 * competition label — it only keeps that field off the card (`competitionHe: null`).
 */
export function reliableMatch(match: MatchRecord): boolean {
  return (
    match.sport === 'football' &&
    match.playedOn.precision === 'day' &&
    typeof match.playedOn.value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(match.playedOn.value) &&
    match.confidence >= CONFIDENCE_FLOOR &&
    !match.notPlayed &&
    match.opponent !== null &&
    match.result !== null &&
    ANCHOR_FIELDS.every((field) => !isDisputed(match, field))
  )
}

function reasonsOf(match: MatchRecord): DailyThemeReason[] {
  const out: DailyThemeReason[] = []
  if (goalIdsOfMatch(match.matchId).some((id) => playableGoalHref(id))) out.push('goal')
  if (lineupHref(match.matchId)) out.push('lineup')
  if (match.stage === 'גמר') out.push('final')
  if (EUROPE.has(match.competition)) out.push('europe')
  if (match.momentIds.length > 0) out.push('moment')
  if (DERBY_RIVAL !== null && match.opponent === DERBY_RIVAL && match.result !== null && match.result.hapoel > match.result.opponent) {
    out.push('derby')
  }
  return out.sort((a, b) => REASON_RANK[b] - REASON_RANK[a])
}

type Anchor = { match: MatchRecord; reason: DailyThemeReason }

let byMonthDay: Map<string, Anchor[]> | null = null
/** every themeable match, by `MM-DD`, built once per server */
function anchorsByMonthDay(): Map<string, Anchor[]> {
  if (byMonthDay) return byMonthDay
  const map = new Map<string, Anchor[]>()
  for (const match of allMatches()) {
    if (!reliableMatch(match) || !archiveHref(match.matchId)) continue
    const [reason] = reasonsOf(match)
    if (!reason) continue
    const md = (match.playedOn.value as string).slice(5, 10)
    map.set(md, [...(map.get(md) ?? []), { match, reason }])
  }
  byMonthDay = map
  return map
}

/**
 * The anchor for a date, or null. Only rows from an earlier year count (a match cannot be
 * "N years ago" today or in the future); among them the strongest reason wins, and a tie
 * is broken by the date itself, so the same month-day can tell a different story in a
 * different year — and always the same one on the same date.
 */
export function anchorFor(date: string): Anchor | null {
  const year = Number(date.slice(0, 4))
  const pool = (anchorsByMonthDay().get(date.slice(5, 10)) ?? []).filter(
    (a) => Number((a.match.playedOn.value as string).slice(0, 4)) < year,
  )
  if (pool.length === 0) return null
  const best = Math.max(...pool.map((a) => REASON_RANK[a.reason]))
  const top = pool.filter((a) => REASON_RANK[a.reason] === best).sort((a, b) => (a.match.matchId < b.match.matchId ? -1 : 1))
  return top[daySeed(date, 'anchor') % top.length] ?? null
}

/** every month-day the archive can theme — for the tests and the docs */
export function themeableMonthDays(): string[] {
  return [...anchorsByMonthDay().keys()].sort()
}

/* ------------------------------------------------------------------ seed searches */

const SEARCH = 6000

/** the first pinned seed from `start` whose deal satisfies `test` — a door that opens on exactly that */
function findSeed(start: number, test: (seed: number) => boolean): number | null {
  for (let i = 0; i < SEARCH; i += 1) {
    const seed = ((start - 1 + i) % 9_999_991) + 1
    if (test(seed)) return seed
  }
  return null
}

function lineupDoor(matchId: string, date: string): string | null {
  const base = lineupHref(matchId)
  if (!base) return null
  const seed = findSeed(daySeed(date, 'lineup'), (s) => dealChallenge(s, 0)?.matchId === matchId)
  return seed === null ? null : `${base}?seed=${seed}`
}

/** gate 7 opens on this debate first */
function debateDoor(debate: Debate, date: string): string | null {
  const base = gateHref(7)
  if (!base) return null
  const seed = findSeed(daySeed(date, `debate:${debate.id}`), (s) => debateRound(s, 0).debates[0]?.id === debate.id)
  return seed === null ? null : `${base}?tab=debate&seed=${seed}`
}

function triviaDoor(topic: Topic, decade: number | null, date: string): string | null {
  const base = gateHref(2)
  if (!base) return null
  const seed = daySeed(date, `trivia:${topic}:${decade ?? 'all'}`)
  const ids = dealSeededRun({ topic: questionTopic(topic), decade, hard: false }, seed, 0).ids
  if (ids.length < ROUND_LENGTH) return null
  return decade === null ? `${base}/${topic}?seed=${seed}` : `${base}/${topic}?era=${decade}&seed=${seed}`
}

/* ------------------------------------------------------------------ items */

function item(
  slot: DailyItem['slot'],
  kind: DailyKind,
  key: string,
  href: string,
  done: DailyItem['done'],
  extra: Partial<Pick<DailyItem, 'promptKey' | 'promptVars' | 'subjectHe' | 'yearsAgo'>> = {},
): DailyItem {
  return {
    slot,
    kind,
    key,
    href,
    done,
    promptKey: extra.promptKey ?? null,
    promptVars: extra.promptVars ?? null,
    subjectHe: extra.subjectHe ?? null,
    yearsAgo: extra.yearsAgo ?? null,
  }
}

function triviaItem(topic: Topic, decade: number | null, date: string, key: string): DailyItem | null {
  const href = triviaDoor(topic, decade, date)
  if (!href) return null
  const topicHe = t(topicSpec(topic).titleKey as MessageKey)
  return item('remember', 'trivia', key, href, { by: 'gate', gate: '/trivia' }, decade === null
    ? { promptKey: 'daily.trivia.topic', promptVars: { topic: topicHe } }
    : { promptKey: 'daily.trivia.era', promptVars: { topic: topicHe, era: eraLabel(decade) } })
}

/* ------------------------------------------------------------------ generic rotation */

export const REMEMBER_KINDS = ['blindCow', 'trivia', 'memory', 'timeline'] as const
type RememberKind = (typeof REMEMBER_KINDS)[number]

const XI_PROMPTS = ['captain', 'twelfth', 'lastCut'] as const
const XI_PROMPT_KEY: Readonly<Record<(typeof XI_PROMPTS)[number], MessageKey>> = {
  captain: 'daily.xi.captain',
  twelfth: 'daily.xi.twelfth',
  lastCut: 'daily.xi.lastCut',
}

/** the choose pool: every debate, three XI prompts, one shirt — `debate:<id>`, `xi:<p>`, `kit:favourite` */
export function choosePool(): string[] {
  return [...DEBATES.map((d) => `debate:${d.id}`), ...XI_PROMPTS.map((p) => `xi:${p}`), 'kit:favourite']
}

function rememberOf(kind: RememberKind, date: string): DailyItem | null {
  const day = dayNumber(date)
  switch (kind) {
    case 'blindCow': {
      const base = gateHref(10)
      if (!base || !dailyQuestion(date)) return null
      return item('remember', 'blindCow', 'blindCow', `${base}?mode=daily`, { by: 'run', id: '/blind-cow/daily' })
    }
    case 'trivia': {
      // the topic walks its own cycle, one step per trivia day
      const topic = cycleAt(TOPICS, Math.floor(day / REMEMBER_KINDS.length), 'daily:trivia-topic') ?? 'general'
      return triviaItem(topic, null, date, `trivia:${topic}`) ?? triviaItem('general', null, date, 'trivia:general')
    }
    case 'memory':
    case 'timeline': {
      const base = gateHref(kind === 'memory' ? 6 : 13)
      if (!base) return null
      return item('remember', kind, kind, `${base}?seed=${daySeed(date, kind)}`, { by: 'gate', gate: base })
    }
  }
}

/** the day's remember item from the cycle; an unavailable kind hands the day to the next one */
export function genericRemember(date: string): DailyItem {
  const day = dayNumber(date)
  const deck = REMEMBER_KINDS.length
  const first = cycleAt(REMEMBER_KINDS, day, 'daily:remember') as RememberKind
  const start = REMEMBER_KINDS.indexOf(first)
  for (let i = 0; i < deck; i += 1) {
    const got = rememberOf(REMEMBER_KINDS[(start + i) % deck] as RememberKind, date)
    if (got) return got
  }
  return item('remember', 'trivia', 'trivia:general', gateHref(2) ?? '/trivia', { by: 'gate', gate: '/trivia' })
}

function chooseOf(key: string, date: string): DailyItem | null {
  if (key.startsWith('debate:')) {
    const debate = DEBATES.find((d) => `debate:${d.id}` === key)
    const href = debate ? debateDoor(debate, date) : null
    return debate && href ? item('choose', 'debate', key, href, { by: 'debate', debateId: debate.id }, { subjectHe: debate.promptHe }) : null
  }
  if (key.startsWith('xi:')) {
    const base = gateHref(1)
    const prompt = key.slice(3) as (typeof XI_PROMPTS)[number]
    return base && XI_PROMPT_KEY[prompt] ? item('choose', 'xi', key, base, { by: 'gate', gate: base }, { promptKey: XI_PROMPT_KEY[prompt] }) : null
  }
  const base = gateHref(5)
  return base ? item('choose', 'kit', key, base, { by: 'gate', gate: base }, { promptKey: 'daily.kit.favourite' }) : null
}

export function genericChoose(date: string): DailyItem {
  const pool = choosePool()
  const day = dayNumber(date)
  for (let i = 0; i < pool.length; i += 1) {
    const got = chooseOf(cycleAt(pool, day + i, 'daily:choose') as string, date)
    if (got) return got
  }
  return item('choose', 'xi', 'xi:captain', gateHref(1) ?? '/xi', { by: 'gate', gate: '/xi' }, { promptKey: 'daily.xi.captain' })
}

const TYPE_ORDER: Readonly<Record<string, number>> = { moment: 0, match: 1, trophy: 2, kit: 3, person: 4, press: 9 }

/**
 * What the archive holds for this month-day, from an earlier year, at the trivia floor —
 * the same rows gate 12's "היום לפני" corner reads (`graph.today`), filtered harder.
 */
export function datedToday(date: string): GraphEntity[] {
  const year = Number(date.slice(0, 4))
  return graphToday(date).filter(
    (e) =>
      e.confidence >= CONFIDENCE_FLOOR &&
      e.date?.precision === 'day' &&
      e.date.value.slice(5, 10) === date.slice(5, 10) &&
      Number(e.date.value.slice(0, 4)) < year &&
      archiveHref(e.id) !== null,
  )
}

export function genericDiscover(date: string): DailyItem {
  const day = dayNumber(date)
  const dated = datedToday(date)
  if (dated.length > 0) {
    const best = Math.min(...dated.map((e) => TYPE_ORDER[e.type] ?? 5))
    const pool = dated.filter((e) => (TYPE_ORDER[e.type] ?? 5) === best).sort((a, b) => (a.id < b.id ? -1 : 1))
    const pick = pool[daySeed(date, 'discover-day') % pool.length] as GraphEntity
    const years = Number(date.slice(0, 4)) - Number((pick.date?.value ?? date).slice(0, 4))
    return item('discover', 'archiveDay', `archive:${pick.id}`, archiveHref(pick.id) as string, { by: 'gate', gate: '/archive' }, {
      subjectHe: pick.titleHe,
      yearsAgo: years,
    })
  }
  const pool = discoverPool().filter((e) => archiveHref(e.id) !== null)
  const pick = cycleAt(pool, day, 'daily:discover')
  if (pick) {
    return item('discover', 'archiveItem', `archive:${pick.id}`, archiveHref(pick.id) as string, { by: 'gate', gate: '/archive' }, {
      subjectHe: pick.titleHe,
    })
  }
  return item('discover', 'archiveItem', 'archive', gateHref(12) ?? '/archive', { by: 'gate', gate: '/archive' })
}

/** The rotation on its own — what a day deals when it has no anchor. */
export function genericItems(date: string): [DailyItem, DailyItem, DailyItem] {
  return [genericRemember(date), genericChoose(date), genericDiscover(date)]
}

/* ------------------------------------------------------------------ the themed day */

const DEBATE_SOURCES: readonly DebateOptionSource[] = ['cup-finals', 'europe-wins', 'derby-wins']

function themedRemember(match: MatchRecord, reason: DailyThemeReason, date: string): DailyItem | null {
  const subjectHe = matchSubject(match.matchId)
  for (const goalId of goalIdsOfMatch(match.matchId)) {
    const href = playableGoalHref(goalId)
    if (href) return item('remember', 'goal', `goal:${goalId}`, href, { by: 'gate', gate: '/goal' }, { subjectHe })
  }
  const lineup = lineupDoor(match.matchId, date)
  if (lineup) return item('remember', 'lineup', `lineup:${match.matchId}`, lineup, { by: 'gate', gate: '/lineup' }, { subjectHe })
  // trivia on the match's decade, in the topic its evening belongs to
  const year = Number((match.playedOn.value as string).slice(0, 4))
  const decade = Math.floor(year / 10) * 10
  const topic: Topic = reason === 'europe' ? 'europe' : reason === 'derby' ? 'derby' : 'history'
  return (
    triviaItem(topic, decade, date, `trivia:${topic}:${decade}`) ??
    triviaItem('history', decade, date, `trivia:history:${decade}`) ??
    triviaItem('general', decade, date, `trivia:general:${decade}`)
  )
}

function themedChoose(match: MatchRecord, date: string): DailyItem | null {
  // a debate whose own list holds this very match — "which final stays with you?"
  for (const source of DEBATE_SOURCES) {
    if (!debateOptions(source).some((option) => option.id === match.matchId)) continue
    const debate = DEBATES.find((d) => d.options === source)
    const href = debate ? debateDoor(debate, date) : null
    if (debate && href) return item('choose', 'debate', `debate:${debate.id}`, href, { by: 'debate', debateId: debate.id }, { subjectHe: debate.promptHe })
  }
  // else a man who scored that night, for your eleven — resolved, sourced, not an own goal
  const base = gateHref(1)
  if (!base) return null
  for (const row of match.scorers) {
    if (row.ownGoal || !row.playerId || row.confidence < CONFIDENCE_FLOOR) continue
    const name = playerSubject(row.playerId)
    if (!name) continue
    return item('choose', 'xi', `xi:player:${row.playerId}`, base, { by: 'gate', gate: base }, {
      promptKey: 'daily.xi.player',
      promptVars: { name },
    })
  }
  return null
}

function themedDiscover(match: MatchRecord, years: number): DailyItem | null {
  const href = archiveHref(match.matchId)
  const subjectHe = matchSubject(match.matchId)
  return href && subjectHe
    ? item('discover', 'archiveDay', `archive:${match.matchId}`, href, { by: 'gate', gate: '/archive' }, { subjectHe, yearsAgo: years })
    : null
}

function themeOf(anchor: Anchor, date: string): DailyTheme | null {
  const { match } = anchor
  const playedOn = match.playedOn.value as string
  const subjectHe = matchSubject(match.matchId)
  if (!subjectHe) return null
  return {
    matchId: match.matchId,
    playedOn,
    yearsAgo: Number(date.slice(0, 4)) - Number(playedOn.slice(0, 4)),
    reason: anchor.reason,
    subjectHe,
    competitionHe: isDisputed(match, 'competition') ? null : nameOf.competition(match.competition),
    dateHe: longDateHe(playedOn),
  }
}

/* ------------------------------------------------------------------ the entry */

const cache = new Map<string, Daily>()

export function resolveDaily(date: string): Daily {
  const hit = cache.get(date)
  if (hit) return hit
  const generic = () => genericItems(date)
  let daily: Daily = { date, theme: null, items: generic() }
  const anchor = anchorFor(date)
  const theme = anchor ? themeOf(anchor, date) : null
  if (anchor && theme) {
    const [r, c, d] = generic()
    const discover = themedDiscover(anchor.match, theme.yearsAgo)
    // a theme whose own archive card cannot open is not a theme
    if (discover) {
      daily = {
        date,
        theme,
        items: [themedRemember(anchor.match, anchor.reason, date) ?? r, themedChoose(anchor.match, date) ?? c, discover ?? d],
      }
    }
  }
  if (cache.size > 64) cache.clear()
  cache.set(date, daily)
  return daily
}

/** for the tests: is this id a real archive row dated on this month-day? */
export function datedOn(anyId: string, monthDay: string): boolean {
  const e = entity(anyId)
  if (e?.date?.precision === 'day' && e.date.value.slice(5, 10) === monthDay) return true
  const match = matchById(anyId)
  return Boolean(match && match.playedOn.precision === 'day' && match.playedOn.value?.slice(5, 10) === monthDay)
}
