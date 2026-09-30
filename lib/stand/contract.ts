import { decodeChallenge } from '@/lib/challenges/resolve'
import { GATES } from '@/lib/gates'
import { t } from '@/lib/i18n'
import { wallGate } from '@/lib/profile/gate-id'
import type { PublicPref } from '@/lib/profile/identity'

/**
 * "היציע שלי" — the contract (ONE RED WORLD §8, §30–§35, §45). Client-safe.
 *
 * A stand is a handful of friends playing the same "היום בהפועל". The database is the
 * referee (`supabase/migrations/20260928120000_worker_stands.sql`); this file holds the
 * shapes both sides agree on, and the cleaners that make a value the database would refuse
 * never leave the device — every regex here is the SQL's own check, word for word.
 *
 * **Who you are in a stand.** Never an account, an email or a name: the device holds a
 * random key in an httpOnly cookie, the database keeps its sha256, and the only public
 * identity is a nickname the member typed or "אדום מהיציע #N" — N is the order of joining INSIDE
 * this stand, so two stands cannot be joined up into one person (§35). See `docs/20-stand.md`.
 */

/** Six characters, no 0/O/1/I — read aloud in a WhatsApp voice note without a repeat. */
export const STAND_CODE = /^[2-9A-HJ-NP-Z]{6}$/

export function cleanStandCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const code = raw.trim().toUpperCase()
  return STAND_CODE.test(code) ? code : null
}

const UNSAFE = /[\u0000-\u001f\u007f<>@]/g

export function cleanStandName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(UNSAFE, '').trim().slice(0, 32)
  return name || null
}

/** A nickname: optional. An `@` is dropped so an email cannot be typed into a stand by habit. */
export function cleanNick(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const nick = raw.replace(UNSAFE, '').trim().slice(0, 20)
  return nick || null
}

/** The run's value, not a message: one line, 48 characters. */
export function cleanHeadline(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const line = raw.replace(/\s+/g, ' ').replace(UNSAFE, '').trim()
  if (!line) return null
  return line.length <= 48 ? line : `${line.slice(0, 47)}…`
}

/** The SQL's href check: a path on this site, never a host. */
export const STAND_HREF = /^\/[a-z0-9-]+(\/[A-Za-z0-9_-]+)*(\?[A-Za-z0-9=&_.:-]*)?$/

/** An absolute share link → the path the stand stores, or null for anything off-site. */
export function standPath(link: string, origin?: string): string | null {
  let path = link
  if (/^https?:\/\//.test(link)) {
    try {
      const url = new URL(link)
      if (origin && url.origin !== origin && !url.hostname.endsWith('dubelteam.com')) return null
      path = `${url.pathname}${url.search}`
    } catch {
      return null
    }
  }
  return path.length <= 600 && STAND_HREF.test(path) ? path : null
}

/** Which gate a link plays: a challenge says so itself; anything else is its plate. */
export function gateOfPath(path: string): number | null {
  const bare = path.split('?')[0] ?? path
  const challenge = /^\/c\/([A-Za-z0-9_-]+)$/.exec(bare)
  if (challenge) return decodeChallenge(challenge[1] as string)?.gate ?? null
  const plate = wallGate(bare)
  if (!plate) return null
  return GATES.find((gate) => gate.href?.split('?')[0] === plate)?.number ?? null
}

/**
 * ONE RED WORLD §35 — one public identity. The nickname a stand is joined (or opened) under
 * BY DEFAULT is the public nickname this device chose in the personal area
 * (`lib/profile/identity.ts`), cleaned by the stand's own rule. Anonymous → empty, and the
 * stand prints its own fallback. The member can still type another one for this stand.
 */
export function defaultStandNick(pref: { mode: PublicPref['mode']; nickname: string }): string {
  return pref.mode === 'nickname' ? (cleanNick(pref.nickname) ?? '') : ''
}

/**
 * The public name — the only one a stand ever prints. The anonymous fallback is
 * "אדום מהיציע #N": N is the join order inside THIS stand, and the words keep it from being
 * read as the account-wide supporter number "אדום #N" (§35 — two numbering systems that
 * looked the same confused people).
 */
export function publicName(no: number, nick: string | null): string {
  return nick ?? t('stand.member.anon', { n: String(no) })
}

/* ------------------------------------------------------------------ what the server answers */

export type StandError =
  | 'unavailable'
  | 'bad_identity'
  | 'bad_name'
  | 'not_found'
  | 'not_member'
  | 'full'
  | 'too_many'
  | 'slow_down'
  | 'bad_post'
  | 'bad_day'
  | 'bad_week'
  | 'busy'
  | 'network'

export type StandRef = { code: string; name: string; no: number; nick: string | null; members: number; othersToday: number }

export type Peek = { code: string; name: string; members: number; member: boolean }

export type Ranked = { no: number; nick: string | null; hints: number; wrong: number; you: boolean }

export type BlindCowView =
  | { mine: false; finished: number }
  | { mine: true; finished: number; solved: number; early: number; ranking: Ranked[] }

export type Pick = { pick: string; n: number; labelHe: string }

export type DebateView =
  | { mine: false; voters: number }
  | { mine: true; voters: number; yours: string | null; yoursHe: string | null; tally: Pick[] }

export type RememberedDebate = { debate: string; promptHe: string; voters: number; picks: Pick[] }

export type FeedRow = { no: number; nick: string | null; gate: number; href: string; headline: string; at: string; mine: boolean }

export type PairFacts = {
  no: number
  nick: string | null
  daysBoth: number
  bcBoth: number
  theyEarlier: number
  youEarlier: number
  debatesBoth: number
  debatesAgree: number
  sameRuns: number
}

export type WeekView = {
  start: string
  players: number
  solved: number
  stations: Record<string, number>
  closedAll: number
}

export type StandHome = {
  code: string
  name: string
  members: number
  you: { no: number; nick: string | null }
  today: { played: number; all3: number; youPlayed: boolean }
  blindCow: BlindCowView
  debate: DebateView
  remember: { daysTogether: number; debates: RememberedDebate[] }
  week: WeekView
  feed: FeedRow[]
  pairs: PairFacts[]
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: StandError }
