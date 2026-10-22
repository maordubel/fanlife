import { clubTimeZone, dayKey } from '@/lib/clubs/mystery-model'
import { createHash } from 'node:crypto'

import type { ClubData } from '@/lib/clubs/contract'

/**
 * Daily Terrace (ADR-U12) — one club's day: three rounds, built from the club's OWN approved records.
 *
 *   REMEMBER   which year did an archive moment happen (the club's history)
 *   REWIND     which of three dated moments came first (its timeline)
 *   WILD CARD  one question forged from the club's records (its trivia)
 *
 * An edition is a pure function of (club data, local date): the same day deals the same three rounds to every
 * supporter and nothing is random. If a club cannot field all three from approved, sourced records the edition is
 * `null` — an honest "not today", never a padded round (rule 15). The answers live in `secret` and never leave the server.
 */
export const ROUND_KINDS = ['remember', 'rewind', 'wild'] as const
export type RoundKind = (typeof ROUND_KINDS)[number]

export type PublicRound = { kind: RoundKind; prompt: string; options: string[]; source: string }
export type Edition = { club: string; date: string; id: string; rounds: [PublicRound, PublicRound, PublicRound] }
export type EditionSecret = { answers: [number, number, number]; edition: Edition }

/** the points for a round: right on the 1st, 2nd, 3rd try, or never */
export const ROUND_POINTS = [100, 70, 40, 0] as const
export const MAX_TRIES = 3

function rng(seed: string): () => number {
  let a = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 8), 16) >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const shuffled = <T,>(xs: readonly T[], r: () => number): T[] => {
  const o = [...xs]
  for (let i = o.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[o[i], o[j]] = [o[j] as T, o[i] as T]
  }
  return o
}
const okFact = (f: { status: string; confidence: number }) => f.status === 'approved' && f.confidence >= 2

const yearOf = (on: string | null | undefined, year?: number | null): number | null => {
  if (typeof year === 'number' && year > 1850) return year
  const y = on ? Number(on.slice(0, 4)) : NaN
  return Number.isInteger(y) && y > 1850 ? y : null
}

function remember(data: ClubData, date: string, r: () => number): { round: PublicRound; answer: number } | null {
  const now = Number(date.slice(0, 4))
  const fromArchive = data.archive
    .filter((f) => okFact(f) && !f.value.sensitive && f.value.precision !== 'unknown' && yearOf(f.value.on, f.value.year) !== null)
    .map((f) => ({ name: f.value.name, year: yearOf(f.value.on, f.value.year) as number, hint: f.value.hint, source: f.sources[0] ?? '' }))
  // a club whose archive holds no dated moments (Hapoel Tel Aviv's lives in its timeline) remembers from the timeline
  const fromTimeline = data.timeline
    .filter((f) => okFact(f) && /^\d{4}-\d{2}-\d{2}$/.test(f.value.on))
    .map((f) => ({ name: f.value.title, year: Number(f.value.on.slice(0, 4)), hint: f.value.hint, source: f.sources[0] ?? '' }))
  // a name that already prints its own year is not a question
  const events = (fromArchive.length >= 3 ? fromArchive : fromTimeline)
    .filter((e) => !`${e.name} ${e.hint}`.includes(String(e.year)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.year - b.year)
  if (events.length === 0) return null
  const e = events[Math.floor(r() * events.length)] as (typeof events)[number]
  const wrong = new Set<number>()
  for (const step of shuffled([-9, -6, -4, -3, 3, 4, 6, 9, 12, -12], r)) {
    const y = e.year + step
    if (y > 1860 && y <= now && !wrong.has(y)) wrong.add(y)
    if (wrong.size === 3) break
  }
  if (wrong.size < 3) return null
  const opts = shuffled([e.year, ...wrong], r).map(String)
  return { round: { kind: 'remember', prompt: `In which year did this happen: ${e.name}${e.hint ? ` (${e.hint})` : ''}?`, options: opts, source: e.source }, answer: opts.indexOf(String(e.year)) }
}

function rewind(data: ClubData, r: () => number): { round: PublicRound; answer: number } | null {
  const cards = data.timeline
    .filter((f) => okFact(f) && /^\d{4}-\d{2}-\d{2}$/.test(f.value.on))
    .map((f) => ({ title: f.value.title, on: f.value.on, source: f.sources[0] ?? '' }))
    .sort((a, b) => a.on.localeCompare(b.on) || a.title.localeCompare(b.title))
  if (cards.length < 3) return null
  for (let tries = 0; tries < 40; tries += 1) {
    const pick = shuffled(cards, r).slice(0, 3)
    const years = pick.map((c) => c.on.slice(0, 4))
    if (new Set(years).size < 3 || new Set(pick.map((c) => c.title)).size < 3) continue
    const first = [...pick].sort((a, b) => a.on.localeCompare(b.on))[0] as (typeof pick)[number]
    return { round: { kind: 'rewind', prompt: 'Which of these happened first?', options: pick.map((c) => c.title), source: first.source }, answer: pick.indexOf(first) }
  }
  return null
}

function wild(data: ClubData, r: () => number): { round: PublicRound; answer: number } | null {
  // a question's wrong answers are its own list, or the named pool of the same kind (its answer taken out)
  const wrongOf = (q: ClubData['trivia']['questions'][number]): string[] => {
    const own = Array.isArray(q.distractors) ? q.distractors : q.pool ? (data.trivia.pools[q.pool] ?? []) : []
    return [...new Set(own.filter((d) => typeof d === 'string' && d !== q.answer))]
  }
  const qs = data.trivia.questions
    .filter((q) => q.type === 'mcq' && typeof q.answer === 'string' && wrongOf(q).length >= 3)
    .sort((a, b) => a.id.localeCompare(b.id))
  if (qs.length === 0) return null
  const q = qs[Math.floor(r() * qs.length)] as (typeof qs)[number]
  const answer = q.answer as string
  const wrong = shuffled(wrongOf(q), r).slice(0, 3)
  const opts = shuffled([answer, ...wrong], r)
  return { round: { kind: 'wild', prompt: q.prompt, options: opts, source: q.source?.title ?? '' }, answer: opts.indexOf(answer) }
}

export function buildEdition(data: ClubData, date: string): EditionSecret | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const club = data.identity.id
  const seed = (k: string) => rng(`terrace|${club}|${date}|${data.version}|${k}`)
  const a = remember(data, date, seed('remember'))
  const b = rewind(data, seed('rewind'))
  const c = wild(data, seed('wild'))
  if (!a || !b || !c) return null
  const edition: Edition = {
    club,
    date,
    id: createHash('sha256').update(`${club}|${date}|${data.version}`).digest('hex').slice(0, 12),
    rounds: [a.round, b.round, c.round],
  }
  return { answers: [a.answer, b.answer, c.answer], edition }
}

/** the calendar day at the club's own home, `YYYY-MM-DD` — the same zone table as every other daily (lib/clubs/mystery-model) */
export function clubDay(country: string, now: Date = new Date()): string {
  return dayKey(now, clubTimeZone(country))
}
