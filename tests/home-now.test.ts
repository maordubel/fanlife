import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * The home "now" layer (ONE RED WORLD §55) — above the wall, never instead of it.
 * Source-level guards, because what they protect is an ORDER on the page and a set of
 * imports, and both are statements about the file.
 */
const ROOT = join(__dirname, '..')
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the ground keeps its wall', () => {
  const page = code(read('app/ground/page.tsx'))

  it('the opening, then the now layer, then the gate wall — all three rendered', () => {
    const intro = page.indexOf('<Intro />')
    const now = page.indexOf('<NowLayer')
    const wall = page.indexOf('id="gates"')
    expect(intro).toBeGreaterThan(-1)
    expect(now).toBeGreaterThan(intro)
    expect(wall).toBeGreaterThan(now)
    expect(page).toContain('wallOrder(GATES)')
    expect(page).toContain('<TunnelPlate />')
  })

  it('"כל השערים" points at the wall that is actually on the page', () => {
    expect(code(read('components/home/NowLayer.tsx'))).toContain('href="#gates"')
  })

  it('resolves the daily for the date it is in Israel, never the UTC date', () => {
    expect(page).toContain('todayInIsrael(')
    expect(page).not.toMatch(/toISOString\(\)\.slice\(0,\s*10\)/)
  })
})

describe('the layer reads the device safely', () => {
  it('reaches LIFE through the save and the map only — no Phaser, no runtime', () => {
    const now = code(read('components/home/NowLayer.tsx'))
    expect(now).not.toMatch(/from '@\/lib\/life\/runtime/)
    expect(now).not.toMatch(/phaser/i)
    // both modules the layer imports from LIFE carry type-only imports
    for (const path of ['lib/life/save.ts', 'lib/life/map.ts']) {
      const imports = read(path).match(/^import .*$/gm) ?? []
      for (const line of imports) expect(line, `${path}: ${line}`).toMatch(/^import type /)
    }
  })

  it('reads storage only after mount, so the server and the first client render agree', () => {
    for (const path of ['components/home/NowLayer.tsx', 'components/home/DailyCard.tsx']) {
      const text = code(read(path))
      expect(text).toContain('useEffect(')
      // no storage read in a state initialiser
      expect(text).not.toMatch(/useState\([^)]*(localStorage|readProfile|readDay|lifeStore)/)
    }
  })

  it('every storage touch in lib/daily is wrapped', () => {
    const text = code(read('lib/daily/progress.ts'))
    const touches = text.match(/window\.localStorage\.[a-zA-Z]+\(/g) ?? []
    const tries = text.match(/try \{/g) ?? []
    expect(touches.length).toBeGreaterThan(0)
    expect(tries.length).toBeGreaterThanOrEqual(3)
  })

  it('the resolver is server-only and the client never builds a gate URL of its own', () => {
    expect(read('lib/daily/resolve.ts')).toMatch(/^import 'server-only'/)
    for (const path of ['components/home/NowLayer.tsx', 'components/home/DailyCard.tsx']) {
      const text = code(read(path))
      expect(text).not.toMatch(/`\/(archive|trivia|polls|goal|lineup|blind-cow|memory|timeline|xi|kits)[?/`]/)
    }
  })
})

describe('events', () => {
  it('uses the three daily names the taxonomy already declared', () => {
    const text = code(read('lib/daily/progress.ts')) + code(read('components/home/DailyCard.tsx'))
    for (const name of ['daily_open', 'daily_item_complete', 'daily_complete']) expect(text).toContain(`'${name}'`)
  })

  it('hears completions at the emit seam, in one line', () => {
    const progress = read('lib/analytics/progress.ts')
    expect(progress.match(/noteDailyProgress\(\)/g)?.length).toBe(1)
  })
})
