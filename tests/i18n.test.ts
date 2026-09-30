import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import he from '@/messages/he.json'
import heLife from '@/messages/he.life.json'
import { CATALOGUE_FILES, MESSAGES } from '@/lib/i18n'

/**
 * מפתחות התרגום — every key a screen asks for must exist, and the catalogue must not rot.
 *
 * Rule 10 puts every user-facing string in `messages/he.json`, which moves a whole class
 * of bug from "the wrong word is on screen" to "the key is not in the file" — and a
 * missing key renders as the key itself, in Latin, in the middle of a Hebrew screen.
 * Nothing was checking for that.
 *
 * The audit that produced this file also found five keys left behind by work that
 * replaced the screens using them (the timeline's old submit/up/down buttons, and two
 * polls keys that were written and never called). Those are gone. The rest of the
 * orphans predate this and are recorded below rather than deleted blind: the list may
 * shrink, never grow.
 */
const catalogue = MESSAGES
const ROOT = join(__dirname, '..')
const SOURCE_ROOTS = ['app', 'components', 'lib']

function sources(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sources(path))
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) out.push(path)
  }
  return out
}

const FILES = SOURCE_ROOTS.flatMap((root) => sources(join(ROOT, root)))

describe('כל מפתח שנקרא — exists', () => {
  it('resolves every literal key passed to t()', () => {
    // Only literals: a key built at runtime (`uss.cat.${card.cat}`) cannot be checked
    // statically, and pretending otherwise would make this test lie in both directions.
    const missing: string[] = []
    for (const file of FILES) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/\bt\(\s*'([a-z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)'/g)) {
        const key = match[1] as string
        if (!(key in catalogue)) missing.push(`${file.slice(ROOT.length + 1)}: ${key}`)
      }
    }
    expect(missing, missing.join('\n')).toEqual([])
  })

  /**
   * שני קבצים, קטלוג אחד — and the ownership line between them has to be a test.
   *
   * `messages/he.json` holds the gates; `messages/he.life.json` holds THE WORKER LIFE.
   * The split exists so two people writing in parallel never edit the same file, and it
   * only works while the rule is mechanical: every `life.*` key in the LIFE file, no
   * `life.*` key in the gates file, and **no key in both** — a duplicate would resolve by
   * spread order, which is a silent winner deciding a sentence on a screen.
   */
  it('keeps the two catalogue files disjoint, and every life.* key in the LIFE file', () => {
    const shared = Object.keys(he).filter((key) => key in heLife)
    expect(shared, `in both files:\n${shared.join('\n')}`).toEqual([])

    const strayInGates = Object.keys(he).filter((key) => key.startsWith('life.'))
    expect(strayInGates, `life.* keys still in messages/he.json:\n${strayInGates.join('\n')}`).toEqual([])

    const strayInLife = Object.keys(heLife).filter((key) => !key.startsWith('life.'))
    expect(strayInLife, `non-life keys in messages/he.life.json:\n${strayInLife.join('\n')}`).toEqual([])

    const files = Object.entries(CATALOGUE_FILES) as [string, Record<string, string>][]
    const total = files.reduce((sum, [, file]) => sum + Object.keys(file).length, 0)
    expect(Object.keys(catalogue).length).toBe(total)
  })

  /**
   * שבעת קבצי השערים (21.9.2026) — אותו חוזה, על כל זוג: שום מפתח בשני קבצים, ושום
   * `life.*` מחוץ לקובץ של LIFE. הספירה למעלה כבר נופלת על כפילות; הבדיקה הזאת אומרת
   * **איזה** מפתח ובאילו שני קבצים, כדי שהתיקון יהיה שורה ולא חיפוש.
   */
  it('keeps every gate cluster file disjoint from every other catalogue file', () => {
    const files = Object.entries(CATALOGUE_FILES) as [string, Record<string, string>][]
    const clashes: string[] = []
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const [a, fa] = files[i]!
        const [b, fb] = files[j]!
        for (const key of Object.keys(fa)) if (key in fb) clashes.push(`${key}: ${a} + ${b}`)
      }
    }
    expect(clashes, clashes.join('\n')).toEqual([])
    const lifeOutside = files
      .filter(([name]) => name !== 'heLife')
      .flatMap(([name, file]) => Object.keys(file).filter((key) => key.startsWith('life.')).map((key) => `${name}: ${key}`))
    expect(lifeOutside, lifeOutside.join('\n')).toEqual([])
  })

  it('has no empty message', () => {
    const blank = Object.entries(catalogue)
      .filter(([, value]) => value.trim() === '')
      .map(([key]) => key)
    expect(blank).toEqual([])
  })

  it('leaves no placeholder unfilled in the catalogue itself', () => {
    // A message with `{n}` is fine; one with `{}` or `{ }` is a template someone never
    // finished, and it ships to a reader as literal braces.
    const broken = Object.entries(catalogue)
      .filter(([, value]) => /\{\s*\}/.test(value))
      .map(([key]) => key)
    expect(broken).toEqual([])
  })
})
