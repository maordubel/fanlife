import { APP_URL } from '@/ecosystem/sdk'

/**
 * Outbound links from FAN LIFE's UI to a sibling app go through `/go/<app>` (app/go/[app]/route.ts),
 * which creates a tracked `shared.handoff` on the server. Client-safe: no keys, no network.
 * Returns null for a link that is not to a sibling app (it is left exactly as it was).
 */
const CAMPAIGN = /^[a-z0-9][a-z0-9_-]{0,59}$/
const SLUG = /^[a-z0-9][a-z0-9-]{1,59}$/
const SIBLINGS = (['dubid', 'offsides', 'theworker'] as const).map((app) => [app, new URL(APP_URL[app]).hostname] as const)

export function goHref(href: string, campaign: string, club?: string | null): string | null {
  let u: URL
  try { u = new URL(href) } catch { return null }
  const hit = SIBLINGS.find(([, host]) => host === u.hostname)
  if (!hit) return null
  const q = new URLSearchParams()
  const c = campaign.toLowerCase().slice(0, 60)
  if (CAMPAIGN.test(c)) q.set('c', c)
  if (club && SLUG.test(club)) q.set('club', club)
  const to = u.pathname + u.search + u.hash
  if (to !== '/') q.set('to', to)
  const qs = q.toString()
  return `/go/${hit[0]}${qs ? `?${qs}` : ''}`
}
