import {describe, expect, it} from 'vitest'
import {resumeLine} from '@/lib/life/hood/resume'
import {hoodWord} from '@/lib/life/hood/words'
import {storyWord} from '@/lib/life/hood/story'

describe('LIFE · coming back (lib/life/hood/resume.ts)', () => {
  it('opens on the last thing he kept, before anybody or any list', () => {
    expect(resumeLine({keeps: ['scarf', 'shirt'], giver: 'dad'})).toEqual({key: 'hood.resume.keep', thing: 'story.keep.shirt'})
  })
  it('opens on whoever is waiting when he has kept nothing yet, and says nothing when nobody is', () => {
    expect(resumeLine({keeps: [], giver: 'kiosk'})).toEqual({key: 'hood.resume.wait', who: 'kiosk'})
    expect(resumeLine({keeps: [], giver: null})).toBeNull()
  })
  it('has the words, and they read as a sentence', () => {
    const thing = storyWord('story.keep.scarf', {})
    expect(thing).not.toBe('story.keep.scarf')
    expect(hoodWord('hood.resume.keep', {thing: thing.charAt(0).toLowerCase() + thing.slice(1)})).toBe('You still have the first scarf.')
    expect(hoodWord('hood.resume.wait', {who: 'Dad'})).toBe('Dad is waiting.')
  })
})
