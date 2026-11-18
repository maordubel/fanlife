/**
 * CONNECTED FOOTBALL — the attention budget (owner's plan §11, 27.10.2026). Client-safe, no network.
 *  · one discovery unit on screen at a time (the slide-up banner OR the DUBID lock strip, never both)
 *  · nothing over a decision: a game in play, an open sheet or dialog, a form being sent
 *  · a family is one product, whatever the language: dubid, dubid-en and dubid-gr are ONE family
 *  · "×" on a discovery unit or a banner takes it off the screen for that moment only; nothing is snoozed (owner, 18.11.2026)
 */
export type Family = 'dubid' | 'offsides' | 'theworker' | 'fuckyou' | 'legends' | 'life' | 'market' | 'fanlife' | string

const HOSTS: Record<string, Family> = {'dubid.dubelteam.com': 'dubid', 'offsides.dubelteam.com': 'offsides', 'theworker.dubelteam.com': 'theworker', 'fuckyou.dubelteam.com': 'fuckyou'}
/** a banner's family from where it leads (its id only breaks a tie), so a language variant can never dodge a snooze */
export function familyOf(id: string, href: string): Family {
  try {
    const u = new URL(href)
    if (HOSTS[u.hostname]) return HOSTS[u.hostname]!
    if (/(^|\.)youtube\.com$/.test(u.hostname) && /^\/@thekypselitapes(\/|$)/i.test(u.pathname)) return 'kypseli'
    if (/(^|\.)dubelteam\.com$/.test(u.hostname) && u.pathname.startsWith('/broken-collective')) return 'book'
    if (u.hostname.endsWith('fanlife.dubelteam.com')) {
      if (u.pathname.startsWith('/all-football/legends')) return 'legends'
      if (/\/life(\/|$)/.test(u.pathname) || u.hash === '#life') return 'life'
      if (/\/(market|kits|closet)(\/|$)/.test(u.pathname)) return 'market'
      if (/^\/shop(\/|$)/.test(u.pathname)) return 'shop'
      return 'fanlife'
    }
  } catch { /* fall through to the id */ }
  return id.replace(/-(en|he|gr|el)$/, '')
}

/** Retired 18.11.2026 (owner): "×" no longer hides a family for a week. The API stays so callers compile; nothing is kept,
 *  and the old device key is cleared on first read so visitors who pressed × before see banners again. */
export const SNOOZE_DAYS = 0
const KEY = 'fanlife.discovery.snooze.v1'
const forget = () => { try { localStorage.removeItem(KEY) } catch { /* a convenience, never a requirement */ } }
export function snoozed(_family: Family, _now = Date.now()): boolean { forget(); return false }
export function snooze(_family: Family, _days = SNOOZE_DAYS, _now = Date.now()): void { forget() }
export function snoozedSet(_now = Date.now()): Set<string> { forget(); return new Set() }

/** a game in play, an open sheet or dialog, a form on its way: nothing slides up over a decision (rule 28) */
export function busy(doc: Document = document): boolean {
  return !!doc.querySelector('[data-chrome="immersive"],dialog[open],[role="dialog"],[aria-modal="true"],[data-activity="busy"],form[aria-busy="true"]')
}
/** another discovery unit is already on screen */
export function occupied(self: string, doc: Document = document): boolean {
  return [...doc.querySelectorAll<HTMLElement>('[data-discovery-unit]')].some(el => el.dataset.discoveryUnit !== self && el.dataset.up !== 'false')
}
