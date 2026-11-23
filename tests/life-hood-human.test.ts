/**
 * LIFE · the hood — the human layer: a street that notices the player without doing anything for him, lines that carry a
 * feeling, and a stride that covers the ground the feet cover.
 */
import {describe, expect, it} from 'vitest'
import {ambientKeys, ballYours, hoodAmbient, spotAt, stepAmbient} from '@/lib/life/hood/ambient'
import {hoodLevel, type HoodClub} from '@/lib/life/hood/level'
import {feelOf, talkScript} from '@/lib/life/hood/talk'
import {HOOD_WORDS, hoodWord} from '@/lib/life/hood/words'
import {GAIT_SOURCE, gaitPose} from '@/lib/life/motion/gait'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'

async function clubOf(id: string): Promise<HoodClub> {
  const club = await loadClub(id)
  if (!club) throw new Error(`no club ${id}`)
  const pack = clubLife(club.data)
  return {id, skin: pack.skin, cast: pack.cast}
}

describe('the street notices the player', () => {
  it('every voice has words: warm, short, no digits, greetings by the name he typed', async () => {
    const a = hoodAmbient(hoodLevel(await clubOf('olympiacos'), 1))
    for (const k of ambientKeys(a)) {
      const text = hoodWord(k, {name: 'Noa'})
      expect(text, k).not.toBe(k); expect(text.length, k).toBeLessThan(48); expect(/\d/.test(text), k).toBe(false)
    }
    expect(Object.keys(HOOD_WORDS).filter(k => k.startsWith('hood.amb.') && HOOD_WORDS[k]!.includes('{name}')).length).toBeGreaterThan(5)
    expect(hoodAmbient(hoodLevel(await clubOf('olympiacos'), 1), true).spots.length).toBeLessThan(a.spots.length)
  })
  it('somebody greets him when he comes near, once, and not from across the street', async () => {
    const a = hoodAmbient(hoodLevel(await clubOf('celtic'), 3)), s = a.spots.find(q => q.kind === 'balcony')!
    for (let i = 0; i < 120; i++) stepAmbient(a, {x: s.x - 40, z: s.z + 60}, false, 1 / 60)
    expect(a.captions.some(c => c.spot === 'balcony')).toBe(false)
    const said: string[] = []
    for (let i = 0; i < 300; i++) for (const e of stepAmbient(a, {x: s.x - 6, z: s.z}, false, 1 / 60)) if (e.k === 'caption' && e.spot === 'balcony') said.push(e.key)
    expect(said).toEqual(['hood.amb.balcony.1'])
    expect(a.noticed.balcony).toBeDefined()
  })
  it('the ball comes to his feet and goes back only when HE presses beside it (or, left alone, rolls home)', async () => {
    const level = hoodLevel(await clubOf('hapoel-tel-aviv'), 2)
    const a = hoodAmbient(level), k = a.spots.find(q => q.kind === 'kids')!, me = {x: k.x + 3.5, z: k.z + 1}
    let n = 0
    while (a.ball!.state !== 'yours' && n++ < 2400) stepAmbient(a, me, false, 1 / 60)
    expect(a.ball!.state).toBe('yours'); expect(ballYours(a, me)).toBe(true)
    for (let i = 0; i < 120; i++) stepAmbient(a, me, false, 1 / 60)
    expect(a.ball!.state).toBe('yours'); expect(a.ball!.kicks).toBe(0)
    const ev = stepAmbient(a, me, true, 1 / 60)
    expect(ev.some(e => e.k === 'kick')).toBe(true); expect(a.ball!.kicks).toBe(1)
    while (a.ball!.state !== 'play' && n++ < 4800) stepAmbient(a, me, false, 1 / 60)
    expect(a.ball!.state).toBe('play')
    // left alone it goes home by itself: nothing waits on him
    const b = hoodAmbient(level); n = 0
    while (b.ball!.state !== 'yours' && n++ < 2400) stepAmbient(b, me, false, 1 / 60)
    for (let i = 0; i < 60 * 14; i++) stepAmbient(b, me, false, 1 / 60)
    expect(b.ball!.kicks).toBe(0); expect(b.ball!.state).not.toBe('yours')
  })
  it('people who walk to the ground keep walking, inside the street', async () => {
    const level = hoodLevel(await clubOf('olympiacos'), 5), a = hoodAmbient(level), s = a.spots.find(q => q.kind === 'pair')!
    for (const t of [0, 30, 400, 2000]) { const p = spotAt(s, t); expect(p.z).toBeGreaterThanOrEqual(level.goal.z); expect(p.z).toBeLessThanOrEqual(level.bounds.z1) }
    expect(spotAt(s, 10).z).toBeLessThan(spotAt(s, 0).z)
  })
})

describe('lines carry a feeling', () => {
  it('Dad offers with a hand on the shoulder, and the scarf is a beat the picture answers', async () => {
    const level = hoodLevel(await clubOf('olympiacos'), 1), j = level.hood!.jobs[0]!
    const offer = talkScript('dad', j.offerKey, {job: 'idle', giver: j.giver, offerKey: j.offerKey})
    expect(feelOf(offer.nodes[offer.start]!)).toMatchObject({mood: 'warm', gesture: 'shoulder', shot: 'two'})
    const thanks = talkScript('dad', 'hood.say.dad.thanks', {job: 'done', giver: j.giver, offerKey: j.offerKey})
    expect(feelOf(thanks.nodes[thanks.start]!)).toMatchObject({gesture: 'scarfOn', beat: 'scarf', shot: 'close'})
    expect(hoodWord('hood.say.dad.offer', {name: 'Noa', mate: 'Sam'})).toContain('Noa')
    // a line nobody directed is still said warmly; a node's own direction wins
    expect(feelOf({id: 'a', who: 'mate', line: 'x'}).mood).toBe('warm')
    expect(feelOf({id: 'a', who: 'dad', line: j.offerKey, mood: 'laugh'}).mood).toBe('laugh')
  })
})

describe('the captured stride', () => {
  it('is a real stride: the legs alternate, a knee only bends one way, and the run is quicker than the walk', () => {
    expect(GAIT_SOURCE.run.seconds).toBeLessThan(GAIT_SOURCE.walk.seconds)
    for (const run of [0, 1]) for (let i = 0; i < 16; i++) {
      const a = gaitPose(i / 16, run), b = gaitPose(i / 16 + 0.5, run)
      expect(a.kneeL).toBeGreaterThanOrEqual(0); expect(Math.abs(a.hipL - b.hipR)).toBeLessThan(0.35)
    }
  })
})
