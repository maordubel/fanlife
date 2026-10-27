import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// The generated plan (scripts/marketing/build-plan.mts → plan-v3.json + supabase/marketing/0007).
type Row = {day: number; at: string; format: string; kind: string; main: {app: string; hook: string; body: string; visual: string; url?: string; kit: {t: string; data: Record<string, unknown>}}}
const rows: Row[] = JSON.parse(readFileSync('scripts/marketing/plan-v3.json', 'utf8'))
const FIXED = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00', '22:00']
const LIVE = {'09:00': 'results', '11:00': 'fixtures', '13:00': 'dubid', '15:00': 'offsides'} as Record<string, string>
const fixed = rows.filter(r => r.kind === 'fixed')
const YEARS = /\b(1[89]\d\d|20\d\d)(?:\/\d\d)?\b|\b(1[89]\d)0s\b/g

describe('FAN LIFE social plan v3 (owner, 27.10.2026)', () => {
  it('thirty days: eight fixed slots on the even hours, the 19:00 club carousel, four live slots on the odd hours', () => {
    expect(rows).toHaveLength(390)
    for (let d = 1; d <= 30; d++) {
      expect(rows.filter(r => r.day === d && r.kind === 'fixed').map(r => r.at.slice(11))).toEqual(FIXED)
      for (const [t, kind] of Object.entries(LIVE)) expect(rows.find(r => r.day === d && r.at.endsWith(t))?.kind).toBe(kind)
    }
  })
  it('one club carousel a day (owner, 27.10.2026): every open club, history · gates · love, its tags and a way in', () => {
    const car = rows.filter(r => r.format === 'carousel')
    expect(car).toHaveLength(30)
    const clubs = new Set<string>()
    for (const r of car) {
      expect(r.at.endsWith('19:00')).toBe(true)
      const slides = (r.main.kit as unknown as {slides: {t: string; data: Record<string, unknown>}[]}).slides
      expect(slides.length).toBeGreaterThanOrEqual(4)
      expect(slides.length).toBeLessThanOrEqual(10)
      expect(slides[0]!.data.s).toBe('cover')
      expect(slides.at(-1)!.data.s).toBe('cta')
      expect(r.main.body).toMatch(/#FANLIFE/)
      expect(r.main.url).toMatch(/\/clubs\/[a-z-]+$/)
      clubs.add(String((slides[0]!.data.club as {id: string}).id))
    }
    expect(clubs.size).toBeGreaterThanOrEqual(8)
    expect(new Set(car.map(r => r.main.visual.split(' · ')[1]))).toEqual(new Set(['history', 'gates', 'love']))
  })
  it('every post carries the kit of its picture', () => {
    for (const r of rows) { expect(r.main.kit?.t, r.at).toBeTruthy(); expect(r.main.kit.data, r.at).toBeTruthy() }
  })
  it('three voices only: FAN LIFE leads, DUBID and OFFSIDES on their weekdays, in their own branding', () => {
    expect(new Set(fixed.map(r => r.main.app))).toEqual(new Set(['fanlife', 'dubid', 'offsides']))
    expect(fixed.filter(r => r.main.app === 'fanlife').length / fixed.length).toBeGreaterThan(0.85)
    for (const r of fixed.filter(r => r.main.app !== 'fanlife')) { expect(r.at.endsWith('12:00')).toBe(true); expect(r.main.kit.t).toBe(`L-${r.main.app.toUpperCase()}-SYSTEM`) }
  })
  it('FAN LIFE sells its gates, and Royal Rumble and Legends Manager every evening', () => {
    for (const r of fixed.filter(r => r.at.endsWith('10:00') || r.at.endsWith('18:00'))) expect(r.main.kit.t).toBe('L-GATE')
    const evening = fixed.filter(r => r.at.endsWith('18:00')).map(r => r.main.kit.data.name)
    expect(evening.filter(n => n === 'ROYAL RUMBLE').length).toBeGreaterThanOrEqual(14)
    expect(evening.filter(n => n === 'LEGENDS MANAGER').length).toBeGreaterThanOrEqual(14)
  })
  it('nothing from before 1980 — not a year, not a season, not a decade', () => {
    for (const r of fixed) for (const m of `${r.main.hook} ${r.main.body} ${JSON.stringify(r.main.kit.data)}`.matchAll(YEARS))
      expect(Number(m[1] || m[2] + '0'), `${r.at}: ${m[0]}`).toBeGreaterThanOrEqual(1980)
  })
  it('the archive slots: on this day, a four-answer quiz, nerds only, and the answer is never in the question', () => {
    for (const r of fixed.filter(r => r.at.endsWith('08:00'))) expect(r.main.hook).toMatch(/^(On this day|This week in history|Did you know)/)
    for (const r of fixed.filter(r => r.at.endsWith('16:00'))) { expect(r.main.hook).toMatch(/^Nerds only/); expect(r.main.body).toMatch(/A\) .+\nB\) .+\nC\) .+\nD\) /) }
    for (const r of fixed.filter(r => /1[46]:00$/.test(r.at))) {
      const ans = r.main.body.match(/(?:Mark the right one|Answer in the first comment \(or the next story frame\)): (.+?)\.(?:\s|$)/)?.[1] ?? ''
      const q = r.at.endsWith('14:00') ? r.main.hook : r.main.body.split('\n\n')[0] ?? ''
      expect(ans.length, r.at).toBeGreaterThan(0)
      if (ans.length < 3) continue
      expect(q.toLowerCase(), r.at).not.toContain(ans.toLowerCase())
    }
  })
  it('English only, no betting words for OFFSIDES, no Champions League before 1992', () => {
    for (const r of fixed) {
      const t = r.main.hook + r.main.body
      expect(t).not.toMatch(/[Ͱ-Ͽ֐-׿Ѐ-ӿ]/)
      if (r.main.app === 'offsides') expect(t).not.toMatch(/\bodds\b|\bbet\b|\bwager/i)
      for (const line of t.split('\n')) { const y = Number(line.match(/\b(19\d\d)\b/)?.[1] || 0); if (y && y < 1992) expect(line).not.toMatch(/UEFA Champions League/) }
    }
  })
})
