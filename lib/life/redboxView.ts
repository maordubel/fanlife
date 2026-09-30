import { type BoxKind, kindArt, memoryKind, photoPlate } from './boxObjects'
import { CHAPTERS } from './content/chapters'
import { ITEMS } from './content/chapter1986'
import { eraFor } from './content/era'
import type { ItemId, LifeState } from './types'

/**
 * מה יש בקופסה — הקריאה שהקופסה האדומה בחדר פותחת (21.9.2026).
 *
 * כל פרק נגמר במשפט *"שמת את זה בקופסה האדומה"*, ועד היום הקופסה לא הייתה חפץ: בחדר עמד
 * צעיף, ו"לפתוח את הקופסה" הרים דגל ולא הראה כלום. מה שבתוכה מגיע משלושה מקורות, וכולם
 * כבר קיימים במצב — אין כאן שדה חדש:
 *
 *   · `memories` שהם **סוף של פרק** — המזהה הוא `<memoryPrefix>-<ending.id>` (ראה
 *     `WorldScene`), ולכן אפשר למצוא את הכרטיס שנסגר בו ואת ה-`memoryHe` שלו. זה המשפט
 *     שהשחקן כבר קרא פעם אחת, והקופסה מחזירה אותו.
 *   · `memories` שהם **רגע** (`{ e: 'memory' }` בשיחה) — שם החפץ, בלי משפט שהומצא לו.
 *   · `redBox` — מה שהיום השאיר (`{ e: 'keep' }`), עם הכותרת וההערה שנכתבו לו.
 *
 * הסדר הוא סדר החיים: שנה, ואז שעה ביום.
 */

export type BoxThing = {
  id: string
  year: number
  item: ItemId
  /** מה מציירים — `boxObjects.ts` מתוך המשפט שנכתב לו */
  kind: BoxKind
  /** הציור, כשלסוג יש ציור; `null` הוא סוג שמצויר ב-CSS */
  art: string | null
  /** לתמונה: הלוח של אותו יום */
  plate: string | null
  /** הפרק שהוא נכנס בו, כשידוע */
  chapter: string | null
  /** מה החפץ */
  nameHe: string
  /** מאיזה יום — כותרת הסוף, או הכותרת שנכתבה לחפץ */
  titleHe: string | null
  /** המשפט שנכתב כשהוא נכנס לקופסה, אם נכתב */
  noteHe: string | null
  source: 'ending' | 'moment' | 'keepsake'
}

type EndingRow = { titleHe: string; memoryHe: string; chapter: string; endingId: string; legacyUnless?: { flag: string; titleHe: string; memoryHe: string } }
let ENDING_BY_MEMORY: Map<string, EndingRow> | null = null

function endingIndex(): Map<string, EndingRow> {
  if (ENDING_BY_MEMORY) return ENDING_BY_MEMORY
  const out = new Map<string, EndingRow>()
  for (const chapter of [...CHAPTERS.map((row) => row.id), 'prologue']) {
    const era = eraFor(chapter)
    for (const card of Object.values(era.endings ?? {})) {
      if (!card?.memoryHe) continue
      const id = `${era.memoryPrefix}-${card.id}`
      if (!out.has(id)) out.set(id, { titleHe: card.titleHe, memoryHe: card.memoryHe, chapter, endingId: card.id, ...(card.legacyUnless ? { legacyUnless: card.legacyUnless } : {}) })
    }
  }
  ENDING_BY_MEMORY = out
  return out
}

export function boxContents(state: LifeState): BoxThing[] {
  const endings = endingIndex()
  const rows: Array<BoxThing & { at: number }> = []
  const seen = new Set<string>()
  const chapterOfYear = (year: number): string | null => CHAPTERS.find((row) => row.year === year)?.id ?? null
  const thing = (
    id: string,
    year: number,
    at: number,
    item: ItemId,
    text: string | null,
    endingId: string | null,
    chapter: string | null,
    extra: Pick<BoxThing, 'titleHe' | 'noteHe' | 'source' | 'nameHe'>,
  ): BoxThing & { at: number } => {
    const kind = memoryKind(text, item, endingId, id)
    return {
      id,
      year,
      at,
      item,
      kind,
      art: kindArt(kind, item, id, chapter, text),
      plate: kind === 'photo' ? photoPlate(chapter ?? chapterOfYear(year)) : null,
      chapter,
      ...extra,
    }
  }
  for (const memory of state.memories) {
    if (seen.has(memory.id)) continue
    seen.add(memory.id)
    const found = endings.get(memory.id) ?? null
    // an older life keeps the words its ending was written in (delta 93, brief §44)
    const ending = found?.legacyUnless && !state.flags[found.legacyUnless.flag] ? { ...found, titleHe: found.legacyUnless.titleHe, memoryHe: found.legacyUnless.memoryHe } : found
    const gift = Boolean(found?.legacyUnless && state.flags[found.legacyUnless.flag])
    rows.push(
      thing(memory.id, memory.year, memory.atMinute, memory.item, ending?.memoryHe ?? null, ending?.endingId ?? null, ending?.chapter ?? null, {
        nameHe: ITEMS[memory.item]?.nameHe ?? '',
        titleHe: ending?.titleHe ?? null,
        noteHe: ending?.memoryHe ?? null,
        source: ending ? 'ending' : 'moment',
      }),
    )
    // the first shirt he was given is the one in the box, not the archive's 1984/85 stand-in
    const last = rows[rows.length - 1]
    if (gift && last?.kind === 'shirt') last.art = 'shirtVisa86'
  }
  for (const kept of state.redBox) {
    if (seen.has(kept.id)) continue
    seen.add(kept.id)
    rows.push(
      thing(kept.id, kept.year, kept.atMinute, kept.item, null, null, chapterOfYear(kept.year), {
        nameHe: ITEMS[kept.item]?.nameHe ?? kept.titleHe,
        titleHe: kept.titleHe,
        noteHe: kept.noteHe ?? null,
        source: 'keepsake',
      }),
    )
  }
  return rows.sort((a, b) => a.year - b.year || a.at - b.at).map(({ at: _at, ...row }) => row)
}
