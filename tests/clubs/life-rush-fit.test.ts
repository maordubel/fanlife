/**
 * LIFE · RUSH — every mission, fitted to every core club through its own approved archive.
 *
 * There is no pilot club. What this holds: every club has a life to play (missions that need no
 * record always play), every bound night is one of the club's own approved rows printed as recorded,
 * every held mission says what research would open it, and the matrix is the same on every run.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {lifeAnchors} from '@/lib/clubs/life/pack'
import {rushView} from '@/lib/clubs/life/rush'
import {fitClub, playable, specFor} from '@/lib/life/rush/fit'
import {templateById} from '@/lib/life/rush/templates'

describe('every core club, every mission', () => {
  it('fits through the club\'s own archive, with no pilot', async () => {
    const matrix: string[] = []
    for (const id of CORE_CLUB_IDS) {
      const data = (await loadClub(id))!.data
      const view = rushView(data)
      const fits = fitClub(view)
      expect(fitClub(view), id).toEqual(fits)

      // a life to play, whatever the archive holds
      expect(fits.filter(playable).length, id).toBeGreaterThanOrEqual(3)
      expect(fits.find(f => f.template === 'kickoff-run')!.state, id).not.toBe('HELD')

      const own = new Map(lifeAnchors(data).map(a => [a.factId, a]))
      for (const f of fits) {
        if (f.anchor) {
          // the night is the club's own approved row, untouched
          expect(own.get(f.anchor.factId), `${id} ${f.template}`).toEqual(f.anchor)
          const t = templateById(f.template)!
          const spec = specFor(t, f, view, {seed: 1, skin: id, age: t.ages[0], mandatory: false, time: 'day'})
          const printed = f.anchor.precision === 'day' ? f.anchor.on! : String(f.anchor.year)
          expect(spec.title, `${id} ${f.template}`).toContain(printed)
        }
        if (f.state === 'HELD') expect(f.research.some(r => r.grade === 'critical'), `${id} ${f.template}`).toBe(true)
        if (f.state === 'IRRELEVANT') expect(f.research, `${id} ${f.template}`).toEqual([])
      }
      matrix.push(`${id.padEnd(20)} ${fits.map(f => `${f.template}:${f.state[0]}`).join(' ')}`)
    }
    console.log(`RUSH fit matrix (R ready · N neutral · H held · I irrelevant)\n${matrix.join('\n')}`)
  }, 300_000)
})
