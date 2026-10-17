import {issueLinkCode} from '@/lib/final-whistle/link'
import {NextRequest, NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {audit, mutate} from '@/lib/master/store'
import {actorOf} from '@/lib/master/audit-log'
import {cronAuthorized, sameOrigin} from '@/lib/master/request'
import {claim, complete, discover, fail, getConfig, getDestination, linkDestination, markSending, ownerAction, reportDelivery, setConfig, status, uncertain} from '@/lib/final-whistle/service'
import {signRender} from '@/lib/final-whistle/token'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}})
const body = async (r: NextRequest) => { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '')
const delivered = (v: unknown) => { const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>; return {...(Number.isInteger(o.photo) ? {photo: o.photo as number} : {}), ...(Number.isInteger(o.document) ? {document: o.document as number} : {})} }

/** The scheduler's own calls (discover, claim, progress, link) take the CRON secret; the owner's (status, config, resend) take the owner's session. */
const RUNNER = new Set(['ping', 'discover', 'claim', 'sending', 'complete', 'fail', 'uncertain', 'link'])

export async function GET(r: NextRequest, {params}: {params: {action: string}}) {
  try {
    if (params.action !== 'status') return json({error: 'Unknown action.'}, 404)
    if (!adminFromRequest(r) && !cronAuthorized(r)) return json({error: 'Sign in to the control room first.', login: '/master/login'}, 401)
    return json(await status())
  } catch (e) { return json({error: String((e as Error).message ?? e)}, 500) }
}

export async function POST(r: NextRequest, {params}: {params: {action: string}}) {
  const a = params.action
  try {
    const now = new Date()
    if (RUNNER.has(a)) {
      if (!cronAuthorized(r)) return json({error: 'Not authorised.'}, 401)
      const b = await body(r)
      if (a === 'ping') { const d = await getDestination(); return json({linked: !!d, chatId: d?.chatId ?? null}) }
      if (a === 'discover') {
        const q = r.nextUrl.searchParams.get('delivery')
        if (q === '0' || q === '1') await reportDelivery(q === '1', now)
        return json(await discover({budgetMs: 40_000, get: async url => {
          // the first provider's free key is shared with the world and often answers 429: no waiting here, discover asks the second provider instead
          const res = await fetch(url, {signal: AbortSignal.timeout(10_000), cache: 'no-store', headers: {accept: 'application/json', 'user-agent': 'FanLife-FinalWhistle/1.0 (results for a fan page; low volume)'}})
          if (!res.ok) throw new Error(`provider answered ${res.status}`)
          return res.json()
        }, now, key: process.env.THESPORTSDB_KEY?.trim() || '123'}))
      }
      if (a === 'claim') {
        const got = await claim(str(b.by, 80) || 'runner', now)
        if (!got) return json({job: null})
        const secret = process.env.CRON_SECRET || ''
        const {exp, sig} = signRender(secret, got.job.id, now.getTime())
        return json({...got, renderUrl: `${r.nextUrl.origin}/final-whistle-render?job=${got.job.id}&exp=${exp}&sig=${sig}`})
      }
      if (a === 'link') { const chat = str(b.chatId, 40); if (!/^-?\d{4,20}$/.test(chat)) return json({error: 'chatId must be a number.'}, 400); await linkDestination(chat, now); return json({ok: true}) }
      const id = str(b.jobId, 64), by = str(b.by, 80) || 'runner'
      if (!/^[a-f0-9]{24}$/.test(id)) return json({error: 'jobId is required.'}, 400)
      const res = a === 'sending' ? await markSending(id, by, now)
        : a === 'complete' ? await complete(id, by, delivered(b.delivered), now)
        : a === 'fail' ? await fail(id, by, {error: str(b.error), retryable: b.retryable === true, retryAfterSec: Number.isFinite(b.retryAfterSec) ? Math.min(3600, Number(b.retryAfterSec)) : undefined, delivered: delivered(b.delivered), definite: b.definite === true}, now)
        : await uncertain(id, by, {error: str(b.error), delivered: delivered(b.delivered)}, now)
      return json(res, res.ok ? 200 : 409)
    }
    // owner
    const admin = adminFromRequest(r)
    if (!admin) return json({error: 'Sign in to the control room first.', login: '/master/login'}, 401)
    sameOrigin(r)
    const b = await body(r)
    if (a === 'config') {
      const before = await getConfig()
      const patch = {...(typeof b.enabled === 'boolean' ? {enabled: b.enabled} : {}), ...(typeof b.dryRun === 'boolean' ? {dryRun: b.dryRun} : {}), ...(typeof b.allClubs === 'boolean' ? {allClubs: b.allClubs} : {}), ...(b.delivery === 'morning' || b.delivery === 'live' ? {delivery: b.delivery as 'morning' | 'live'} : {}), ...(Array.isArray(b.clubIds) ? {clubIds: b.clubIds.filter((x): x is string => typeof x === 'string').slice(0, 40)} : {})}
      const after = await setConfig(patch, now)
      await mutate(s => audit(s, 'final-whistle.config', 'final-whistle', JSON.stringify(patch), {actor: actorOf(admin).actor, role: actorOf(admin).role, before: JSON.stringify({enabled: before.enabled, dryRun: before.dryRun, clubIds: before.clubIds}), after: JSON.stringify({enabled: after.enabled, dryRun: after.dryRun, clubIds: after.clubIds})}))
      return json(after)
    }
    if (a === 'link-code') {
      const res = await issueLinkCode(now)
      await mutate(s => audit(s, 'final-whistle.link-code', 'final-whistle', '', {actor: actorOf(admin).actor, role: actorOf(admin).role}))
      return json(res)
    }
    if (a === 'retry' || a === 'dismiss') {
      const id = str(b.jobId, 64)
      if (!/^[a-f0-9]{24}$/.test(id)) return json({error: 'jobId is required.'}, 400)
      const res = await ownerAction(id, a, now)
      await mutate(s => audit(s, `final-whistle.${a}`, id, '', {actor: actorOf(admin).actor, role: actorOf(admin).role}))
      return json(res, res.ok ? 200 : 409)
    }
    return json({error: 'Unknown action.'}, 404)
  } catch (e) {
    const m = String((e as Error).message ?? e)
    return json({error: m}, /origin|durable store/i.test(m) ? 409 : 500)
  }
}
