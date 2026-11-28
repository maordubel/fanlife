import {describe, expect, it} from 'vitest'
import {echoFor, momentAt, momentEffect, momentFlag, momentOf, MOMENTS} from '@/lib/life/hood/story/moments'
import {advance, choose, scriptKeys, talkScript} from '@/lib/life/hood/talk'
import {missionById, storyWord} from '@/lib/life/hood/story'
import {newLife} from '@/lib/life/hood/story/director'
import {applyEffect, newPlay, storyLevel} from '@/lib/life/hood/story/play'
import {hoodLevel} from '@/lib/life/hood/level'
import {startHood} from '@/lib/life/hood/run'
import {loadClub} from '@/lib/clubs/resolver'
import {clubLife} from '@/lib/clubs/life/pack'

const ctx = {job: 'active', giver: 'dad', offerKey: ''} as const

describe('LIFE · the moment (lib/life/hood/story/moments.ts)', () => {
  it('follows a real last line of a real chapter, and is remembered on a later real chapter', () => {
    for (const m of MOMENTS) {
      const mission = missionById(m.mission)
      expect(mission, m.mission).toBeTruthy()
      expect(mission!.converge.do === 'talk' && mission!.converge.say, m.mission).toBe(m.line)
      const later = missionById(m.echo)
      expect(later, m.echo).toBeTruthy()
      expect(later!.age, `${m.echo} comes after ${m.mission}`).toBeGreaterThan(mission!.age)
      expect(momentAt(m.line)).toBe(m)
    }
    expect(new Set(MOMENTS.map(m => m.echo)).size).toBe(MOMENTS.length) // one memory to a card: a film, not a book
  })
  it('has every word, for both gestures, and none of them names a year, a score or a club', () => {
    for (const m of MOMENTS) {
      const who = missionById(m.mission)!.converge
      const s = talkScript(who.do === 'talk' ? who.who : 'dad', m.line, ctx)
      const keys = [...scriptKeys(s), ...m.ids.flatMap(id => [`story.moment.${m.mission}.${id}.after`, `story.moment.${m.mission}.${id}.later`])]
      for (const k of keys.filter(x => x.startsWith('story.moment.'))) {
        const text = storyWord(k, {mate: 'M', kiosk: 'K', neighbour: 'N', name: 'A'})
        expect(text, k).not.toBe(k)
        expect(/\d{4}|\d\s*[-–:]\s*\d/.test(text), k).toBe(false)
      }
    }
  })
  it('plays as the line, then the two gestures, then what is said back; and can be left with neither done', () => {
    const s = talkScript('dad', 'story.s.first-noise.dad', ctx)
    expect(s.nodes[s.start]!.line).toBe('story.s.first-noise.dad')
    const ask = advance(s, s.start).node!
    expect(ask.choices?.map(c => c.key)).toEqual(['story.moment.first-noise.radio', 'story.moment.first-noise.window'])
    const out = choose(s, ask.id, 1)
    expect(out.effect).toBe(momentEffect('first-noise', 'window'))
    expect(out.node?.line).toBe('story.moment.first-noise.window.say')
    expect(advance(s, out.node!.id).node).toBeNull()
    // a line that is no chapter's moment is still one plain line
    expect(Object.keys(talkScript('mate', 'story.s.first-noise.mate', ctx).nodes)).toEqual(['a'])
  })
  it('is remembered once, never scored, and only when the story knows it', async () => {
    const club = await loadClub('olympiacos'), pack = clubLife(club!.data)
    const sl = storyLevel(hoodLevel({id: 'olympiacos', skin: pack.skin, cast: pack.cast}, 1)), run = startHood(sl.level)
    const p0 = newPlay()
    const p1 = applyEffect(run, sl, p0, momentEffect('first-noise', 'radio')).play
    expect(momentOf(p1.state, 'first-noise')).toBe('radio')
    // nothing else moved: no money, no reputation, no bond, nothing kept
    expect({...p1.state, flags: {}}).toEqual({...p0.state, flags: {}})
    expect(Object.keys(p1.state.flags)).toEqual([momentFlag('first-noise')])
    // the second gesture does not rewrite the first
    expect(applyEffect(run, sl, p1, momentEffect('first-noise', 'window')).play).toBe(p1)
    expect(applyEffect(run, sl, p0, 'story:moment:first-noise:fly').play).toBe(p0)
    expect(applyEffect(run, sl, p0, 'story:moment:no-such-chapter:radio').play).toBe(p0)
  }, 120_000)
  it('comes back a chapter later, on that chapter\'s card and no other', () => {
    const st = {...newLife(), flags: {[momentFlag('first-noise')]: 'window'}}
    expect(echoFor(st, 'six-short')).toEqual({mission: 'first-noise', id: 'window'})
    expect(echoFor(st, 'the-way-in')).toBeNull()
    expect(echoFor(newLife(), 'six-short')).toBeNull()
    expect(echoFor(st, null)).toBeNull()
    expect(momentOf({flags: {[momentFlag('first-noise')]: 'garbled'}}, 'first-noise')).toBeNull()
  })
})
