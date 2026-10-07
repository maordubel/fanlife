/**
 * The supporter's card in FAN LIFE — The Worker's "אני" card (app/tik) adapted to a hub of clubs.
 * Device-first like The Worker before sign-in: one record under `fanlife.me.v1`. The member number
 * is minted once and never rewritten (The Worker's rule for its TIK); "joined" is the first day this
 * device opened the card. Every declared field is optional, and a field left empty leaves its line
 * out of the oath and the story — nothing is filled in for the reader.
 */
export const ME_KEY = 'fanlife.me.v1'
export const NAME_MAX = 18
export const BEGAN = ['family', 'friends', 'ground', 'tv', 'home'] as const
export type Began = (typeof BEGAN)[number]
export type MeCard = { v: 1; memberNo: string; joined: string; name: string; club: string | null; since: number | null; began: Began | null; first: string; number: number | null }

const today = () => new Date().toISOString().slice(0, 10)
const mint = () => `FL-${String(Math.floor(1000 + Math.random() * 9000))}`

export function blankCard(): MeCard {
  return { v: 1, memberNo: mint(), joined: today(), name: '', club: null, since: null, began: null, first: '', number: null }
}

/** Reads (and on first sight writes) the card. A damaged record keeps its member number if it can. */
export function readCard(): MeCard {
  try {
    const raw = localStorage.getItem(ME_KEY)
    if (raw && raw.length < 4000) {
      const p = JSON.parse(raw) as Partial<MeCard>
      if (p && p.v === 1 && typeof p.memberNo === 'string' && /^FL-\d{4}$/.test(p.memberNo)) return sanitize(p as MeCard)
    }
    const fresh = blankCard()
    localStorage.setItem(ME_KEY, JSON.stringify(fresh))
    return fresh
  } catch {
    return blankCard()
  }
}

export function sanitize(c: MeCard): MeCard {
  const year = new Date().getFullYear()
  return {
    v: 1,
    memberNo: c.memberNo,
    joined: /^\d{4}-\d{2}-\d{2}$/.test(c.joined) ? c.joined : today(),
    name: (c.name || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX),
    club: typeof c.club === 'string' && /^[a-z0-9-]{2,40}$/.test(c.club) ? c.club : null,
    since: Number.isInteger(c.since) && c.since! >= 1880 && c.since! <= year ? c.since : null,
    began: BEGAN.includes(c.began as Began) ? c.began : null,
    first: (c.first || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    number: Number.isInteger(c.number) && c.number! >= 1 && c.number! <= 99 ? c.number : null,
  }
}

/** Saves the declared half; the member number and the first day stay what they were. */
export function writeCard(next: MeCard): MeCard {
  const kept = readCard()
  const out = sanitize({ ...next, memberNo: kept.memberNo, joined: kept.joined })
  try { localStorage.setItem(ME_KEY, JSON.stringify(out)) } catch { /* private mode: the card lives until the tab closes */ }
  return out
}

/** Earned only: total finished rounds across every club decide the standing. */
export function rankOf(rounds: number): 0 | 1 | 2 | 3 {
  return rounds >= 60 ? 3 : rounds >= 20 ? 2 : rounds >= 5 ? 1 : 0
}

/** Code 39-style bars printed from the member number — the bars ARE the number, not decoration. */
export function barsOf(memberNo: string): number[] {
  const out: number[] = []
  for (const ch of memberNo) {
    const c = ch.charCodeAt(0)
    for (let i = 0; i < 5; i++) out.push(((c >> i) & 1) ? 3 : 1, 1)
  }
  return out
}
