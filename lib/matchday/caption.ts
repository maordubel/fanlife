import type {Snapshot} from './types'

const ZONE = 'Europe/Athens'
const SITE = 'FanLife.DubelTeam.com'
const hhmm = (iso: string) => new Intl.DateTimeFormat('en-GB', {timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(iso))
const dateLine = (day: string) => new Intl.DateTimeFormat('en-GB', {timeZone: ZONE, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'}).format(new Date(`${day}T12:00:00Z`)).toUpperCase()
export const documentNameFor = (day: string, format: 'story' | 'post', page: number) => `matchday-${day}-${format}-${String(page + 1).padStart(2, '0')}.png`

const timeOf = (f: Snapshot['fixtures'][number]) => f.status === 'postponed' ? 'P-P' : f.kickoff === null ? 'TBC' : hhmm(f.kickoff)
const tag = (f: Snapshot['fixtures'][number]) => f.status === 'postponed' ? ' (POSTPONED)' : f.status === 'live' ? ' (LIVE)' : f.status === 'finished' ? ' (PLAYED TODAY)' : ''
const line = (f: Snapshot['fixtures'][number]) => `${timeOf(f)}  ${f.home.name} vs ${f.away.name}${f.competition ? ` — ${f.competition}` : ''}${tag(f)}`

/** the short caption of the preview photo */
export function headerCaption(s: Snapshot, nameOf: (id: string) => string = id => id): string {
  const n = s.fixtures.length
  const body = s.coverage === 'complete' ? (n ? `${n} ${n === 1 ? 'match' : 'matches'} today · all kick-offs in Athens time` : 'No games today.')
    : n ? `${n} ${n === 1 ? 'match' : 'matches'} confirmed · PARTIAL SCHEDULE` : 'SCHEDULE UNCONFIRMED — no fixtures verified yet.'
  const miss = s.coverage === 'partial' && s.missingClubIds.length ? `Not confirmed: ${s.missingClubIds.map(nameOf).join(', ')}` : null
  return [`TODAY’S FOOTBALL • ${dateLine(s.day)}`, body, miss, `Updated ${hhmm(s.updatedAt)} Athens time`, SITE].filter(Boolean).join('\n')
}
/** ready to paste under the story or post */
export function instagramCaption(s: Snapshot): string {
  const rows = s.fixtures.map(line)
  return [`TODAY’S FOOTBALL • ${dateLine(s.day)}`, '', ...(rows.length ? rows : [s.coverage === 'complete' ? 'No games today. The stories never stop.' : 'Schedule unconfirmed.']), '', 'All kick-offs in Athens time.', SITE, '', '#FanLife #Football #MatchDay'].join('\n').slice(0, 2000)
}
/** the text-only package, when graphics are withheld */
export function textPackage(s: Snapshot, reason: string): string {
  return [`TODAY’S FOOTBALL • ${dateLine(s.day)} — TEXT ONLY`, reason, '', ...(s.fixtures.length ? s.fixtures.map(line) : ['No fixtures to list.']), '', 'All kick-offs in Athens time.', SITE].join('\n').slice(0, 4000)
}
export function alertText(s: Snapshot, why: string): string {
  return [`⚠ TODAY’S FOOTBALL • ${s.day} — needs you`, why, s.missingCrests.length ? `Missing crests: ${s.missingCrests.join(', ')}` : null, 'Control room → Operations → Today’s Football.'].filter(Boolean).join('\n').slice(0, 1500)
}
