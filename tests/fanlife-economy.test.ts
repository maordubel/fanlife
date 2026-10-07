import { execSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { EN } from '@/lib/fanlife/i18n'
import { fanShirts } from '@/lib/fanlife/catalog'
import fanCopy from '@/messages/en.fanlife.json'

/**
 * FAN LIFE's shirt economy is a FORK of The Worker's (scripts/fanlife/fork-economy.py): same
 * components, same database functions, English copy, every club's shirts. These checks keep the fork
 * honest — regenerated, fully English, and inside the database's own slug rule.
 */
const ROOT = join(__dirname, '..')
const walk = (dir: string): string[] => readdirSync(dir).flatMap((e) => { const p = join(dir, e); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : [] })
const FORKS = [...walk(join(ROOT, 'components/fanlife')), ...walk(join(ROOT, 'lib/fanlife'))]
const PAGES = ['app/closet', 'app/market', 'app/auction', 'app/shirts', 'app/master/exchange'].flatMap((d) => walk(join(ROOT, d)))
const HEBREW = /[֐-׿]/

describe('FAN LIFE shirt economy', () => {
  it('the forks are what the script makes from today\'s Worker sources', () => {
    expect(() => execSync('python3 scripts/fanlife/fork-economy.py --check', { cwd: ROOT, stdio: 'pipe' })).not.toThrow()
  })
  it('no fork reaches the Hebrew catalogue', () => {
    const leaks = [...FORKS, ...PAGES].filter((f) => /^import (?!type )[^\n]*from\s*['"]@\/lib\/i18n['"]/m.test(readFileSync(f, 'utf8')))
    expect(leaks.map((f) => f.slice(ROOT.length + 1))).toEqual([])
  })
  it('every literal key a fork asks for has English copy', () => {
    const missing: string[] = []
    for (const f of [...FORKS, ...PAGES]) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*'([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)'/g)) if (!(m[1]! in EN)) missing.push(`${f.slice(ROOT.length + 1)}: ${m[1]}`)
    }
    expect(missing).toEqual([])
  })
  it('the English catalogues hold no Hebrew and no empty message', () => {
    const all = { ...EN, ...fanCopy } as Record<string, string>
    expect(Object.entries(all).filter(([, v]) => HEBREW.test(v) || !v.trim()).map(([k]) => k)).toEqual([])
  })
  it('every shirt in the catalogue is a slug the database accepts, once, with its club in its label', async () => {
    const shirts = await fanShirts()
    expect(shirts.length).toBeGreaterThan(168)
    const slugs = shirts.map((s) => s.slug)
    expect(slugs.filter((s) => !/^[a-z0-9][a-z0-9-]{2,63}$/.test(s))).toEqual([])
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(shirts.filter((s) => !s.variantHe.startsWith(s.clubName))).toEqual([])
    expect(shirts.filter((s) => !s.src && !s.kit)).toEqual([])
  })
})
