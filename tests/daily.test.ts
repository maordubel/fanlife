import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { matchById } from '@/lib/archive/match-master'
import { agoKey, greetingKey, hourInIsrael, recapKey } from '@/lib/daily/copy'
import { doneSlots, ruleDone } from '@/lib/daily/progress'
import {
  REMEMBER_KINDS,
  anchorFor,
  choosePool,
  datedOn,
  genericItems,
  reliableMatch,
  resolveDaily,
  themeableMonthDays,
} from '@/lib/daily/resolve'
import { dayNumber } from '@/lib/daily/rotation'
import { addDays } from '@/lib/date/israel'
import { dealChallenge } from '@/lib/game/lineup'
import { MESSAGES, t } from '@/lib/i18n'
import { debateRound } from '@/lib/polls/debates'
import { emptyProfile, type Profile } from '@/lib/profile/store'

/**
 * היום בהפועל (ONE RED WORLD §7, §42). The daily is a promise made to everybody on the same
 * date, so it is tested like one: the same date always deals the same three things, a
 * themed day always points at a real row dated on that month-day, and the rotation never
 * brings an item back before its pool is used up.
 */

const LEAP_YEAR = '2028-01-01'
const allDays = Array.from({ length: 366 }, (_, i) => addDays(LEAP_YEAR, i))

describe('determinism', () => {
  it('the same Israel date deals the same daily, every time', () => {
    for (const date of ['2026-09-28', '2027-05-24', '2028-02-29']) {
      const a = JSON.stringify(resolveDaily(date))
      const b = JSON.stringify({ ...resolveDaily(date) })
      expect(a).toBe(b)
      expect(JSON.stringify(genericItems(date))).toBe(JSON.stringify(genericItems(date)))
      expect(JSON.stringify(anchorFor(date))).toBe(JSON.stringify(anchorFor(date)))
    }
  })

  it('two different dates deal a different daily', () => {
    const a = resolveDaily('2026-09-28').items.map((i) => i.key).join('|')
    const b = resolveDaily('2026-09-29').items.map((i) => i.key).join('|')
    expect(a).not.toBe(b)
  })

  it('always three, in slot order, each with a same-site door', () => {
    for (const date of allDays.slice(0, 40)) {
      const daily = resolveDaily(date)
      expect(daily.items.map((i) => i.slot)).toEqual(['remember', 'choose', 'discover'])
      for (const item of daily.items) expect(item.href.startsWith('/')).toBe(true)
    }
  })
})

describe('Historical Daily — never an invented anniversary (366 days)', () => {
  const dailies = allDays.map((date) => resolveDaily(date))

  it('some days are themed and some are not — the archive decides, not a quota', () => {
    const themed = dailies.filter((d) => d.theme).length
    expect(themed).toBeGreaterThan(30)
    expect(themed).toBeLessThan(366)
    expect(themeableMonthDays().length).toBeGreaterThan(0)
  })

  it('every themed day hangs on a real, reliable row dated on that very month-day, in an earlier year', () => {
    for (const daily of dailies) {
      if (!daily.theme) continue
      const match = matchById(daily.theme.matchId)
      expect(match, daily.date).not.toBeNull()
      expect(reliableMatch(match!), daily.date).toBe(true)
      expect(match!.playedOn.value, daily.date).toBe(daily.theme.playedOn)
      expect(daily.theme.playedOn.slice(5), daily.date).toBe(daily.date.slice(5))
      const years = Number(daily.date.slice(0, 4)) - Number(daily.theme.playedOn.slice(0, 4))
      expect(years, daily.date).toBeGreaterThan(0)
      expect(daily.theme.yearsAgo, daily.date).toBe(years)
    }
  })

  it('every "היום לפני" item — themed or not — is an archive row dated on that month-day', () => {
    for (const daily of dailies) {
      for (const item of daily.items) {
        if (item.yearsAgo === null) continue
        const id = item.key.replace(/^archive:/, '')
        expect(datedOn(id, daily.date.slice(5)), `${daily.date} ${item.key}`).toBe(true)
        expect(item.yearsAgo, daily.date).toBeGreaterThan(0)
      }
    }
  })

  it('a themed day derives its items from the same match wherever a gate can serve it', () => {
    for (const daily of dailies) {
      if (!daily.theme) continue
      const discover = daily.items[2]
      expect(discover.key, daily.date).toBe(`archive:${daily.theme.matchId}`)
      expect(discover.href, daily.date).toContain(daily.theme.matchId)
      const remember = daily.items[0]
      if (remember.kind === 'lineup') {
        const seed = Number(new URL(remember.href, 'https://x').searchParams.get('seed'))
        expect(dealChallenge(seed, 0)?.matchId, daily.date).toBe(daily.theme.matchId)
      }
      if (remember.kind === 'trivia') {
        const era = new URL(remember.href, 'https://x').searchParams.get('era')
        expect(Number(era), daily.date).toBe(Math.floor(Number(daily.theme.playedOn.slice(0, 4)) / 10) * 10)
      }
    }
  })

  it('24 May is the championship of 1986 — its goal, replayed; its match, in the archive', () => {
    // rule 49: the row is in the archive, with a sourced goal gate 8 deals. A conflict on
    // the competition LABEL keeps the label off the card, never the day off the calendar.
    const daily = resolveDaily('2026-05-24')
    expect(daily.theme?.playedOn).toBe('1986-05-24')
    expect(daily.theme?.yearsAgo).toBe(40)
    expect(daily.theme?.competitionHe).toBe('ליגה לאומית')
    expect(daily.items[0].kind).toBe('goal')
    expect(daily.items[0].href).toMatch(/^\/goal\?g=/)
  })

  it('a debate door opens gate 7 on exactly that debate', () => {
    for (const daily of dailies.slice(0, 120)) {
      const choose = daily.items[1]
      if (choose.kind !== 'debate' || choose.done.by !== 'debate') continue
      const seed = Number(new URL(choose.href, 'https://x').searchParams.get('seed'))
      expect(debateRound(seed, 0).debates[0]?.id, daily.date).toBe(choose.done.debateId)
    }
  })
})

describe('rotation — no premature repeat', () => {
  const start = '2026-09-28'
  const days = Array.from({ length: 60 }, (_, i) => addDays(start, i))
  const generic = days.map((date) => genericItems(date))

  it('choose: nothing comes back before the pool is used up', () => {
    const keys = generic.map((items) => items[1].key)
    const window = Math.min(choosePool().length, keys.length)
    for (let i = 0; i + window <= keys.length; i += 1) {
      const slice = keys.slice(i, i + window)
      expect(new Set(slice).size, slice.join(' ')).toBe(slice.length)
    }
  })

  it('discover: sixty days, sixty different things', () => {
    const keys = generic.map((items) => items[2].key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('remember: the four kinds take turns, and the trivia topic walks its own cycle', () => {
    const kinds = generic.map((items) => items[0].kind)
    for (let i = 1; i < kinds.length; i += 1) expect(kinds[i], days[i]).not.toBe(kinds[i - 1])
    for (let i = 0; i + REMEMBER_KINDS.length <= kinds.length; i += 1) {
      expect(new Set(kinds.slice(i, i + REMEMBER_KINDS.length)).size).toBeGreaterThanOrEqual(REMEMBER_KINDS.length - 1)
    }
    const topics = generic.filter((items) => items[0].kind === 'trivia').map((items) => items[0].key)
    for (let i = 1; i < topics.length; i += 1) expect(topics[i]).not.toBe(topics[i - 1])
  })

  it('counts days on the calendar, not the clock', () => {
    expect(dayNumber('2026-09-29') - dayNumber('2026-09-28')).toBe(1)
    expect(dayNumber('2028-03-01') - dayNumber('2028-02-28')).toBe(2)
  })
})

describe('done — read from the ledger every gate already writes', () => {
  const day = '2026-09-28'
  const profile = (gates: Record<string, string>): Profile => {
    const p = emptyProfile()
    for (const [id, lastOn] of Object.entries(gates)) {
      p.gates[id] = { plays: 1, best: 0, bestRate: 0, lastOn, correct: 0, asked: 0 }
    }
    return p
  }

  it('a trivia topic lights the trivia plate; gate 4 does not light gate 5', () => {
    expect(ruleDone({ by: 'gate', gate: '/trivia' }, day, profile({ '/trivia/europe': day }), {})).toBe(true)
    expect(ruleDone({ by: 'gate', gate: '/kits' }, day, profile({ '/kits/build': day }), {})).toBe(false)
    expect(ruleDone({ by: 'gate', gate: '/kits' }, day, profile({ '/kits': day }), {})).toBe(true)
  })

  it('yesterday is not today', () => {
    expect(ruleDone({ by: 'gate', gate: '/memory' }, day, profile({ '/memory': '2026-09-27' }), {})).toBe(false)
  })

  it('the Blind Cow daily is its own run, not any Blind Cow', () => {
    const rule = { by: 'run', id: '/blind-cow/daily' } as const
    expect(ruleDone(rule, day, profile({ '/blind-cow': day }), {})).toBe(false)
    expect(ruleDone(rule, day, profile({ '/blind-cow/daily': day }), {})).toBe(true)
  })

  it('a debate is done once the device holds a vote for it', () => {
    expect(ruleDone({ by: 'debate', debateId: 'x' }, day, emptyProfile(), {})).toBe(false)
    expect(ruleDone({ by: 'debate', debateId: 'x' }, day, emptyProfile(), { x: 'p_1' })).toBe(true)
  })

  it('a slot once counted stays counted', () => {
    const got = doneSlots([], day, emptyProfile(), {}, { choose: '2026-09-28T10:00:00Z' })
    expect([...got]).toEqual(['choose'])
  })
})

describe('the words', () => {
  it('the recap counts what the day actually held', () => {
    expect(recapKey(0)).toBeNull()
    expect(t(recapKey(1)!)).toBe('היום חזרת לרגע אחד.')
    expect(t(recapKey(2)!)).toBe('היום חזרת לשני רגעים.')
    expect(t(recapKey(3)!)).toBe('היום חזרת לשלושה רגעים.')
  })

  it('one and two years are words, not numbers', () => {
    expect(t(agoKey(1).key, agoKey(1).vars)).toBe('לפני שנה בדיוק')
    expect(t(agoKey(2).key, agoKey(2).vars)).toBe('לפני שנתיים בדיוק')
    expect(t(agoKey(38).key, agoKey(38).vars)).toBe('לפני 38 שנים בדיוק')
  })

  it('greets by the hour in Israel, not the machine’s', () => {
    // 10:30 UTC in January is 12:30 in Tel Aviv (UTC+2); in July it is 13:30 (UTC+3)
    expect(hourInIsrael(new Date('2026-01-15T10:30:00Z'))).toBe(12)
    expect(hourInIsrael(new Date('2026-07-15T10:30:00Z'))).toBe(13)
    expect(hourInIsrael(new Date('2026-01-15T22:30:00Z'))).toBe(0)
    expect(greetingKey(5)).toBe('home.greet.morning')
    expect(greetingKey(11)).toBe('home.greet.morning')
    expect(greetingKey(12)).toBe('home.greet.noon')
    expect(greetingKey(17)).toBe('home.greet.evening')
    expect(greetingKey(22)).toBe('home.greet.night')
    expect(greetingKey(3)).toBe('home.greet.night')
    expect(t('home.greet.evening')).toBe('ערב טוב.')
  })

  it('every daily/home string is asked for somewhere (rule 32: no dead strings)', () => {
    const own = JSON.parse(readFileSync(join(__dirname, '..', 'messages/he.daily.json'), 'utf8')) as Record<string, string>
    const files: string[] = []
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) walk(path)
        else if (/\.tsx?$/.test(name)) files.push(readFileSync(path, 'utf8'))
      }
    }
    walk(join(__dirname, '..', 'lib/daily'))
    walk(join(__dirname, '..', 'components/home'))
    const source = files.join('\n')
    const dead = Object.keys(own).filter((key) => !source.includes(`'${key}'`))
    expect(dead, dead.join('\n')).toEqual([])
    for (const key of Object.keys(own)) expect(MESSAGES[key]?.trim()).toBeTruthy()
  })
})
