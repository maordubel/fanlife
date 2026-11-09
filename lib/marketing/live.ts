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
import {smartTags} from './tags'

export const LIVE_KINDS = ['fixtures', 'results', 'dubid', 'offsides', 'briefing', 'vote', 'numbers', 'pulse'] as const
export type LiveKind = typeof LIVE_KINDS[number]
export const isLiveKind = (k: unknown): k is LiveKind => LIVE_KINDS.includes(k as LiveKind)

export type DubidRound = {id: string; round: number; league: string; code: string; lock_at: string; first_kickoff_at: string | null}
export type OffsidesMatch = {id: string; home: string; away: string; league: string; kickoff: string; tier: number | null; arenas: number}
export type LiveData = {dubid: DubidRound[]; offsides: OffsidesMatch[]; posted: string[]}
export type Kit = {t: string; data: Record<string, unknown>}
export type Composed = {msg: string; kit: Kit; refs: string[]} | {skip: string}

const TZ = 'Europe/Athens'
const URL: Record<string, string> = {fanlife: 'https://fanlife.dubelteam.com', dubid: 'https://dubid.dubelteam.com', offsides: 'https://offsides.dubelteam.com'}
const NAME: Record<string, string> = {fanlife: 'FAN LIFE', dubid: 'DUBID', offsides: 'OFFSIDES'}
// Smart tags (plan v4, owner 29.10.2026): one brand tag, then the topic — never a wall of generic ones.
const TAGS: Record<string, string> = {
  fanlife: '#FANLIFE #Football #FootballFans',
  dubid: '#DUBID #FantasyFootball #FPL #IsraeliFootball #SuperLeagueGreece',
  offsides: '#OFFSIDES #FootballPredictions #MatchDay #PredictTheScore',
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const part = (at: Date | string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', {timeZone: TZ, ...o}).format(new Date(at))
export const dayKey = (at: Date | string) => part(at, {year: 'numeric', month: '2-digit', day: '2-digit'}).split('/').reverse().join('-')
export const hhmm = (at: Date | string) => part(at, {hour: '2-digit', minute: '2-digit', hour12: false})
const weekday = (at: Date | string) => part(at, {weekday: 'short'}).toUpperCase()
const dayMonth = (at: Date | string) => part(at, {day: 'numeric', month: 'short'}).toUpperCase()
const longDay = (at: Date | string) => part(at, {weekday: 'long', day: 'numeric', month: 'long'})

/** the Telegram message, in the same shape marketing.render() writes for the fixed plan (v4, owner 29.10.2026): a short
 *  header, then the caption in a <pre> block — Telegram gives a block a one-tap copy — and, when there is one, the first
 *  comment in a second block. The picture went out just before; nothing else to read. */
export const CAPTION_MAX = 2200
export function message(o: {app: 'fanlife' | 'dubid' | 'offsides'; sendAt: Date; label: string; hook: string; body: string; url?: string; visual: string; tags?: string; comment?: string}) {
  const caption = [o.hook, '', o.body, '', `👉 ${o.url || URL[o.app]!}`, '', o.tags || TAGS[o.app]!].join('\n').slice(0, CAPTION_MAX)
  return [`📅 <b>${part(o.sendAt, {weekday: 'short'})} ${part(o.sendAt, {day: '2-digit', month: '2-digit'}).replace('/', '.')} · ${hhmm(o.sendAt)}</b> · ${esc(o.label)}`,
    `📌 Post · <b>${NAME[o.app]}</b> · Instagram · Facebook · TikTok`, '',
    '👇 <b>Caption</b> — tap the box to copy', `<pre>${esc(caption)}</pre>`,
    ...(o.comment ? ['💬 <b>First comment</b> — tap to copy', `<pre>${esc(o.comment.slice(0, 900))}</pre>`] : []),
  ].join('\n')
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
    tags: smartTags({clubs: [...new Set(rows.map(r => r.clubId))], topics: ['results']}),
    visual: 'L-RESULTS Full time: the scores on split-flap tiles, both crests.'}),
  kit: {t: 'L-RESULTS', data: {clubs: [...new Set(rows.map(r => r.clubId))], dayTop: weekday(rows[rows.length - 1]!.kickoff), dayBottom: dayMonth(rows[rows.length - 1]!.kickoff),
    rows: rows.map(r => ({home: r.home, away: r.away, score: `${r.homeScore}-${r.awayScore}`, line: comp(r.competition).toUpperCase() || 'FULL TIME', homeCrestName: r.home, awayCrestName: r.away}))}}}
}

/** 11:00 — the FAN LIFE clubs playing today or tomorrow (Athens days), each match announced once */
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
    body: `${rows.map(f => `${when(f)} (Athens time) · ${f.home} v ${f.away}${f.competition ? ` · ${comp(f.competition)}` : ''}`).join('\n')}\n\nWho are you with? Before kick-off, warm up on your club's trivia on FAN LIFE.`,
    url: one ? clubLink(one.clubId) : URL.fanlife, tags: smartTags({clubs: [...new Set(rows.map(f => f.clubId))], topics: ['fixtures']}), visual: 'L-FIXTURES Next up: the matches as tickets, both crests, the kick-off times.'}),
  kit: {t: 'L-FIXTURES', data: {clubs: [...new Set(rows.map(f => f.clubId))], dayTop: allToday ? 'TODAY' : weekday(rows[0]!.kickoff), dayBottom: dayMonth(rows[0]!.kickoff),
    rows: rows.map(f => ({home: f.home, away: f.away, line: `${when(f).toUpperCase()}${f.competition ? ' · ' + comp(f.competition).toUpperCase() : ''}`, homeCrestName: f.home, awayCrestName: f.away}))}}}
}

/** 13:00 — DUBID: a round that opened and was not announced yet */
export function composeDubid(d: LiveData, now: Date): Composed {
  const rounds = d.dubid.filter(r => !d.posted.includes(`gw:${r.id}`) && Date.parse(r.lock_at) > now.getTime() + 3600_000).slice(0, 4)
  if (!rounds.length) return {skip: 'no new DUBID round is open'}
  const sameRound = rounds.every(r => r.round === rounds[0]!.round)
  const lock = (r: DubidRound) => `${longDay(r.lock_at)}, ${hhmm(r.lock_at)} (Athens time)`
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
    body: `${top.map(m => `${hhmm(m.kickoff)} (Athens time) · ${m.home} v ${m.away} · ${m.league}${m.arenas ? ` · ${m.arenas} arena${m.arenas === 1 ? '' : 's'}` : ''}`).join('\n')}${extra}\n\nPredict before kick-off: the exact score, half-time, the first scorer. Flash questions live during the match.\nA free simulation game — no real money, only bragging rights.`,
    visual: 'L-OFFSIDES-TODAY Today\'s Central Arenas: OFFSIDES logo, the matches with both crests, JOIN THE BATTLE + QR.'}),
  kit: {t: 'L-OFFSIDES-TODAY', data: {app: 'offsides', rows: top.map(m => ({home: m.home, away: m.away, ko: hhmm(m.kickoff), league: m.league.toUpperCase(), arenas: m.arenas, line: `${hhmm(m.kickoff)} · ${m.league.toUpperCase()}${m.arenas ? ` · ${m.arenas} ARENA${m.arenas === 1 ? '' : 'S'}` : ''}`, homeCrestName: m.home, awayCrestName: m.away})),
    label: 'FREE PREDICTION GAME · NO REAL MONEY'}}}
}

/**
 * 07:30 — the owner's morning briefing (owner, 29.10.2026: "management and a shared update of the activity, apart
 * from the marketing"). Not a post: no picture, no caption box, nothing to copy. Four parts, each read from real data,
 * each saying so plainly when it is empty — OFFSIDES arenas open today, today's matches (the FAN LIFE clubs and every
 * OFFSIDES match), the FAN LIFE clubs' results since yesterday morning, and the DUBID rounds still open.
 * Never deduplicated against the posts: a briefing reports the state of the day, every day.
 */
export type LedgerRow = {at: string; kind: string; status: string; format?: string; label: string | null; app?: string | null; to?: string[]; error?: string | null
  published?: {facebook?: string; instagram?: string; x?: string} | null}
const LIVE_SLOT = new Set(['fixtures', 'results', 'dubid', 'offsides', 'vote', 'numbers', 'pulse'])
const ok = (s?: string) => !!s && s.startsWith('published')
/** one line per post of a day: ✅ out everywhere it was meant to go · ✋ sent to you as a draft to post by hand · ❌ failed */
const WHERE: Record<string, string> = {feed: 'feed', story: 'story', tiktok: 'TikTok'}
export function ledgerLines(rows: readonly LedgerRow[]) {
  const quiet = rows.filter(r => r.status === 'skipped' && LIVE_SLOT.has(r.kind)).length
  const out = {done: 0, ok: [] as string[], hands: [] as string[], failed: [] as string[], quiet}
  for (const r of rows) {
    if (r.status === 'skipped') continue
    const name = `${r.at} ${r.label || r.kind}`
    const meta = (r.to || []).filter(t => t === 'feed' || t === 'story')
    if (r.status === 'failed' || r.status === 'refused') { out.failed.push(`${name} — ${(r.error || 'not delivered').slice(0, 80)}`); continue }
    if (r.status === 'pending' || r.status === 'sending') { out.failed.push(`${name} — never went out`); continue }
    const p = r.published || {}
    const bad = [p.facebook && !ok(p.facebook) ? `Facebook: ${p.facebook}` : '', p.instagram && !ok(p.instagram) ? `Instagram: ${p.instagram}` : ''].filter(Boolean)
    if (bad.length && meta.length) { out.failed.push(`${name} — ${bad.join(' · ').slice(0, 90)}`); continue }
    if (meta.length && !(ok(p.facebook) && ok(p.instagram))) { out.hands.push(`${name} — draft in this chat, post it by hand`); continue }
    if ((r.to || []).includes('tiktok')) out.hands.push(`${name} — TikTok carousel by hand`)
    out.done++
    out.ok.push(`${name}${meta.length ? ` · ${meta.map(t => WHERE[t]).join(' + ')}` : ' · Telegram'}`)
  }
  return out
}
export function composeBriefing(fixtures: readonly Fixture[], results: readonly Result[], liveClubs: readonly string[], d: LiveData, now: Date, names: Record<string, string>,
  ledger: {yesterday: readonly LedgerRow[]; today: readonly LedgerRow[]} | null = null): Composed {
  const today = dayKey(now)
  const uniq = <T,>(xs: T[], key: (x: T) => string) => { const s = new Set<string>(); return xs.filter(x => !s.has(key(x)) && s.add(key(x))) }
  const os = d.offsides.filter(m => dayKey(m.kickoff) === today)
  const arenas = os.filter(m => m.arenas > 0).sort((a, b) => b.arenas - a.arenas || a.kickoff.localeCompare(b.kickoff))
  const clubToday = uniq(fixtures.filter(f => liveClubs.includes(f.clubId) && f.status === 'scheduled' && dayKey(f.kickoff) === today)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff)), f => f.providerEventId)
  const done = uniq(results.filter(r => liveClubs.includes(r.clubId) && now.getTime() > Date.parse(r.kickoff) && now.getTime() - Date.parse(r.kickoff) < 36 * 3600_000)
    .sort((a, b) => a.kickoff.localeCompare(b.kickoff)), r => r.providerEventId)
  const rounds = d.dubid.filter(r => Date.parse(r.lock_at) > now.getTime()).sort((a, b) => a.lock_at.localeCompare(b.lock_at))
  const t = (f: {kickoff: string; dateOnly?: boolean}) => f.dateOnly ? 'today' : hhmm(f.kickoff)
  const sec = (title: string, rows: string[], empty: string) => [`<b>${title}</b>`, ...(rows.length ? rows.map(r => `• ${esc(r)}`) : [`<i>${esc(empty)}</i>`])].join('\n')
  const total = arenas.reduce((n, m) => n + m.arenas, 0)
  // owner, 9.11.2026: "tick what was published, warn about failures, show the day's plan — practical and to the point"
  const y = ledger ? ledgerLines(ledger.yesterday) : null
  const pub = !ledger ? ['<b>📣 Yesterday’s publishing</b>', '<i>The plan’s record could not be read.</i>']
    : [`<b>📣 Yesterday’s publishing</b> — ✅ ${y!.done}${y!.hands.length ? ` · ✋ ${y!.hands.length}` : ''}${y!.failed.length ? ` · ❌ ${y!.failed.length}` : ''}${y!.quiet ? ` · ${y!.quiet} live slot${y!.quiet === 1 ? '' : 's'} quiet (no data)` : ''}`,
      ...y!.failed.slice(0, 8).map(l => `❌ ${esc(l)}`), ...y!.hands.slice(0, 6).map(l => `✋ ${esc(l)}`), ...y!.ok.slice(0, 18).map(l => `✅ ${esc(l)}`),
      ...(!y!.failed.length && !y!.hands.length && y!.done ? ['<i>Everything went out by itself.</i>'] : [])]
  const plan = !ledger ? [] : ['<b>📅 Today’s plan</b>', ...(ledger.today.length ? ledger.today.slice(0, 18).map(r => `• ${r.at} ${esc(r.label || r.kind)}${LIVE_SLOT.has(r.kind) ? ' <i>(live — only if there is data)</i>' : ''}${(r.to || []).length ? ` · ${(r.to || []).map(t => WHERE[t] || t).join(' + ')}` : ''}`) : ['<i>Nothing planned today.</i>'])]
  const msg = [
    `☀️ <b>Morning briefing · ${part(now, {weekday: 'short'})} ${part(now, {day: '2-digit', month: '2-digit'}).replace('/', '.')}</b>`, '',
    ...pub, '', ...(plan.length ? [...plan, ''] : []),
    sec('⚽ FAN LIFE clubs today', clubToday.map(f => `${t(f)} ${f.home} v ${f.away}${f.competition ? ` · ${comp(f.competition)}` : ''}`), 'No FAN LIFE club plays today.'), '',
    sec('🏁 Since yesterday', done.map(r => `${r.home} ${r.homeScore}-${r.awayScore} ${r.away}`), 'No FAN LIFE club played.'), '',
    sec(`🏟 OFFSIDES — ${os.length} match${os.length === 1 ? '' : 'es'} today${total ? `, ${total} arena${total === 1 ? '' : 's'} open` : ''}`, arenas.slice(0, 5).map(m => `${hhmm(m.kickoff)} ${m.home} v ${m.away} · ${m.arenas} arena${m.arenas === 1 ? '' : 's'}`), 'No active arena yet.'), '',
    sec('🧩 DUBID', rounds.slice(0, 4).map(r => `${r.league} · Round ${r.round} · locks ${weekday(r.lock_at).slice(0, 1)}${weekday(r.lock_at).slice(1).toLowerCase()} ${hhmm(r.lock_at)}`), 'No round open.'),
  ].join('\n')
  // the pictures (owner, 29.10.2026: "with the relevant graphics"): one card per part that has something in it,
  // sent as one album before the text — the same layouts the live posts use
  const slides: Kit[] = []
  if (arenas.length) slides.push({t: 'L-OFFSIDES-TODAY', data: {app: 'offsides', rows: arenas.slice(0, 5).map(m => ({home: m.home, away: m.away, ko: hhmm(m.kickoff), league: m.league.toUpperCase(), arenas: m.arenas,
    line: `${hhmm(m.kickoff)} · ${m.league.toUpperCase()} · ${m.arenas} ARENA${m.arenas === 1 ? '' : 'S'}`, homeCrestName: m.home, awayCrestName: m.away})), label: 'FREE PREDICTION GAME · NO REAL MONEY'}})
  if (clubToday.length) slides.push({t: 'L-FIXTURES', data: {clubs: [...new Set(clubToday.map(f => f.clubId))], dayTop: 'TODAY', dayBottom: dayMonth(now),
    rows: clubToday.slice(0, 6).map(f => ({home: f.home, away: f.away, line: `TODAY${f.dateOnly ? '' : ' ' + hhmm(f.kickoff)}${f.competition ? ' · ' + comp(f.competition).toUpperCase() : ''}`, homeCrestName: f.home, awayCrestName: f.away}))}})
  if (done.length) slides.push({t: 'L-RESULTS', data: {clubs: [...new Set(done.map(r => r.clubId))], dayTop: weekday(done[done.length - 1]!.kickoff), dayBottom: dayMonth(done[done.length - 1]!.kickoff),
    rows: done.slice(-6).map(r => ({home: r.home, away: r.away, score: `${r.homeScore}-${r.awayScore}`, line: comp(r.competition).toUpperCase() || 'FULL TIME', homeCrestName: r.home, awayCrestName: r.away}))}})
  if (rounds.length) slides.push({t: 'L-DUBID-ROUND', data: {app: 'dubid', round: rounds[0]!.round, leagues: rounds.slice(0, 4).map(r => ({name: r.league, round: r.round, line: `LINEUPS LOCK ${weekday(r.lock_at)} ${dayMonth(r.lock_at)} · ${hhmm(r.lock_at)}`})), label: 'DUBID · FANTASY FOOTBALL'}})
  void names
  return {refs: [`brief:${today}`], msg: msg.slice(0, 4000), kit: slides.length ? {t: 'L-CAROUSEL', data: {briefing: true}, slides} as unknown as Kit : {t: 'none', data: {}}}
}

// ── plan v6 (owner, 9.11.2026): live counters from real data — never a typed number ─────────────────────────────────

export type VoteRow = {club_id: string; account_votes: number | string; guest_votes: number | string}
/** below this many real ballots the vote slot stays quiet: "3 fans voted" is not a hook, it is a confession */
export const VOTE_QUIET = 10
/** 12:00 (Mon/Thu) — the hub's Club Vote ("which club opens next?"): the REAL ballots only (worker_hub_vote_tally),
 *  never the site's labelled early count; the same total is never announced twice */
export function composeVote(rows: readonly VoteRow[], names: Record<string, string>, d: LiveData, now: Date): Composed {
  const tally = rows.map(r => ({id: r.club_id, name: names[r.club_id] || '', votes: Number(r.account_votes || 0) + Number(r.guest_votes || 0)}))
    .filter(r => r.name && r.votes > 0).sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name))
  const total = tally.reduce((n, r) => n + r.votes, 0)
  if (total < VOTE_QUIET) return {skip: `only ${total} real ballot(s) in the Club Vote — quiet until ${VOTE_QUIET}`}
  const ref = `vote:${total}`
  if (d.posted.includes(ref)) return {skip: 'the Club Vote total has not changed since it was last posted'}
  const [a, b] = tally, lead = a && b ? a.votes - b.votes : 0
  const hook = `${total} fans have voted. Which club opens next?`
  const body = `${tally.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} — ${r.votes} vote${r.votes === 1 ? '' : 's'}`).join('\n')}${a && b ? `\n\n${a.name} lead${lead ? ` by ${lead}` : ' — level at the top'}.` : ''}\nThe winner is the next club whose whole history opens on FAN LIFE.\nYour club not on top? Send this to your group. 👇`
  return {refs: [ref], msg: message({app: 'fanlife', sendAt: now, label: 'Club Vote', hook, body, url: URL.fanlife,
    tags: smartTags({topics: ['vote'], max: 6}), visual: 'L-VOTE the ballot board: the leading clubs, their real counts, the total.'}),
  kit: {t: 'L-VOTE', data: {total, rows: tally.slice(0, 5).map(r => ({name: r.name, votes: r.votes, crestName: r.name})), shout: 'VOTE!', label: 'FAN LIFE · WHICH CLUB OPENS NEXT?'}}}
}

export type FunnelRow = {gate: string; visitors: number | string; starters: number | string; finishers: number | string}
const GATE_NAMES: Record<string, string> = {xi: 'All-time XI', trivia: 'Trivia', lineup: 'Historical line-up', 'kit-builder': 'Kit builder', kits: 'Shirt collection',
  memory: 'Memory', polls: 'Terrace vote', goal: 'Goal reconstruction', 'royal-rumble': 'Royal Rumble', 'blind-cow': 'Blind Cow', derby: 'The derby',
  archive: 'Living archive', timeline: 'Timeline', legends: 'Legends Manager'}
export const NUMBERS_QUIET = 50
/** 12:00 (other days) — real activity this week (worker_events_funnel, 7 days): rounds finished, the busiest game. Once a day at most. */
export function composeNumbers(rows: readonly FunnelRow[], d: LiveData, now: Date): Composed {
  const games = rows.map(r => ({key: String(r.gate).split('/').filter(Boolean).pop() || '', done: Number(r.finishers || 0)})).filter(r => r.done > 0)
  const done = games.reduce((n, r) => n + r.done, 0)
  if (done < NUMBERS_QUIET) return {skip: `${done} rounds finished this week — quiet until ${NUMBERS_QUIET}`}
  const ref = `num:${dayKey(now)}`
  if (d.posted.includes(ref)) return {skip: 'community numbers already posted today'}
  const by = new Map<string, number>()
  for (const g of games) if (GATE_NAMES[g.key]) by.set(g.key, (by.get(g.key) ?? 0) + g.done)
  const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0]
  const hook = `${done.toLocaleString('en-GB')} rounds played on FAN LIFE this week.`
  const body = `${top ? `The busiest game: ${GATE_NAMES[top[0]]} — ${top[1].toLocaleString('en-GB')} rounds.\n` : ''}Every round is a supporter proving something about their club.\nWhere's yours? Play free, no download. 👇`
  return {refs: [ref], msg: message({app: 'fanlife', sendAt: now, label: 'This week on FAN LIFE', hook, body, url: URL.fanlife,
    tags: smartTags({topics: ['gate'], max: 6}), visual: 'L-NUMBERS one giant real number: rounds played this week, the busiest game.'}),
  kit: {t: 'L-NUMBERS', data: {number: done.toLocaleString('en-GB'), line: 'ROUNDS PLAYED THIS WEEK', sub: top ? `BUSIEST: ${GATE_NAMES[top[0]]!.toUpperCase()}` : '', shout: 'THIS WEEK!', label: 'FAN LIFE · REAL NUMBERS'}}}
}

export type ChannelVideo = {videoId: string; title: string; kind: 'film' | 'short'; publishedAt: string}
/** 20:00 — the channel pulse: the newest PUBLIC video (the studio's upload records), each announced once, never one
 *  published more than 10 days ago (old news is not a pulse) */
export function composePulse(videos: readonly ChannelVideo[], d: LiveData, now: Date): Composed {
  const fresh = videos.filter(v => /^[A-Za-z0-9_-]{11}$/.test(v.videoId) && Date.parse(v.publishedAt) <= now.getTime() && now.getTime() - Date.parse(v.publishedAt) < 10 * 86400_000
    && !d.posted.includes(`yt:${v.videoId}`)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  const v = fresh[0]
  if (!v) return {skip: 'no new public video on the channel'}
  const url = v.kind === 'short' ? `https://youtube.com/shorts/${v.videoId}` : `https://youtu.be/${v.videoId}`
  const hook = v.kind === 'short' ? `New Short: ${v.title}` : `New on the channel: ${v.title}`
  const body = `${v.title}\n\n${v.kind === 'short' ? '60 seconds of a night supporters never forget.' : 'The full story — real nights, real supporters.'}\n▶️ ${url}\n\nWere you there? Tell us in the comments 👇`
  return {refs: [`yt:${v.videoId}`], msg: message({app: 'fanlife', sendAt: now, label: 'Channel pulse', hook, body, url, tags: smartTags({topics: ['film'], max: 6}),
    visual: 'L-FILM the video\'s own thumbnail on a screen, its title.'}),
  kit: {t: 'L-FILM', data: {title: v.title, thumbUrl: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, kicker: v.kind === 'short' ? 'NEW SHORT' : 'NOW ON YOUTUBE', shout: 'WATCH!'}}}
}
