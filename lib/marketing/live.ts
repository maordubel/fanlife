/**
 * FAN LIFE social plan v3 (owner, 27.10.2026) — the live slots. A live row in marketing.posts is a SLOT: at send time
 * it is composed from real data, or it stays quiet. Never a guessed fixture, never a repeated announcement.
 *   09:00 results  — FAN LIFE clubs' finished matches (the fixture feed's "last", kicked off within 36 hours)
 *   11:00 fixtures — FAN LIFE clubs playing today or tomorrow (the fixture feed's "next")
 *   13:00 dubid    — a DUBID round that is open and not yet announced (game.gameweeks)
 *   15:00 offsides — today's OFFSIDES matches and their arenas (offsides.matches/arenas)
 * Pure: the data comes in, the message and the picture's kit come out. lib/marketing/run.ts fetches the data.
 */
import type {Fixture, Result} from '@/lib/fixtures/types'

export const LIVE_KINDS = ['fixtures', 'results', 'dubid', 'offsides'] as const
export type LiveKind = typeof LIVE_KINDS[number]
export const isLiveKind = (k: unknown): k is LiveKind => LIVE_KINDS.includes(k as LiveKind)

export type DubidRound = {id: string; round: number; league: string; code: string; lock_at: string; first_kickoff_at: string | null}
export type OffsidesMatch = {id: string; home: string; away: string; league: string; kickoff: string; tier: number | null; arenas: number}
export type LiveData = {dubid: DubidRound[]; offsides: OffsidesMatch[]; posted: string[]}
export type Kit = {t: string; data: Record<string, unknown>}
export type Composed = {msg: string; kit: Kit; refs: string[]} | {skip: string}

const TZ = 'Asia/Jerusalem'
const URL: Record<string, string> = {fanlife: 'https://fanlife.dubelteam.com', dubid: 'https://dubid.dubelteam.com', offsides: 'https://offsides.dubelteam.com'}
const NAME: Record<string, string> = {fanlife: 'FAN LIFE', dubid: 'DUBID', offsides: 'OFFSIDES'}
const TAGS: Record<string, string> = {
  fanlife: '#FANLIFE #FootballForever #Football #Supporters #DubelTeam',
  dubid: '#DUBID #FantasyFootball #IsraeliFootball #SuperLeagueGreece #DubelTeam',
  offsides: '#OFFSIDES #Predictions #Football #MatchDay #DubelTeam',
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const part = (at: Date | string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, ...o}).format(new Date(at))
export const dayKey = (at: Date | string) => part(at, {year: 'numeric', month: '2-digit', day: '2-digit'}).split('/').reverse().join('-')
export const hhmm = (at: Date | string) => part(at, {hour: '2-digit', minute: '2-digit', hour12: false})
const weekday = (at: Date | string) => part(at, {weekday: 'short'}).toUpperCase()
const dayMonth = (at: Date | string) => part(at, {day: 'numeric', month: 'short'}).toUpperCase()
const longDay = (at: Date | string) => part(at, {weekday: 'long', day: 'numeric', month: 'long'})

/** the Telegram message, in the same shape marketing.render() writes for the fixed plan */
export function message(o: {app: 'fanlife' | 'dubid' | 'offsides'; sendAt: Date; label: string; hook: string; body: string; url?: string; visual: string}) {
  return [`🗓 <b>${esc(o.label)} · ${part(o.sendAt, {day: '2-digit', month: '2-digit'}).replace('/', '.')} · ${hhmm(o.sendAt)}</b>`,
    `📌 Post · <b>${NAME[o.app]}</b>`, '📱 Instagram · Facebook · TikTok (photo)', '',
    '🪝 <b>HOOK</b>', `<b>${esc(o.hook)}</b>`, '', '✍️ <b>POST</b>', esc(o.hook), '', esc(o.body), '',
    `👉 ${esc(o.url || URL[o.app]!)}`, '', TAGS[o.app], '', `🎨 <i>Visual: ${esc(o.visual)}</i>`].join('\n').slice(0, 4000)
}

const comp = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim()
const clubLink = (clubId: string) => `${URL.fanlife}/clubs/${clubId}`

/** 09:00 — the FAN LIFE clubs' results since yesterday morning, each announced once */
export function composeResults(results: readonly Result[], liveClubs: readonly string[], d: LiveData, now: Date, names: Record<string, string>): Composed {
  const fresh = results.filter(r => liveClubs.includes(r.clubId) && now.getTime() - Date.parse(r.kickoff) < 36 * 3600_000 && now.getTime() > Date.parse(r.kickoff)
    && !d.posted.includes(`res:${r.providerEventId}`))
  const seen = new Set<string>(), rows = fresh.sort((a, b) => a.kickoff.localeCompare(b.kickoff)).filter(r => !seen.has(r.providerEventId) && seen.add(r.providerEventId)).slice(0, 6)
  if (!rows.length) return {skip: 'no FAN LIFE club finished a match in the last 36 hours'}
  const lines = rows.map(r => `${r.home} ${r.homeScore}-${r.awayScore} ${r.away}${r.competition ? ` (${comp(r.competition)})` : ''}`)
  const one = rows.length === 1 ? rows[0]! : null
  const won = one ? (one.clubSide === 'home' ? one.homeScore > one.awayScore : one.awayScore > one.homeScore) : false
  const hook = one ? (won ? `Full time: ${names[one.clubId] || one.home} win it.` : `Full time for ${names[one.clubId] || (one.clubSide === 'home' ? one.home : one.away)}.`) : `Full time — ${rows.length} FAN LIFE clubs in action.`
  return {refs: rows.map(r => `res:${r.providerEventId}`), msg: message({app: 'fanlife', sendAt: now, label: 'Results', hook,
    body: `${lines.join('\n')}\n\nHow did yours go? Tell us in the comments.\nEvery club's whole history is on FAN LIFE.`, url: one ? clubLink(one.clubId) : URL.fanlife,
    visual: 'L-RESULTS Full time: the scores on split-flap tiles, both crests.'}),
  kit: {t: 'L-RESULTS', data: {clubs: [...new Set(rows.map(r => r.clubId))], dayTop: weekday(rows[rows.length - 1]!.kickoff), dayBottom: dayMonth(rows[rows.length - 1]!.kickoff),
    rows: rows.map(r => ({home: r.home, away: r.away, score: `${r.homeScore}-${r.awayScore}`, line: comp(r.competition).toUpperCase() || 'FULL TIME', homeCrestName: r.home, awayCrestName: r.away}))}}}
}

/** 11:00 — the FAN LIFE clubs playing today or tomorrow (Israel days), each match announced once */
export function composeFixtures(fixtures: readonly Fixture[], liveClubs: readonly string[], d: LiveData, now: Date, names: Record<string, string>): Composed {
  const today = dayKey(now), tomorrow = dayKey(new Date(now.getTime() + 24 * 3600_000))
  const due = fixtures.filter(f => liveClubs.includes(f.clubId) && f.status === 'scheduled' && Date.parse(f.kickoff) > now.getTime() - (f.dateOnly ? 24 * 3600_000 : 0)
    && [today, tomorrow].includes(dayKey(f.kickoff)) && !d.posted.includes(`fx:${f.providerEventId}`))
  const seen = new Set<string>(), rows = due.sort((a, b) => a.kickoff.localeCompare(b.kickoff)).filter(f => !seen.has(f.providerEventId) && seen.add(f.providerEventId)).slice(0, 6)
  if (!rows.length) return {skip: 'no FAN LIFE club plays today or tomorrow'}
  const when = (f: Fixture) => `${dayKey(f.kickoff) === today ? 'Today' : 'Tomorrow'}${f.dateOnly ? '' : ` ${hhmm(f.kickoff)}`}`
  const allToday = rows.every(f => dayKey(f.kickoff) === today)
  const one = rows.length === 1 ? rows[0]! : null
  const hook = one ? `${names[one.clubId] || one.home} play ${dayKey(one.kickoff) === today ? 'today' : 'tomorrow'}. Ready?` : `${rows.length} FAN LIFE clubs, ${allToday ? 'one day' : 'two days'}. Next up.`
  return {refs: rows.map(f => `fx:${f.providerEventId}`), msg: message({app: 'fanlife', sendAt: now, label: 'Next up', hook,
    body: `${rows.map(f => `${when(f)} (Israel time) · ${f.home} v ${f.away}${f.competition ? ` · ${comp(f.competition)}` : ''}`).join('\n')}\n\nWho are you with? Before kick-off, warm up on your club's trivia on FAN LIFE.`,
    url: one ? clubLink(one.clubId) : URL.fanlife, visual: 'L-FIXTURES Next up: the matches as tickets, both crests, the kick-off times.'}),
  kit: {t: 'L-FIXTURES', data: {clubs: [...new Set(rows.map(f => f.clubId))], dayTop: allToday ? 'TODAY' : weekday(rows[0]!.kickoff), dayBottom: dayMonth(rows[0]!.kickoff),
    rows: rows.map(f => ({home: f.home, away: f.away, line: `${when(f).toUpperCase()}${f.competition ? ' · ' + comp(f.competition).toUpperCase() : ''}`, homeCrestName: f.home, awayCrestName: f.away}))}}}
}

/** 13:00 — DUBID: a round that opened and was not announced yet */
export function composeDubid(d: LiveData, now: Date): Composed {
  const rounds = d.dubid.filter(r => !d.posted.includes(`gw:${r.id}`) && Date.parse(r.lock_at) > now.getTime() + 3600_000).slice(0, 4)
  if (!rounds.length) return {skip: 'no new DUBID round is open'}
  const sameRound = rounds.every(r => r.round === rounds[0]!.round)
  const lock = (r: DubidRound) => `${longDay(r.lock_at)}, ${hhmm(r.lock_at)} (Israel time)`
  const hook = sameRound ? `Round ${rounds[0]!.round} is open. One player from every club.` : `New DUBID rounds are open. One player from every club.`
  return {refs: rounds.map(r => `gw:${r.id}`), msg: message({app: 'dubid', sendAt: now, label: 'DUBID round', hook,
    body: `${rounds.map(r => `${r.league} · Round ${r.round} · lineups lock ${lock(r)}`).join('\n')}\n\nDUBID 11: build a full lineup with one player from each club and a captain.\nDUBID 5: five players, one budget.\nPick before the lock — after the first kick-off, the round is closed.`,
    visual: 'L-DUBID-ROUND The round is open: DUBID logo, each league and its lock time.'}),
  kit: {t: 'L-DUBID-ROUND', data: {app: 'dubid', round: sameRound ? rounds[0]!.round : rounds.map(r => r.round).sort((a, b) => a - b)[0],
    leagues: rounds.map(r => ({name: r.league, round: r.round, line: `LINEUPS LOCK ${weekday(r.lock_at)} ${dayMonth(r.lock_at)} · ${hhmm(r.lock_at)}`})), label: 'DUBID · FANTASY FOOTBALL'}}}
}

/** 15:00 — OFFSIDES: today's matches and their arenas */
export function composeOffsides(d: LiveData, now: Date): Composed {
  const today = dayKey(now)
  const all = d.offsides.filter(m => dayKey(m.kickoff) === today && Date.parse(m.kickoff) > now.getTime() && !d.posted.includes(`os:${m.id}`))
  if (!all.length) return {skip: 'no OFFSIDES match today'}
  const top = [...all].sort((a, b) => b.arenas - a.arenas || a.kickoff.localeCompare(b.kickoff)).slice(0, 5).sort((a, b) => a.kickoff.localeCompare(b.kickoff))
  const arenas = all.reduce((n, m) => n + m.arenas, 0)
  const hook = arenas > 0 ? `${arenas} arena${arenas === 1 ? '' : 's'} open today. Who knows football in your group?` : `${all.length} match${all.length === 1 ? '' : 'es'} today. Open an arena, send the link.`
  const extra = all.length > top.length ? `\n…and ${all.length - top.length} more on OFFSIDES.` : ''
  return {refs: all.map(m => `os:${m.id}`), msg: message({app: 'offsides', sendAt: now, label: 'OFFSIDES today', hook,
    body: `${top.map(m => `${hhmm(m.kickoff)} (Israel time) · ${m.home} v ${m.away} · ${m.league}${m.arenas ? ` · ${m.arenas} arena${m.arenas === 1 ? '' : 's'}` : ''}`).join('\n')}${extra}\n\nPredict before kick-off: the exact score, half-time, the first scorer. Flash questions live during the match.\nA free simulation game — no real money, only bragging rights.`,
    visual: 'L-OFFSIDES-TODAY Today\'s arenas: OFFSIDES logo, the matches with both crests.'}),
  kit: {t: 'L-OFFSIDES-TODAY', data: {app: 'offsides', rows: top.map(m => ({home: m.home, away: m.away, line: `${hhmm(m.kickoff)} · ${m.league.toUpperCase()}${m.arenas ? ` · ${m.arenas} ARENA${m.arenas === 1 ? '' : 'S'}` : ''}`, homeCrestName: m.home, awayCrestName: m.away})),
    label: 'FREE PREDICTION GAME · NO REAL MONEY'}}}
}
