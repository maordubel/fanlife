import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// The generated plan (scripts/marketing/build-plan.mts → plan-v6.json + supabase/marketing/0010). Plan v6, owner 9.11.2026 (on v5, 4.11.2026):
// Athens time; every row names its channels in kit.to (feed = Facebook + Instagram, story, tiktok); four feed posts a day.
type Main = {app: string; hook: string; body: string; visual: string; url?: string; tags?: string; label?: string; comment?: string; comment_label?: string; how?: string; kit: {t: string; data: Record<string, unknown>; to?: string[]}}
type Row = {day: number; at: string; format: string; kind: string; main: Main}
const rows: Row[] = JSON.parse(readFileSync('scripts/marketing/plan-v6.json', 'utf8'))
const FEED = ['10:00', '13:00', '19:00', '21:00']
const STORY = ['14:00', '16:00', '17:30', '19:30', '22:00']
const LIVE = {'07:30': 'briefing', '09:00': 'results', '11:00': 'fixtures', '13:30': 'dubid', '15:00': 'offsides', '20:00': 'pulse'} as Record<string, string>
const fixed = rows.filter(r => r.kind === 'fixed')
const YEARS = /\b(1[89]\d\d|20\d\d)(?:\/\d\d)?\b|\b(1[89]\d)0s\b/g
const at = (t: string) => fixed.filter(r => r.at.endsWith(t))
const label = (l: string) => fixed.filter(r => r.main.label === l)

describe('FAN LIFE social plan v6 (owner, 9.11.2026)', () => {
  it('45 days from 10.11.2026, Athens time: four feed posts, five stories (+ a film on Wednesdays), the live slots and the briefing', () => {
    expect(rows[0]!.at.slice(0, 10)).toBe('2026-11-10')
    expect(rows.at(-1)!.at.slice(0, 10)).toBe('2026-12-24')
    expect(rows.filter(r => r.kind === 'briefing')).toHaveLength(45)
    for (let d = 1; d <= 45; d++) {
      const day = rows.filter(r => r.day === d && r.kind === 'fixed')
      expect(day.filter(r => r.main.kit.to!.includes('feed')).map(r => r.at.slice(11)).sort()).toEqual(FEED)
      const st = day.filter(r => r.main.kit.to!.includes('story')).map(r => r.at.slice(11)).sort()
      expect(st.filter(t => t !== '20:30')).toEqual(STORY)
      for (const [t, kind] of Object.entries(LIVE)) expect(rows.find(r => r.day === d && r.at.endsWith(t))?.kind).toBe(kind)
    }
    expect(new Set(rows.map(r => r.at)).size).toBe(rows.length)
    expect(fixed.filter(r => r.at.endsWith('20:30'))).toHaveLength(fixed.filter(r => r.at.endsWith('20:30') && new Date(r.at.slice(0, 10)).getUTCDay() === 3).length)
    // 12:00: the Club Vote on Mondays and Thursdays (feed + story), the real numbers on Wednesdays and Sundays (story)
    for (const r of rows.filter(r => r.at.endsWith('12:00'))) {
      const dow = new Date(r.at.slice(0, 10)).getUTCDay()
      expect(r.kind, r.at).toBe(dow === 1 || dow === 4 ? 'vote' : 'numbers')
      expect([1, 4, 0, 3]).toContain(dow)
    }
  })
  it('every row names its channels; the briefing goes nowhere but Telegram; the carousel is also a TikTok draft', () => {
    for (const r of rows) expect(Array.isArray(r.main.kit.to), r.at).toBe(true)
    for (const r of rows.filter(r => r.kind === 'briefing')) expect(r.main.kit.to).toEqual([])
    for (const r of rows.filter(r => r.format === 'carousel')) expect(r.main.kit.to).toEqual(['feed', 'tiktok'])
    for (const r of rows.filter(r => ['results', 'fixtures', 'dubid', 'offsides', 'pulse', 'numbers'].includes(r.kind))) expect(r.main.kit.to).toEqual(['story'])
    for (const r of rows.filter(r => r.kind === 'vote')) expect(r.main.kit.to).toEqual(['feed', 'story'])
  })
  it('a story never needs a sticker: the quiz question at 14:00, its answer at 17:30, same club', () => {
    for (let d = 1; d <= 45; d++) {
      const q = rows.find(r => r.day === d && r.at.endsWith('14:00'))!, a = rows.find(r => r.day === d && r.at.endsWith('17:30'))!
      expect(q.main.kit.t).toBe('T10-NERDS')
      expect((q.main.kit.data.options as string[]).length).toBe(4)
      expect(a.main.label).toBe('Story quiz · answer')
      expect((a.main.kit.data.club as {id: string}).id).toBe((q.main.kit.data.club as {id: string}).id)
      expect(q.main.kit.data.options as string[]).toContain(String(a.main.hook).replace('The answer: ', ''))
    }
  })
  it('films: only public ones, each with its own thumbnail, on Friday night and Wednesday story; Instagram points at YouTube and back', () => {
    const films = fixed.filter(r => r.main.kit.t === 'L-FILM')
    expect(films.length).toBeGreaterThanOrEqual(12)
    for (const r of films) { expect(r.main.url).toMatch(/^https:\/\/youtu\.be\//); expect(String(r.main.kit.data.thumb)).toMatch(/thumbnail(-1)?\.jpg$/); expect(r.main.body).toContain('@fanlifefootballstories') }
    for (const r of label('The bundle')) expect(r.main.body).toContain('youtube.com/@FanLifeFootballStories')
  })
  it('OPINION WAR: a question every day at 16:00 and Tuesday night — opinions only, two sides or YES/NO, never a number', () => {
    const war = label('Opinion War')
    expect(at('16:00').every(r => r.main.label === 'Opinion War')).toBe(true)
    expect(war.length).toBeGreaterThanOrEqual(45 + 3)
    for (const r of war) {
      expect(r.main.kit.t).toBe('L-DEBATE')
      expect(r.main.hook, r.at).toMatch(/\?$/)
      expect(r.main.body, r.at).toMatch(/👇/)
      expect(`${r.main.hook} ${r.main.body}`, r.at).not.toMatch(/\d{2,}%|\b\d{3,}\b/)
      const d = r.main.kit.data as {left: {name: string; club?: string}; right: {name: string; club?: string} | null}
      if (d.right) { expect(d.left.name).not.toBe(d.right.name); expect(r.main.body).toContain(`⬅️ ${d.left.name} or ➡️ ${d.right.name}`) }
      else expect(r.main.body).toContain('YES or')
    }
    expect(new Set(war.map(r => r.main.hook)).size).toBeGreaterThan(25)
  })
  it('the bundle walks the whole universe on Sundays: the club, Royal Rumble, Legends Manager, a film, the way in', () => {
    const b = label('The bundle')
    expect(b.length).toBeGreaterThanOrEqual(6)
    for (const r of b) {
      expect(new Date(r.at.slice(0, 10)).getUTCDay()).toBe(0)
      const slides = (r.main.kit as unknown as {slides: {t: string; data: Record<string, unknown>}[]}).slides
      expect(slides.map(s => s.t)).toEqual(['L-SLIDE', 'L-GATE', 'L-GATE', 'L-GATE', 'L-FILM', 'L-SLIDE'])
    }
  })
  it('no THE WORKER in this plan (owner, 9.11.2026)', () => {
    for (const r of rows) expect(JSON.stringify(r.main), r.at).not.toMatch(/theworker\.dubelteam|THE WORKER\b/)
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
    for (const r of label('Did you know')) { const id = String((r.main.kit.data.club as {id: string}).id); if (id === 'celtic') expect(r.main.tags).toMatch(/#Celtic/) }
  })
  it('every post has a short label and the kit of its picture', () => {
    for (const r of rows) { expect(r.main.label, r.at).toBeTruthy(); expect(r.main.kit?.t, r.at).toBeTruthy() }
  })
  it('the answer lives in the first comment, never in the caption', () => {
    for (const r of [...label('Nerds only'), ...label('Guess the score'), ...label('Guess the year')]) {
      expect(r.main.comment, r.at).toMatch(/^✅ /)
      const ans = r.main.comment!.slice(2).split(/[.\n]/)[0]!.replace(/^It finished /, '').trim()
      if (r.main.label === 'Guess the year') expect(r.main.body, r.at).toContain('____')
      if (r.main.label === 'Guess the score') expect(r.main.body, r.at).toContain('?–?')
      if (r.main.label !== 'Guess the score' && ans.length >= 3) expect(`${r.main.hook} ${r.main.body.split('\n\n')[0]}`.toLowerCase(), r.at).not.toContain(ans.toLowerCase())
      expect(r.main.body, r.at).toMatch(/👇/)
    }
    for (const r of label('Nerds only')) expect(r.main.body).toMatch(/A\) .+\nB\) .+\nC\) .+\nD\) /)
  })
  it('one club carousel a day: history · gates · love, every open club', () => {
    const car = rows.filter(r => r.format === 'carousel' && r.main.label !== 'The bundle')
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
    for (const r of fixed.filter(r => r.main.app !== 'fanlife')) { expect(r.at.endsWith('13:00')).toBe(true); expect(r.main.kit.t).toBe(`L-${r.main.app.toUpperCase()}-SYSTEM`) }
    // v6 week: Monday night Royal Rumble, Saturday night Legends Manager
    for (const r of at('21:00')) { const dow = new Date(r.at.slice(0, 10)).getUTCDay(); if (dow === 1) expect(r.main.kit.data.name).toBe('ROYAL RUMBLE'); if (dow === 6) expect(r.main.kit.data.name).toBe('LEGENDS MANAGER') }
  })
  it('nothing from before 1980 — hook, caption, comment or picture', () => {
    for (const r of fixed) for (const m of `${r.main.hook} ${r.main.body} ${r.main.comment ?? ''} ${JSON.stringify(r.main.kit.data)}`.matchAll(YEARS))
      expect(Number(m[1] || m[2] + '0'), `${r.at}: ${m[0]}`).toBeGreaterThanOrEqual(1980)
  })
  it('no repeated archive item: each guess-the-score match and each fact once', () => {
    const score = label('Guess the score').map(r => r.main.comment)
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
