import type { CollectorShirt, ItemState, OwnerItem } from './types'

/**
 * מדדי האוסף — מה הארון אומר על עצמו (מפרט §10–§11), כחישוב טהור אחד.
 *
 * **המכנה הוא הארכיון, לא עשר.** "שנות ה-90: 7/10" בדוגמה של המפרט מניח עשור של עשר עונות, והארכיון
 * לא מחזיק עשר: בשנות ה-90 יש בו שבע שנים שונות, בשנות ה-50 חמש, בשנות ה-40 אחת. מדד שמודד מול
 * עשר היה אומר לאספן שחסרות לו חולצות שאף אחד לא צילם — חור שהמערכת המציאה. לכן "משבצת" היא
 * שנה שהארכיון עצמו ממיין לפיה (`year`: שנת הפתיחה של עונה, או השנה היחידה שהמקור נתן), והמכנה
 * של עשור הוא מספר המשבצות שלו בארכיון.
 *
 * **שנה שהמקור נתן בלי עונה נשארת "בערך"** (כלל 69 §4): משבצת מקבלת תווית עונה רק אם יש בארכיון
 * חולצה מתוארכת-בוודאות שנפתחה באותה שנה. ויקיפועל ממפה שנה לעונה באופן לא עקבי, כך שבמקרה נדיר
 * משבצת אחת עשויה לחבר חולצה של סוף עונה עם חולצה של תחילת הבאה — זה המחיר של לא לנחש, והמסך אומר אותו.
 *
 * הקובץ לא מכיר מילים: הוא מחזיר מספרים ומזהים, והמסך מתרגם (כלל 10).
 */

/** בארון עכשיו: מוחזק, סגור בעסקה, או מוחזק ומושעה על ידי מנהל. נמכר/הוחלף/הוצא — כבר לא. */
export const IN_CLOSET: ReadonlySet<ItemState> = new Set<ItemState>(['held', 'reserved', 'suspended'])

export type ItemLike = Pick<OwnerItem, 'archiveSlug' | 'state' | 'forTrade' | 'forSale'>
export type ShirtLike = Pick<CollectorShirt, 'slug' | 'year' | 'decade' | 'seasonLabel' | 'seasonAmbiguous' | 'yearRaw'>

export type SeasonSlot = {
  year: number
  decade: number
  /** a season the archive is SURE of, when one opened this year — otherwise null ("בערך") */
  seasonLabel: string | null
  /** every archive photograph filed under this year */
  slugs: string[]
}

export type SlotRow = SeasonSlot & { copies: number }

export type DecadeRow = {
  decade: number
  /** slots the archive holds in this decade — the honest denominator */
  total: number
  /** slots with at least one copy in the closet */
  have: number
  copies: number
  slots: SlotRow[]
}

export type ClosetSummary = {
  /** physical copies in the closet now */
  copies: number
  /** distinct archive shirts among them */
  shirts: number
  /** the decade with the most copies — "11 משנות ה-90" */
  topDecade: { decade: number; copies: number } | null
  forTrade: number
  forSale: number
  wants: number
  /** first and last year the closet reaches, for "1989 → 2026" */
  span: { from: number; to: number } | null
}

const inCloset = (item: ItemLike) => IN_CLOSET.has(item.state)

/** The archive's own years, oldest first — one slot per year it holds a photograph of. */
export function seasonSlots(archive: readonly ShirtLike[]): SeasonSlot[] {
  const byYear = new Map<number, SeasonSlot>()
  for (const shirt of archive) {
    if (!shirt.year) continue
    const slot = byYear.get(shirt.year) ?? { year: shirt.year, decade: shirt.decade, seasonLabel: null, slugs: [] }
    slot.slugs.push(shirt.slug)
    if (!shirt.seasonAmbiguous && shirt.seasonLabel && slot.seasonLabel === null) slot.seasonLabel = shirt.seasonLabel
    byYear.set(shirt.year, slot)
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

/** copies in the closet per archive year */
function copiesByYear(items: readonly ItemLike[], shirts: Readonly<Record<string, ShirtLike>>): Map<number, number> {
  const out = new Map<number, number>()
  for (const item of items) {
    if (!inCloset(item)) continue
    const shirt = shirts[item.archiveSlug]
    if (!shirt?.year) continue
    out.set(shirt.year, (out.get(shirt.year) ?? 0) + 1)
  }
  return out
}

export function closetSummary(
  items: readonly ItemLike[],
  wants: number,
  shirts: Readonly<Record<string, ShirtLike>>,
): ClosetSummary {
  const held = items.filter(inCloset)
  const decades = new Map<number, number>()
  const years: number[] = []
  for (const item of held) {
    const shirt = shirts[item.archiveSlug]
    if (!shirt) continue
    decades.set(shirt.decade, (decades.get(shirt.decade) ?? 0) + 1)
    if (shirt.year) years.push(shirt.year)
  }
  // most copies wins; a tie goes to the older decade, so the line does not flip between renders
  let topDecade: ClosetSummary['topDecade'] = null
  for (const [decade, copies] of [...decades.entries()].sort((a, b) => a[0] - b[0])) {
    if (!topDecade || copies > topDecade.copies) topDecade = { decade, copies }
  }
  return {
    copies: held.length,
    shirts: new Set(held.map((item) => item.archiveSlug)).size,
    topDecade,
    // the market counts only what can actually change hands — a reserved copy is promised
    forTrade: held.filter((item) => item.state === 'held' && item.forTrade).length,
    forSale: held.filter((item) => item.state === 'held' && item.forSale).length,
    wants,
    span: years.length > 0 ? { from: Math.min(...years), to: Math.max(...years) } : null,
  }
}

/** Every decade the archive holds, oldest first, with what the closet covers of it. */
export function decadeCoverage(
  items: readonly ItemLike[],
  archive: readonly ShirtLike[],
  shirts: Readonly<Record<string, ShirtLike>>,
): DecadeRow[] {
  const copies = copiesByYear(items, shirts)
  const rows = new Map<number, DecadeRow>()
  for (const slot of seasonSlots(archive)) {
    const row = rows.get(slot.decade) ?? { decade: slot.decade, total: 0, have: 0, copies: 0, slots: [] }
    const n = copies.get(slot.year) ?? 0
    row.total += 1
    row.copies += n
    if (n > 0) row.have += 1
    row.slots.push({ ...slot, copies: n })
    rows.set(slot.decade, row)
  }
  return [...rows.values()].sort((a, b) => a.decade - b.decade)
}

/** The seasons of a decade the closet does not reach — "חסרות לי". */
export function gapsOf(row: DecadeRow): SlotRow[] {
  return row.slots.filter((slot) => slot.copies === 0)
}

/**
 * The decade to open the strip on: the one with the most seasons in the closet (the collector's
 * decade — "11 משנות ה-90"), then the one closest to complete, then the newer; with nothing held,
 * the newest decade the archive has.
 */
export function focusDecade(rows: readonly DecadeRow[]): number | null {
  if (rows.length === 0) return null
  let best: DecadeRow | null = null
  for (const row of rows) {
    if (row.have === 0) continue
    const ratio = row.have / row.total
    const bestRatio = best ? best.have / best.total : -1
    if (!best || row.have > best.have || (row.have === best.have && (ratio > bestRatio || (ratio === bestRatio && row.decade > best.decade)))) {
      best = row
    }
  }
  return (best ?? rows[rows.length - 1])?.decade ?? null
}

/** The oldest shirt in the closet. A tie within one year prefers the one the archive is sure of. */
export function oldestShirt<S extends ShirtLike>(
  items: readonly ItemLike[],
  shirts: Readonly<Record<string, S>>,
): S | null {
  let best: S | null = null
  for (const item of items) {
    if (!inCloset(item)) continue
    const shirt = shirts[item.archiveSlug]
    if (!shirt?.year) continue
    if (!best || shirt.year < best.year || (shirt.year === best.year && best.seasonAmbiguous && !shirt.seasonAmbiguous)) {
      best = shirt
    }
  }
  return best
}

/**
 * "העונה עם הכי הרבה פריטים". Only when some season holds two copies or more — with one of
 * each, every season ties and naming one of them would be naming nothing.
 */
export function busiestSeason(
  items: readonly ItemLike[],
  archive: readonly ShirtLike[],
  shirts: Readonly<Record<string, ShirtLike>>,
): SlotRow | null {
  let best: SlotRow | null = null
  for (const row of decadeCoverage(items, archive, shirts)) {
    for (const slot of row.slots) {
      if (slot.copies < 2) continue
      if (!best || slot.copies > best.copies || (slot.copies === best.copies && slot.year > best.year)) best = slot
    }
  }
  return best
}
