import type { AuthenticityClaim, CollectorError, Condition, Currency, ItemPatch, ItemType, OwnerItem, Size } from './types'

/**
 * עורך העותק — הטיוטה, ההבדל, והבדיקה המוקדמת.
 *
 * **המסד הוא מי שמחליט** (`worker_collector_item_update`). הבדיקה כאן היא אותם כללים בדיוק, באותו
 * סדר, כדי שהאספן ישמע "חסרה מידה" לפני שהוא לוחץ שמור ולא אחרי סיבוב לשרת — ושום דבר לא נשלח
 * שהמסד היה ממילא מחזיר. אם השניים ייפרדו, המסד ינצח: המסך מציג את מה שחזר משם.
 *
 *   1. מספר חולצה 0–99, מחיר חיובי              → `bad_value` + `key`
 *   2. פתוח למכירה/החלפה בלי מידה, מצב או סוג     → `details_required` + `missing`
 *   3. למכירה, בלי מחיר ובלי "פתוח להצעות"       → `price_required`
 *   4. רפליקה שמוצגת כמקורית או כ-Match Worn      → `replica_claim` (אילוץ `replica_honest`)
 */

export type Draft = {
  size: Size | null
  condition: Condition | null
  itemType: ItemType
  authenticityClaim: AuthenticityClaim | null
  playerName: string
  playerNumber: string
  personalization: string
  description: string
  forTrade: boolean
  forSale: boolean
  askingPrice: string
  currency: Currency
  openToOffers: boolean
}

export type DraftProblem = { error: CollectorError; missing?: string[]; key?: string }

export const LIMITS = { playerName: 40, personalization: 200, description: 1500, photos: 8 } as const

export function draftOf(item: OwnerItem): Draft {
  return {
    size: item.size,
    condition: item.condition,
    itemType: item.itemType,
    authenticityClaim: item.authenticityClaim,
    playerName: item.playerName ?? '',
    playerNumber: item.playerNumber === null ? '' : String(item.playerNumber),
    personalization: item.personalization ?? '',
    description: item.description ?? '',
    forTrade: item.forTrade,
    forSale: item.forSale,
    askingPrice: item.askingPrice === null ? '' : String(item.askingPrice),
    currency: item.currency,
    openToOffers: item.openToOffers,
  }
}

const text = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** `"7"` → 7, `""` → null, anything else → NaN (so the check can say which field) */
function whole(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

function money(value: string): number | null {
  const trimmed = value.trim().replace(',', '.')
  if (trimmed === '') return null
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

/** A replica never claims to be original (spec §24) — the claims a replica may still make. */
export function claimAllowed(type: ItemType, claim: AuthenticityClaim): boolean {
  return !((type === 'replica' || type === 'fan_reproduction') && (claim === 'original' || claim === 'match_worn'))
}

export function precheck(draft: Draft): DraftProblem | null {
  const number = whole(draft.playerNumber)
  if (number !== null && (Number.isNaN(number) || number > 99)) return { error: 'bad_value', key: 'playerNumber' }
  const price = money(draft.askingPrice)
  if (price !== null && (Number.isNaN(price) || price <= 0 || price >= 100_000_000)) return { error: 'bad_value', key: 'askingPrice' }
  if (draft.forSale || draft.forTrade) {
    const missing: string[] = []
    if (draft.size === null) missing.push('size')
    if (draft.condition === null) missing.push('condition')
    if (draft.itemType === 'unknown') missing.push('itemType')
    if (missing.length > 0) return { error: 'details_required', missing }
    if (draft.forSale && price === null && !draft.openToOffers) return { error: 'price_required' }
  }
  if (draft.authenticityClaim && !claimAllowed(draft.itemType, draft.authenticityClaim)) return { error: 'replica_claim' }
  return null
}

/** Only the keys that changed, normalised the way the database stores them. */
export function patchFrom(item: OwnerItem, draft: Draft): ItemPatch {
  const next: Required<ItemPatch> = {
    size: draft.size,
    condition: draft.condition,
    itemType: draft.itemType,
    authenticityClaim: draft.authenticityClaim,
    playerName: text(draft.playerName),
    playerNumber: whole(draft.playerNumber),
    personalization: text(draft.personalization),
    description: text(draft.description),
    forTrade: draft.forTrade,
    forSale: draft.forSale,
    askingPrice: money(draft.askingPrice),
    currency: draft.currency,
    openToOffers: draft.openToOffers,
  }
  const before: Required<ItemPatch> = {
    size: item.size,
    condition: item.condition,
    itemType: item.itemType,
    authenticityClaim: item.authenticityClaim,
    playerName: item.playerName,
    playerNumber: item.playerNumber,
    personalization: item.personalization,
    description: item.description,
    forTrade: item.forTrade,
    forSale: item.forSale,
    askingPrice: item.askingPrice,
    currency: item.currency,
    openToOffers: item.openToOffers,
  }
  const patch: ItemPatch = {}
  for (const key of Object.keys(next) as (keyof ItemPatch)[]) {
    if (next[key] !== before[key]) (patch as Record<string, unknown>)[key] = next[key]
  }
  return patch
}

/** Move one photo a place toward the start (-1) or the end (+1). Out of range is a no-op. */
export function movePhoto(paths: readonly string[], index: number, by: -1 | 1): string[] {
  const target = index + by
  if (index < 0 || index >= paths.length || target < 0 || target >= paths.length) return [...paths]
  const out = [...paths]
  const [row] = out.splice(index, 1)
  out.splice(target, 0, row as string)
  return out
}
