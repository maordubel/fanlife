/**
 * יתומים — תוכן שנכתב, עבר טיפוסים, יש לו בדיקות, ואיש לא יכול לפתוח אותו.
 *
 *   npx tsx scripts/life/orphan-audit.ts        (npm run life:orphans)
 *
 * `deadend-audit` הולך **מהחדרים החוצה**: הוא לוקח כל מה שאפשר להגיע אליו ובודק שהוא
 * שלם. זה הכיוון השני, וכלל 78 נכתב עליו — לקחת כל שיחה שקיימת ולשאול אם משהו בעולם
 * נוקב בשמה. שמונה פעולות מסלול, שלושה מבטים כתובים ושלוש שיחות שנכתבו לרגע שמערכת
 * אחרת לקחה — כולם ישבו כאן בלי ששום דבר יאדים.
 *
 * הסריקה מונה שם כ"נקרא" משני סוגי מקורות, ובכוונה ברוחב יתר:
 *
 *   1. **מבנים** — `talk` של שחקן, `act` של נקודה חמה, `goto` בתוך שיחה, פעימות פרק,
 *      הזדמנויות, מפגשים, רקע, תסריטי משחק, נקודות פנורמה וטבלת ההזמנות של המסלולים.
 *   2. **מחרוזות בקוד** — כל מחרוזת בתוך `lib/**` ו-`app/**` שאינה קובץ הגדרת שיחות.
 *      חצי תריסר שיחות נפתחות מתוך ריצה (`dialogue.start('derby:chant')`), ואין דרך
 *      מבנית למצוא אותן. זו הערכת-יתר: שם שמופיע בהערה ייחשב "נקרא", ולכן אין כאן
 *      חיוביות שווא — יש שליליות שווא, וזה בדיוק הצד הבטוח.
 *
 * יתום אחד מותר, בשמו ועם הסיבה, ב-`ALLOWED`. יציאה 1 על כל יתום אחר.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { CHAPTERS } from '../../lib/life/content/chapters'
import { DIALOGUE } from '../../lib/life/content/dialogue'
import { eraFor } from '../../lib/life/content/era'
import { MATCH_SCRIPTS } from '../../lib/life/content/matchScripts'
import { PANO_SPOTS } from '../../lib/life/content/panoramas'
import { OFFER_CONVERSATIONS } from '../../lib/life/routes'
import { ALL_SCENES, exitInEra, inEra } from '../../lib/life/world/scenes'

/**
 * **הרשימה ריקה, והיא נשארת** — 21.9.2026.
 *
 * `route-proof-found` ישב כאן בשמו: חלון ההקמה של הפועל אוסישקין הוא 2007
 * (`FOUNDING_YEAR`), והפרק האחרון שנבנה היה 2000, כך שלהניח אותה בחדר היה אומר
 * שאפשר לייסד מועדון בשנת 2000 — טענה על העולם האמיתי. ההערה שעמדה כאן אמרה
 * *"היום שייכתב פרק 2007 מוריד את השורה הזאת"*, ושלושת פרקי 2007 נכתבו: המשימה
 * מונחת עכשיו פעם אחת בכל אחד מהם, והסריקה מאשרת זאת בעצמה.
 *
 * הרשימה עצמה אינה נמחקת (כלל 73): זה המקום שבו החלטה כזאת תירשם בפעם הבאה, בשם
 * ועם הסיבה. מפה ריקה שאפשר לקרוא בה אומרת "אין היום אף יתום מותר"; מפה שנמחקה
 * אומרת שהכלי לא יכול להיכשל.
 */
const ALLOWED = new Map<string, string>([])

const ids = new Set(Object.keys(DIALOGUE))
const named = new Set<string>()
const say = (id: string | null | undefined) => {
  if (typeof id === 'string' && ids.has(id)) named.add(id)
}

// ---------------------------------------------------------------- 1. the structures
const walk = (value: unknown, keys: readonly string[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, keys)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = value as Record<string, unknown>
  for (const key of keys) say(node[key] as string)
  for (const child of Object.values(node)) walk(child, keys)
}

const POINTERS = ['talk', 'act', 'node', 'conversation', 'dialogue', 'start'] as const

for (const scene of ALL_SCENES) {
  for (const actor of scene.actors) say(actor.talk)
  for (const spot of scene.hotspots) say(spot.act)
}
for (const chapter of CHAPTERS) {
  const era = eraFor(chapter.id)
  walk(era.beats ?? [], POINTERS)
  walk(era.opportunities, POINTERS)
  walk(era.encounters, POINTERS)
  walk(era.ambient, POINTERS)
}
walk(MATCH_SCRIPTS, POINTERS)
walk(Object.values(PANO_SPOTS), POINTERS)
walk(Object.values(DIALOGUE), POINTERS)
for (const stages of Object.values(OFFER_CONVERSATIONS)) for (const id of Object.values(stages)) say(id)

// ------------------------------------------------------------ 2. the string literals
/** the files that DEFINE conversations — naming an id inside its own row proves nothing */
const DEFINES = /^(dialogue|chapter|routes|stagea-days|opportunities|encounters|schedules|ambient|retry|beats|era|panoramas|matchScripts)/

const sources: string[] = []
const sweep = (dir: string): void => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      sweep(path)
      continue
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue
    if (dir.includes('lib/life/content') && DEFINES.test(entry)) continue
    sources.push(readFileSync(path, 'utf8'))
  }
}
sweep('lib')
sweep('app')

const text = sources.join('\n')
for (const id of ids) if (!named.has(id) && text.includes(`'${id}'`)) named.add(id)

// ----------------------------------------------------- 3. things placed where nobody goes
/**
 * ואותה שאלה על חפץ במקום על שיחה — נקודה חמה שנראית עובדת ועומדת בחדר שהפרק שלה אינו
 * נכנס אליו. `gigChapters` בלי `until` הוא הדרך הקלה להגיע לכאן.
 */
/** `travel` הוא דלת — אותה הכרעה של `world/worldline.ts` ושל `tests/life-orphans` */
const travelsIn = (chapter: string): string[] => {
  const out: string[] = []
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) return value.forEach(visit)
    if (!value || typeof value !== 'object') return
    const node = value as Record<string, unknown>
    if (node.a === 'travel' && typeof node.to === 'string') out.push(node.to)
    for (const child of Object.values(node)) visit(child)
  }
  visit(eraFor(chapter).beats ?? [])
  return out
}

const roomsIn = (chapter: string): Set<string> => {
  const start = CHAPTERS.find((row) => row.id === chapter)?.start.location
  const seen = new Set<string>([...(start ? [start] : []), ...travelsIn(chapter)])
  const queue = [...seen]
  while (queue.length) {
    const here = queue.shift()
    const scene = ALL_SCENES.find((row) => row.id === here)
    if (!scene) continue
    for (const exit of scene.exits) {
      if (!exitInEra(exit, chapter) || seen.has(exit.to)) continue
      seen.add(exit.to)
      queue.push(exit.to)
    }
  }
  return seen
}

const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)
const REACHABLE: Record<string, Set<string>> = {}
for (const chapter of PLAYABLE) REACHABLE[chapter.id] = roomsIn(chapter.id)

const stranded: string[] = []
for (const scene of ALL_SCENES) {
  const here = (thing: { era?: unknown }) =>
    PLAYABLE.some((chapter) => Boolean(REACHABLE[chapter.id]?.has(scene.id)) && inEra(thing as never, chapter.id))
  for (const spot of scene.hotspots) if (!here(spot)) stranded.push(`${scene.id}:${spot.id} → ${spot.act}`)
  for (const actor of scene.actors) if (!here(actor)) stranded.push(`${scene.id}:${actor.id} (אדם)`)
}

// ------------------------------------------------------------------------- the report
const orphans = [...ids].filter((id) => !named.has(id)).sort()
const real = orphans.filter((id) => !ALLOWED.has(id))
const excused = orphans.filter((id) => ALLOWED.has(id))

console.log('')
console.log(`=== שיחות (${ids.size}) · נקראות (${named.size}) ===`)
console.log('')
console.log(`=== יתומים (${real.length}) ===`)
for (const id of real) console.log(`  ${id}`)
if (excused.length > 0) {
  console.log('')
  console.log(`=== יתומים בהחלטה (${excused.length}) ===`)
  for (const id of excused) console.log(`  ${id} — ${ALLOWED.get(id)}`)
}
for (const id of ALLOWED.keys()) {
  if (!orphans.includes(id)) console.log(`\n  הערה: ${id} כבר נגיש — אפשר להוריד אותו מ-ALLOWED.`)
}
console.log('')
console.log(`=== עומדים בחדר שאי-אפשר להיכנס אליו (${stranded.length}) ===`)
for (const row of stranded) console.log(`  ${row}`)
console.log('')
if (real.length > 0 || stranded.length > 0) {
  console.log(`FAIL — ${real.length} שיחות ו-${stranded.length} חפצים שאי-אפשר להגיע אליהם (כלל 78)`)
  process.exit(1)
}
console.log(`PASS — every conversation written has something that opens it (${excused.length} by decision)`)
console.log('PASS — every hotspot and person stands in a room its own chapter can enter')
