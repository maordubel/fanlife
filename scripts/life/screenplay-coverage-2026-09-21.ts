/**
 * האם המילים של התסריט נמצאות במשחק — `npm run life:screenplay-coverage`.
 *
 * הלוגיקה ב-`lib/life/content/screenplay/coverage.ts`; כאן רק הדיסק והדוח. יציאה 1 על
 * כל פער שאינו בשמו ב-`WAITING_SCENES` או ב-`REWORDED_CHOICES`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  REWORDED_CHOICES,
  WAITING_SCENES,
  screenplayGaps,
  type ScreenplayScene,
} from '../../lib/life/content/screenplay/coverage'

const DIR = 'lib/life/content'
const scenes = JSON.parse(readFileSync(join(DIR, 'screenplay/scenes.json'), 'utf8')) as ScreenplayScene[]
const corpus = readdirSync(DIR)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => readFileSync(join(DIR, file), 'utf8'))
  .join('\n')

const gaps = screenplayGaps(scenes, corpus)
const waiting = gaps.filter((gap) => gap.sceneId in WAITING_SCENES)
const reworded = gaps.filter((gap) => gap.kind === 'choice' && gap.choiceId in REWORDED_CHOICES)
const open = gaps.filter((gap) => !waiting.includes(gap) && !reworded.includes(gap))

const lines = scenes.reduce((sum, scene) => sum + scene.openingLines.length, 0)
const choices = scenes.reduce((sum, scene) => sum + scene.choices.length, 0)
console.log(`תסריט: ${scenes.length} סצנות · ${lines} שורות פתיחה · ${choices} בחירות\n`)

console.log('=== מחכות, בשמן ===')
for (const [id, why] of Object.entries(WAITING_SCENES)) {
  console.log(`  ${id.padEnd(5)} ${String(waiting.filter((gap) => gap.sceneId === id).length).padStart(2)} פערים  ${why}`)
}
console.log('\n=== נבנו במילים אחרות, בשמן ===')
for (const [id, why] of Object.entries(REWORDED_CHOICES)) console.log(`  ${id.padEnd(7)} ${why}`)

console.log('\n=== פתוח ===')
for (const gap of open) {
  console.log(gap.kind === 'opening' ? `  ${gap.sceneId.padEnd(7)} שורת פתיחה חסרה — ${gap.who}: ${gap.text}` : `  ${gap.choiceId.padEnd(7)} בחירה שאף שורה שלה אינה במשחק — ${gap.titleHe}`)
}
if (open.length) {
  console.log(`\nFAIL — ${open.length} פערים בין התסריט למשחק`)
  process.exit(1)
}
console.log('  (אין)\n\nPASS — כל שורת פתיחה וכל בחירה בתסריט נמצאות במשחק, או נקובות בשמן')
