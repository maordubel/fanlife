import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Home fix pass, 29.9.2026 — what the owner asked to be gone or smaller stays that way. */
const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the home page', () => {
  const page = code(read('app/ground/page.tsx'))
  it('prints no standfirst and no "how you get in" heading', () => {
    expect(page).not.toContain('Standfirst')
    expect(page).not.toContain('HOW YOU GET IN')
    expect(page).not.toContain('wall.howYouGetIn')
    expect(page).not.toContain('<h2')
  })
  it('keeps the #gates section, the tunnel first, then the gates', () => {
    expect(page).toContain('id="gates"')
    expect(page.indexOf('<TunnelPlate />')).toBeLessThan(page.indexOf('wallOrder(GATES)'))
  })
  it('the standfirst copy is gone from the messages', () => {
    expect(read('messages/he.json')).not.toContain('home.standfirst')
  })
})

describe('the daily card on the home page', () => {
  it('is the compact variant there and defaults to full elsewhere', () => {
    expect(code(read('components/home/NowLayer.tsx'))).toContain('variant="compact"')
    expect(read('components/home/DailyCard.tsx')).toContain("variant = 'full'")
  })
  it('offers one current row and a disclosure for the rest', () => {
    const card = read('components/home/DailyCard.tsx')
    expect(card).toContain('data-daily-variant="compact"')
    expect(card).toContain('aria-expanded')
    expect(card).toContain("t('daily.more')")
  })
})

describe('the tunnel plate', () => {
  const plate = read('components/life/TunnelPlate.tsx')
  it('no longer says "TUNNEL · NOT A GATE"', () => {
    expect(plate).not.toMatch(/NOT A GATE/)
  })
  it('names the resume from the save (year · place), not a fixed prologue line', () => {
    expect(plate).toContain('readLifeResume')
    expect(plate).not.toContain('life.place.prologue')
    expect(plate).toContain('resume.year')
  })
  it('states the honest default and the resume kicker', () => {
    expect(plate).toContain("t('life.tunnel.start')")
    expect(plate).toContain("t('life.tunnel.resumeKicker')")
  })
})
