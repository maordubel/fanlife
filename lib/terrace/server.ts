import 'server-only'
import { cookies } from 'next/headers'

import { requestClub } from '@/lib/clubs/request'
import { open, seal } from '@/lib/game/blind-cow/token'
import { buildEdition, clubDay, type Edition } from './edition'
import { finished, newLedger, step, total, type Ledger } from './ledger'

/**
 * Daily Terrace on the server: the browser asks for today's edition and sends an OPTION; the server holds the
 * answers, grades, keeps the one attempt of the day in a sealed httpOnly cookie, and reveals a round's answer only
 * once that round is done. The access rule is the club's trivia gate (a club that cannot play trivia has no Daily).
 */
export type Public = { ok: true; edition: Edition; tried: [number[], number[], number[]]; points: [number | null, number | null, number | null]; total: number; finished: boolean; reveal: (number | null)[] }
export type Fail = { ok: false; error: 'CLOSED' | 'NOT_READY' | 'BAD_INPUT' | 'BAD_ROUND' | 'BAD_OPTION' | 'ROUND_DONE' | 'ALREADY_TRIED' }
export type Answered = { ok: true; correct: boolean; done: boolean; points: number | null; answer: number | null; state: Public }

const name = (club: string) => `fanlife-terrace-${club.replace(/[^a-z0-9-]/gi, '-')}`
const TRIVIA_GATE = 2

async function today(slug: unknown) {
  if (typeof slug !== 'string' || slug.length > 60) return null
  const club = await requestClub(slug, TRIVIA_GATE)
  if (!club || !club.data.gates.trivia.playable) return null
  const built = buildEdition(club.data, clubDay(club.data.identity.country))
  return { id: club.data.identity.id, built }
}

function ledgerFor(id: string, date: string, edition: string): Ledger {
  const l = open<Ledger>(cookies().get(name(id))?.value)
  return l && l.v === 1 && l.club === id && l.date === date && l.edition === edition ? l : newLedger(id, date, edition)
}
function save(l: Ledger) {
  cookies().set(name(l.club), seal(l), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 48 })
}
function view(ed: Edition, answers: readonly [number, number, number], l: Ledger): Public {
  return { ok: true, edition: ed, tried: l.tries, points: l.points, total: total(l), finished: finished(l), reveal: l.points.map((p, i) => (p === null ? null : answers[i]!)) }
}

export async function terraceToday(slug: unknown): Promise<Public | Fail> {
  const t = await today(slug)
  if (!t) return { ok: false, error: 'CLOSED' }
  if (!t.built) return { ok: false, error: 'NOT_READY' }
  const l = ledgerFor(t.id, t.built.edition.date, t.built.edition.id)
  return view(t.built.edition, t.built.answers, l)
}

export async function terraceAnswer(slug: unknown, round: unknown, option: unknown): Promise<Answered | Fail> {
  if (typeof round !== 'number' || typeof option !== 'number') return { ok: false, error: 'BAD_INPUT' }
  const t = await today(slug)
  if (!t) return { ok: false, error: 'CLOSED' }
  if (!t.built) return { ok: false, error: 'NOT_READY' }
  const { edition, answers } = t.built
  const l = ledgerFor(t.id, edition.date, edition.id)
  const r = step(l, round, option, answers, edition.rounds[round]?.options.length ?? 0)
  if (!r.ok) return { ok: false, error: r.error }
  save(r.ledger)
  return { ok: true, correct: r.correct, done: r.done, points: r.points, answer: r.answer, state: view(edition, answers, r.ledger) }
}

/** The finished day's score for the board — the server's own number from the sealed ledger, or null when the day is not done. */
export async function terraceFinished(slug: unknown): Promise<{ club: string; date: string; edition: string; total: number } | null> {
  const t = await today(slug)
  if (!t || !t.built) return null
  const { edition } = t.built
  const l = ledgerFor(t.id, edition.date, edition.id)
  return finished(l) ? { club: t.id, date: edition.date, edition: edition.id, total: total(l) } : null
}
