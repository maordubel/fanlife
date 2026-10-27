import type {Fixture} from '@/lib/fixtures/types'
import {sameClub} from '@/lib/fixtures/names'
import {PRODUCTS} from './registry'

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
  targetApp: 'fanlife' | 'dubid' | 'offsides'; intent: 'start' | 'resume' | 'view' | 'join' | 'create'
  clubId?: string; leagueCode?: string; gameweekId?: string; fixtureId?: string; format?: 'five' | 'full' | 'any'
  state: ActionState; href: string; reasonCode: string
  /** when the catalog behind this action was read */ checkedAt: string
  /** the moment the promise stops being true (a DUBID round locks, an OFFSIDES match kicks off) — never a cache age */ expiresAt: string
  copy: {kicker: string; title: string; line: string; cta: string}
}

export type DubidFormat = {mode: 'five' | 'full'; state: string; canSubmit: boolean}
export type DubidLeague = {code: string; names?: {en?: {full?: string}}; round: number; status: string; lockAt: string; currentGameweek?: string; formats?: Partial<Record<'five' | 'full', DubidFormat>>}
/** `arenas` = arenas a visitor can JOIN now: public, open, not archived, no password (worker_marketing_live_data, 27.10.2026). */
export type OffsidesMatch = {id: string; home: string; away: string; league: string; kickoff: string; arenas: number}
export type Catalog = {dubid: DubidLeague[] | null; offsides: OffsidesMatch[] | null; checkedAt: string}

/** Where the visitor comes from and in which language — handed to the companion app so its way back is exact. */
export type Origin = {src: 'hub' | 'club' | 'gate'; lang: 'en' | 'he' | 'el'}
export const HUB_ORIGIN: Origin = {src: 'hub', lang: 'en'}

/**
 * The switches every discovery unit obeys (CF-06): a product off in lib/universe/registry.ts (`enabled`, `heldOut`) or in
 * the control room (Settings → Features → Universe bridge: `universeOff` = 'dubid', 'offsides', 'legends', 'life',
 * 'club:<id>', '<product>:<id>') is never a candidate — on the card, in the desk, or in a post built on these rules.
 */
export type Policy = {off?: ReadonlySet<string>}
export function productAllowed(product: string, clubId: string | undefined, policy: Policy = {}): boolean {
  const p = PRODUCTS.find(x => x.id === product)
  if (p && (!p.enabled || (clubId && p.heldOut.includes(clubId)))) return false
  const off = policy.off ?? new Set<string>()
  return !off.has(product) && !(clubId && (off.has(`club:${clubId}`) || off.has(`${product}:${clubId}`)))
}

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
/** DUBID closes the door a quarter of an hour before the lock; the card stops promising at the same moment */
export const DUBID_MARGIN = 15 * MIN
const iso = (t: number) => new Date(t).toISOString()
const time = (v: string | undefined) => { const t = Date.parse(v ?? ''); return Number.isFinite(t) ? t : NaN }
/** back_to_story (ecosystem contract v9): the companion app is told which FAN LIFE page to offer a way back to, and in which language. */
const back = (clubId: string, o: Origin) => `from=fanlife&club=${encodeURIComponent(clubId)}&lang=${o.lang}&src=${o.src}`
const leagueName = (l: DubidLeague) => l.names?.en?.full || l.code

/** Still true at `now`? A malformed date or a passed deadline is never shown. */
export function stillValid(a: Pick<DiscoveryAction, 'expiresAt' | 'checkedAt'>, now: Date): boolean {
  const e = time(a.expiresAt), c = time(a.checkedAt)
  return Number.isFinite(e) && Number.isFinite(c) && e > now.getTime()
}

/** DUBID for a club: a round open now in the club's league, in the format(s) that can really take a line-up. */
export function dubidActionFor(clubId: string, cat: Catalog, now: Date, origin: Origin = HUB_ORIGIN): DiscoveryAction | null {
  const code = DUBID_LEAGUE[clubId]
  if (!code) return null
  if (!cat.dubid || !Number.isFinite(time(cat.checkedAt))) return null // unknown: a card never promises what it could not check
  const l = cat.dubid.find(x => x.code === code)
  if (!l || !Number.isInteger(l.round)) return null
  const lock = time(l.lockAt), t = now.getTime()
  if (l.status !== 'open' || !Number.isFinite(lock) || lock - t <= DUBID_MARGIN) return null // live/locked = read only
  const five = !!l.formats?.five?.canSubmit, full = !!l.formats?.full?.canSubmit
  if (!five && !full) return null
  // CF-04: the promise names the format that is really open; both open → the format picker is the destination
  const format = five && full ? 'any' : full ? 'full' : 'five'
  const copy = format === 'full' ? {title: 'Your next XI starts here.', cta: 'Pick your XI in DUBID ↗'}
    : format === 'five' ? {title: 'Your next five starts here.', cta: 'Pick your five in DUBID ↗'}
    : {title: 'Your fantasy team starts here.', cta: 'Build your team in DUBID ↗'}
  const q = `league=${encodeURIComponent(code)}&format=${format}${l.currentGameweek ? `&gw=${encodeURIComponent(l.currentGameweek)}` : ''}&${back(clubId, origin)}`
  return {id: `dubid:${code}:${l.currentGameweek ?? l.round}:${format}`, family: 'dubid', targetApp: 'dubid', intent: 'start', clubId, leagueCode: code,
    gameweekId: l.currentGameweek, format, state: 'playable', href: `${DUBID}/?${q}`, reasonCode: `round_open_${format}`,
    checkedAt: cat.checkedAt, expiresAt: iso(lock - DUBID_MARGIN),
    copy: {kicker: 'Your league this weekend', title: copy.title, line: `${leagueName(l)} · Round ${l.round}`, cta: copy.cta}}
}

/**
 * OFFSIDES for one fixture: only the same match (both clubs by exact name, same day), listed, before kick-off (the
 * predictions lock at kick-off). CF-03: the promise follows what OFFSIDES can do — JOIN when an open public arena exists,
 * otherwise CREATE one. A private, locked or archived arena is never counted as open.
 */
export function offsidesActionFor(f: Fixture, cat: Catalog, now: Date, origin: Origin = HUB_ORIGIN): DiscoveryAction | null {
  if (!cat.offsides || !Number.isFinite(time(cat.checkedAt)) || f.status !== 'scheduled' || f.dateOnly) return null
  const k = time(f.kickoff), t = now.getTime()
  if (!Number.isFinite(k) || !(k - t <= 3 * HOUR && k > t)) return null
  const m = cat.offsides.find(x => sameClub(x.home, f.home) && sameClub(x.away, f.away) && Math.abs(time(x.kickoff) - k) <= 3 * HOUR)
  if (!m) return null
  const ko = time(m.kickoff)
  if (!Number.isFinite(ko) || ko <= t) return null
  const open = Number.isInteger(m.arenas) && m.arenas > 0
  return {id: `offsides:${m.id}:${open ? 'join' : 'create'}`, family: 'offsides', targetApp: 'offsides', intent: open ? 'join' : 'create', clubId: f.clubId, fixtureId: f.providerEventId,
    state: 'playable', href: `${OFFSIDES}/?${back(f.clubId, origin)}#/match/${encodeURIComponent(m.id)}`, reasonCode: open ? 'arena_open' : 'arena_create',
    checkedAt: cat.checkedAt, expiresAt: iso(ko),
    copy: open
      ? {kicker: 'Kick-off soon', title: 'Watching the match? Join an arena.', line: `${m.home} v ${m.away} · ${m.arenas} open arena${m.arenas === 1 ? '' : 's'}`, cta: 'Join an arena in OFFSIDES ↗'}
      : {kicker: 'Kick-off soon', title: 'Watching the match? Start an arena.', line: `${m.home} v ${m.away} · no open arena yet`, cta: 'Start an arena in OFFSIDES ↗'}}
}

/** Every candidate the matchday card weighed, and why it was or was not chosen (CF-08: the desk reads the same list). */
export type Stage = 'eligible' | 'selected' | 'suppressed' | 'ineligible'
export type Candidate = {clubId: string; family: 'dubid' | 'offsides'; stage: Stage; reason: string; action: DiscoveryAction | null}
export type Decision = {selected: {fixture: Fixture; action: DiscoveryAction} | null; candidates: Candidate[]}

/**
 * The matchday card: ONE companion action across the clubs on the roll, deterministic. Near kick-off the same match
 * on OFFSIDES wins; otherwise the soonest club whose DUBID league has an open round (within three days of its match).
 * Nothing true to offer → no selection, and the card is not drawn.
 */
export function matchdayDecision(fixtures: readonly Fixture[], cat: Catalog, now: Date, opts: {snoozed?: ReadonlySet<string>; policy?: Policy; origin?: Origin} = {}): Decision {
  const snoozed = opts.snoozed ?? new Set<string>(), policy = opts.policy ?? {}, origin = opts.origin ?? HUB_ORIGIN
  const soon = [...fixtures].filter(f => f.status === 'scheduled' && !f.dateOnly && Number.isFinite(time(f.kickoff)))
    .sort((a, b) => time(a.kickoff) - time(b.kickoff) || a.clubId.localeCompare(b.clubId))
  const candidates: Candidate[] = []
  let selected: Decision['selected'] = null
  const consider = (f: Fixture, family: 'dubid' | 'offsides', a: DiscoveryAction | null, whyNot: string) => {
    if (!a) { candidates.push({clubId: f.clubId, family, stage: 'ineligible', reason: whyNot, action: null}); return }
    if (!stillValid(a, now)) { candidates.push({clubId: f.clubId, family, stage: 'ineligible', reason: 'Expired', action: null}); return }
    if (!productAllowed(family, f.clubId, policy)) { candidates.push({clubId: f.clubId, family, stage: 'suppressed', reason: 'Switched off in the control room', action: a}); return }
    if (snoozed.has(family)) { candidates.push({clubId: f.clubId, family, stage: 'suppressed', reason: 'Snoozed by this visitor', action: a}); return }
    if (selected) { candidates.push({clubId: f.clubId, family, stage: 'eligible', reason: 'Another card was chosen first', action: a}); return }
    selected = {fixture: f, action: a}
    candidates.push({clubId: f.clubId, family, stage: 'selected', reason: a.copy.line, action: a})
  }
  for (const f of soon) consider(f, 'offsides', offsidesActionFor(f, cat, now, origin), !cat.offsides ? 'OFFSIDES could not be checked' : time(f.kickoff) - now.getTime() > 3 * HOUR ? 'Match is more than 3 hours away' : 'This match is not open on OFFSIDES')
  for (const f of soon) {
    const until = time(f.kickoff) - now.getTime()
    if (!DUBID_LEAGUE[f.clubId]) continue
    if (until < 0 || until > 72 * HOUR) { candidates.push({clubId: f.clubId, family: 'dubid', stage: 'ineligible', reason: until < 0 ? 'Match already started' : 'Match is more than 3 days away', action: null}); continue }
    consider(f, 'dubid', dubidActionFor(f.clubId, cat, now, origin), dubidWhyNot(f.clubId, cat, now))
  }
  return {selected, candidates}
}

export function companionFor(fixtures: readonly Fixture[], cat: Catalog, now: Date, snoozed: ReadonlySet<string> = new Set(), policy: Policy = {}): {fixture: Fixture; action: DiscoveryAction} | null {
  return matchdayDecision(fixtures, cat, now, {snoozed, policy}).selected
}

function dubidWhyNot(clubId: string, cat: Catalog, now: Date): string {
  const code = DUBID_LEAGUE[clubId]
  if (!code) return 'Not a DUBID league'
  if (!cat.dubid) return 'DUBID could not be checked'
  const l = cat.dubid.find(x => x.code === code)
  if (!l) return `${code}: no round listed`
  if (l.status !== 'open') return `${leagueName(l)} · Round ${l.round} is ${l.status}`
  const lock = time(l.lockAt)
  if (!Number.isFinite(lock) || lock - now.getTime() <= DUBID_MARGIN) return `${leagueName(l)} · Round ${l.round}: locks too soon`
  return `${leagueName(l)} · Round ${l.round}: no format can take a line-up`
}

/**
 * Why a club gets — or does not get — each companion card right now (CF-08). Four facts kept apart:
 *  · eligible  — the target could take this visitor now (the rules above),
 *  · selected  — the hub card chose it (one card for the whole roll),
 *  · suppressed — switched off in the control room,
 *  · viewable  — what a visitor finally sees also depends on THEIR snoozes, which the server cannot know.
 */
export type Explanation = {clubId: string; dubid: {shown: boolean; stage: Stage; reason: string}; offsides: {shown: boolean; stage: Stage; reason: string}}
export function explainClub(clubId: string, fixtures: readonly Fixture[], cat: Catalog, now: Date, decision?: Decision, policy: Policy = {}): Explanation {
  const d = decision ?? matchdayDecision(fixtures, cat, now, {policy})
  const pick = (family: 'dubid' | 'offsides'): Explanation['dubid'] => {
    const rows = d.candidates.filter(c => c.clubId === clubId && c.family === family)
    const best = rows.find(r => r.stage === 'selected') ?? rows.find(r => r.stage === 'eligible') ?? rows.find(r => r.stage === 'suppressed') ?? rows[0]
    if (best) return {shown: best.stage === 'selected', stage: best.stage, reason: best.stage === 'eligible' ? `${best.action?.copy.line ?? ''} — eligible, not chosen (${best.reason})` : best.reason}
    if (family === 'dubid') {
      const reason = dubidWhyNot(clubId, cat, now)
      const could = !!dubidActionFor(clubId, cat, now)
      return {shown: false, stage: 'ineligible', reason: could ? `${reason.split(':')[0]} is open — but no confirmed match of this club in the next 3 days, so the hub does not offer it` : reason}
    }
    return {shown: false, stage: 'ineligible', reason: !cat.offsides ? 'OFFSIDES could not be checked' : 'No confirmed match'}
  }
  return {clubId, dubid: pick('dubid'), offsides: pick('offsides')}
}
