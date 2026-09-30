/**
 * היציע שלי, מתוך "אני" — קריאה בלבד (ONE RED WORLD §24, §8).
 *
 * The stands ("היציע שלי", `/stand/<code>`) are built in their own module and own their own
 * storage; the personal area only POINTS at one, never writes to it and never imports it, so
 * the two can land in either order. The seam is deliberately loose and fully tolerant: any
 * `worker.stand*` key the device holds is read, and the first thing in it shaped like a stand
 * code (`{ code }`, a list of them, or a record keyed by code) becomes the link. Nothing
 * found → nothing drawn. The code is the only thing read: a stand's name or members never
 * come here (a code is what the invite link already carries in the open).
 */

export type StandLink = { code: string; href: string }

/** An invite code as `/stand/7F4K` spells it: capitals and digits, at least one digit. */
const CODE = /^(?=.*\d)[A-Z0-9]{4,12}$/

function codeIn(value: unknown, depth = 0): string | null {
  if (depth > 3 || value === null || value === undefined) return null
  if (typeof value === 'string') return CODE.test(value) ? value : null
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = codeIn(item, depth + 1)
      if (found) return found
    }
    return null
  }
  if (typeof value === 'object') {
    const row = value as Record<string, unknown>
    for (const key of ['code', 'standCode', 'current', 'last']) {
      const found = codeIn(row[key], depth + 1)
      if (found) return found
    }
    for (const key of ['stands', 'mine', 'joined']) {
      const found = codeIn(row[key], depth + 1)
      if (found) return found
    }
    const keys = Object.keys(row).filter((key) => CODE.test(key))
    return keys[0] ?? null
  }
  return null
}

/** Pure: the stored values → the first stand link, or null. */
export function standLinkFrom(values: readonly unknown[]): StandLink | null {
  for (const value of values) {
    const code = codeIn(value)
    if (code) return { code, href: `/stand/${encodeURIComponent(code)}` }
  }
  return null
}

export function readStandLink(): StandLink | null {
  if (typeof window === 'undefined') return null
  const values: unknown[] = []
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith('worker.stand')) continue
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      try {
        values.push(JSON.parse(raw) as unknown)
      } catch {
        values.push(raw)
      }
    }
  } catch {
    return null
  }
  return standLinkFrom(values)
}
