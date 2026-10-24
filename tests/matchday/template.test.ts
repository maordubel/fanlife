import {readFileSync} from 'node:fs'
import sharp from 'sharp'
import {describe, expect, it} from 'vitest'
// @ts-expect-error plain ESM module without types
import {hasCrest, renderSvg, validate} from '../../scripts/matchday/template.mjs'

const sample = JSON.parse(readFileSync('tests/fixtures/matchday/sample.json', 'utf8'))
const none = JSON.parse(readFileSync('tests/fixtures/matchday/no-games.json', 'utf8'))

describe('the kit template', () => {
  it('draws story and post at the exact print sizes', async () => {
    for (const [format, w, h] of [['story', 1080, 1920], ['post', 1080, 1350]] as const) {
      const png = await sharp(Buffer.from(renderSvg(validate(sample), format, 0)), {density: 72}).png().toBuffer()
      const m = await sharp(png).metadata()
      expect([m.width, m.height]).toEqual([w, h])
    }
  })
  it('draws a no-games day when coverage is complete', () => { expect(() => renderSvg(validate(none), 'story', 0)).not.toThrow() })
  it('refuses an unavailable provider, a duplicate id and a fixture outside the day', () => {
    expect(() => validate({...sample, coverage: 'unavailable'})).toThrow(/unavailable/i)
    expect(() => validate({...sample, fixtures: [sample.fixtures[0], sample.fixtures[0]]})).toThrow(/unique/i)
    expect(() => validate({...sample, fixtures: [{...sample.fixtures[0], kickoff: '2099-10-26T14:00:00Z'}]})).toThrow(/outside/i)
  })
  it('real fixtures need source evidence', () => { expect(() => validate({...sample, sample: false})).toThrow(/source/i) })
  it('knows which crests exist', () => { expect(hasCrest('celtic')).toBe(true); expect(hasCrest('no-such-club')).toBe(false); expect(hasCrest('../etc')).toBe(false) })
})
