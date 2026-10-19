import 'server-only'

import { APPS, appUrl, handoffUrl, type AppId } from '@/ecosystem/sdk'

/**
 * `/go/<app>` — the hub's tracked door to a sibling app (ecosystem/contract.json, `shared.handoff`).
 * The handoff is created on the SERVER with the service role, so the key never reaches a browser,
 * and anything refused (no env, network, RPC said no) still sends the visitor on with a plain link:
 * a lead that cannot be counted is still a visitor worth sending.
 */
const SLUG = /^[a-z0-9][a-z0-9-]{1,59}$/
const CAMPAIGN = /^[a-z0-9][a-z0-9_-]{0,59}$/
const TOKEN = /^[0-9a-f]{64}$/

export type GoTarget = Exclude<AppId, 'fanlife'>
export const GO_TARGETS = APPS.filter((a): a is GoTarget => a !== 'fanlife')

export const isGoTarget = (v: string): v is GoTarget => (GO_TARGETS as readonly string[]).includes(v)

/** A relative path on the target app, or '/'. No scheme, no protocol-relative `//host`, no backslash tricks. */
export function safeTo(v: string | null): string {
  if (!v || !v.startsWith('/') || v.startsWith('//') || v.includes('\\') || v.length > 300) return '/'
  return /[\u0000-\u001f\s]/.test(v) ? '/' : v
}

export type GoInput = { club: string | null; campaign: string | null; to: string }

export function goInput(search: URLSearchParams): GoInput {
  const club = search.get('club'), campaign = search.get('c')
  return {
    club: club && SLUG.test(club) ? club : null,
    campaign: campaign && CAMPAIGN.test(campaign) ? campaign : null,
    to: safeTo(search.get('to')),
  }
}

type Env = { url?: string; key?: string }
type Fetch = (input: string, init: RequestInit) => Promise<Response>

/** Where to send the visitor: a tracked handoff URL when the server could create one, else the plain URL. */
export async function goDestination(target: GoTarget, input: GoInput, env: Env = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }, fetcher: Fetch = fetch): Promise<string> {
  const plain = appUrl(target, input.to)
  if (!env.url || !env.key) return plain
  try {
    const res = await fetcher(`${env.url.replace(/\/+$/, '')}/rest/v1/rpc/handoff_create`, {
      method: 'POST',
      headers: { apikey: env.key, Authorization: `Bearer ${env.key}`, 'Content-Profile': 'shared', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_source: 'fanlife', p_target: target, p_club: input.club, p_campaign: input.campaign }),
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return plain
    const d = (await res.json()) as { ok?: boolean; token?: unknown } | null
    return d?.ok === true && typeof d.token === 'string' && TOKEN.test(d.token) ? handoffUrl(target, d.token, input.to) : plain
  } catch {
    return plain
  }
}
