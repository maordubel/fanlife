/**
 * איפה זה קורה — ומה שהתברר כשספרנו (20.9.2026).
 *
 *   npx tsx scripts/life/screenplay-places-2026-09-20.ts    (npm run life:places)
 *
 * הרושם הראשון היה ש-114 הסצנות של תסריט ההמשך מבקשות 114 חדרים, וזה היה מבהיל.
 * הספירה אמרה משהו אחר: `מקום` בתסריט הוא **הוראת בימוי**, לא מזהה חדר. הוא מערבב
 * מקום עם רגע — *"אחרי השריקה"*, *"חורף 2009/10"*, *"לפני ואחרי גמר הגביע"* — ולכן
 * 161 אטומים שונים שרובם מופיעים פעם אחת, וארבעה מהם הם פשוט "בית".
 *
 * מה שהתסריט באמת מבקש הוא **מעט חדרים וחמישה עשר רגעים**, ורובם כבר מצוירים. הסקריפט
 * הזה מציע התאמה לכל סצנה, ו**מדווח את השארית** — כי הצעה היא הצעה, והחלטה איפה סצנה
 * מתרחשת היא של בן אדם שמסתכל על ציור (כלל 52: חדר ממוקם בהסתכלות, לא בקריאה).
 *
 * זה לא כלי שמכריע. זה כלי שמצמצם את השאלה מ-114 לכמה עשרות, ואומר אילו.
 */
import { writeFileSync } from 'node:fs'

import scenes from '../../lib/life/content/screenplay/scenes.json'
import { ALL_SCENES } from '../../lib/life/world/scenes'

/**
 * מילות המקום שכבר יש להן חדר. כל שורה היא הצעה, לא קביעה — והיא מתוארת במילים של
 * התסריט עצמו ולא במילים של קובץ הסצנות, כי זה מה שכתוב בסצנה.
 */
const SUGGESTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/החדר של פוגי|חדר השינה/, 'bedroom'],
  // בית קפה קודם לבית — `/בבית/` בלע את "עם רומא **בבית** קפה" ושלח סצנה מ-2010 לסלון
  // של קובי. `allenby` הוא הפינה עם בית הקפה, ו-`eraArt` שלו כבר מחליף ציור לפי עשור.
  [/בית קפה/, 'allenby'],
  [/סלון|הבית|^בית$|בבית|הדרך הביתה/, 'home'],
  [/מטבח|שולחן המטבח/, 'kitchen'],
  [/קיוסק/, 'kiosk'],
  [/הרחוב|ברחוב/, 'street'],
  [/מגרש/, 'pitch'],
  [/אלנבי/, 'allenby'],
  [/בלומפילד/, 'bloomfield-outside'],
  [/אוסישקין/, 'ussishkin-outside'],
  [/כיתה/, 'classroom'],
  [/שער 5|יציע/, 'gate5'],
  [/קופ[הת]|כרטיסים/, 'ticket-office'],
  [/תחנה|רציף|אוטובוס/, 'bus-station'],
  [/רמת גן/, 'ramat-gan'],
  [/התקווה/, 'hatikva'],
]

/**
 * ומה שנשאר מתחלק לשניים, וזה החלק שמרגיע.
 *
 * קריאה של השמונים שנשארו מראה שרובם **אינם חדרים כלל**. *"שיחה פרטית על הורות"*,
 * *"מפגש חזרה אפשרי"*, *"תכנון מוקדם, 2025"* — אלה **רגעים**, והם קורים איפה שהחיים
 * נמצאים. *"הקופסה האדומה"* ו*"אלבום אישי"* הם מערכות שכבר קיימות במשחק, לא מקומות.
 *
 * מה שבאמת צריך ציור הוא מה שנשאר אחרי שמוציאים את שני אלה — והוא **תריסר בערך**,
 * לא 114. זה ההבדל בין משימה שאפשר לעשות לבין מספר שמבהיל.
 */
const A_MOMENT = /שיחה|מפגש|תכנון|הכנה|לקראת|אחרי|לפני|צומת|סבב|חלון|ערב עם|שיחת|סיבוב/
const A_SYSTEM = /הקופסה האדומה|אלבום/

/**
 * ...ושם של מקום אינו שם של ציור, כי **ציור הוא עשור**.
 *
 * מאור הצביע על זה במילה אחת — *"בלומפילד החדש למשל יש לך במאגר!"* — וזו מחלקה שלמה
 * של תקלות, לא שורה אחת. הטבלה למעלה מתאימה לפי **מילה**: "בלומפילד" נופל על
 * `bloomfield-outside`, שהוא הגישה לבלומפילד **של 1986**. לכן R02, שכתוב בה
 * "בלומפילד המחודש, 2019", הייתה מקבלת את הציור של אצטדיון שנהרס. אותו דבר ב"מגרש":
 * `pitch` הוא מגרש האבנים של שלב א׳, וארבע סצנות בין 2000 ל-2016 הצביעו עליו.
 *
 * החדר קיים — הציור הוא מה שצריך להתחלף. לכן זו אינה הצעה אחרת אלא **שדה שני**:
 * `repaint` אומר באיזה רקע להשתמש ולמה, ו-`suggest` נשאר החדר.
 *
 * שלוש המשפחות שנמדדו, וכולן קיימות בתיקייה היום:
 * · בלומפילד — `bloomOld*` (2000–2016), `bloomNew*` (2019+), והקיים הוא 1986
 * · מגרש — `pitchSmall` (מבוקש), והקיים הוא חצר האבנים של בן שמונה
 * · בית — `homeAdult` (מבוקש), והקיים הוא הסלון של קובי
 */
type Repaint = { backdrop: string; whyHe: string }
const REPAINT: ReadonlyArray<readonly [string, (year: number | null) => boolean, Repaint]> = [
  // 21.9.2026 — חובר: `repaints` על `bloomfield-outside` (לוח בלומפילד ב-`world/scenes.ts`)
  ['bloomfield-outside', (y) => y !== null && y >= 2017, { backdrop: 'bloomNewPlaza', whyHe: 'בלומפילד המחודש — ✓ מחובר (`repaints`, רצפה נמדדה); 2016–2018 הדלת נעולה' }],
  // `bloomOldGates` הוא שער 5 (חובר ל-`gate5` בשנות ה-2000); לשער 7 של שנות ה-2000 ולטריבונה אין ציור (§17)
  ['bloomfield-outside', (y) => y !== null && y >= 2000 && y < 2017, { backdrop: 'bloomOldTerrace', whyHe: 'בלומפילד 2000–2016 — שער 5 ✓ (`bloomOldGates`); היציע מבפנים מבוקש (ART-PROMPTS §17א)' }],
  ['pitch', (y) => y === null || y >= 2000, { backdrop: 'pitchSmall', whyHe: 'מגרש של מבוגרים — `pitch` הוא חצר האבנים של 1986 (ציור מבוקש)' }],
  ['home', (y) => y === null || y >= 2000, { backdrop: 'homeAdult', whyHe: 'הבית של פוגי המבוגר — `living`/`kitchen` הם הדירה של קובי ב-1986 (ציור מבוקש)' }],
  ['kitchen', (y) => y === null || y >= 2000, { backdrop: 'homeAdult', whyHe: 'אותה דירה — פינת המטבח של `homeAdult` (ציור מבוקש)' }],
  ['bedroom', (y) => y === null || y >= 2000, { backdrop: 'bedroom00', whyHe: 'החדר של בן 22 — `bedroom`/`bedroom90` הם ילד (ציור מבוקש, אפשר לוותר)' }],
]
/** סצנה שנוקבת בשם הדייר אינה צריכה ציור אחר — A01 היא **סלון קובי**, ככתוב. */
const NAMED_OWNER = /סלון קובי|אצל אבא/
const repaintFor = (room: string | null, year: number | null, place: string): Repaint | null => {
  if (room === null || NAMED_OWNER.test(place)) return null
  const hit = REPAINT.find(([id, when]) => id === room && when(year))
  return hit ? hit[2] : null
}

const rooms = new Map<string, string>(ALL_SCENES.map((scene) => [scene.id as string, scene.titleHe]))
type Kind = 'room-exists' | 'a-moment' | 'a-system' | 'needs-painting'
type Row = { scene: string; chapter: string; placeHe: string; suggest: string | null; kind: Kind; proposed: true; repaint?: Repaint }
const out: Row[] = []

for (const scene of scenes) {
  const place = scene.placeHe ?? ''
  const hit = SUGGESTS.find(([pattern]) => pattern.test(place))
  const kind: Kind = hit
    ? 'room-exists'
    : A_SYSTEM.test(place)
      ? 'a-system'
      : A_MOMENT.test(place)
        ? 'a-moment'
        : 'needs-painting'
  const suggest = hit ? hit[1] : null
  const repaint = repaintFor(suggest, (scene as { year: number | null }).year ?? null, place)
  out.push({ scene: scene.id, chapter: scene.chapter, placeHe: place, suggest, kind, proposed: true, ...(repaint ? { repaint } : {}) })
}

const matched = out.filter((row) => row.suggest !== null)
const open = out.filter((row) => row.suggest === null)

console.log('')
console.log(`=== ${out.length} סצנות · הצעה לחדר קיים: ${matched.length} · נשארות לשיחה: ${open.length} ===`)
console.log('')
const byRoom = new Map<string, number>()
for (const row of matched) byRoom.set(row.suggest!, (byRoom.get(row.suggest!) ?? 0) + 1)
console.log('=== חדרים קיימים שהתסריט חוזר אליהם ===')
for (const [room, n] of [...byRoom.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${room.padEnd(20)} ${rooms.get(room) ?? '—'}`)
}
const moments = out.filter((row) => row.kind === 'a-moment')
const systems = out.filter((row) => row.kind === 'a-system')
const paint = out.filter((row) => row.kind === 'needs-painting')

console.log('')
console.log(`=== רגע ולא מקום (${moments.length}) — קורה איפה שהחיים נמצאים ===`)
for (const row of moments.slice(0, 8)) console.log(`  ${row.scene}  ${row.placeHe}`)
if (moments.length > 8) console.log(`  ...ועוד ${moments.length - 8}`)
console.log('')
console.log(`=== מערכת שכבר קיימת, לא חדר (${systems.length}) ===`)
for (const row of systems) console.log(`  ${row.scene}  ${row.placeHe}`)
console.log('')
console.log(`=== מה שבאמת צריך ציור (${paint.length}) ===`)
for (const row of paint) console.log(`  ${row.scene}  [${row.chapter}]  ${row.placeHe}`)

writeFileSync('lib/life/content/screenplay/places.json', JSON.stringify({ rows: out }, null, 2) + '\n', 'utf8')
const repainted = out.filter((row) => row.repaint)
console.log('')
console.log(`=== חדר קיים, ציור מהעשור הלא נכון (${repainted.length}) ===`)
for (const row of repainted) {
  console.log(`  ${row.scene}  ${String(row.suggest).padEnd(20)} → ${row.repaint!.backdrop.padEnd(14)} ${row.repaint!.whyHe}`)
}

console.log('')
console.log(`נכתב: lib/life/content/screenplay/places.json`)
console.log('ההצעה היא הצעה. חדר ממוקם בהסתכלות על ציור, לא בהתאמת מחרוזת (כלל 52).')
