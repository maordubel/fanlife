import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs'
import sharp from 'sharp'
import {describe, expect, it} from 'vitest'
import {isYellow} from '@/lib/isYellow'
import {reelBeats, shotFor, shotSrc, SHOTS} from '@/lib/life/universal/reel'

/**
 * The chapter reel stands on stills photographed in the club's own TOWN (public/life/town/shots.js,
 * scripts/life/capture-shots.mjs). Every club with a LIFE has the whole set, each still is small,
 * and Hapoel's decodes with no yellow at all (rule 8, measured on the decoded bytes, rule 61).
 */
const clubs = readdirSync('club-packs').filter(d => existsSync(`club-packs/${d}/core.json`) || existsSync(`club-packs/${d}/life`))
const file = (club: string, shot: string) => `public${shotSrc(club, shot as (typeof SHOTS)[number])}`

describe('chapter reel · shot in the world itself', () => {
  it('walks the day: the scarf at home under the age, then ticket, tunnel and stand, the stand under the title', () => {
    const b = reelBeats({no: 1, of: 9, age: 12, prevAge: 8, title: 'T', kicker: 'K', intro: 'One. Two.', places: ['a', 'b', 'c']})
    let v = 0
    const shots = b.map(x => shotFor(x, x.k === 'voice' ? v++ : 0))
    expect(shots).toEqual(['scarf', 'ticket', 'tunnel', 'stand', 'tunnel', 'stand', 'stand'])
  })

  it('every club with a LIFE has every shot, and each is a light still', () => {
    const missing: string[] = []
    for (const c of clubs) for (const s of SHOTS) {
      const f = file(c, s)
      if (!existsSync(f)) missing.push(f)
      else expect(statSync(f).size, f).toBeLessThan(140_000)
    }
    expect(missing).toEqual([])
  })

  it("Hapoel Tel Aviv's stills decode with no yellow pixel", async () => {
    for (const s of SHOTS) {
      const {data, info} = await sharp(readFileSync(file('hapoel-tel-aviv', s))).removeAlpha().raw().toBuffer({resolveWithObject: true})
      let n = 0
      for (let i = 0; i < info.width * info.height * 3; i += 3) if (isYellow(data[i]!, data[i + 1]!, data[i + 2]!)) n++
      expect(n, s).toBe(0)
    }
  })

  it('the shot page stages only with ?shot= and names its rooms', () => {
    const js = readFileSync('public/life/town/shots.js', 'utf8')
    expect(js).toMatch(/NAME=Q\.get\('shot'\);if\(!NAME\)return;/)
    for (const s of SHOTS) expect(js, s).toContain(`${s}:{room:`)
    expect(readFileSync('public/life/town/play.html', 'utf8')).toContain('/life/town/shots.js')
  })
})
