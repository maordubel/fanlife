/**
 * The shared engine must not grow new club literals. This is a RATCHET: the baseline is what
 * existed on 29.9.2026 (docs/22-club-agnostic-audit.md §3). A count may go down, never up, and a
 * shared file with no baseline entry may carry none. To retire debt, lower the number.
 * Regenerate deliberately with UPDATE_CLUB_BASELINE=1.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const BASELINE = join(ROOT, 'tests/fixtures/club-literals-baseline.json')
const SHARED = ['lib/game', 'lib/archive', 'lib/canon', 'lib/links', 'lib/away-days', 'lib/daily', 'lib/share', 'lib/analytics', 'lib/voice', 'lib/kit', 'lib/club']
// club identity is DATA (content/clubs) and the ClubContext itself; the two files below hold it
const EXEMPT = new Set(['lib/club/context.ts'])
const LITERAL = /הפועל|Hapoel|hapoel|מכבי תל אביב|is_?[dD]erby|ussishkin|אוסישקין/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`
    const st = statSync(join(ROOT, rel))
    if (st.isDirectory()) walk(rel, out)
    else if (/\.tsx?$/.test(name)) out.push(rel)
  }
  return out
}

function count(): Record<string, number> {
  const result: Record<string, number> = {}
  for (const dir of SHARED) {
    for (const file of walk(dir)) {
      if (EXEMPT.has(file)) continue
      let n = 0
      for (const line of readFileSync(join(ROOT, file), 'utf8').split('\n')) {
        const t = line.trim()
        if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue
        if (LITERAL.test(line)) n += 1
      }
      if (n > 0) result[file] = n
    }
  }
  return result
}

describe('club-agnostic ratchet', () => {
  const now = count()
  if (process.env.UPDATE_CLUB_BASELINE) writeFileSync(BASELINE, JSON.stringify(now, null, 1) + '\n')
  const base = JSON.parse(readFileSync(BASELINE, 'utf8')) as Record<string, number>

  it('no shared file gains a club literal', () => {
    const worse = Object.entries(now).filter(([f, n]) => n > (base[f] ?? 0)).map(([f, n]) => `${f}: ${base[f] ?? 0} → ${n}`)
    expect(worse, 'take the club from ClubContext (lib/club/context.ts) instead of typing it').toEqual([])
  })

  it('the baseline only shrinks (retire a debt, lower its number)', () => {
    const stale = Object.entries(base).filter(([f, n]) => (now[f] ?? 0) < n).map(([f]) => f)
    expect(stale, 'run UPDATE_CLUB_BASELINE=1 npx vitest run tests/club-agnostic.test.ts to record the progress').toEqual([])
  })
})
