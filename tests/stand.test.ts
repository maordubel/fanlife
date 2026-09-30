import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MESSAGES } from '@/lib/i18n'
import { emptyProfile, emptyStat } from '@/lib/profile/store'
import {
  STAND_CODE,
  STAND_HREF,
  cleanHeadline,
  cleanNick,
  cleanStandCode,
  cleanStandName,
  defaultStandNick,
  gateOfPath,
  publicName,
  standPath,
  type StandHome,
} from '@/lib/stand/contract'
import { groupStory, notYetLine, objectives, pairLines, weekRecap } from '@/lib/stand/story'
import { STATION_IDS, isoWeekKey, isoWeekStart, stationDone, weekProgram } from '@/lib/stand/week'

const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const SQL = read('supabase/migrations/20260928120000_worker_stands.sql')

function home(over: Partial<StandHome> = {}): StandHome {
  return {
    code: 'ABC234',
    name: 'שער 5',
    members: 4,
    you: { no: 1, nick: null },
    today: { played: 3, all3: 2, youPlayed: true },
    blindCow: { mine: true, finished: 3, solved: 3, early: 2, ranking: [] },
    debate: { mine: true, voters: 3, yours: 'm_1', yoursHe: 'x', tally: [{ pick: 'm_1', n: 3, labelHe: 'x' }] },
    remember: { daysTogether: 4, debates: [] },
    week: { start: '2026-09-28', players: 4, solved: 6, stations: {}, closedAll: 1 },
    feed: [],
    pairs: [],
    ...over,
  }
}

describe('the contract — the device refuses what the database would', () => {
  it('uses the SQL checks word for word', () => {
    expect(SQL).toContain(`code ~ '${STAND_CODE.source}'`)
    expect(SQL).toContain(`href ~ '${STAND_HREF.source.replace(/\\\//g, '/')}'`)
  })

  it('reads a code in any case and nothing ambiguous', () => {
    expect(cleanStandCode(' abc234 ')).toBe('ABC234')
    expect(cleanStandCode('ABC0I1')).toBeNull()
    expect(cleanStandCode('ABCDE')).toBeNull()
  })

  it('keeps names and nicknames short, and an email out of a nickname', () => {
    expect(cleanStandName('  ')).toBeNull()
    expect(cleanStandName('a'.repeat(40))).toHaveLength(32)
    expect(cleanNick('me@mail.com')).toBe('memail.com')
    expect(cleanNick('')).toBeNull()
  })

  it('makes a headline one line of 48 at most — a value, not a message', () => {
    expect(cleanHeadline('9\nמתוך\n12')).toBe('9 מתוך 12')
    expect(cleanHeadline('א'.repeat(80))).toHaveLength(48)
    expect(cleanHeadline('<b>x</b>')).toBe('bx/b')
  })

  it('stores a path on this site, never a host', () => {
    expect(standPath('https://theworker.dubelteam.com/trivia/europe?seed=12&from=share')).toBe('/trivia/europe?seed=12&from=share')
    expect(standPath('/c/Ab3_-x')).toBe('/c/Ab3_-x')
    expect(standPath('//evil.example/x')).toBeNull()
    expect(standPath('javascript:alert(1)')).toBeNull()
    expect(standPath('/trivia?x=<script>')).toBeNull()
  })

  it('knows which gate a link plays', () => {
    expect(gateOfPath('/trivia/europe?seed=1')).toBe(2)
    expect(gateOfPath('/blind-cow/daily')).toBe(10)
    expect(gateOfPath('/life')).toBeNull()
  })

  it('prints a nickname or "אדום מהיציע #N" and nothing else', () => {
    // §35 — the stand's own number is worded apart from the account-wide "אדום #N"
    expect(publicName(7, null)).toBe('אדום מהיציע #7')
    expect(publicName(7, null)).not.toMatch(/^אדום #/)
    expect(publicName(7, 'אבי')).toBe('אבי')
  })
})

describe('השבוע ביציע — five stations from existing gates, by ISO week in Israel', () => {
  it('finds the ISO week', () => {
    expect(isoWeekStart('2026-09-28')).toBe('2026-09-28')
    expect(isoWeekStart('2026-10-04')).toBe('2026-09-28')
    expect(isoWeekStart('2027-01-01')).toBe('2026-12-28')
    expect(isoWeekKey('2026-09-28')).toBe('2026-W40')
    expect(isoWeekKey('2027-01-01')).toBe('2026-W53')
    expect(isoWeekKey('2021-01-03')).toBe('2020-W53')
  })

  it('deals five different open gates, the same five all week, a new set across weeks', () => {
    const monday = weekProgram('2026-09-28').map((s) => s.id)
    expect(monday).toHaveLength(5)
    expect(new Set(monday).size).toBe(5)
    for (const day of ['2026-09-29', '2026-10-01', '2026-10-04']) expect(weekProgram(day).map((s) => s.id)).toEqual(monday)
    const weeks = new Set<string>()
    for (let i = 0; i < 10; i += 1) {
      const d = new Date(Date.UTC(2026, 8, 28 + i * 7)).toISOString().slice(0, 10)
      weeks.add(weekProgram(d).map((s) => s.id).join(','))
    }
    expect(weeks.size).toBeGreaterThan(1)
    for (const s of weekProgram('2026-09-28')) expect(STATION_IDS).toContain(s.id)
  })

  it('closes a station from the device ledger, this week only', () => {
    const station = weekProgram('2026-09-28').find((s) => s.id === 'g2') ?? { id: 'g2' as const, gate: 2, href: '/trivia', labelKey: 'stand.station.g2' as const }
    const profile = emptyProfile()
    profile.gates['/trivia/europe'] = { ...emptyStat(), plays: 1, lastOn: '2026-09-30' }
    expect(stationDone(station, '2026-09-28', profile)).toBe(true)
    profile.gates['/trivia/europe'] = { ...emptyStat(), plays: 1, lastOn: '2026-09-27' }
    expect(stationDone(station, '2026-09-28', profile)).toBe(false)
  })

  it('works solo: the recap is the player\'s own', () => {
    expect(weekRecap(null, 4, 5).map((l) => l.key)).toEqual(['stand.week.recapSolo', 'stand.week.leftOne'])
    expect(weekRecap(home(), 5, 5).map((l) => l.key)).toEqual(['stand.week.recap', 'stand.week.allMine', 'stand.week.closedAll'])
  })
})

describe('the group story — counts from rows, a group headline, no winner', () => {
  it('leads with the group, and says it gently when nobody played', () => {
    expect(groupStory(home()).map((l) => l.key)).toEqual([
      'stand.story.played',
      'stand.story.bcAll',
      'stand.story.bcEarly',
      'stand.story.all3',
      'stand.debate.agree',
    ])
    expect(groupStory(home({ today: { played: 0, all3: 0, youPlayed: false } })).map((l) => l.key)).toEqual(['stand.story.quiet'])
  })

  it('says nothing about the blind cow to a member who has not played it', () => {
    const keys = groupStory(home({ blindCow: { mine: false, finished: 3 } })).map((l) => l.key)
    expect(keys.some((k) => k.startsWith('stand.story.bc'))).toBe(false)
  })

  it('counts who is not in yet, softly', () => {
    expect(notYetLine(home())).toEqual({ key: 'stand.today.notYetOne' })
    expect(notYetLine(home({ today: { played: 4, all3: 0, youPlayed: true } }))?.key).toBe('stand.today.allIn')
    expect(notYetLine(home({ members: 1 }))).toBeNull()
  })

  it('builds objectives only from real actions', () => {
    const program = weekProgram('2026-09-28')
    const list = objectives(home({ debate: { mine: false, voters: 4 }, week: { start: '', players: 5, solved: 10, stations: Object.fromEntries(program.map((s) => [s.id, 1])), closedAll: 0 } }), program)
    expect(list.every((o) => o.done)).toBe(true)
    expect(objectives(home({ members: 1 }), program).some((o) => o.key === 'stand.coop.debate')).toBe(false)
  })

  it('tells a pair what they share, never who beat whom', () => {
    const lines = pairLines({ no: 2, nick: 'אפי', daysBoth: 7, bcBoth: 5, theyEarlier: 3, youEarlier: 1, debatesBoth: 6, debatesAgree: 4, sameRuns: 2 })
    expect(lines.map((l) => l.key)).toEqual(['stand.pairs.same', 'stand.pairs.days', 'stand.pairs.theyEarlier', 'stand.pairs.agree'])
    const text = lines.map((l) => MESSAGES[l.key] ?? '').join(' ')
    expect(text).not.toMatch(/ניצח|הפסיד|נגד|דירוג/)
  })

  it('resolves every key the stand hands out, and keeps no key nobody uses', () => {
    const code = [
      'lib/stand/story.ts', 'lib/stand/week.ts', 'lib/stand/contract.ts', 'components/stand/StandHome.tsx',
      'components/stand/StandIndex.tsx', 'components/stand/WeekCard.tsx', 'components/share/StandPost.tsx',
      'components/home/StandHooks.tsx', 'app/stand/page.tsx', 'app/stand/[code]/page.tsx',
    ].map(read).join('\n')
    const used = new Set([...code.matchAll(/'(stand\.[a-zA-Z0-9_.]+)'/g)].map((m) => m[1] as string))
    for (const key of used) expect(MESSAGES[key], key).toBeTruthy()
    const catalogue = JSON.parse(read('messages/he.stand.json')) as Record<string, string>
    for (const key of Object.keys(catalogue)) expect(used.has(key), `unused ${key}`).toBe(true)
  })
})

describe('the database side (rules 89/90) — read from the migration itself', () => {
  it('prefixes every object worker_ and touches nothing on auth', () => {
    for (const m of SQL.matchAll(/create (?:or replace )?(?:temp )?(?:table|function|index|trigger)(?: if not exists)? (?:public\.)?(\w+)/g)) {
      expect(m[1], m[0]).toMatch(/^worker_/)
    }
    expect(SQL).not.toMatch(/\bauth\.(users|uid|jwt)/)
    expect(SQL).not.toMatch(/on auth\./)
  })

  it('grants nothing on a table and opens exactly eight functions', () => {
    expect(SQL).not.toMatch(/grant [^;]* on (table )?public\.worker_stand/)
    const open = /v_open text\[\] := array\[([^\]]+)\]/.exec(SQL)?.[1] ?? ''
    expect([...open.matchAll(/'(worker_stand_\w+)'/g)].map((m) => m[1]).sort()).toEqual([
      'worker_stand_create', 'worker_stand_home', 'worker_stand_join', 'worker_stand_leave',
      'worker_stand_mine', 'worker_stand_peek', 'worker_stand_post', 'worker_stand_report',
    ])
    expect(SQL).toContain('stand_tables 6 · stand_open_functions 8 · anon_can_touch 0 · auth_triggers 0')
  })

  it('stores a hash of the device key, never the key, never a person', () => {
    expect(SQL).toContain("encode(sha256(convert_to('worker-stand|' || p_me, 'UTF8')), 'hex')")
    const statements = SQL.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').replace(/comment on table[^;]*;/g, '')
    expect(statements).not.toMatch(/\b(user_id|email|display_name)\b/)
  })

  it('is wired into scripts/db/verify.sh', () => {
    expect(read('scripts/db/verify.sh')).toContain('supabase/tests/60-stand.sql')
  })
})

describe('the seams — small, and the privacy holds in the code too', () => {
  it('ShareRow gains exactly one element and its import', () => {
    const row = read('components/share/ShareRow.tsx')
    expect(row.match(/<StandPost /g)).toHaveLength(1)
    expect(row).toContain("import { StandPost } from './StandPost'")
  })

  it('no stand component reaches the server module or prints a key', () => {
    for (const file of readdirSync(join(ROOT, 'components/stand'))) {
      const text = read(`components/stand/${file}`)
      expect(text, file).not.toContain('lib/stand/server')
      expect(text, file).not.toMatch(/stand_me|member_hash|device_id/)
    }
    expect(read('lib/stand/server.ts')).toMatch(/^import 'server-only'/)
  })

  it('takes the blind cow from the server\'s own sealed cookie, never from the page', () => {
    const actions = read('app/stand/actions.ts')
    expect(actions).toContain("cookies().get('bc_daily')")
    expect(read('lib/stand/local.ts')).not.toMatch(/bc_daily|hints/)
  })

  it('the guest is never walled off from the daily', () => {
    const home = read('components/stand/StandHome.tsx')
    const guest = home.slice(home.indexOf('function Guest('), home.indexOf('function Member('))
    expect(guest).toContain('<DailyCard daily={daily} />')
  })
})

describe('one public identity (§35, 28.9.2026)', () => {
  it('the stand defaults to the public nickname, cleaned by the stand rule; anonymous stays empty', () => {
    expect(defaultStandNick({ mode: 'nickname', nickname: 'שער 5' })).toBe('שער 5')
    expect(defaultStandNick({ mode: 'nickname', nickname: 'me@mail.com' })).toBe('memail.com')
    expect(defaultStandNick({ mode: 'anonymous', nickname: 'שער 5' })).toBe('')
    expect(defaultStandNick({ mode: 'nickname', nickname: '' })).toBe('')
  })

  it('the forms read the device preference, and the override re-joins — no new SQL path', () => {
    const home = read('components/stand/StandHome.tsx')
    const index = read('components/stand/StandIndex.tsx')
    for (const code of [home, index]) expect(code).toContain('defaultStandNick(readPref())')
    expect(home).toMatch(/function NickEdit[\s\S]*joinStandAction\(code, nick\)/)
    expect(home + index).not.toMatch(/supporter_no|worker_public_label|publicIdentity\(/)
  })
})
