import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {NextRequest, NextResponse} from 'next/server'
import {prepare, type Due} from '@/lib/marketing/run'
import {metaEnv} from '@/lib/marketing/metaStore'
import {runMetaSocial} from '@/lib/stories/metaSocial'
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
type Meta = {facebook: string; instagram: string; line: string; story?: boolean}
/** published on both Facebook and Instagram, and nothing else (TikTok) asked of the owner */
function done_everywhere(meta: Meta, kit: unknown): boolean {
  const to = (kit as {to?: unknown} | null)?.to
  if (Array.isArray(to) && to.includes('tiktok')) return false
  return meta.facebook.startsWith('published') && meta.instagram.startsWith('published')
}
/** the one line for a post that went out by itself: what it was and where */
function quietLine(msg: string, meta: Meta): string {
  const head = String(msg).split('\n').find(l => l.includes('📌')) || ''
  const what = head.replace(/<[^>]+>/g, '').replace(/^📌\s*/, '').split('·').slice(0, 2).join('·').trim()
  const hook = (String(msg).match(/<b>HOOK<\/b>\n<b>([^<]+)<\/b>/)?.[1] || String(msg).match(/<pre>([^<\n]{1,90})/)?.[1] || '').trim()
  return `✅ <b>Published</b> · Facebook + Instagram${meta.story ? ' stories' : ''} · ${what}${hook ? `\n<i>${hook.slice(0, 90)}</i>` : ''}`
}
/** docs/fanlife/53-meta-publishing.md — the same module the GitHub backup imports */
async function publish(p: Due, pngs: Buffer[]): Promise<Meta> {
  try {
    const file = pathToFileURL(path.join(process.cwd(), 'scripts/marketing/meta-publish.mjs')).href
    const mod = await import(/* webpackIgnore: true */ file)
    return await mod.publishToMeta(p, pngs, {env: await metaEnv()})
  } catch (e) { return {facebook: 'error', instagram: 'error', line: `⚠️ Meta publisher failed to load: ${String((e as Error)?.message || e).slice(0, 120)}`} }
}
/** docs/fanlife/54-x-publishing.md — the business X account, same once-only rule */
async function publishX(p: Due, pngs: Buffer[]): Promise<{x: string; line: string}> {
  try {
    const file = pathToFileURL(path.join(process.cwd(), 'scripts/marketing/x-publish.mjs')).href
    const mod = await import(/* webpackIgnore: true */ file)
    return await mod.publishToX(p, pngs)
  } catch (e) { return {x: 'error', line: `⚠️ X publisher failed to load: ${String((e as Error)?.message || e).slice(0, 120)}`} }
}
/** what happened to the picture — returned in the tick's answer so a missing image says why */
async function sendVisuals(token: string, chat: string, kit: unknown, {pngs, why}: {pngs: Buffer[]; why: string | null}): Promise<string> {
  const brief = (kit as {data?: {briefing?: boolean}} | null)?.data?.briefing === true
  if (!pngs.length) return `none: ${why}`
  const note = why ? ` (own layout failed, app card sent: ${why.split('\n')[0]!.slice(0, 160)})` : ''
  const form = new FormData()
  form.append('chat_id', chat)
  form.append('disable_notification', 'true')
  if (pngs.length === 1) {
    form.append('photo', new Blob([new Uint8Array(pngs[0]!)], {type: 'image/png'}), 'post.png')
    form.append('caption', brief ? '☀️ Morning briefing — today at a glance. Details follow.' : '🎨 Ready-made visual — the post follows.')
  } else {
    form.append('media', JSON.stringify(pngs.map((_, i) => ({type: 'photo', media: `attach://s${i}`, ...(i ? {} : {caption: brief ? '☀️ Morning briefing — today at a glance. Details follow.' : `🎨 Ready-made carousel — ${pngs.length} slides. The post follows.`})}))))
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
  const done: {id: number; outcome: string; visual: string; facebook?: string; instagram?: string; x?: string}[] = []
  const cache = {}
  for (const due of got.posts || []) {
    // a live slot (matches, results, a DUBID round, OFFSIDES today) is composed now from real data, or stays quiet
    const p = await prepare(due, new Date(), cache).catch(() => null)
    if (!p) { done.push({id: due.id, outcome: 'skipped', visual: '-'}); continue }
    const drawn = await visuals(p.msg, p.kit)
    // the business Page + its Instagram (off unless META_AUTOPUBLISH=1); tried once, and the result is printed on the draft
    const meta = await publish(p, drawn.pngs)
    const x = await publishX(p, drawn.pngs)
    // plan v5: a post published everywhere it was meant to go reaches Telegram as one quiet line; anything that still
    // needs hands (TikTok, a refusal, Meta switched off) comes as the full copy-paste draft with its pictures
    const quiet = done_everywhere(meta, p.kit)
    const visual = quiet ? 'not sent (published)' : await sendVisuals(token, p.chat_id, p.kit, drawn).catch(e => `error: ${String(e).slice(0, 200)}`)
    const tiktok = Array.isArray((p.kit as {to?: unknown} | null)?.to) && ((p.kit as {to: string[]}).to).includes('tiktok') ? '📱 <b>TikTok</b>: post these slides as a photo carousel (Photo mode); caption and tags from the box below.' : ''
    const head = [meta.line, x.line, tiktok].filter(Boolean).join('\n')
    const text = quiet ? quietLine(p.msg, meta) : head ? `${head}\n${p.msg}` : p.msg
    const sent = await tg(token, 'sendMessage', {chat_id: p.chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true, disable_notification: quiet})
    const outcome = sent.ok ? 'sent' : sent.unknown || (sent.status ?? 0) >= 500 ? 'unknown' : 'refused'
    const error = sent.ok ? null : String(sent.description || `status ${sent.status}`).split(token).join('[token]').slice(0, 300)
    await rpc('worker_marketing_report', {p_id: p.id, p_outcome: outcome, p_error: error})
    // plan v6: where it went out, for the morning briefing's ✅ / ✋ / ❌ (best effort: the post is out either way)
    await rpc('worker_marketing_published', {p_id: p.id, p_result: {facebook: meta.facebook || null, instagram: meta.instagram || null, x: x.x || null}}).catch(() => null)
    done.push({id: p.id, outcome, visual, facebook: meta.facebook, instagram: meta.instagram, x: x.x})
  }
  // the studio's Reels and posts on Facebook and Instagram, on this five-minute clock (lib/stories/metaSocial.ts)
  const studio = await runMetaSocial().catch(() => [] as string[])
  return json({ok: true, done, studio})
}
