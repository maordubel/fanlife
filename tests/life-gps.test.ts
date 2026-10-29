/**
 * LIFE · the GPS (lib/life/universal/gps.ts): the job's light is always on something he can reach, and following it
 * gets him there. Nobody plays a Season One episode wondering which door the job is behind.
 */
import {describe, expect, it} from 'vitest'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'
import {apply, emptyState, meets, openChapter} from '@/lib/life/universal/engine'
import {goalOf, wayTo} from '@/lib/life/universal/gps'
import {sceneOf} from '@/lib/life/universal/world'
import type {LifeState} from '@/lib/life/universal/types'

const packOf = async (id: string) => clubLife((await loadClub(id))!.data, {locale: 'en'})

describe('the GPS', {timeout: 120000}, () => {
  it('every Season One job names where it is done — a person, a thing, or a room to walk into', async () => {
    const pack = await packOf('hapoel-tel-aviv')
    for (const ch of pack.chapters.filter(c => c.episode)) {
      const enters = new Set(ch.beats.map(b => b.id))
      for (const o of ch.objectives) expect(!!o.at || enters.has(o.id), `${ch.id}.${o.id}`).toBe(true)
    }
  })

  for (const club of ['hapoel-tel-aviv', 'celtic', 'aek-athens']) it(`${club}: from the first room of every episode the light leads to the job`, async () => {
    const pack = await packOf(club)
    for (const ch of pack.chapters.filter(c => c.episode)) {
      let st: LifeState = openChapter(ch).reduce(apply, emptyState())
      const job = ch.objectives.find(o => !meets(st, o.done))!
      expect(job, ch.id).toBeTruthy()
      // walk the light, door by door, until the light stands in the job's room
      for (let hop = 0; hop < 8 && st.room !== job.room; hop++) {
        const g = goalOf(ch, st, sceneOf(pack, ch, st, st.room!))
        expect(g, `${ch.id} in ${st.room}`).not.toBeNull()
        expect(g!.kind, `${ch.id} in ${st.room}`).toBe('exit')
        const door = ch.doors.find(d => d.id === g!.id)!
        expect(meets(st, door.needs), `${ch.id}: the light never stands on a locked door`).toBe(true)
        st = apply(st, {t: 'moved', room: door.to, spawn: door.spawn, time: st.time})
      }
      const g = goalOf(ch, st, sceneOf(pack, ch, st, st.room!))
      if (g) { expect(g.here).toBe(true); expect(g.room).toBe(st.room) }
    }
  })

  it('no way through open doors means no light, never a wrong one', async () => {
    const pack = await packOf('hapoel-tel-aviv')
    const ch = pack.chapters.find(c => c.id === 'S1E1')!
    const st = openChapter(ch).reduce(apply, emptyState())
    expect(wayTo(ch, st, st.room!, 'nowhere-at-all')).toBeNull()
  })
})
