import {NextRequest, NextResponse} from 'next/server'
import {adminFromRequest} from '@/lib/master/admin'
import {audit, mutate} from '@/lib/master/store'
import {actorOf} from '@/lib/master/audit-log'
import {cronAuthorized, sameOrigin} from '@/lib/master/request'
import {getDestination} from '@/lib/final-whistle/service'
import {checkpoint, pendingAlerts, claim, complete, fail, getConfig, markSending, ownerAction, prepare, setConfig, status, uncertain} from '@/lib/matchday/service'
import {isDayKey} from '@/lib/matchday/day'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const json = (data: unknown, status = 200) => NextResponse.json(data, {status, headers: {'Cache-Control': 'no-store'}})
const body = async (r: NextRequest) => { try { return (await r.json()) as Record<string, unknown> } catch { return {} } }
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined)
const bool = (v: unknown) => (typeof v === 'boolean' ? v : undefined)

/** The scheduler's calls take the CRON secret; the owner's (status, config, resend) take the owner's session. */
const RUNNER = new Set(['prepare', 'alerts', 'claim', 'sending', 'checkpoint', 'complete', 'fail', 'uncertain'])
const JOB_ID = /^(final-whistle-owner-\d{4}-\d{2}-\d{2}-r\d{1,3}|\d{4}-\d{2}-\d{2}-dry)$/

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
      const by = str(b.by, 80) || 'runner'
      if (a === 'prepare') {
        const dryRun = b.dryRun === true
        const day = str(b.day, 10) || undefined
        if (day && !isDayKey(day)) return json({error: 'day must be YYYY-MM-DD.'}, 400)
        return json(await prepare({dryRun, day, deps: {budgetMs: 40_000, now, key: process.env.THESPORTSDB_KEY?.trim() || '123', get: async url => {
          const res = await fetch(url, {signal: AbortSignal.timeout(10_000), cache: 'no-store', headers: {accept: 'application/json', 'user-agent': 'FanLife-TodaysFootball/1.0 (daily schedule for a fan page; low volume)'}})
          if (!res.ok) throw new Error(`provider answered ${res.status}`)
          return res.json()
        }}}))
      }
      if (a === 'alerts') return json({alerts: await pendingAlerts(now), chatId: (await getDestination())?.chatId ?? null})
      if (a === 'claim') {
        const got = await claim(by, now)
        if (!got) return json({job: null})
        return json({...got, chatId: (await getDestination())?.chatId ?? null})
      }
      const id = str(b.jobId, 64)
      if (!JOB_ID.test(id)) return json({error: 'jobId is required.'}, 400)
      const res = a === 'sending' ? await markSending(id, by, now)
        : a === 'checkpoint' ? (/^[a-z0-9-]{1,24}$/.test(str(b.key, 24)) && Number.isInteger(b.messageId) ? await checkpoint(id, by, str(b.key, 24), Number(b.messageId), now) : {ok: false as const, error: 'key and messageId are required.'})
        : a === 'complete' ? await complete(id, by, now)
        : a === 'fail' ? await fail(id, by, {error: str(b.error), retryable: b.retryable === true, retryAfterSec: num(b.retryAfterSec, 1, 3600), definite: b.definite === true}, now)
        : await uncertain(id, by, {error: str(b.error)}, now)
      return json(res, res.ok ? 200 : 409)
    }
    // owner
    const admin = adminFromRequest(r)
    if (!admin) return json({error: 'Sign in to the control room first.', login: '/master/login'}, 401)
    sameOrigin(r)
    const b = await body(r)
    const who = {actor: actorOf(admin).actor, role: actorOf(admin).role}
    if (a === 'config') {
      const before = await getConfig()
      const patch = {
        ...(bool(b.enabled) !== undefined ? {enabled: b.enabled as boolean} : {}), ...(bool(b.dryRun) !== undefined ? {dryRun: b.dryRun as boolean} : {}),
        ...(bool(b.allClubs) !== undefined ? {allClubs: b.allClubs as boolean} : {}), ...(bool(b.allowMissingCrests) !== undefined ? {allowMissingCrests: b.allowMissingCrests as boolean} : {}),
        ...(bool(b.sendEmptyDay) !== undefined ? {sendEmptyDay: b.sendEmptyDay as boolean} : {}), ...(bool(b.sendPartial) !== undefined ? {sendPartial: b.sendPartial as boolean} : {}),
        ...(num(b.sendHour, 0, 12) !== undefined ? {sendHour: Math.round(num(b.sendHour, 0, 12)!)} : {}),
        ...(Array.isArray(b.clubIds) ? {clubIds: b.clubIds.filter((x): x is string => typeof x === 'string').slice(0, 40)} : {}),
      }
      const after = await setConfig(patch)
      await mutate(s => audit(s, 'matchday.config', 'matchday', JSON.stringify(patch), {...who, before: JSON.stringify(before), after: JSON.stringify(after)}))
      return json(after)
    }
    if (a === 'retry' || a === 'dismiss' || a === 'revise') {
      const id = str(b.jobId, 64)
      if (!JOB_ID.test(id)) return json({error: 'jobId is required.'}, 400)
      const res = await ownerAction(id, a, now)
      await mutate(s => audit(s, `matchday.${a}`, id, '', who))
      return json(res, res.ok ? 200 : 409)
    }
    return json({error: 'Unknown action.'}, 404)
  } catch (e) {
    const m = String((e as Error).message ?? e)
    return json({error: m}, /origin|durable store/i.test(m) ? 409 : /cannot identify|send hour/i.test(m) ? 400 : 500)
  }
}
