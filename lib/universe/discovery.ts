import type {Fixture} from '@/lib/fixtures/types'
import {sameClub} from '@/lib/fixtures/names'

/**
 * CONNECTED FOOTBALL (owner's plan, 27.10.2026) — the one place that decides whether a companion action exists.
 * Pure: the catalog (what DUBID and OFFSIDES say is open right now) and the clock come in, at most one action comes
 * out. A card on the site and a post on the social plan read the same answer, so they cannot contradict each other.
 *
 * "A match is close" is context, never a promise. An invitation exists only when the target can really do it:
 *  · DUBID — the club's league is mapped, its round is `open` and a format answers canSubmit, the lock still ahead.
 *    The copy names the LEAGUE and the ROUND, never the fixture: a cup tie is not a fantasy round.
 *  · OFFSIDES — the very match (same two clubs, same day) is on OFFSIDES, visible, not kicked off long ago.
 */
export type ActionState = 'playable' | 'resumable' | 'read_only' | 'unavailable' | 'unknown'
export type DiscoveryAction = {
  id: string; family: 'life' | 'legends' | 'daily' | 'archive' | 'dubid' | 'offsides'
  targetApp: 'fanlife' | 'dubid' | 'offsides'; intent: 'start' | 'resume' | 'view'
  clubId?: string; leagueCode?: string; gameweekId?: string; fixtureId?: string
  state: ActionState; href: string; reasonCode: string; checkedAt: string; expiresAt: string
  copy: {kicker: string; title: string; line: string; cta: string}
}

export type DubidFormat = {mode: 'five' | 'full'; state: string; canSubmit: boolean}
export type DubidLeague = {code: string; names?: {en?: {full?: string}}; round: number; status: string; lockAt: string; currentGameweek?: string; formats?: Partial<Record<'five' | 'full', DubidFormat>>}
export type OffsidesMatch = {id: string; home: string; away: string; league: string; kickoff: string; arenas: number}
export type Catalog = {dubid: DubidLeague[] | null; offsides: OffsidesMatch[] | null; checkedAt: string}

/**
 * The FAN LIFE clubs DUBID covers, and in which league. Verified 27.10.2026 against core.team_seasons (exact team
 * names, rule 7) — a club missing here gets no DUBID invitation, however close its match is (the Dinamo Zagreb case).
 */
export const DUBID_LEAGUE: Readonly<Record<string, string>> = {
  'hapoel-tel-aviv': 'IL_PREMIER', 'hapoel-petah-tikva': 'IL_PREMIER',
  olympiacos: 'GR_SUPER', panathinaikos: 'GR_SUPER', 'aek-athens': 'GR_SUPER',
}
const DUBID = 'https://dubid.dubelteam.com', OFFSIDES = 'https://offsides.dubelteam.com'
const MIN = 60_000, HOUR = 60 * MIN
const iso = (t: number) => new Date(t).toISOString()
/** back_to_story (ecosystem contract): the companion app is told which FAN LIFE club page to offer a way back to. */
const back = (clubId: string) => `from=fanlife&club=${encodeURIComponent(clubId)}`
const leagueName = (l: DubidLeague) => l.names?.en?.full || l.code

/** DUBID for a club: playable (pick now), read_only (the round is running), unavailable, or unknown (no catalog). */
export function dubidActionFor(clubId: string, cat: Catalog, now: Date): DiscoveryAction | null {
  const code = DUBID_LEAGUE[clubId]
  if (!code) return null
  if (!cat.dubid) return null // unknown: a card never promises what it could not check
  const l = cat.dubid.find(x => x.code === code)
  if (!l) return null
  const lock = Date.parse(l.lockAt), t = now.getTime()
  const open = l.status === 'open' && Number.isFinite(lock) && lock - t > 15 * MIN
  const can = Object.values(l.formats ?? {}).some(f => f?.canSubmit)
  if (!open || !can) return null // live/locked = read only: the hub does not sell a round nobody can enter
  const name = leagueName(l)
  return {id: `dubid:${code}:${l.currentGameweek ?? l.round}`, family: 'dubid', targetApp: 'dubid', intent: 'start', clubId, leagueCode: code,
    gameweekId: l.currentGameweek, state: 'playable', href: `${DUBID}/?league=${encodeURIComponent(code)}&${back(clubId)}`, reasonCode: 'round_open',
    checkedAt: cat.checkedAt, expiresAt: iso(Math.min(lock, Date.parse(cat.checkedAt) + 2 * MIN)),
    copy: {kicker: 'Your league this weekend', title: 'Your next XI starts here.', line: `${name} · Round ${l.round}`, cta: 'Pick your XI in DUBID ↗'}}
}

/** OFFSIDES for one fixture: only the same match (both clubs by exact name, same day), visible on OFFSIDES. */
export function offsidesActionFor(f: Fixture, cat: Catalog, now: Date): DiscoveryAction | null {
  if (!cat.offsides || f.status !== 'scheduled' || f.dateOnly) return null
  const k = Date.parse(f.kickoff), t = now.getTime()
  if (!(k - t <= 3 * HOUR && k - t >= -15 * MIN)) return null // near kick-off, before the predictions lock
  const m = cat.offsides.find(x => sameClub(x.home, f.home) && sameClub(x.away, f.away) && Math.abs(Date.parse(x.kickoff) - k) <= 3 * HOUR)
  if (!m) return null
  return {id: `offsides:${m.id}`, family: 'offsides', targetApp: 'offsides', intent: 'start', clubId: f.clubId, fixtureId: f.providerEventId,
    state: 'playable', href: `${OFFSIDES}/?${back(f.clubId)}#/match/${encodeURIComponent(m.id)}`, reasonCode: m.arenas > 0 ? 'arena_open' : 'match_listed',
    checkedAt: cat.checkedAt, expiresAt: iso(Math.min(Date.parse(m.kickoff), Date.parse(cat.checkedAt) + 2 * MIN)),
    copy: {kicker: 'Kick-off soon', title: 'Watching the match? Play along.', line: `${m.home} v ${m.away}${m.arenas ? ` · ${m.arenas} arena${m.arenas === 1 ? '' : 's'} open` : ''}`, cta: 'Open this match in OFFSIDES ↗'}}
}

/**
 * The matchday card: ONE companion action across the clubs on the roll, deterministic. Near kick-off the same match
 * on OFFSIDES wins; otherwise the soonest club whose DUBID league has an open round (within three days of its match).
 * Nothing true to offer → null, and the card is not drawn.
 */
export function companionFor(fixtures: readonly Fixture[], cat: Catalog, now: Date, snoozed: ReadonlySet<string> = new Set()): {fixture: Fixture; action: DiscoveryAction} | null {
  const soon = [...fixtures].filter(f => f.status === 'scheduled' && !f.dateOnly).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff) || a.clubId.localeCompare(b.clubId))
  if (!snoozed.has('offsides')) for (const f of soon) { const a = offsidesActionFor(f, cat, now); if (a) return {fixture: f, action: a} }
  if (!snoozed.has('dubid')) for (const f of soon) {
    const until = Date.parse(f.kickoff) - now.getTime()
    if (until < 0 || until > 72 * HOUR) continue
    const a = dubidActionFor(f.clubId, cat, now)
    if (a) return {fixture: f, action: a}
  }
  return null
}

/** Why a club gets — or does not get — each companion card right now. The control room's view of the same rules. */
export type Explanation = {clubId: string; dubid: {shown: boolean; reason: string}; offsides: {shown: boolean; reason: string}}
export function explainClub(clubId: string, fixtures: readonly Fixture[], cat: Catalog, now: Date): Explanation {
  const t = now.getTime()
  const next = [...fixtures].filter(f => f.clubId === clubId && f.status === 'scheduled' && !f.dateOnly && Date.parse(f.kickoff) >= t - 15 * MIN)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0]
  const code = DUBID_LEAGUE[clubId]
  let dubid: Explanation['dubid']
  if (!code) dubid = {shown: false, reason: 'Not a DUBID league'}
  else if (!cat.dubid) dubid = {shown: false, reason: 'DUBID could not be checked'}
  else {
    const l = cat.dubid.find(x => x.code === code)
    const a = dubidActionFor(clubId, cat, now)
    if (a) dubid = {shown: true, reason: `${a.copy.line} — open`}
    else if (!l) dubid = {shown: false, reason: `${code}: no round listed`}
    else if (l.status !== 'open') dubid = {shown: false, reason: `${leagueName(l)} · Round ${l.round} is ${l.status}`}
    else dubid = {shown: false, reason: `${leagueName(l)} · Round ${l.round}: locks too soon or nobody can submit`}
  }
  let offsides: Explanation['offsides']
  if (!cat.offsides) offsides = {shown: false, reason: 'OFFSIDES could not be checked'}
  else if (!next) offsides = {shown: false, reason: 'No confirmed match'}
  else {
    const a = offsidesActionFor(next, cat, now)
    offsides = a ? {shown: true, reason: a.copy.line} : {shown: false, reason: Date.parse(next.kickoff) - t > 3 * HOUR ? 'Match is more than 3 hours away' : 'This match is not on OFFSIDES today'}
  }
  return {clubId, dubid, offsides}
}
