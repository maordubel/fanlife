/**
 * הדגלים שהמנוע מרים ואף קובץ תוכן אינו מצהיר עליהם — נסרקים מהמקור.
 *
 * הוצא מ-`worldline-audit.ts` ב-21.9.2026 כדי שגם `tests/life-worldline.test.ts` יסגור
 * את הפרקים עם אותה רשימה בדיוק. בלעדיה הבדיקה דיווחה על היציע של 1986 כחדר בלי יציאה,
 * כי `found:kobi` עולה רק אחרי `match:over` — דגל שהמנוע כותב. שני מקורות לאותו מושג
 * הם מה שכלל 59 אוסר, ולכן יש פונקציה אחת.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { engineOnly } from '../../lib/life/world/worldline'

/** כל דגל שמישהו במקור מרים — תוכן ומנוע יחד */
export function raisedInSource(root = process.cwd()): Set<string> {
  const SOURCE_DIRS = [
    'lib/life',
    'lib/life/content',
    'lib/life/runtime',
    'lib/life/runtime/scenes',
    'lib/life/world',
    'components/life',
    'app/life',
  ]

  const RAISED_IN_SOURCE = new Set<string>()
  {
    const named = new Map<string, string>()
    const sources: string[] = []
    for (const dir of SOURCE_DIRS) {
      let files: string[] = []
      try {
        files = readdirSync(join(root, dir)).filter((file) => /\.tsx?$/.test(file))
      } catch {
        continue
      }
      for (const file of files) sources.push(readFileSync(join(root, dir, file), 'utf8'))
    }
    for (const source of sources) {
      for (const m of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*'([a-z][\w-]*:[\w:-]+)'/g)) {
        if (m[1] && m[2]) named.set(m[1], m[2])
      }
    }
    for (const source of sources) {
      for (const m of source.matchAll(/flag\.raised',\s*flag:\s*'([^']+)'/g)) if (m[1]) RAISED_IN_SOURCE.add(m[1])
      // a VALUE written by a played board or a chore (`t: 'flag.set'`) is a write as much as a raise
      for (const m of source.matchAll(/flag\.set',\s*flag:\s*'([^']+)'/g)) if (m[1]) RAISED_IN_SOURCE.add(m[1])
      for (const m of source.matchAll(/t:\s*'flag\.raised',\s*flag:\s*`([^`$]+)`/g)) if (m[1]) RAISED_IN_SOURCE.add(m[1])
      for (const m of source.matchAll(/raise\('([^']+)'\)/g)) if (m[1]) RAISED_IN_SOURCE.add(m[1])
      for (const m of source.matchAll(/e:\s*'flag',\s*flag:\s*'([^']+)'/g)) if (m[1]) RAISED_IN_SOURCE.add(m[1])
      for (const m of source.matchAll(/flag:\s*([A-Za-z_$][\w$]*)\s*[,}]/g)) {
        const value = m[1] ? named.get(m[1]) : undefined
        if (value) RAISED_IN_SOURCE.add(value)
      }
    }
  }

  return RAISED_IN_SOURCE
}

/**
 * ומה מזה נשאר אחרי שמורידים כל דגל שקובץ תוכן מרים — זה מה שהמנוע כותב בעצמו, וזה מה
 * שהסגור רשאי להתייחס אליו כמסופק. ההפרש הוא מה ששומר על `life:knows:hall` בחוץ.
 */
export function engineFlagsFromSource(root = process.cwd()): Set<string> {
  return engineOnly(raisedInSource(root))
}
