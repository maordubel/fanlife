/**
 * The Dubel top ad — Monetag In-Page Push, zone 11100824, the ONE ad format FAN LIFE runs (owner, 11.10.2026).
 *
 * Three switches, any one of which turns it off:
 *  1. `ADS_ENABLED` inside `public/dubel-top-ad.js` — the owner's file switch, editable on GitHub.
 *  2. The control room → Settings → "Top ad" (`state.ads.topAd`), saved in the control state.
 *  3. A page that is never an ad page (below): the script tag is not rendered and `<body data-no-ads>` is set,
 *     which the script itself honours.
 *
 * Never on: the control room and staff pages, API/auth, and anywhere a run is played — every club gate, LIFE, and
 * THE WORKER's own gates (CLAUDE.md rule 28: an ad may never appear during a run; docs/fanlife/ADSENSE-APPROVAL.md §2).
 */
export const TOP_AD_SRC = '/dubel-top-ad.js'

const NEVER_PREFIX = ['/master', '/qa', '/api', '/auth', '/life', '/city', '/c/']
/** ALL FOOTBALL and LEGENDS MANAGER: their front page is a reading page; every gate, career and match is a run (rule 28) */
const EXPERIENCE_RUNS = /^\/all-football\/.+/
/** THE WORKER's gate routes (rule 24) and the club gates are game screens. */
const WORKER_GAMES = ['/xi', '/trivia', '/lineup', '/kits/build', '/memory', '/polls', '/goal', '/blind-cow', '/derby', '/timeline', '/royal-rumble', '/away-days', '/tik']
/** Doors inside a club that are reading pages, not runs. Anything else under /clubs/<id>/ is a gate or LIFE. */
const CLUB_READING = new Set(['', 'play', 'history', 'terrace', 'meetings'])

export function topAdAllowedOn(path: string | null | undefined): boolean {
  const p = (path || '/').split('?')[0]!.replace(/\/+$/, '') || '/'
  // Any admin screen, wherever it lives (the kit desk included) — matched by segment, not by naming its route.
  if (p.split('/').includes('admin')) return false
  if (NEVER_PREFIX.some((x) => p === x.replace(/\/$/, '') || p.startsWith(x.endsWith('/') ? x : x + '/'))) return false
  if (WORKER_GAMES.some((x) => p === x || p.startsWith(x + '/'))) return false
  if (EXPERIENCE_RUNS.test(p)) return false
  const club = /^\/clubs\/[^/]+(?:\/(.*))?$/.exec(p)
  if (club) return CLUB_READING.has(club[1] ?? '')
  return true
}

export type TopAdSetting = { topAd: boolean; updatedAt: string | null }
/** On by default: the owner asked for it; the admin switch and the file switch turn it off. */
export const DEFAULT_TOP_AD: TopAdSetting = { topAd: true, updatedAt: null }

// Site ownership check the ad network asked for (owner, 11.10.2026): one meta tag in <head>, on every host.
export const MONETAG_SITE_VERIFICATION = '8c3dd993bbe05dffb1f2244701825c92'
