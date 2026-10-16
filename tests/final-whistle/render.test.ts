import {describe, expect, it} from 'vitest'
import {renderFinalWhistle, FINAL_WHISTLE_FOOTER_DOMAIN} from '@/lib/share/v3/final-whistle'
import {shareClub} from '@/lib/share/v3/theme'
import {auditColours} from '@/lib/share/v3/theme'
import type {FinalResult} from '@/lib/fixtures/types'
import type {ShareAssets} from '@/lib/share/v3/render'

const assets: ShareAssets = {logo: 'data:,', shirt: 'data:,', fontCss: '', art: Object.fromEntries(['archive-objects', 'away-supporters', 'father-child', 'footballer', 'scarf-fan', 'shirt-exchange', 'terrace-crowd', 'vintage-shirt'].map(a => [a, 'data:,'])) as ShareAssets['art']}
const measure = (s: string, n: number) => s.length * n * .5
const base = (o: Partial<FinalResult> = {}): FinalResult => ({
  clubId: 'hapoel-tel-aviv', kickoff: '2026-10-17T16:00:00.000Z', home: 'Hapoel Tel Aviv', away: 'Away Team', homeScore: 2, awayScore: 1, clubSide: 'home',
  opponent: 'Away Team', competition: 'Israeli Premier League', providerEventId: 'E1', dateOnly: false, finalStatus: 'FT',
  regulationScore: {home: 2, away: 1}, afterExtraTimeScore: null, penalties: null, competitionKind: 'league',
  evidence: {source: 'thesportsdb', providerEventId: 'E1', rawStatus: 'Match Finished', status: 'FT', observedAt: '2026-10-17T18:10:00.000Z', providerUpdatedAt: null}, ...o,
})
const draw = (club: string, r: FinalResult, sample = false) => renderFinalWhistle({club, result: {...r, clubId: club}, sample}, {assets, measure})

describe('FINAL WHISTLE card', () => {
  it('prints exactly the main portal address, for every club, never a subdomain', () => {
    for (const club of ['hapoel-tel-aviv', 'panathinaikos', 'aek-athens', 'olympiacos']) {
      const r = draw(club, base())
      expect(r.svg).toContain(`>${FINAL_WHISTLE_FOOTER_DOMAIN}<`)
      expect(FINAL_WHISTLE_FOOTER_DOMAIN).toBe('FanLife.DubelTeam.com')
      expect(r.svg.replace('http://www.w3.org/2000/svg','')).not.toMatch(/https?:\/\//i)
      expect(r.svg).not.toContain(`${shareClub(club)!.sub}.fanlife`)
      expect(r.size).toEqual({w: 1080, h: 1920})
    }
  })
  it('has no warnings and no forbidden colour for three clubs and every outcome', () => {
    const cases: Array<[string, Partial<FinalResult>]> = [
      ['win', {}], ['draw', {homeScore: 1, awayScore: 1}], ['loss', {homeScore: 0, awayScore: 3}],
      ['big', {homeScore: 10, awayScore: 0}], ['nil', {homeScore: 0, awayScore: 0}],
      ['aet', {finalStatus: 'AET', afterExtraTimeScore: {home: 2, away: 1}, regulationScore: null}],
      ['pens', {finalStatus: 'PEN', homeScore: 1, awayScore: 1, penalties: {home: 4, away: 3}, regulationScore: null}],
      ['long', {away: 'Borussia Mönchengladbach'}],
    ]
    for (const club of ['hapoel-tel-aviv', 'panathinaikos', 'aek-athens'])
      for (const [name, o] of cases) {
        const r = draw(club, base(o))
        expect(r.warnings, `${club} ${name}`).toEqual([])
        expect(auditColours(r.svg, shareClub(club)!)).toEqual([])
      }
  })
  it('keeps home left and away right whichever side the club is on, and colours the club’s own score', () => {
    const home = draw('hapoel-tel-aviv', base()).svg, away = draw('hapoel-tel-aviv', base({clubSide: 'away', home: 'Other FC', away: 'Hapoel Tel Aviv', homeScore: 1, awayScore: 2})).svg
    const pos = (svg: string, f: string) => Number(svg.match(new RegExp(`<text x="(\\d+)"[^>]*data-field="${f}"`))![1])
    expect(pos(home, 'score.home')).toBeLessThan(pos(home, 'score.away'))
    expect(pos(away, 'score.home')).toBeLessThan(pos(away, 'score.away'))
    const fill = (svg: string, f: string) => svg.match(new RegExp(`fill="(#[0-9a-f]{6})" text-anchor="middle" data-field="${f}"`, 'i'))![1]
    expect(fill(home, 'score.home')).not.toBe(fill(home, 'score.away'))
    expect(fill(away, 'score.away')).toBe(fill(home, 'score.home'))
  })
  it('only the winning card gets the terrace, and the line never claims points outside a league', () => {
    expect(draw('hapoel-tel-aviv', base()).svg).toContain('THE POINTS ARE OURS.')
    expect(draw('hapoel-tel-aviv', base({competitionKind: 'cup'})).svg).toContain('THIS ONE IS OURS.')
    expect(draw('hapoel-tel-aviv', base({competitionKind: 'cup', homeScore: 1, awayScore: 1})).svg).toContain('LEVEL AT THE WHISTLE.')
    expect(draw('hapoel-tel-aviv', base({homeScore: 1, awayScore: 1})).svg).toContain('SHARED POINTS. SAME LOVE.')
    expect(draw('hapoel-tel-aviv', base({homeScore: 0, awayScore: 1})).svg).toContain('WE GO AGAIN.')
  })
  it('states extra time and the shoot-out kicks, and refuses an undecided shoot-out', () => {
    expect(draw('hapoel-tel-aviv', base({finalStatus: 'AET'})).svg).toContain('AFTER EXTRA TIME')
    expect(draw('hapoel-tel-aviv', base({finalStatus: 'PEN', homeScore: 1, awayScore: 1, penalties: {home: 4, away: 3}})).svg).toContain('PENALTIES 4–3')
    expect(() => draw('hapoel-tel-aviv', base({finalStatus: 'PEN', homeScore: 1, awayScore: 1, penalties: null}))).toThrow()
  })
  it('warns instead of overflowing when a name cannot fit two lines',()=>{
    expect(draw('hapoel-tel-aviv', base({away: 'Borussia Verylong Mönchengladbach Athletic Club Reserves'})).warnings.join()).toContain('team.away')
  })
  it('marks a sample and never prints it on a real card; escapes provider text', () => {
    expect(draw('hapoel-tel-aviv', base(), true).svg).toContain('NOT A REAL RESULT')
    expect(draw('hapoel-tel-aviv', base()).svg).not.toContain('NOT A REAL RESULT')
    expect(draw('hapoel-tel-aviv', base({away: '<script>'})).svg).not.toContain('<script>')
  })
  it('keeps text out of the two bands Instagram keeps for itself', () => {
    const svg = draw('hapoel-tel-aviv', base()).svg
    for (const m of svg.matchAll(/<text x="[\d.]+" y="([\d.]+)"/g)) {
      const y = Number(m[1]); expect(y > 250 && y < 1700 || svg.includes('NOT A REAL RESULT')).toBe(true)
    }
  })
})
