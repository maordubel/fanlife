import {describe, expect, it} from 'vitest'
import {existsSync, readFileSync} from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import {gateArt} from '../../scripts/marketing/kit/live.mjs'

const A = path.join(process.cwd(), 'scripts/marketing/kit/assets')
const GATES = ['xi', 'trivia', 'lineup', 'kit-builder', 'kits', 'memory', 'polls', 'goal', 'royal-rumble', 'blind-cow', 'derby', 'archive', 'timeline', 'life', 'legends']
const PAIRS = [...GATES.map(g => 'gate-' + g), 'moment-goal', 'moment-final', 'moment-away', 'moment-derby', 'moment-kid', 'moment-radio', 'cover-history', 'cover-gates', 'cover-love']
const SINGLE = ['goal', 'swipe', 'new', 'free', 'quiz', 'derby', 'tonight', 'legends', 'wow', 'yours'].map(w => 'sticker-' + w).concat(['tex-newsprint', 'tex-terrace', 'tex-grass'])

async function colours(file: string) {
  const {data, info} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject: true})
  const seen = new Set<string>()
  for (let i = 0; i < data.length; i += info.channels) if (data[i + 3]! > 0) seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`)
  return seen
}

describe('art round 2 (owner, 27.10.2026)', () => {
  it('every file is in the kit, one ink per file: line black, tone grey', async () => {
    for (const n of PAIRS) {
      expect([...await colours(path.join(A, n + '-line.png'))], n).toEqual(['0,0,0'])
      expect([...await colours(path.join(A, n + '-tone.png'))], n).toEqual(['128,128,128'])
    }
    for (const n of SINGLE) expect([...await colours(path.join(A, n + '.png'))], n).toEqual(['0,0,0'])
  }, 120_000)

  it('every gate the plan prints wears its own drawing, not a shared plate', () => {
    const plan = JSON.parse(readFileSync(path.join(process.cwd(), 'scripts/marketing/plan-v3.json'), 'utf8'))
    const names = new Set<string>()
    for (const x of plan) for (const k of x.main.kit?.slides ?? [x.main.kit]) if (k?.t === 'L-GATE') names.add(k.data.name)
    expect(names.size).toBeGreaterThan(10)
    for (const name of names) { const a = gateArt({name}); expect(a, name).toMatch(/^gate-/); expect(existsSync(path.join(A, a + '-line.png'))).toBe(true) }
  })
})
