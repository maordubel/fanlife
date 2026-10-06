/**
 * A club's signature: how its page is drawn. Two dimensions, both from closed sets, so every club — including ones
 * not yet in the registry — gets an identity of its own without a designer touching CSS:
 *   pattern  how the club's colour is worn (the shirt, where it is known: Olympiacos stripes, Zrinjski sash)
 *   layout   how the club's masthead is composed (poster · curtain · ground · split · ticket)
 * Colour itself still comes only from the identity manifest (rule 91): `.mag-badge` / `.mag-band` wear it, nothing else.
 */
export const PATTERNS = ['solid', 'stripes', 'sash', 'hoops', 'halves', 'checks'] as const
export const LAYOUTS = ['poster', 'curtain', 'ground', 'split', 'ticket'] as const
export type Pattern = (typeof PATTERNS)[number]
export type Layout = (typeof LAYOUTS)[number]
export type Signature = {pattern: Pattern; layout: Layout}
/** Written by hand where the club's own look is known. Everything else is derived, never defaulted to one look. */
const OWN: Record<string, Signature> = {
  'hapoel-tel-aviv': {pattern: 'solid', layout: 'poster'},
  olympiacos: {pattern: 'stripes', layout: 'curtain'},
  panathinaikos: {pattern: 'solid', layout: 'ground'},
  'zrinjski-mostar': {pattern: 'sash', layout: 'split'},
  'hapoel-petah-tikva': {pattern: 'solid', layout: 'ticket'},
}
import {REGISTRY} from '@/lib/master/registry'
const REGISTRY_ORDER = REGISTRY.map(c => c.id)
const h = (s: string, salt: number) => { let x = 2166136261 ^ salt; for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619); return x >>> 0 }
const COMBOS = PATTERNS.flatMap(pattern => LAYOUTS.map(layout => ({pattern, layout})))
const key = (s: Signature) => `${s.pattern}/${s.layout}`
/**
 * Deterministic and collision-free for registry clubs: each club starts at its hash position and takes the first
 * combination no earlier club (own or derived) holds. The registry is append-only, so adding a club never changes
 * another club's page. An id outside the registry still gets a stable signature (its hash position).
 */
export function signatureFor(clubId: string, order: readonly string[] = REGISTRY_ORDER): Signature {
  if (OWN[clubId]) return OWN[clubId]!
  const taken = new Set(Object.values(OWN).map(key))
  for (const id of order) {
    if (OWN[id]) continue
    let i = h(id, 7) % COMBOS.length
    while (taken.has(key(COMBOS[i]!))) i = (i + 1) % COMBOS.length
    if (id === clubId) return COMBOS[i]!
    taken.add(key(COMBOS[i]!))
  }
  return COMBOS[h(clubId, 7) % COMBOS.length]!
}
