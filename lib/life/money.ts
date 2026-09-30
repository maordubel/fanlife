/**
 * כסף — one formatter for every shekel the player sees.
 *
 * The state keeps `agorot` (a save from 1986 still loads), the player sees whole
 * shekels: `12 ₪`, `קיבלת 5 ₪`, `שילמת 8 ₪`. Nothing in the game is priced under a
 * shekel any more — every amount in the content is a multiple of 100 — so the rounding
 * here is a guard, not a rule. The sign is a suffix with a thin space, the way a Hebrew
 * price tag reads; a negative amount is never shown with a minus, it is "paid".
 */

export const SHEKEL = '₪'

/** whole shekels from agorot: `1250` → `13 ₪`, `0` → `0 ₪` */
export function formatMoney(agorot: number): string {
  const shekels = Math.round(Math.abs(agorot) / 100)
  return `${shekels} ${SHEKEL}`
}

/** a change in the pocket, as the toast says it: `קיבלת 5 ₪` / `שילמת 8 ₪`; nothing for nothing */
export function describeMoneyChange(agorot: number): string | null {
  const shekels = Math.round(Math.abs(agorot) / 100)
  if (shekels === 0) return null
  return agorot > 0 ? `קיבלת ${shekels} ${SHEKEL}` : `שילמת ${shekels} ${SHEKEL}`
}
