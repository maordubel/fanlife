import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

// The generated plan (scripts/marketing/build-plan.mts → plan-v2.json + supabase/marketing/0006).
type Row = {day: number; at: string; format: string; main: {app: string; hook: string; body: string; visual: string; url?: string}}
const rows: Row[] = JSON.parse(readFileSync('scripts/marketing/plan-v2.json', 'utf8'))
const SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']

describe('FAN LIFE social plan v2', () => {
  it('is fixed: thirty days, the same eight slots, no match placeholders', () => {
    expect(rows).toHaveLength(240)
    for (let d = 1; d <= 30; d++) expect(rows.filter(r => r.day === d).map(r => r.at.slice(11))).toEqual(SLOTS)
    for (const r of rows) expect(r.main.hook + r.main.body).not.toMatch(/\{home\}|\{away\}|\{kickoff\}/)
  })
  it('FAN LIFE leads; every other app gets its weekday', () => {
    const apps = rows.map(r => r.main.app)
    expect(apps.filter(a => a === 'fanlife').length / apps.length).toBeGreaterThan(0.7)
    for (const a of ['dubid', 'offsides', 'theworker', 'fuckyou']) expect(apps).toContain(a)
  })
  it('the data slots come from the archive: on this day, nerds only, a four-answer quiz, spicy', () => {
    for (const r of rows.filter(r => r.at.endsWith('08:00'))) expect(r.main.hook).toMatch(/^(On this day|This week in history)/)
    for (const r of rows.filter(r => r.at.endsWith('16:00'))) { expect(r.main.hook).toMatch(/^Nerds only/); expect(r.main.body).toMatch(/A\) .+\nB\) .+\nC\) .+\nD\) /) }
    for (const r of rows.filter(r => r.at.endsWith('18:00'))) expect(r.main.body).toMatch(/A\) .+\nB\) .+\nC\) .+\nD\) .+\nMark the right one: /)
  })
  it('never asks a question whose prompt already holds the answer', () => {
    for (const r of rows.filter(r => /1[68]:00$/.test(r.at))) {
      const ans = r.main.body.match(/(?:Mark the right one|Answer in the first comment \(or the next story frame\)): (.+?)\.(?:\s|$)/)?.[1] ?? ''
      const q = r.at.endsWith('18:00') ? r.main.hook : r.main.body.split('\n\n')[0] ?? ''
      expect(ans.length, r.at).toBeGreaterThan(0)
      if (ans.length < 3) continue // "1. FC Saarbrücken": the capture stops at the club's own full stop
      expect(q.toLowerCase(), r.at).not.toContain(ans.toLowerCase())
    }
  })
  it('English only, no betting words for OFFSIDES, no Champions League before 1992', () => {
    for (const r of rows) {
      const t = r.main.hook + r.main.body
      expect(t).not.toMatch(/[Ͱ-Ͽ֐-׿Ѐ-ӿ]/)
      expect(t).not.toMatch(/\bodds\b|\bbet\b|\bwager/i)
      for (const line of t.split('\n')) { const y = Number(line.match(/\b(19\d\d)\b/)?.[1] || 0); if (y && y < 1992) expect(line).not.toMatch(/UEFA Champions League/) }
    }
  })
})
