import 'server-only'
import {getFixtureFeed} from '@/lib/fixtures/service'
import {CORE_CLUB_IDS} from '@/lib/clubs/resolver'
import {serverFeatures} from '@/lib/features-server'
import {composeBriefing, composeDubid, composeFixtures, composeOffsides, composeResults, isLiveKind, type Composed, type LiveData} from './live'

/** The database side of the social plan (service role, server only). */
export async function rpc<T = unknown>(name: string, body: Record<string, unknown>): Promise<T | null> {
  const url = (process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, ''), key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {method: 'POST', headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20_000)})
  return res.ok ? res.json().catch(() => null) as Promise<T | null> : null
}

const NAMES: Record<string, string> = {'hapoel-tel-aviv': 'Hapoel Tel Aviv', 'hapoel-petah-tikva': 'Hapoel Petah Tikva', olympiacos: 'Olympiacos', panathinaikos: 'Panathinaikos',
  'aek-athens': 'AEK Athens', 'st-pauli': 'St. Pauli', celtic: 'Celtic', 'zrinjski-mostar': 'Zrinjski Mostar'}

export type Due = {id: number; chat_id: string; msg: string; kit?: unknown; kind?: string; send_at?: string}

/**
 * A due post as it should go out. A fixed post is returned as it is. A live slot is composed now from real data —
 * the message and its picture — and recorded (worker_marketing_compose), or skipped (worker_marketing_skip) and
 * returned as null. When the data cannot be read the slot is skipped too: a live post never guesses.
 */
export async function prepare(p: Due, now = new Date(), cache: {data?: LiveData | null} = {}): Promise<Due | null> {
  if (!isLiveKind(p.kind)) return p
  let out: Composed
  try {
    if (p.kind === 'briefing') {
      // the owner's morning briefing (operations): never switched off with a product, never deduplicated
      const feed = await getFixtureFeed(now)
      cache.data ??= await rpc<LiveData>('worker_marketing_live_data', {})
      out = composeBriefing(feed.fixtures, feed.results ?? [], CORE_CLUB_IDS, cache.data ?? {dubid: [], offsides: [], posted: []}, now, NAMES)
    } else if (p.kind === 'fixtures' || p.kind === 'results') {
      const feed = await getFixtureFeed(now)
      cache.data ??= await rpc<LiveData>('worker_marketing_live_data', {})
      const data = cache.data ?? {dubid: [], offsides: [], posted: []}
      out = p.kind === 'fixtures' ? composeFixtures(feed.fixtures, CORE_CLUB_IDS, data, now, NAMES) : composeResults(feed.results ?? [], CORE_CLUB_IDS, data, now, NAMES)
    } else if ((await serverFeatures().catch(() => null))?.universeOff.includes(p.kind!)) {
      // CF-06: a product switched off in the control room is not advertised by the social plan either
      out = {skip: `${p.kind} is switched off in Settings → Features → Universe bridge`}
    } else {
      cache.data ??= await rpc<LiveData>('worker_marketing_live_data', {})
      out = cache.data ? (p.kind === 'dubid' ? composeDubid(cache.data, now) : composeOffsides(cache.data, now)) : {skip: 'live data unavailable'}
    }
  } catch (e) { out = {skip: `live data failed: ${String((e as Error)?.message || e).slice(0, 160)}`} }
  if ('skip' in out) { await rpc('worker_marketing_skip', {p_id: p.id, p_why: out.skip}); return null }
  await rpc('worker_marketing_compose', {p_id: p.id, p_msg: out.msg, p_ref: out.refs.join(',')})
  if (cache.data && p.kind !== 'briefing') cache.data.posted.push(...out.refs)
  return {...p, msg: out.msg, kit: out.kit}
}
