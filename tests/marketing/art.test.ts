import {describe, expect, it} from 'vitest'
import {existsSync, readFileSync, readdirSync} from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
// @ts-expect-error — plain ESM module, no types
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
    const plan = JSON.parse(readFileSync(path.join(process.cwd(), 'scripts/marketing/plan-v4.json'), 'utf8'))
    const names = new Set<string>()
    for (const x of plan) for (const k of x.main.kit?.slides ?? [x.main.kit]) if (k?.t === 'L-GATE') names.add(k.data.name)
    expect(names.size).toBeGreaterThan(10)
    for (const name of names) { const a: string = gateArt({name}); expect(a, name).toMatch(/^gate-/); expect(existsSync(path.join(A, a + '-line.png'))).toBe(true) }
  })
})

describe('art round 2 is used, not just stored (owner, 29.10.2026)', () => {
  it('every gate plate, moment, cover, sticker and texture is drawn by the kit or the plan', () => {
    const src = ['scripts/marketing/kit/live.mjs', 'scripts/marketing/kit/source/templates.mjs', 'scripts/marketing/kit/source/weekly.mjs', 'scripts/marketing/kit/visual.mjs', 'scripts/marketing/plan-v4.json']
      .map(f => readFileSync(f, 'utf8')).join('\n')
    const names = readdirSync('scripts/marketing/kit/assets').filter(f => /^(gate|moment|cover)-.+-line\.png$|^sticker-[a-z]+\.png$|^tex-/.test(f))
      .map(f => f.replace(/-line\.png$|\.png$/, ''))
    // the sticker art is named without its prefix in the kit (c.stick('free', …)) and in the plan (sticker: 'derby')
    const missing = names.filter(n => !src.includes(n) && !src.includes(`'${n.replace(/^(sticker|tex)-/, '')}'`) && !src.includes(`"${n.replace(/^(sticker|tex)-/, '')}"`)
      && !(n.startsWith('gate-') && src.includes('GATE_ART')))
    expect(missing).toEqual([])
    for (const n of names.filter(n => n.startsWith('sticker-'))) expect(existsSync(`scripts/marketing/kit/assets/${n}-fill.png`), n).toBe(true)
  })
})
