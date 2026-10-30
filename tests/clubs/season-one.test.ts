/**
 * LIFE · Season One — the childhood and the youth as six episodes. What this suite holds the season to:
 *  · every episode compiles, validates and cannot be got stuck in, for every core club;
 *  · it stands on a club's own night only where the archive holds one of the right kind (home for the first time and
 *    for the fence, away for the away day), and quotes that row as recorded;
 *  · the hooks are there: the phone in the first seconds, an object out of the box for every episode, a flash-forward,
 *    a tease for the next one, secrets in the interviews, and the sealed envelope opened only on the last card.
 */
import {describe, expect, it} from 'vitest'
import {CORE_CLUB_IDS, loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {simulate} from '@/lib/life/universal/sim'
import {validatePack} from '@/lib/life/universal/validate'
import {SEASON_ONE_UNTIL} from '@/lib/life/universal/season'
import type {LifePack} from '@/lib/life/universal/types'

const packs = new Map<string, LifePack>()
async function packOf(id: string) { if (!packs.has(id)) packs.set(id, clubLife((await loadClub(id))!.data)); return packs.get(id)! }
const episodes = (p: LifePack) => p.chapters.filter(c => c.episode)

describe('Season One', () => {
  for (const id of CORE_CLUB_IDS) {
    it(`${id}: six episodes, in order, that validate and cannot be got stuck in`, async () => {
      const pack = await packOf(id)
      expect(validatePack(pack)).toEqual([])
      const eps = episodes(pack)
      expect(eps.map(c => c.episode!.no)).toEqual([1, 2, 3, 4, 5, 6])
      expect(eps.every(c => c.age <= SEASON_ONE_UNTIL)).toBe(true)
      for (const c of eps) {
        const r = simulate(pack, c)
        expect(r.stuck, c.id).toEqual([])
        expect(r.endings.length, c.id).toBeGreaterThan(0)
      }
    }, 300000)
  }

  it('stands on a night only of the right kind, and quotes it as recorded', async () => {
    for (const id of CORE_CLUB_IDS) {
      const pack = await packOf(id)
      for (const c of episodes(pack).filter(x => x.anchor)) {
        expect(c.lives?.length, c.id).toBeGreaterThan(0)
        const us = c.anchor!.match?.us
        // E6 is an away day, E3 and E5 are nights in the ground; E1 is the radio, which carried home and away alike
        if (c.id === 'S1E6') expect(us, `${id} ${c.id}`).toBe('away')
        else if (c.id !== 'S1E1') expect(us, `${id} ${c.id}`).toBe('home')
        if (c.id === 'S1E1') expect(c.lives?.[0]?.at, `${id} E1 is heard, not seen`).toBe('radio')
      }
      // an episode with no night plays no live board
      for (const c of episodes(pack).filter(x => !x.anchor)) expect(c.lives ?? [], c.id).toEqual([])
    }
    const hapoel = await packOf('hapoel-tel-aviv')
    expect(episodes(hapoel).filter(c => c.anchor).map(c => `${c.id}@${c.anchor!.on}`)).toEqual(['S1E1@1984-01-07', 'S1E3@1986-05-24', 'S1E5@1990-05-12', 'S1E6@1992-01-31'])
  }, 300000)

  it('hooks the player from the first second to the last card', async () => {
    const eps = episodes(await packOf('hapoel-tel-aviv'))
    // the first seconds: a phone, 2026, before any title
    expect(eps[0]!.episode!.texts!.length).toBeGreaterThanOrEqual(3)
    expect(eps.slice(1).every(c => !c.episode!.texts)).toBe(true)
    for (const c of eps) {
      const e = c.episode!
      expect(e.box?.item, c.id).toBeTruthy()
      // the flash-forward is a staged scene of this episode, and the card takes us back
      expect(c.cines?.some(x => x.id === e.flash?.cine), c.id).toBe(true)
      expect(e.flash!.card, c.id).toBeTruthy()
      // something in the interviews he did not know then — more than one road holds one
      expect((c.docs ?? []).flatMap(d => d.lines).filter(l => l.secret).length, c.id).toBeGreaterThanOrEqual(2)
    }
    // a question for every next episode; the last one ends on the envelope, and only the last one opens it
    expect(eps.slice(0, -1).every(c => !!c.episode!.tease && !!c.episode!.next)).toBe(true)
    expect(eps.slice(0, -1).every(c => !c.episode!.letter)).toBe(true)
    expect(eps.at(-1)!.episode!.letter!.lines.length).toBeGreaterThan(2)
    expect(eps.at(-1)!.episode!.letter!.after).toMatch(/envelope/i)
  })
})
