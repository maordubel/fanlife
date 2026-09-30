/**
 * התרומה — הדרך היחידה להכנסה בשלב הזה (מפרט §50), ורק אחרי עסקה שהושלמה.
 *
 * אין כאן ספק תשלום: עד שמאור בוחר אחד, `NEXT_PUBLIC_DONATE_URL` ריק והכרטיס מציג את התודה בלי
 * כפתורי כסף. כשהכתובת מוגדרת, כל כפתור פותח אותה עם הסכום בפרמטר `amount` — והסכום לעולם לא
 * קשור לסכום העסקה (§53). שום דבר באתר לא יודע אם מישהו תרם (§54, §57).
 */
export const DONATION_AMOUNTS_EUR = [2, 5, 10] as const

export function donateUrl(amount?: number): string | null {
  const base = (process.env.NEXT_PUBLIC_DONATE_URL ?? '').trim()
  if (!/^https:\/\/\S+$/.test(base)) return null
  if (amount === undefined) return base
  const url = new URL(base)
  url.searchParams.set('amount', String(amount))
  return url.toString()
}
