/**
 * npm run away-days:club -- zrinjski-mostar            (UEFA id from club-packs/zrinjski-mostar/ingest.json)
 *
 * A club's European journey straight from UEFA's public match API (match.uefa.com/v5):
 * every finished match the team played, each with the ground UEFA records (name, city,
 * country, coordinates, capacity), the round, the leg, scorers with minutes, attendance.
 * Written to content/generated/away-days-<club>.json.
 *
 * Nothing is invented: a match whose stadium UEFA does not record is kept in `unplaced`
 * with the reason, and is not on the map. Selection is by the ground's PHYSICAL country,
 * never by which side was drawn at home (a "home" tie played abroad is an away day).
 */
import {execFileSync} from 'node:child_process'
import {existsSync,readFileSync,writeFileSync} from 'node:fs'

const [,, clubId, argTeam, ...rest] = process.argv
// the id lives in club-packs/<club>/ingest.json (uefaTeamId); a second argument overrides it
const cfg = clubId && existsSync(`club-packs/${clubId}/ingest.json`) ? JSON.parse(readFileSync(`club-packs/${clubId}/ingest.json`, 'utf8')) : {}
const teamId = argTeam ?? cfg.uefaTeamId
if (!clubId || !teamId) { console.error('usage: build-euro-club.mjs <clubId> [uefaTeamId]  (id otherwise from club-packs/<club>/ingest.json)'); process.exit(1) }
const get = (url) => {
  for (let i = 0; ; i++) {
    try { return JSON.parse(execFileSync('curl', ['-s', '-m', '40', url], {encoding: 'utf8', maxBuffer: 64 << 20})) }
    catch (e) { if (i >= 4) throw e; execFileSync('sleep', [String(1 + i * 2)]) }
  }
}
const one = (x) => (Array.isArray(x) ? x[0] : x)
const list = []
for (let off = 0; ; off += 50) {
  const page = get(`https://match.uefa.com/v5/matches?teamId=${teamId}&limit=50&offset=${off}&order=ASC`)
  if (!Array.isArray(page) || !page.length) break
  list.push(...page)
  if (page.length < 50) break
}
const en = (t) => t?.translations?.name?.EN ?? t?.internationalName ?? null
const matches = list.filter((m) => m.status === 'FINISHED').map((m) => one(get(`https://match.uefa.com/v5/matches?matchId=${m.id}`)) ?? m)
const mine = (t) => String(t.id) === String(teamId)
const club = matches.flatMap((m) => [m.homeTeam, m.awayTeam]).find(mine)
const stadiums = {}
const visits = []
const unplaced = []
const KO = {'Knock-out Play-off': 'Knockout play-off'}
for (const m of matches) {
  const home = mine(m.homeTeam), opp = home ? m.awayTeam : m.homeTeam
  const t = m.score?.total ?? m.score?.regular
  if (!t || t.home == null || t.away == null) continue
  const sf = home ? t.home : t.away, sa = home ? t.away : t.home
  const rec = {
    id: `${clubId}:${m.id}`, uefaId: String(m.id), playedOn: m.kickOffTime.date,
    competition: m.competition?.metaData?.name ?? null, season: m.seasonYear ?? null,
    stage: KO[m.round?.metaData?.name] ?? m.round?.metaData?.name ?? null,
    leg: m.leg?.number ?? null, drawnHome: home,
    opponent: opp.internationalName, opponentCountry: opp.countryCode,
    scoreFor: sf, scoreAgainst: sa, result: sf > sa ? 'W' : sf < sa ? 'L' : 'D',
    penalties: m.score?.penalty ? {for: home ? m.score.penalty.home : m.score.penalty.away, against: home ? m.score.penalty.away : m.score.penalty.home} : null,
    attendance: m.matchAttendance ?? null,
    scorers: (m.playerEvents?.scorers ?? []).map((g) => ({name: g.player?.internationalName ?? null, minute: g.time?.minute ?? null, forClub: String(g.teamId) === String(teamId), penalty: /PENALTY/i.test(g.goalType ?? ''), ownGoal: /OWN/i.test(g.goalType ?? '')})).filter((g) => g.name),
  }
  const s = m.stadium, geo = s?.geolocation
  if (!s || !geo || typeof geo.latitude !== 'number' || typeof geo.longitude !== 'number') {
    unplaced.push({...rec, reason: 'UEFA records no ground with coordinates for this match'}); continue
  }
  const id = `uefa-${s.id}`
  stadiums[id] ??= {id, name: (en(s) ?? s.translations?.mediaName?.EN ?? '').trim().replace(/^The Marshall .*Legia Warsaw$/, 'Stadion Legii (Pi\u0142sudski)'), city: (s.city?.translations?.name?.EN ?? '').trim() || null, countryCode: s.countryCode, lat: geo.latitude, lng: geo.longitude, capacity: s.capacity ?? null, opened: s.openingDate ? Number(s.openingDate.slice(0, 4)) : null}
  visits.push({...rec, venueId: id})
}
visits.sort((a, b) => a.playedOn.localeCompare(b.playedOn) || a.uefaId.localeCompare(b.uefaId))
const homeCountry = club?.countryCode ?? null
// the club's own ground = where it last played a drawn-home match in its own country (grounds change; "home" is where it lives now)
const origin = [...visits].reverse().find((v) => v.drawnHome && stadiums[v.venueId].countryCode === homeCountry)?.venueId ?? null
for (const v of visits) {
  const c = stadiums[v.venueId].countryCode
  v.side = v.venueId === origin ? 'HOME' : c === homeCountry ? 'DOMESTIC' : v.drawnHome ? 'NEUTRAL' : 'AWAY'
  v.physicallyAbroad = c !== homeCountry
}
const abroad = visits.filter((v) => v.physicallyAbroad)
const out = {
  schemaVersion: 1, clubId, source: 'UEFA match API (match.uefa.com/v5), public JSON', uefaTeamId: String(teamId),
  clubName: rest.join(' ') || en(club), homeCountry, origin,
  counts: {matches: visits.length, abroad: abroad.length, grounds: new Set(visits.map((v) => v.venueId)).size, countries: new Set(visits.map((v) => stadiums[v.venueId].countryCode)).size, unplaced: unplaced.length},
  stadiums: Object.values(stadiums).sort((a, b) => a.id.localeCompare(b.id)), visits, unplaced,
}
writeFileSync(`content/generated/away-days-${clubId}.json`, JSON.stringify(out, null, 1) + '\n')
console.log(out.counts, 'origin', origin)
