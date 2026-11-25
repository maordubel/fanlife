import {describe, expect, it} from 'vitest'
import {heroBody} from '@/lib/life/rush-render/human/age'

describe('the player grows with the story', () => {
  it('a boy to twelve, a teenager to eighteen, a man after, and never shorter a year later', () => {
    expect(heroBody(6).cast).toBe('boy'); expect(heroBody(12).cast).toBe('boy')
    expect(heroBody(13).cast).toBe('teen'); expect(heroBody(18).cast).toBe('teen')
    expect(heroBody(19).cast).toBe('father'); expect(heroBody(48).cast).toBe('father')
    let last = 0
    for (let a = 6; a <= 48; a++) { const b = heroBody(a); expect(b.height, `age ${a}`).toBeGreaterThanOrEqual(last); last = b.height; expect(b.child).toBe(a < 13) }
  })
  it('every height is one the body can stand at (the troupe clamps a child 0.62–1.12 and anyone else 0.9–1.1 of the model)', () => {
    const model = {boy: 1.3718, teen: 1.5363, father: 1.7826}
    for (let a = 6; a <= 48; a++) {
      const b = heroBody(a), k = b.height / model[b.cast]
      expect(k, `age ${a}`).toBeGreaterThanOrEqual(b.child ? 0.62 : 0.9)
      expect(k, `age ${a}`).toBeLessThanOrEqual(b.child ? 1.12 : 1.1)
    }
    expect(heroBody(19).height - heroBody(6).height).toBeGreaterThan(0.5)
  })
})
