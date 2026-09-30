import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DEFAULT_IDENTITY } from '@/lib/life/content/chapter1986'
import { apply, emptyState } from '@/lib/life/events'
import type { LifeEvent } from '@/lib/life/events'

/**
 * דגל שנקרא אחרי חצות — the bug class that hides as dead content.
 *
 * `personFlags()` in `events.ts` empties the save at every `day.entered` and
 * `year.entered` except for a named handful of prefixes. That is correct and deliberate:
 * the errand, the homework and the hour you were told to be home are not a life.
 *
 * What it costs is invisible. A chapter that writes `g4:bus` on Wednesday and reads it on
 * Thursday to choose its ENDING does not crash, does not warn, and does not fail a
 * suite — it silently collapses onto whichever ending has no condition, and the other
 * three become text nobody will ever see. On 15.9.2026 a simulation of 200 playthroughs
 * per chapter found exactly that: `1993-galil` produced `heard` 200 times out of 200
 * with three endings written and unreachable, and `1998-laces` lost one of six.
 *
 * Statically the graph looked fine, which is why nothing caught it: the defect is in
 * TIME, not in the graph. This test is the time check.
 */

const CONTENT = join(process.cwd(), 'lib/life/content')

/** The prefixes a day change does not erase. Read from the source, never retyped. */
const SURVIVING = (() => {
  const source = readFileSync(join(process.cwd(), 'lib/life/events.ts'), 'utf8')
  const block = source.slice(source.indexOf('function personFlags'))
  const found = [...block.slice(0, block.indexOf('return kept')).matchAll(/startsWith\('([^']+)'\)/g)]
  return found.map((m) => m[1] as string)
})()

function survives(flag: string): boolean {
  return SURVIVING.some((prefix) => flag.startsWith(prefix))
}

describe('דגלים ששורדים מעבר יום', () => {
  it('קורא את רשימת הקידומות מהמנוע עצמו, לא מעותק', () => {
    // If this list is ever retyped here, the test starts agreeing with itself.
    expect(SURVIVING.length).toBeGreaterThanOrEqual(8)
    expect(SURVIVING).toContain('own:')
    expect(SURVIVING).toContain('went:')
    expect(SURVIVING).toContain('life:')
  })

  it('מוכיח על המנוע שמעבר יום באמת מוחק דגל בלי קידומת', () => {
    // The premise, proven rather than assumed.
    let state = emptyState(DEFAULT_IDENTITY, 1993)
    state = apply(state, { t: 'flag.raised', flag: 'g4:example' } as LifeEvent)
    state = apply(state, { t: 'flag.raised', flag: 'went:example' } as LifeEvent)
    expect(state.flags['g4:example']).toBe(true)

    state = apply(state, {
      t: 'day.entered',
      dayId: 'x',
      year: 1993,
      weekday: 4,
      minute: 600,
    } as LifeEvent)

    expect(state.flags['g4:example'], 'a day should have erased this').toBeFalsy()
    expect(state.flags['went:example'], 'went: is one of the surviving prefixes').toBe(true)
  })

  it('שום סיום בפרק רב־יומי לא נשען על דגל שהיום מוחק', () => {
    const offenders: string[] = []

    for (const name of readdirSync(CONTENT)) {
      if (!name.startsWith('chapter') || !name.endsWith('.ts')) continue
      const text = readFileSync(join(CONTENT, name), 'utf8')

      // Only chapters that actually cross a day boundary can suffer from this.
      if (!text.includes('DAY(')) continue

      for (const line of text.split('\n')) {
        // The shape at risk is a line that decides an ending and TESTS a flag to do it.
        // Writing a flag beside an ending (`{ e: 'flag' }, { e: 'ending' }`) is fine and
        // common — 1996-army does it on every branch — so only `when:` clauses count.
        if (!line.includes("e: 'ending'")) continue
        for (const clause of line.matchAll(/when:\s*\{([^}]*)\}/g)) {
          for (const match of (clause[1] as string).matchAll(/flag:\s*'([^']+)'/g)) {
            const flag = match[1] as string
            // `<something>:done` guards are written and read inside the same beat — they
            // mark "this ending already fired", never "what happened yesterday".
            if (flag.endsWith(':done')) continue
            if (!survives(flag)) offenders.push(`${name}: ending tests '${flag}'`)
          }
        }
      }
    }

    expect(
      offenders,
      `these endings are unreachable — a day change erases the flag they test:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
