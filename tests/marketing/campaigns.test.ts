import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import {buildCampaign, inputFrom, CLUB_CARDS, OPEN_CLUBS, TEMPLATES, track, type TemplateKey} from '../../lib/marketing/campaigns'

// the 30-day plan and the control room's Campaigns area build from the same templates (owner, 24.11.2026)
describe('campaigns', () => {
  it('every template builds rows with a picture, a campaign and a tracked link to the site', () => {
    for (const template of Object.keys(TEMPLATES) as TemplateKey[]) {
      const {campaign, rows} = buildCampaign({template, start: '2026-12-01', club: 'celtic', clubs: ['celtic'], feature: 'rumble', sale: {label: 'Weekend sale', percent: 15, ends: 'Sun 6 Dec'}})
      expect(rows.length, template).toBeGreaterThan(0)
      for (const r of rows) {
        expect(r.at).toMatch(/^\d{4}-\d{2}-\d{2} \d\d:\d\d$/)
        expect(r.main.campaign.id).toBe(campaign.id)
        expect(r.main.kit.t).toMatch(/^L-/)
        if (r.main.url?.startsWith('https://fanlife.dubelteam.com')) expect(r.main.url).toContain(`utm_campaign=${campaign.id}`)
      }
    }
  })
  it('a club that is not open yet: the teasers go, opening night and the week wait for the club', () => {
    const {rows} = buildCampaign({template: 'club-opening', club: 'fenerbahce', start: '2026-11-25', days: 6})
    expect(rows.slice(0, 2).every(r => !r.held && r.main.url?.includes('/clubs?'))).toBe(true)
    expect(rows.slice(2).every(r => r.held && r.main.hold === 'open:fenerbahce')).toBe(true)
    expect(rows.filter(r => r.main.launch)).toHaveLength(1)
    // nothing that waits for the club sends a fan to its closed page before then; nothing before it opens draws its home screen
    expect(rows[0]!.main.kit.data.noScreen).toBe(true)
  })
  it('a club without films of its own is never sold another club’s film', () => {
    const {rows} = buildCampaign({template: 'film-push', club: 'st-pauli', start: '2026-12-01', days: 2})
    expect(rows.every(r => r.main.kit.t === 'L-YT')).toBe(true)
  })
  it('Partizan and the Greek rivals keep their rules: every open club has a card with real numbers', () => {
    for (const id of OPEN_CLUBS) { const c = CLUB_CARDS[id]!; expect(c.stats.matches).toBeGreaterThan(0); expect(c.stats.shirts).toBeGreaterThan(0) }
    const tpl = readFileSync('scripts/marketing/kit/v4/templates.mjs', 'utf8')
    expect(tpl).toContain("lum(c) < .18 ? '#FFFBF2'") // a black club (Partizan) gets white, never a default red
  })
  it('the desk input refuses what it does not know', () => {
    expect(() => inputFrom({template: 'nope', start: '2026-12-01'})).toThrow()
    expect(() => inputFrom({template: 'club-days', start: 'tomorrow'})).toThrow()
    const i = inputFrom({template: 'club-days', start: '2026-12-01', clubs: ['celtic', 'not-a-club'], days: 99})
    expect(i.clubs).toEqual(['celtic']); expect(i.days).toBe(31); expect(i.id).toMatch(/^club-days-celtic-20261201-/)
  })
  it('links carry the campaign', () => { expect(track('/shop?club=celtic', 'x-1')).toBe('https://fanlife.dubelteam.com/shop?club=celtic&utm_source=social&utm_campaign=x-1') })
})
