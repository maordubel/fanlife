/**
 * מה מהתסריט כבר יש לו בית במנוע, ומה עוד לא — במספרים (20.9.2026).
 *
 *   npx tsx scripts/life/screenplay-map-2026-09-20.ts     (npm run life:screenplay-map)
 *
 * הפרסר קרא 114 סצנות ו-345 בחירות בלי לפרש אף אחת מהן. זה המעבר השני: להריץ את
 * טבלאות ההכרעה של `mapping.ts` על כל בחירה ולספור — כמה אפקטים כבר מתורגמים, כמה
 * ממתינים לעבודה, ומי בדיוק. **הדוח הוא רשימת העבודה של החיבור**, והוא נמדד ולא נזכר.
 */
import scenes from '../../lib/life/content/screenplay/scenes.json'
import {
  AUDIENCE_OF,
  ACHIEVEMENT_OF,
  CHARACTER_OF,
  NAME_COLLISION,
  NEEDS_A_HOME,
  PEOPLE_WITHOUT_A_ROW,
  PRESENCE_INHERIT,
  PRESENCE_OF,
  ROLE_NOT_PERSON,
  SKILL_OF,
} from '../../lib/life/content/screenplay/mapping'

type Row = { where: string; key: string; detail: string }

const mapped = new Map<string, number>()
const waiting = new Map<string, number>()
const rows: Row[] = []
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1)

/** the segments that translate today, each to something the engine already folds */
const DIRECT: Readonly<Record<string, string>> = {
  זיכרון: "{ e: 'remember' }",
  'מצב סיפורי': "{ e: 'flagValue' }",
  קשרים: "{ e: 'rel', axis: 'bond' | 'trust' }",
  עלויות: "{ e: 'time' } · { e: 'energy' } · { e: 'money' }",
  'הוכחת ביצוע': "{ e: 'proof' }",
  מיומנויות: "{ e: 'skill' }",
  פריט: "{ e: 'give' }",
  נוכחות: 'presence.recorded',
  אנרגיה: "{ e: 'energy' }",
  'אמון קהילה': "{ e: 'proof', audience } — ארבעה קהלים",
  הישג: "שורה ב-`achievements.ts` — `ACHIEVEMENT_OF`",
}

for (const scene of scenes) {
  for (const choice of scene.choices) {
    for (const effect of choice.effects) {
      const key = effect.key
      const value = effect.value as unknown

      if (key === 'מיומנויות' && value && typeof value === 'object') {
        for (const name of Object.keys(value)) {
          if (SKILL_OF[name]) bump(mapped, 'מיומנויות')
          else {
            bump(waiting, 'מיומנויות')
            rows.push({ where: choice.id, key, detail: `כישור לא ממופה: ${name}` })
          }
        }
        continue
      }

      if (key === 'אמון קהילה' && value && typeof value === 'object') {
        for (const name of Object.keys(value)) {
          if (AUDIENCE_OF[name]) bump(mapped, 'אמון קהילה')
          else {
            bump(waiting, 'אמון קהילה')
            rows.push({ where: choice.id, key, detail: `קהל לא ממופה: ${name}` })
          }
        }
        continue
      }

      if (key === 'קשרים' && value && typeof value === 'object') {
        for (const name of Object.keys(value)) {
          if (CHARACTER_OF[name]) bump(mapped, 'קשרים')
          else if (ROLE_NOT_PERSON.includes(name)) {
            bump(waiting, 'קשרים')
            rows.push({ where: choice.id, key, detail: `תפקיד שנפתר בריצה: ${name}` })
          } else {
            bump(waiting, 'קשרים')
            const clash = NAME_COLLISION[name]
            const known = PEOPLE_WITHOUT_A_ROW.includes(name)
            rows.push({
              where: choice.id,
              key,
              detail: clash ? `התנגשות שם — ${name}: ${clash}` : `${known ? 'חסרה שורה ברישום' : 'שם שלא נצפה'}: ${name}`,
            })
          }
        }
        continue
      }

      /**
       * הישג — ממופה ל-`ACHIEVEMENT_OF`, ושם שאין לו שורה **מדווח בשמו**.
       *
       * זה נשאר ב-`ממתין` עד 21.9.2026 כ"שבעה הישגים חדשים", ועכשיו יש שש שורות
       * ב-`achievements.ts`. השביעי לא נעלם — הוא `keys_in_hand` שמופיע פעמיים,
       * וזו הסיבה שהמיפוי הוא טבלה ולא ספירה.
       */
      if (key === 'הישג') {
        if (typeof value === 'string' && ACHIEVEMENT_OF[value]) bump(mapped, 'הישג')
        else {
          bump(waiting, 'הישג')
          rows.push({ where: choice.id, key, detail: `הישג בלי שורה ב-achievements.ts: ${String(value)}` })
        }
        continue
      }

      if (key === 'נוכחות') {
        if (typeof value === 'string' && (PRESENCE_OF[value] || value === PRESENCE_INHERIT)) bump(mapped, 'נוכחות')
        else {
          bump(waiting, 'נוכחות')
          rows.push({ where: choice.id, key, detail: `מצב נוכחות לא ממופה: ${String(value)}` })
        }
        continue
      }

      if (DIRECT[key]) {
        bump(mapped, key)
        continue
      }

      bump(waiting, key)
      rows.push({ where: choice.id, key, detail: NEEDS_A_HOME[key] ?? 'מקטע שאין לו שורה ב-NEEDS_A_HOME' })
    }
  }
}

const total = [...mapped.values()].reduce((a, b) => a + b, 0) + [...waiting.values()].reduce((a, b) => a + b, 0)
const done = [...mapped.values()].reduce((a, b) => a + b, 0)

console.log('')
console.log(`=== אפקטים בתסריט: ${total} · יש להם בית: ${done} (${Math.round((done / total) * 100)}%) ===`)
console.log('')
console.log('=== מתורגם היום ===')
for (const [key, n] of [...mapped.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${key.padEnd(16)} → ${DIRECT[key] ?? '—'}`)
}
console.log('')
console.log('=== ממתין לעבודה ===')
for (const [key, n] of [...waiting.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${key.padEnd(16)} ${NEEDS_A_HOME[key] ?? ''}`)
}

const byDetail = new Map<string, number>()
for (const row of rows) byDetail.set(row.detail, (byDetail.get(row.detail) ?? 0) + 1)
console.log('')
console.log('=== מה בדיוק חסר ===')
for (const [detail, n] of [...byDetail.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${detail}`)

const unlisted = rows.filter((row) => row.detail === 'מקטע שאין לו שורה ב-NEEDS_A_HOME')
console.log('')
if (unlisted.length > 0) {
  console.log(`FAIL — ${unlisted.length} מקטעים שאינם ממופים ואינם רשומים כעבודה`)
  for (const row of unlisted.slice(0, 10)) console.log(`  [${row.where}] ${row.key}`)
  process.exit(1)
}
console.log('PASS — כל מקטע בתסריט או מתורגם, או רשום בשמו כעבודה')
