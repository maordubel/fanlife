import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// The generated plan (scripts/marketing/build-plan.mts → plan-v4.json + supabase/marketing/0008). Plan v4, owner 29.10.2026:
// 45 days, easier text, smarter tags, real copy-paste (the answer in the first comment, never in the caption).
type Main = {app: string; hook: string; body: string; visual: string; url?: string; tags?: string; label?: string; comment?: string; comment_label?: string; how?: string; kit: {t: string; data: Record<string, unknown>}}
type Row = {day: number; at: string; format: string; kind: string; main: Main}
const rows: Row[] = JSON.parse(readFileSync('scripts/marketing/plan-v4.json', 'utf8'))
const FIXED = ['08:00', '10:00', '12:00', '14:00', '16:00', '17:00', '17:30', '18:00', '19:00', '19:30', '20:00', '21:00', '22:00', '22:30']
const LIVE = {'07:30': 'briefing', '09:00': 'results', '11:00': 'fixtures', '13:00': 'dubid', '15:00': 'offsides'} as Record<string, string>
const fixed = rows.filter(r => r.kind === 'fixed')
const YEARS = /\b(1[89]\d\d|20\d\d)(?:\/\d\d)?\b|\b(1[89]\d)0s\b/g
const at = (t: string) => fixed.filter(r => r.at.endsWith(t))

describe('FAN LIFE social plan v4 (owner, 29.10.2026)', () => {
  it('45 days from 29.10.2026: fourteen fixed slots (19:30 GENERATIONS), four live slots and the morning briefing a day', () => {
    expect(rows).toHaveLength(45 * 19)
    expect(rows[0]!.at.slice(0, 10)).toBe('2026-10-29')
    expect(rows.filter(r => r.kind === 'briefing')).toHaveLength(45)
    expect(rows.at(-1)!.at.slice(0, 10)).toBe('2026-12-12')
    for (let d = 1; d <= 45; d++) {
      expect(rows.filter(r => r.day === d && r.kind === 'fixed').map(r => r.at.slice(11))).toEqual(FIXED)
      for (const [t, kind] of Object.entries(LIVE)) expect(rows.find(r => r.day === d && r.at.endsWith(t))?.kind).toBe(kind)
    }
    expect(new Set(rows.map(r => r.at)).size).toBe(rows.length)
  })
  it('smart tags: #FANLIFE (or the app) first, at most eight, never in the caption body', () => {
    for (const r of fixed) {
      const tags = r.main.tags!.split(' ')
      expect(tags.length, r.at).toBeGreaterThanOrEqual(3)
      expect(tags.length, r.at).toBeLessThanOrEqual(8)
      expect(tags[0], r.at).toBe(r.main.app === 'fanlife' ? '#FANLIFE' : `#${r.main.app.toUpperCase()}`)
      expect(new Set(tags).size, r.at).toBe(tags.length)
      for (const t of tags) expect(t, r.at).toMatch(/^#[A-Za-z0-9]+$/)
      expect(r.main.body, r.at).not.toMatch(/(^|\s)#[A-Za-z]/)
    }
    // a club post carries that club's own tag
    for (const r of at('16:00')) { const id = String((r.main.kit.data.club as {id: string}).id); if (id === 'celtic') expect(r.main.tags).toMatch(/#Celtic/) }
  })
  it('every post has a short label and the kit of its picture', () => {
    for (const r of rows) { expect(r.main.label, r.at).toBeTruthy(); expect(r.main.kit?.t, r.at).toBeTruthy() }
  })
  it('the answer lives in the first comment, never in the caption', () => {
    for (const t of ['16:00', '17:30', '22:30']) for (const r of at(t)) {
      expect(r.main.comment, r.at).toMatch(/^✅ /)
      const ans = r.main.comment!.slice(2).split(/[.\n]/)[0]!.replace(/^It finished /, '').trim()
      if (t === '22:30') expect(r.main.body, r.at).toContain('____')
      if (t === '17:30') expect(r.main.body, r.at).toContain('?–?')
      if (t !== '17:30' && ans.length >= 3) expect(`${r.main.hook} ${r.main.body.split('\n\n')[0]}`.toLowerCase(), r.at).not.toContain(ans.toLowerCase())
      expect(r.main.body, r.at).toMatch(/👇/)
    }
    for (const r of at('16:00')) expect(r.main.body).toMatch(/A\) .+\nB\) .+\nC\) .+\nD\) /)
    for (const r of [...at('14:00'), ...at('21:00')]) { expect(r.format).toBe('story'); expect(r.main.how).toMatch(/Quiz sticker/); expect(r.main.comment_label).toBe('Frame 2') }
  })
  it('one club carousel a day: history · gates · love, every open club', () => {
    const car = rows.filter(r => r.format === 'carousel')
    expect(car).toHaveLength(45)
    const clubs = new Set<string>()
    for (const r of car) {
      const slides = (r.main.kit as unknown as {slides: {data: Record<string, unknown>}[]}).slides
      expect(slides.length).toBeGreaterThanOrEqual(4)
      expect(slides.length).toBeLessThanOrEqual(10)
      expect(slides[0]!.data.s).toBe('cover')
      expect(slides.at(-1)!.data.s).toBe('cta')
      clubs.add(String((slides[0]!.data.club as {id: string}).id))
    }
    expect(clubs.size).toBeGreaterThanOrEqual(8)
  })
  it('three voices: FAN LIFE leads, DUBID and OFFSIDES on their weekdays in their own branding', () => {
    expect(new Set(fixed.map(r => r.main.app))).toEqual(new Set(['fanlife', 'dubid', 'offsides']))
    expect(fixed.filter(r => r.main.app === 'fanlife').length / fixed.length).toBeGreaterThan(0.9)
    for (const r of fixed.filter(r => r.main.app !== 'fanlife')) { expect(r.at.endsWith('12:00')).toBe(true); expect(r.main.kit.t).toBe(`L-${r.main.app.toUpperCase()}-SYSTEM`) }
    const evening = at('18:00').map(r => r.main.kit.data.name)
    expect(evening.filter(n => n === 'ROYAL RUMBLE').length).toBeGreaterThanOrEqual(20)
    expect(evening.filter(n => n === 'LEGENDS MANAGER').length).toBeGreaterThanOrEqual(20)
  })
  it('nothing from before 1980 — hook, caption, comment or picture', () => {
    for (const r of fixed) for (const m of `${r.main.hook} ${r.main.body} ${r.main.comment ?? ''} ${JSON.stringify(r.main.kit.data)}`.matchAll(YEARS))
      expect(Number(m[1] || m[2] + '0'), `${r.at}: ${m[0]}`).toBeGreaterThanOrEqual(1980)
  })
  it('no repeated archive item: each guess-the-score match and each fact once', () => {
    const score = at('17:30').filter(r => r.main.label === 'Guess the score').map(r => r.main.comment)
    expect(new Set(score).size).toBe(score.length)
    const facts = fixed.filter(r => r.main.kit.t === 'L-FACT' && r.main.label !== 'Generations · ask your dad') // an engagement prompt, not an archive item.map(r => r.main.comment || r.main.body.split('\n\n')[0])
    expect(new Set(facts).size).toBe(facts.length)
  })
  it('English only, no betting words for OFFSIDES, competitions under the name of their time', () => {
    for (const r of fixed) {
      const t = `${r.main.hook}\n${r.main.body}\n${r.main.comment ?? ''}`
      expect(t).not.toMatch(/[Ͱ-Ͽ֐-׿Ѐ-ӿ]/)
      if (r.main.app === 'offsides') expect(t).not.toMatch(/\bodds\b|\bbet\b|\bwager/i)
      for (const line of t.split('\n')) { const y = Number(line.match(/\b(19\d\d)\b/)?.[1] || 0); if (y && y < 1992) expect(line).not.toMatch(/UEFA Champions League/) }
    }
  })
})
