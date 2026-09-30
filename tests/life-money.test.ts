/**
 * שקלים — one formatter, whole shekels, and not an agora anywhere the player can read.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { MESSAGES } from '@/lib/i18n'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { ERA_KEYS, eraFor } from '@/lib/life/content/era'
import { describeMoneyChange, formatMoney } from '@/lib/life/money'

describe('formatMoney', () => {
  it('prints whole shekels with the sign after the number', () => {
    expect(formatMoney(1200)).toBe('12 ₪')
    expect(formatMoney(500)).toBe('5 ₪')
    expect(formatMoney(0)).toBe('0 ₪')
    expect(formatMoney(-800)).toBe('8 ₪')
    expect(formatMoney(1250)).toBe('13 ₪')
  })

  it('says received / paid, and nothing for nothing', () => {
    expect(describeMoneyChange(500)).toBe('קיבלת 5 ₪')
    expect(describeMoneyChange(-800)).toBe('שילמת 8 ₪')
    expect(describeMoneyChange(0)).toBeNull()
    expect(describeMoneyChange(20)).toBeNull()
  })
})

describe('the economy is in whole shekels', () => {
  const contentDir = join(process.cwd(), 'lib/life/content')
  const files = readdirSync(contentDir).filter((f) => f.endsWith('.ts'))

  /**
   * ...ומספר עם קו תחתון הוא אותו מספר (21.9.2026).
   *
   * הביטוי קרא `\d+` וקטע את `70_000` אחרי שתי ספרות, כלומר הוא דיווח על **70** —
   * סכום שבאמת אינו כפולה של שקל, ושלא קיים בקוד. זו חיובית שווא, ולא ריכוך: מפריד
   * ספרות הוא תחביר חוקי של JavaScript שמשנה קריאוּת ולא ערך, והשומר ממשיך לבדוק
   * בדיוק את מה שבדק. שורה שבאמת נושאת אגורות בודדות עדיין מפילה אותו.
   */
  it('every amount in the content is a multiple of a shekel', () => {
    for (const file of files) {
      const source = readFileSync(join(contentDir, file), 'utf8')
      for (const m of source.matchAll(/(?:agorot|minAgorot): (-?[\d_]+)/g)) {
        const n = Number(m[1]!.replace(/_/g, ''))
        expect(Number.isFinite(n), `${file}: ${m[0]} is not a number`).toBe(true)
        expect(Math.abs(n % 100), `${file}: ${m[0]}`).toBe(0)
      }
    }
  })

  it('no agora reaches the player — not in a line, a choice, a toast, or a label', () => {
    const texts: string[] = []
    for (const conversation of Object.values(DIALOGUE)) {
      for (const branch of conversation.branches) {
        for (const line of branch.lines) texts.push(line.text)
        for (const choice of branch.choices ?? []) {
          texts.push(choice.text, choice.noteHe ?? '')
          for (const effect of choice.then ?? []) if (effect.e === 'toast') texts.push(effect.text)
        }
        for (const effect of branch.then ?? []) if (effect.e === 'toast') texts.push(effect.text)
      }
    }
    for (const key of ERA_KEYS) {
      for (const beat of eraFor(key).beats ?? []) {
        for (const action of beat.do) {
          if (action.a === 'toast') texts.push(action.text)
          if (action.a === 'lines') for (const line of action.lines) texts.push(line.text)
        }
      }
    }
    for (const text of texts) expect(text).not.toMatch(/אגור/)
    const messages = MESSAGES
    for (const [key, value] of Object.entries(messages)) if (key.startsWith('life.')) expect(value, key).not.toMatch(/אגור/)
    for (const file of ['components/life/LifeHud.tsx', 'components/life/DebugPanel.tsx', 'components/life/Stamp.tsx']) {
      expect(readFileSync(join(process.cwd(), file), 'utf8'), file).not.toMatch(/אגור/)
    }
  })
})
