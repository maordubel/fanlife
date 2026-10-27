/**
 * CONNECTED FOOTBALL — the attention budget (owner's plan §11, 27.10.2026). Client-safe, no network.
 *  · one discovery unit on screen at a time (the slide-up banner OR the DUBID lock strip, never both)
 *  · nothing over a decision: a game in play, an open sheet or dialog, a form being sent
 *  · a family is one product, whatever the language: dubid, dubid-en and dubid-gr are ONE family
 *  · "Close" on a discovery unit snoozes its family for seven days on this device
 */
export type Family = 'dubid' | 'offsides' | 'theworker' | 'fuckyou' | 'legends' | 'life' | 'market' | 'fanlife' | string

const HOSTS: Record<string, Family> = {'dubid.dubelteam.com': 'dubid', 'offsides.dubelteam.com': 'offsides', 'theworker.dubelteam.com': 'theworker', 'fuckyou.dubelteam.com': 'fuckyou'}
/** a banner's family from where it leads (its id only breaks a tie), so a language variant can never dodge a snooze */
export function familyOf(id: string, href: string): Family {
  try {
    const u = new URL(href)
    if (HOSTS[u.hostname]) return HOSTS[u.hostname]!
    if (u.hostname.endsWith('fanlife.dubelteam.com')) {
      if (u.pathname.startsWith('/all-football/legends')) return 'legends'
      if (/\/life(\/|$)/.test(u.pathname) || u.hash === '#life') return 'life'
      if (/\/(market|kits|closet)(\/|$)/.test(u.pathname)) return 'market'
      return 'fanlife'
    }
  } catch { /* fall through to the id */ }
  return id.replace(/-(en|he|gr|el)$/, '')
}

export const SNOOZE_DAYS = 7
const KEY = 'fanlife.discovery.snooze.v1'
type Snooze = Record<string, number>
const read = (): Snooze => { try { const v = JSON.parse(localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v as Snooze : {} } catch { return {} } }
export function snoozed(family: Family, now = Date.now()): boolean { return (read()[family] ?? 0) > now }
export function snooze(family: Family, days = SNOOZE_DAYS, now = Date.now()): void {
  try { const s = read(); for (const k of Object.keys(s)) if (s[k]! <= now) delete s[k]; s[family] = now + days * 86_400_000; localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* a convenience, never a requirement */ }
}
export function snoozedSet(now = Date.now()): Set<string> { const s = read(); return new Set(Object.keys(s).filter(k => s[k]! > now)) }

/** a game in play, an open sheet or dialog, a form on its way: nothing slides up over a decision (rule 28) */
export function busy(doc: Document = document): boolean {
  return !!doc.querySelector('[data-chrome="immersive"],dialog[open],[role="dialog"],[aria-modal="true"],[data-activity="busy"],form[aria-busy="true"]')
}
/** another discovery unit is already on screen */
export function occupied(self: string, doc: Document = document): boolean {
  return [...doc.querySelectorAll<HTMLElement>('[data-discovery-unit]')].some(el => el.dataset.discoveryUnit !== self && el.dataset.up !== 'false')
}
