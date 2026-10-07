/**
 * "I was there" (owner, 7.10.2026: the personal feeling — "הייתי שם" — on matches and moments).
 * Device-first like the rest of "Me": one record under `fanlife.been.v1`, keyed `<club>:<id>`.
 * Un-marking keeps a tombstone (b:false) so a later sync can tell a change of heart from a gap —
 * the same shape as The Worker's AWAY DAYS "been" (rule: the later `at` wins).
 */
export const BEEN_KEY = 'fanlife.been.v1'
export const BEEN_EVENT = 'fanlife:been'
export type BeenRow = { club: string; label: string; on: string | null; b: boolean; at: string }
export type BeenBook = Record<string, BeenRow>

const ID = /^[a-z0-9-]{2,40}:[^\s]{1,160}$/

export function readBeen(): BeenBook {
  try {
    const raw = localStorage.getItem(BEEN_KEY)
    if (!raw || raw.length > 400000) return {}
    const p = JSON.parse(raw) as unknown
    if (!p || typeof p !== 'object') return {}
    const out: BeenBook = {}
    for (const [k, v] of Object.entries(p as Record<string, Partial<BeenRow>>)) {
      if (!ID.test(k) || !v || typeof v.label !== 'string' || typeof v.at !== 'string') continue
      out[k] = { club: k.split(':')[0]!, label: v.label.slice(0, 160), on: typeof v.on === 'string' && /^\d{4}(-\d{2}-\d{2})?$/.test(v.on) ? v.on : null, b: v.b === true, at: v.at }
    }
    return out
  } catch { return {} }
}

export const beenKey = (club: string, id: string) => `${club}:${id}`

/** Marks or un-marks one match/moment; returns the new state. */
export function setBeen(club: string, id: string, label: string, on: string | null, b: boolean): boolean {
  const key = beenKey(club, id)
  if (!ID.test(key)) return false
  const book = readBeen()
  book[key] = { club, label: label.slice(0, 160), on, b, at: new Date().toISOString() }
  try { localStorage.setItem(BEEN_KEY, JSON.stringify(book)); window.dispatchEvent(new Event(BEEN_EVENT)) } catch { return false }
  return true
}

/** Only the days marked "I was there", oldest first (undated last). */
export function beenList(book: BeenBook, club?: string): (BeenRow & { key: string })[] {
  return Object.entries(book).filter(([, r]) => r.b && (!club || r.club === club)).map(([key, r]) => ({ ...r, key }))
    .sort((a, b) => (a.on ?? '9999').localeCompare(b.on ?? '9999') || a.label.localeCompare(b.label))
}

/** Two books from two devices: per key, the later `at` wins; on a tie "I was there" wins. */
export function mergeBeen(a: BeenBook, b: BeenBook): BeenBook {
  const out: BeenBook = { ...a }
  for (const [k, r] of Object.entries(b)) {
    const x = out[k]
    if (!x || r.at > x.at || (r.at === x.at && r.b && !x.b)) out[k] = r
  }
  return out
}
