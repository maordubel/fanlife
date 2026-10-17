import 'server-only'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import {parseFinals, parseTeam, providerUrl} from '@/lib/fixtures/provider'
import {readState} from '@/lib/master/store'
import {eligibleClubIds} from './eligibility'
import {jobId, scoreFingerprint} from './fingerprint'
import {morningAfter} from './athens'
import {afterBootstrap, emptyWatch, observe, toFinalResult} from './verify'
import {listDocs, readDoc, updateDoc} from './store'
import {parseS365Finals, parseS365Team, s365ResultsUrl, s365SearchUrl} from './s365'
import {DEFAULT_CONFIG, DESTINATION_ID, LEASE_MS, MAX_ATTEMPTS, type Config, type Delivered, type Destination, type Job, type RunInfo, type Watch} from './types'

export type Deps = {get: (url: string) => Promise<unknown>; now: Date; key: string; pause?: (ms: number) => Promise<void>; /** stop starting new clubs after this many ms (the route has 60 s); the rest go first next run */ budgetMs?: number; clock?: () => number}
/** the provider's free tier allows 30 requests a minute; one every 2.2 s stays under it */
const PROVIDER_GAP_MS = 2200
/** an event older than this is history unless it was already being watched */
const MAX_AGE_MS = 72 * 3600_000
const iso = (d: Date) => d.toISOString()

// ───────────── config and destination
export async function getConfig(): Promise<Config> { return {...DEFAULT_CONFIG, ...(await readDoc<Partial<Config>>('config.json', {})).value} }
export async function setConfig(patch: Partial<Pick<Config, 'enabled' | 'dryRun' | 'clubIds' | 'allClubs' | 'delivery'>>, now: Date): Promise<Config> {
  if (patch.clubIds) {
    const known = new Set(FIXTURE_TEAMS.map(t => t.clubId))
    const bad = patch.clubIds.filter(c => !known.has(c))
    if (bad.length) throw new Error(`The provider cannot identify: ${bad.join(', ')}.`)
  }
  return updateDoc<Partial<Config>>('config.json', {}, cur => {
    const next = {...DEFAULT_CONFIG, ...cur, ...patch}
    // switching on starts the clock: nothing that kicked off before this moment is ever sent (no history spam)
    if (next.enabled && !next.bootstrapAt) next.bootstrapAt = iso(now)
    return next
  }).then(c => ({...DEFAULT_CONFIG, ...c}))
}
export async function reportDelivery(configured: boolean, now: Date) {
  const cur = await getConfig()
  if (cur.deliveryConfigured === configured && cur.deliverySeenAt && now.getTime() - Date.parse(cur.deliverySeenAt) < 6 * 3600_000) return
  await updateDoc<Partial<Config>>('config.json', {}, c => ({...DEFAULT_CONFIG, ...c, deliveryConfigured: configured, deliverySeenAt: iso(now)}))
}
export async function getDestination(): Promise<Destination | null> { return (await readDoc<Destination | null>('destination.json', null)).value }
export const linkDestination = (chatId: string, now: Date) => updateDoc<Destination | null>('destination.json', null, () => ({chatId, linkedAt: iso(now)}))

// ───────────── discover: look at the provider, fold into watches, make jobs
const watchName = (clubId: string, eventId: string) => `watch/${clubId}~${eventId}.json`
const jobName = (id: string) => `jobs/${id}.json`

async function teamIdFor(clubId: string, deps: Deps): Promise<string | null> {
  const known = (await readDoc<Record<string, string>>('teams.json', {})).value[clubId]
  if (known) return known
  const team = FIXTURE_TEAMS.find(t => t.clubId === clubId)
  if (!team) return null
  for (const term of [team.search, ...(team.searchAlso ?? [])]) {
    const found = parseTeam(await deps.get(providerUrl(deps.key, `searchteams.php?t=${encodeURIComponent(term)}`)), team)
    await (deps.pause ?? sleep)(PROVIDER_GAP_MS)
    if (found) { await updateDoc<Record<string, string>>('teams.json', {}, c => ({...c, [clubId]: found.teamId})); return found.teamId }
  }
  return null
}
/** 365scores has its own team ids; kept under `<club>@365` so the two providers never mix. */
async function s365TeamIdFor(clubId: string, deps: Deps): Promise<string | null> {
  const key = `${clubId}@365`
  const known = (await readDoc<Record<string, string>>('teams.json', {})).value[key]
  if (known) return known
  const team = FIXTURE_TEAMS.find(t => t.clubId === clubId)
  if (!team) return null
  for (const term of [team.search, ...(team.searchAlso ?? [])]) {
    const found = parseS365Team(await deps.get(s365SearchUrl(term)), team)
    if (found) { await updateDoc<Record<string, string>>('teams.json', {}, c => ({...c, [key]: found})); return found }
  }
  return null
}
/** The same match seen by the other source is the same match: an existing watch of this club within this window blocks a second one. */
const SAME_MATCH_MS = 6 * 3600_000
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function discover(deps: Deps): Promise<{enabled: boolean} & Partial<RunInfo> & {pending?: number}> {
  const cfg = await getConfig()
  if (!cfg.enabled) return {enabled: false}
  const state = await readState()
  const clubs = eligibleClubIds(state, cfg)
  const run: RunInfo = {at: iso(deps.now), clubs: clubs.length, watched: 0, created: 0, errors: []}
  await sweepLeases(deps.now)
  // every club gets looked at: the one checked longest ago goes first, so a rate-limited or out-of-time run never starves the same clubs twice
  const cursor = (await readDoc<Record<string, string>>('cursor.json', {})).value
  const order = [...clubs].sort((a, b) => (cursor[a] ?? '').localeCompare(cursor[b] ?? '') || a.localeCompare(b))
  const t0 = (deps.clock ?? Date.now)()
  const looked: string[] = []
  for (const clubId of order) {
    if (deps.budgetMs && (deps.clock ?? Date.now)() - t0 > deps.budgetMs) break
    try {
      let teamId: string | null = null, finals: ReturnType<typeof parseFinals> = [], why = ''
      try {
        teamId = await teamIdFor(clubId, deps)
        if (!teamId) why = 'provider team not identified'
        else { finals = parseFinals(await deps.get(providerUrl(deps.key, `eventslast.php?id=${teamId}`))); await (deps.pause ?? sleep)(PROVIDER_GAP_MS) }
      } catch (e) { why = String((e as Error).message ?? e).slice(0, 100) }
      if (why) {
        // the first provider could not answer for this club (rate limit, unknown team): ask the second one before giving up
        try {
          teamId = await s365TeamIdFor(clubId, deps)
          if (!teamId) throw new Error('second provider team not identified')
          finals = parseS365Finals(await deps.get(s365ResultsUrl(teamId)))
          await (deps.pause ?? sleep)(1000)
        } catch (e2) { throw new Error(`${why}; then ${String((e2 as Error).message ?? e2).slice(0, 80)}`) }
      }
      if (!teamId) continue
      looked.push(clubId)
      let others: Watch[] | null = null
      for (const p of finals) {
        const f = toFinalResult(clubId, teamId, p, deps.now)
        if (!f) continue
        const existing = (await readDoc<Watch | null>(watchName(clubId, p.id), null)).value
        if (!existing) {
          others ??= await listDocs<Watch>(`watch/${clubId}~`)
          if (others.some(o => o.providerEventId !== p.id && Math.abs(Date.parse(o.kickoff) - Date.parse(f.kickoff)) < SAME_MATCH_MS)) continue
          if (!afterBootstrap(f.kickoff, cfg.bootstrapAt, false)) continue
          if (!f.dateOnly && deps.now.getTime() - Date.parse(f.kickoff) > MAX_AGE_MS) continue
        }
        const w = await updateDoc<Watch | null>(watchName(clubId, p.id), null, cur => observe(cur ?? emptyWatch(clubId, p.id, f.kickoff, f.dateOnly, teamId), f, deps.now))
        if (!w) continue
        run.watched++
        if (w.state === 'ready' && w.confirmedFingerprint && w.lastResult && scoreFingerprint(w.lastResult) === w.confirmedFingerprint) {
          if (await ensureJob(w, cfg, deps.now)) run.created++
        }
      }
    } catch (e) { run.errors.push(`${clubId}: ${String((e as Error).message ?? e).slice(0, 160)}`) }
  }
  if (looked.length) await updateDoc<Record<string, string>>('cursor.json', {}, c => ({...c, ...Object.fromEntries(looked.map(id => [id, iso(deps.now)]))}))
  run.deferred = order.length - looked.length - run.errors.length
  await updateDoc<RunInfo | null>('run.json', null, () => run)
  return {enabled: true, ...run, pending: await pendingCount(deps.now)}
}

async function ensureJob(w: Watch, cfg: Config, now: Date): Promise<boolean> {
  const f = w.lastResult!
  const id = jobId(DESTINATION_ID, w.providerEventId, w.clubId, w.confirmedFingerprint!)
  if ((w.jobs ?? []).includes(id)) return false
  const prior = w.jobs ?? []
  let made = false
  await updateDoc<Job | null>(jobName(id), null, cur => {
    made = !cur
    return cur ?? {id, destinationId: DESTINATION_ID, providerEventId: w.providerEventId, clubId: w.clubId, fingerprint: w.confirmedFingerprint!, kind: prior.length ? 'CORRECTED' : 'FINAL', state: 'ready', result: f, dryRun: cfg.dryRun, notBefore: cfg.delivery === 'live' ? null : morningAfter(f.kickoff), createdAt: iso(now), updatedAt: iso(now), attempts: 0, lease: null, retryAfter: null, delivered: {}, sentAt: null, note: null}
  })
  // a result that is corrected before it was sent supersedes the earlier job; one already sent stays as history
  for (const p of prior) await updateDoc<Job | null>(jobName(p), null, cur => (cur && ['ready', 'retryable_failed', 'needs_review'].includes(cur.state) ? {...cur, state: 'superseded', updatedAt: iso(now), note: 'replaced by a corrected result'} : cur))
  await updateDoc<Watch | null>(watchName(w.clubId, w.providerEventId), null, cur => (cur && !(cur.jobs ?? []).includes(id) ? {...cur, jobs: [...(cur.jobs ?? []), id]} : cur))
  return made
}

// ───────────── claim / transitions (the runner)
const due = (j: Job, now: Date) => !j.notBefore || Date.parse(j.notBefore) <= now.getTime()
const claimable = (j: Job, now: Date) => due(j, now) && (j.state === 'ready' || (j.state === 'retryable_failed' && (!j.retryAfter || Date.parse(j.retryAfter) <= now.getTime())) || (j.state === 'rendering' && !!j.lease && Date.parse(j.lease.until) <= now.getTime()))

/** A lease that ran out while SENDING means we cannot know whether Telegram delivered: it waits for a person, never auto-resends. */
export async function sweepLeases(now: Date) {
  for (const j of await listDocs<Job>('jobs/')) {
    if (j.state === 'sending' && j.lease && Date.parse(j.lease.until) <= now.getTime()) {
      await updateDoc<Job | null>(jobName(j.id), null, cur => (cur && cur.state === 'sending' && cur.lease && Date.parse(cur.lease.until) <= now.getTime() ? {...cur, state: 'delivery_unknown', lease: null, updatedAt: iso(now), note: 'The runner stopped while sending; Telegram may or may not have delivered. Check the chat, then resend or dismiss.'} : cur))
    }
  }
}
export async function pendingCount(now: Date) { return (await listDocs<Job>('jobs/')).filter(j => claimable(j, now)).length }

export async function claim(by: string, now: Date): Promise<{job: Job; chatId: string | null; deliveryConfigured: boolean} | null> {
  await sweepLeases(now)
  const jobs = (await listDocs<Job>('jobs/')).filter(j => claimable(j, now)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const j of jobs) {
    let won = false
    const next = await updateDoc<Job | null>(jobName(j.id), null, cur => {
      won = false
      if (!cur || !claimable(cur, now)) return cur
      if (cur.attempts >= MAX_ATTEMPTS) return {...cur, state: 'needs_review', note: `gave up after ${MAX_ATTEMPTS} attempts`, updatedAt: iso(now)}
      won = true
      return {...cur, state: 'rendering', attempts: cur.attempts + 1, lease: {by, until: iso(new Date(now.getTime() + LEASE_MS))}, updatedAt: iso(now)}
    })
    if (won && next) return {job: next, chatId: (await getDestination())?.chatId ?? null, deliveryConfigured: (await getConfig()).deliveryConfigured}
  }
  return null
}

type Step = (cur: Job) => Job | {error: string}
async function transition(id: string, by: string, now: Date, step: Step): Promise<{ok: true; job: Job} | {ok: false; error: string}> {
  let err: string | null = null
  const next = await updateDoc<Job | null>(jobName(id), null, cur => {
    err = null
    if (!cur) { err = 'unknown job'; return cur }
    if (cur.lease && cur.lease.by !== by) { err = 'the job is leased to another runner'; return cur }
    const r = step(cur)
    if ('error' in r) { err = r.error; return cur }
    return {...r, updatedAt: iso(now)}
  })
  return err || !next ? {ok: false, error: err ?? 'unknown job'} : {ok: true, job: next}
}
/** the point of no return: after this a lost answer means "unknown", never "send again" */
export const markSending = (id: string, by: string, now: Date) => transition(id, by, now, c => c.state === 'sending' ? c : c.state !== 'rendering' ? {error: `cannot send from ${c.state}`} : {...c, state: 'sending', lease: {by, until: iso(new Date(now.getTime() + LEASE_MS))}})
export async function complete(id: string, by: string, d: Delivered, now: Date) {
  const r = await transition(id, by, now, c => c.state === 'sent' ? c : !['rendering', 'sending'].includes(c.state) ? {error: `cannot complete from ${c.state}`} : {...c, state: 'sent', lease: null, delivered: {...c.delivered, ...d}, sentAt: iso(now), note: c.dryRun ? 'dry run: checked and rendered, not sent' : null})
  if (r.ok) await updateDoc<Watch | null>(watchName(r.job.clubId, r.job.providerEventId), null, w => (w && w.confirmedFingerprint === r.job.fingerprint ? {...w, state: 'done'} : w))
  return r
}
export const fail = (id: string, by: string, o: {error: string; retryable: boolean; retryAfterSec?: number; delivered?: Delivered}, now: Date) => transition(id, by, now, c =>
  c.state === 'sent' ? c : o.retryable && c.attempts < MAX_ATTEMPTS
    ? {...c, state: 'retryable_failed', lease: null, delivered: {...c.delivered, ...o.delivered}, retryAfter: iso(new Date(now.getTime() + (o.retryAfterSec ?? 120 * c.attempts) * 1000)), note: o.error.slice(0, 300)}
    : {...c, state: 'needs_review', lease: null, delivered: {...c.delivered, ...o.delivered}, note: o.error.slice(0, 300)})
export const uncertain = (id: string, by: string, o: {error: string; delivered?: Delivered}, now: Date) => transition(id, by, now, c => c.state === 'sent' ? c : {...c, state: 'delivery_unknown', lease: null, delivered: {...c.delivered, ...o.delivered}, note: `${o.error.slice(0, 200)} — check the chat before resending`})

/** The owner's decision: resend (after a failure or an unknown delivery) or dismiss. Never automatic. */
export async function ownerAction(id: string, action: 'retry' | 'dismiss', now: Date) {
  let err: string | null = null
  const next = await updateDoc<Job | null>(jobName(id), null, cur => {
    err = null
    if (!cur) { err = 'unknown job'; return cur }
    if (!['retryable_failed', 'needs_review', 'delivery_unknown'].includes(cur.state)) { err = `a ${cur.state} job cannot be changed`; return cur }
    return action === 'retry'
      ? {...cur, state: 'ready', attempts: 0, lease: null, retryAfter: null, updatedAt: iso(now), note: cur.state === 'delivery_unknown' ? 'resent by the owner after an unknown delivery — may be a duplicate' : 'resent by the owner'}
      : {...cur, state: 'superseded', lease: null, updatedAt: iso(now), note: 'dismissed by the owner'}
  })
  return err || !next ? {ok: false as const, error: err ?? 'unknown job'} : {ok: true as const, job: next}
}

export async function status() {
  const [config, dest, run, jobs, watches] = await Promise.all([getConfig(), getDestination(), readDoc<RunInfo | null>('run.json', null), listDocs<Job>('jobs/'), listDocs<Watch>('watch/')])
  return {config, linked: !!dest, linkedAt: dest?.linkedAt ?? null, lastRun: run.value,
    jobs: jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30),
    watches: {total: watches.length, byState: watches.reduce<Record<string, number>>((m, w) => ({...m, [w.state]: (m[w.state] ?? 0) + 1}), {}), needsReview: watches.filter(w => w.state === 'needs_review').map(w => ({clubId: w.clubId, providerEventId: w.providerEventId, note: w.note, home: w.lastResult?.home ?? null, away: w.lastResult?.away ?? null, status: w.lastResult?.evidence.rawStatus ?? null}))}}
}
