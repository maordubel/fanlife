import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {NextRequest, NextResponse} from 'next/server'
import {prepare, type Due} from '@/lib/marketing/run'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60
const json = (d: unknown, s = 200) => NextResponse.json(d, {status: s, headers: {'Cache-Control': 'no-store'}})

/**
 * FAN LIFE social plan — the tick (docs/fanlife/51-marketing-telegram.md). pg_cron POSTs {nonce} every 5 minutes;
 * the nonce is one-time and minted by the database, so this route needs no secret of its own: it trades the nonce
 * for the due posts (worker_marketing_tick, service role), sends each — kit picture first, then the copy — with the
 * bot token this deployment already holds, and reports Telegram's answer. A forged or reused nonce gets nothing.
 */
const STORE = () => (process.env.FAN_LIFE_STORE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
async function rpc(name: string, body: Record<string, unknown>) {
  const url = STORE(), key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {method: 'POST', headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20_000)})
  return res.ok ? res.json().catch(() => null) : null
}
type TG = {ok?: boolean; status?: number; unknown?: boolean; description?: string}
const tg = (token: string, method: string, body: FormData | Record<string, unknown>): Promise<TG> =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body), headers: body instanceof FormData ? undefined : {'content-type': 'application/json'}, signal: AbortSignal.timeout(25_000)})
    .then(async r => ({status: r.status, ...(await r.json().catch(() => ({})))})).catch(e => ({unknown: true, description: String(e?.name || e)}))

/** The kit renderer is plain ESM under scripts/; it is traced into this function and loaded at run time. */
async function visuals(msg: string, kit: unknown): Promise<{pngs: Buffer[]; why: string | null}> {
  try {
    const file = pathToFileURL(path.join(process.cwd(), 'scripts/marketing/kit/visual.mjs')).href
    const mod = await import(/* webpackIgnore: true */ file)
    const pngs: Buffer[] = await mod.visualsFor(msg, kit ?? null)
    return {pngs, why: mod.lastError || (pngs.length ? null : 'nothing to draw')}
  } catch (e) { return {pngs: [], why: `load: ${String((e as Error)?.stack || e).slice(0, 400)}`} }
}
/** what happened to the picture — returned in the tick's answer so a missing image says why */
async function sendVisuals(token: string, chat: string, msg: string, kit: unknown): Promise<string> {
  const {pngs, why} = await visuals(msg, kit)
  if (!pngs.length) return `none: ${why}`
  const note = why ? ` (own layout failed, app card sent: ${why.split('\n')[0]!.slice(0, 160)})` : ''
  const form = new FormData()
  form.append('chat_id', chat)
  form.append('disable_notification', 'true')
  if (pngs.length === 1) {
    form.append('photo', new Blob([new Uint8Array(pngs[0]!)], {type: 'image/png'}), 'post.png')
    form.append('caption', '🎨 Ready-made visual — the post follows.')
  } else {
    form.append('media', JSON.stringify(pngs.map((_, i) => ({type: 'photo', media: `attach://s${i}`, ...(i ? {} : {caption: `🎨 Ready-made carousel — ${pngs.length} slides. The post follows.`})}))))
    pngs.forEach((b, i) => form.append(`s${i}`, new Blob([new Uint8Array(b)], {type: 'image/png'}), `slide-${i + 1}.png`))
  }
  const r = await tg(token, pngs.length === 1 ? 'sendPhoto' : 'sendMediaGroup', form)
  return r.ok ? `sent ${pngs.length}${note}` : `refused: ${String(r.description || r.status).split(token).join('[token]').slice(0, 200)}`
}

export async function POST(r: NextRequest) {
  let b: {nonce?: unknown} = {}
  try { b = await r.json() } catch { /* empty */ }
  const nonce = typeof b.nonce === 'string' && /^[0-9a-f-]{36}$/i.test(b.nonce) ? b.nonce : null
  if (!nonce) return json({ok: false}, 400)
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || ''
  const got = await rpc('worker_marketing_tick', {p_nonce: nonce}) as {ok?: boolean; probe?: boolean; chat_id?: string; posts?: Due[]} | null
  if (!got?.ok) return json({ok: false}, 403)
  if (!token) return json({ok: false, error: 'TELEGRAM_BOT_TOKEN is not set on this deployment.'}, 503)
  if (got.probe) {
    const c = got.chat_id ? await tg(token, 'getChat', {chat_id: got.chat_id}) : {ok: false, description: 'no chat'}
    // the probe also draws one sample picture (sent nowhere), so a broken renderer shows itself without waiting for a slot
    const sample = await visuals('📌 Post · <b>FAN LIFE</b>\n\n🪝 <b>HOOK</b>\n<b>Football. Forever.</b>\n\n🎨 <i>Visual: T1 Quote card.</i>', null)
    return json({ok: true, probe: true, reachable: !!c.ok, why: c.ok ? null : String(c.description || c.status).slice(0, 120), render: sample.pngs.length ? `ok ${sample.pngs[0]!.length} bytes` : sample.why})
  }
  const done: {id: number; outcome: string; visual: string}[] = []
  const cache = {}
  for (const due of got.posts || []) {
    // a live slot (matches, results, a DUBID round, OFFSIDES today) is composed now from real data, or stays quiet
    const p = await prepare(due, new Date(), cache).catch(() => null)
    if (!p) { done.push({id: due.id, outcome: 'skipped', visual: '-'}); continue }
    const visual = await sendVisuals(token, p.chat_id, p.msg, p.kit).catch(e => `error: ${String(e).slice(0, 200)}`)
    const sent = await tg(token, 'sendMessage', {chat_id: p.chat_id, text: p.msg, parse_mode: 'HTML', disable_web_page_preview: true})
    const outcome = sent.ok ? 'sent' : sent.unknown || (sent.status ?? 0) >= 500 ? 'unknown' : 'refused'
    const error = sent.ok ? null : String(sent.description || `status ${sent.status}`).split(token).join('[token]').slice(0, 300)
    await rpc('worker_marketing_report', {p_id: p.id, p_outcome: outcome, p_error: error})
    done.push({id: p.id, outcome, visual})
  }
  return json({ok: true, done})
}
