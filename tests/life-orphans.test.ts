import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { CHAPTERS } from '@/lib/life/content/chapters'
import { DIALOGUE } from '@/lib/life/content/dialogue'
import { eraFor } from '@/lib/life/content/era'
import { MATCH_SCRIPTS } from '@/lib/life/content/matchScripts'
import { PANO_SPOTS } from '@/lib/life/content/panoramas'
import { OFFER_CONVERSATIONS } from '@/lib/life/routes'
import { ALL_SCENES, exitInEra, inEra } from '@/lib/life/world/scenes'

/**
 * תוכן שנכתב ואיש לא יכול לפתוח — הכיוון השני של `deadend-audit` (כלל 78).
 *
 * `deadend-audit` הולך מהחדרים החוצה: כל מה שמגיעים אליו חייב להיות שלם. הוא עיוור
 * לחלוטין לכיוון ההפוך — שיחה שקיימת, עוברת טיפוסים, יש לה בדיקות, ו**שום דבר בעולם
 * לא נוקב בשמה**. שלוש-עשרה כאלה נמצאו ב-20.9.2026: שמונה פעולות מסלול ששלושה שלבי
 * כניסה מבקשים בשם, שלושה מבטים כתובים, שיחה על ליל 1991, וההצעה היחידה שאסור לשום
 * אות להציע.
 *
 * `scripts/life/orphan-audit.ts` (`npm run life:orphans`) הוא אותה סריקה עם דוח קריא;
 * זה החלק שאסור לו לסגת. שני מקורות נספרים כ"נקרא", בהערכת-יתר מכוונת:
 *
 *   1. מבנים — `talk`, `act`, `goto`, פעימות, הזדמנויות, מפגשים, רקע, תסריטי משחק,
 *      נקודות פנורמה וטבלת ההזמנות.
 *   2. כל מחרוזת בקוד מחוץ לקבצי ההגדרה, כי חצי תריסר שיחות נפתחות מתוך ריצה
 *      (`dialogue.start('derby:chant')`) ואין דרך מבנית למצוא אותן.
 *
 * שם שמופיע רק בהערה ייחשב "נקרא", ולכן אין כאן חיוביות שווא — יש שליליות שווא, וזה
 * הצד הבטוח: כל מה שהבדיקה הזאת מדווחת הוא אמיתי.
 */

/**
 * **הרשימה ריקה מ-21.9.2026, והיום שהיא דיברה עליו הגיע.**
 *
 * היא החזיקה יתום אחד — `route-proof-found` — עם הנימוק המדויק: *"חלון ההקמה הוא
 * 2007, אחרי הפרק האחרון שנבנה; להניח אותו בחדר פירושו לטעון שאפשר לייסד את המועדון
 * בשנת 2000. היום שייכתב פרק 2007 מוריד את השורה הזאת."*
 *
 * שלושת פרקי 2007 נכתבו, והשיחה מונחת עכשיו **פעם אחת בכל אחד מהם** — כי הפסגה
 * מבקשת שלוש ראיות בשלושה פרקים. הרשימה נשארת כאן **ריקה ולא נמחקת**: היא המקום שבו
 * ההחלטה הבאה תיאמר בקול, וכלי שמוחקים אותו כשהוא ירוק אינו כלי (כלל 73).
 */
const ALLOWED = new Set<string>([])

const ids = new Set(Object.keys(DIALOGUE))
const named = new Set<string>()
const say = (id: unknown) => {
  if (typeof id === 'string' && ids.has(id)) named.add(id)
}

const POINTERS = ['talk', 'act', 'node', 'conversation', 'dialogue', 'start'] as const
const walk = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) walk(item)
    return
  }
  if (!value || typeof value !== 'object') return
  const node = value as Record<string, unknown>
  for (const key of POINTERS) say(node[key])
  for (const child of Object.values(node)) walk(child)
}

for (const scene of ALL_SCENES) {
  for (const actor of scene.actors) say(actor.talk)
  for (const spot of scene.hotspots) say(spot.act)
}
for (const chapter of CHAPTERS) {
  const era = eraFor(chapter.id)
  walk(era.beats ?? [])
  walk(era.opportunities)
  walk(era.encounters)
  walk(era.ambient)
}
walk(MATCH_SCRIPTS)
walk(Object.values(PANO_SPOTS))
walk(Object.values(DIALOGUE))
for (const stages of Object.values(OFFER_CONVERSATIONS)) for (const id of Object.values(stages)) say(id)

/** the files that DEFINE conversations — an id inside its own row proves nothing */
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
    if (dir.includes(join('lib', 'life', 'content')) && DEFINES.test(entry)) continue
    sources.push(readFileSync(path, 'utf8'))
  }
}
sweep('lib')
sweep('app')
const CODE = sources.join('\n')
for (const id of ids) if (!named.has(id) && CODE.includes(`'${id}'`)) named.add(id)

const ORPHANS = [...ids].filter((id) => !named.has(id)).sort()

describe('יתומים — שיחה שנכתבה וששום דבר לא פותח', () => {
  it('finds the walk itself, so a broken sweep cannot pass by finding nothing', () => {
    // A sweep that resolved nothing would report zero orphans and look perfect.
    expect(ids.size).toBeGreaterThan(500)
    expect(named.size / ids.size).toBeGreaterThan(0.95)
  })

  it('leaves nothing written that nothing can open', () => {
    expect(ORPHANS.filter((id) => !ALLOWED.has(id))).toEqual([])
  })

  /**
   * וההיפך נבדק גם הוא: פטור שכבר אינו נכון הוא שקר שקט בקובץ שקיים כדי להיות כן.
   */
  it('keeps the one excused orphan honest — it is excused only while it is still an orphan', () => {
    for (const id of ALLOWED) {
      expect(ids.has(id), `${id} is excused and does not exist`).toBe(true)
      expect(ORPHANS.includes(id), `${id} is reachable now — take it off the list`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------------

/**
 * ...ואותה שאלה על חפץ במקום על שיחה.
 *
 * שיחה יתומה היא טקסט שאיש לא קורא. נקודה חמה יתומה גרועה ממנה, כי היא נראית עובדת:
 * היא מצוירת בחדר, יש לה `act` תקין, השיחה בקצה השני שלמה — והחדר עצמו אינו נגיש בשנה
 * שהיא מתויגת בה. תשע כאלה נמצאו ב-20.9.2026, כולן ג׳ובים: `gigChapters` רץ מ-`from`
 * עד סוף הפרקים כשאין `until`, ולכן `platform-bags` הוצע בשבעה פרקים כשלרציף יש דלת
 * באחד, ו-`banner-gate5` בשישה כשלשער 5 יש דלת בשלושה. שבוע עבודה שהרוטציה מציעה ואיש
 * לא יכול לקחת.
 */
const PLAYABLE = CHAPTERS.filter((chapter) => chapter.playable !== false)

/**
 * `travel` הוא דלת (אותה הכרעה של `world/worldline.ts`, 21.9.2026): ביט שמעביר את השחקן
 * לחדר — הקפיצה לחדר החזרות ב-2012, לטרמינל אחרי מילאן ב-2002 — הוא דרך פנימה בדיוק כמו
 * פתח מצויר, והאנשים שמחכים שם אינם יתומים.
 */
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

const REACHABLE: Record<string, Set<string>> = {}
for (const chapter of PLAYABLE) REACHABLE[chapter.id] = roomsIn(chapter.id)

const standsSomewhere = (scene: string, thing: { era?: unknown }): boolean =>
  PLAYABLE.some((chapter) => Boolean(REACHABLE[chapter.id]?.has(scene)) && inEra(thing as never, chapter.id))

describe('חפצים ואנשים שעומדים בחדר שאי-אפשר להיכנס אליו', () => {
  it('leaves every room enterable in some chapter', () => {
    const ever = new Set<string>()
    for (const rooms of Object.values(REACHABLE)) for (const room of rooms) ever.add(room)
    expect(ALL_SCENES.map((scene) => scene.id).filter((id) => !ever.has(id))).toEqual([])
  })

  it('stands every hotspot in a room its own chapter can walk into', () => {
    const stranded: string[] = []
    for (const scene of ALL_SCENES) {
      for (const spot of scene.hotspots) if (!standsSomewhere(scene.id, spot)) stranded.push(`${scene.id}:${spot.id}`)
    }
    expect(stranded).toEqual([])
  })

  it('does the same for every person placed in a room', () => {
    const stranded: string[] = []
    for (const scene of ALL_SCENES) {
      for (const actor of scene.actors) if (!standsSomewhere(scene.id, actor)) stranded.push(`${scene.id}:${actor.id}`)
    }
    expect(stranded).toEqual([])
  })
})
