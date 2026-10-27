import 'server-only'
import type {Catalog, DubidLeague, OffsidesMatch} from './discovery'

/**
 * The Connected Football catalog (server): what DUBID and OFFSIDES say is open right now.
 *  · DUBID  — game.leagues_public (anon-granted, DUBID's own public RPC): status, round, lock, canSubmit per format.
 *  · OFFSIDES — today's visible matches and their arenas, read-only through public.worker_marketing_live_data (service role).
 * The same reads feed the social plan's live slots (lib/marketing/run.ts), so a post and a card agree.
 * Cached one minute; a read that fails is null (unknown) — never "nothing is open", never a guess.
 */
const TTL = 60_000
let cache: {at: number; value: Catalog} | null = null
let inflight: Promise<Catalog> | null = null

const base = () => (process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
async function call(name: string, key: string, profile?: string): Promise<unknown> {
  const r = await fetch(`${base()}/rest/v1/rpc/${name}`, {method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(5000),
    headers: {apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', ...(profile ? {'content-profile': profile, 'accept-profile': profile} : {})}, body: '{}'})
  if (!r.ok) throw new Error(`${name} answered ${r.status}`)
  return r.json()
}

export async function readCatalog(): Promise<Catalog> {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', svc = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const [d, o] = await Promise.allSettled([
    base() && anon ? call('leagues_public', anon, 'game') : Promise.reject(new Error('no anon key')),
    base() && svc ? call('worker_marketing_live_data', svc) : Promise.reject(new Error('no service key')),
  ])
  const dubid = d.status === 'fulfilled' && Array.isArray(d.value) ? d.value as DubidLeague[] : null
  const live = o.status === 'fulfilled' && o.value && typeof o.value === 'object' ? o.value as {offsides?: OffsidesMatch[]} : null
  return {dubid, offsides: Array.isArray(live?.offsides) ? live!.offsides! : null, checkedAt: new Date().toISOString()}
}

export async function getCatalog(): Promise<Catalog> {
  if (cache && Date.now() - cache.at < TTL) return cache.value
  inflight ??= readCatalog().then(v => { cache = {at: Date.now(), value: v}; return v }).finally(() => { inflight = null })
  return inflight
}
