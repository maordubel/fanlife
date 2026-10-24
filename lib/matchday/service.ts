import 'server-only'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'
import {eligibleClubIds} from '@/lib/final-whistle/eligibility'
import {teamIdFor} from '@/lib/final-whistle/service'
import {readState} from '@/lib/master/store'
import {alertText, headerCaption, instagramCaption, textPackage} from './caption'
import {buildSnapshot, errorClubDay, lookClub} from './collect'
import {dayBounds, dayKeyOf, isDayKey} from './day'
import {listDocs, readDoc, updateDoc} from './store'
import {DEFAULT_CONFIG, DESTINATION_ID, ERROR_HOLD_MS, FRESH_MS, LEASE_MS, MAX_ATTEMPTS, type ClubDay, type Config, type Job, type JobMode, type PrepareProgress, type Snapshot} from './types'

const iso = (d: Date) => d.toISOString()
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
export type Deps = {get: (url: string) => Promise<unknown>; now: Date; key: string; pause?: (ms: number) => Promise<void>; budgetMs?: number; clock?: () => number}

// ───────────── config
export async function getConfig(): Promise<Config> { return {...DEFAULT_CONFIG, ...(await readDoc<Partial<Config>>('config.json', {})).value} }
export async function setConfig(patch: Partial<Config>): Promise<Config> {
  if (patch.clubIds) {
    const known = new Set(FIXTURE_TEAMS.map(t => t.clubId))
    const bad = patch.clubIds.filter(c => !known.has(c))
    if (bad.length) throw new Error(`The provider cannot identify: ${bad.join(', ')}.`)
  }
  if (patch.sendHour !== undefined && !(Number.isInteger(patch.sendHour) && patch.sendHour >= 0 && patch.sendHour <= 12)) throw new Error('The send hour must be 0–12.')
  return updateDoc<Partial<Config>>('config.json', {}, cur => ({...DEFAULT_CONFIG, ...cur, ...patch})).then(c => ({...DEFAULT_CONFIG, ...c}))
}

// ───────────── prepare: look at the provider (resumable), then close ONE snapshot and make the job
const clubName = (id: string) => FIXTURE_TEAMS.find(t => t.clubId === id)?.search ?? id
const clubDocName = (day: string, id: string) => `days/${day}/clubs/${id}.json`
const jobName = (day: string, rev: number, dry: boolean) => dry ? `jobs/${day}-dry.json` : `jobs/${day}-r${rev}.json`

const settled = (c: ClubDay | null, now: Date) => !!c && now.getTime() - Date.parse(c.fetchedAt) < (c.coverage === 'error' ? ERROR_HOLD_MS : FRESH_MS)

export async function prepare(o: {deps: Deps; dryRun?: boolean; day?: string}): Promise<{enabled: boolean; skipped?: string; progress?: PrepareProgress; job?: Pick<Job, 'id' | 'state' | 'mode' | 'revision'> | null}> {
  const {deps} = o, now = deps.now, cfg = await getConfig()
  const dry = o.dryRun === true
  if (!cfg.enabled && !dry) return {enabled: false}
  if (o.day !== undefined && !(dry && isDayKey(o.day))) throw new Error('A chosen day is only allowed for a dry run, and must be YYYY-MM-DD.')
  const day = o.day ?? dayKeyOf(now)
  const state = await readState()
  const clubs = eligibleClubIds(state, cfg)
  const unmapped = (cfg.allClubs ? state.clubs.map(c => c.id) : cfg.clubIds).filter(id => !FIXTURE_TEAMS.some(t => t.clubId === id)).sort()
  const docs = new Map<string, ClubDay | null>(await Promise.all(clubs.map(async id => [id, (await readDoc<ClubDay | null>(clubDocName(day, id), null)).value] as const)))
  const stale = clubs.filter(id => !settled(docs.get(id) ?? null, now)).sort((a, b) => (docs.get(a)?.fetchedAt ?? '').localeCompare(docs.get(b)?.fetchedAt ?? '') || a.localeCompare(b))
  const t0 = (deps.clock ?? Date.now)(), pause = deps.pause ?? sleep
  let looked = 0
  for (const id of stale) {
    if (looked > 0 && deps.budgetMs && (deps.clock ?? Date.now)() - t0 > deps.budgetMs) break
    let doc: ClubDay
    try {
      const teamId = await teamIdFor(id, {get: deps.get, now, key: deps.key, pause})
      if (!teamId) doc = errorClubDay(id, null, 'provider team not identified', iso(now))
      else {
        try { doc = await lookClub({clubId: id, teamId, day, key: deps.key, get: deps.get, pause, now}) }
        catch (e) { doc = errorClubDay(id, teamId, String((e as Error).message ?? e), iso(now)) }
        await pause(2200)
      }
    } catch (e) { doc = errorClubDay(id, null, String((e as Error).message ?? e), iso(now)) }
    await updateDoc<ClubDay | null>(clubDocName(day, id), null, () => doc)
    docs.set(id, doc); looked++
  }
  const open = clubs.filter(id => !settled(docs.get(id) ?? null, now))
  const progress: PrepareProgress = {day, clubs: clubs.length, looked, settled: clubs.length - open.length, done: open.length === 0}
  if (!progress.done) return {enabled: true, progress}
  const snapshot = buildSnapshot({day, now, clubs: clubs.map(id => docs.get(id)!), unmappedClubIds: unmapped})
  const job = await upsertJob(snapshot, cfg, dry, now)
  return {enabled: true, progress, job: job ? {id: job.id, state: job.state, mode: job.mode, revision: job.revision} : null}
}

function modeFor(s: Snapshot, cfg: Config): {mode: JobMode; state: Job['state']; note: string | null} {
  if (s.coverage === 'unavailable') return {mode: 'blocked', state: 'needs_review', note: 'The provider could not be read for any club — nothing was drawn and no “no games” graphic was made.'}
  if (!cfg.sendPartial && s.coverage === 'partial') return {mode: 'blocked', state: 'needs_review', note: 'Coverage is partial and partial packages are switched off.'}
  if (!s.fixtures.length && s.coverage === 'complete' && !cfg.sendEmptyDay) return {mode: 'blocked', state: 'superseded', note: 'No games today and empty days are switched off.'}
  if (s.missingCrests.length && !cfg.allowMissingCrests) return {mode: 'text', state: 'ready', note: `Graphics withheld: no crest on file for ${s.missingCrests.join(', ')}.`}
  return {mode: 'images', state: 'ready', note: null}
}

/** One job per day and revision. Before anything is sent a changed snapshot replaces the job's data; after it is sent, nothing changes by itself. */
async function upsertJob(snapshot: Snapshot, cfg: Config, dry: boolean, now: Date): Promise<Job | null> {
  const day = snapshot.day
  const existing = (await listDocs<Job>('jobs/')).filter(j => j.day === day && (dry ? j.dryRun && j.id.endsWith('-dry') : !j.id.endsWith('-dry')))
  const latest = existing.sort((a, b) => b.revision - a.revision)[0] ?? null
  if (latest && !['ready', 'needs_review', 'retryable_failed'].includes(latest.state)) return latest // in flight or finished: leave it
  const revision = latest?.revision ?? 1
  const m = modeFor(snapshot, cfg)
  const id = dry ? `${day}-dry` : `${DESTINATION_ID}-${day}-r${revision}`
  const notBefore = dry ? iso(now) : iso(new Date(dayBounds(day, cfg.sendHour).sendAt))
  return updateDoc<Job | null>(jobName(day, revision, dry), null, cur => {
    if (cur && !['ready', 'needs_review', 'retryable_failed'].includes(cur.state)) return cur
    if (cur && cur.snapshot.hash === snapshot.hash && cur.mode === m.mode && cur.dryRun === dry) return cur
    return {
      id, day, revision, kind: cur?.kind ?? 'DAILY', destinationId: DESTINATION_ID, state: m.state, mode: m.mode, snapshot,
      delivered: cur?.delivered ?? {}, dryRun: dry || cfg.dryRun, notBefore, createdAt: cur?.createdAt ?? iso(now), updatedAt: iso(now),
      attempts: cur?.attempts ?? 0, lease: null, retryAfter: null, sentAt: null, note: m.note,
    }
  })
}

// ───────────── claim / transitions
const claimable = (j: Job, now: Date) => Date.parse(j.notBefore) <= now.getTime() && (j.state === 'ready' || (j.state === 'retryable_failed' && (!j.retryAfter || Date.parse(j.retryAfter) <= now.getTime())) || (j.state === 'rendering' && !!j.lease && Date.parse(j.lease.until) <= now.getTime()))

export async function sweepLeases(now: Date) {
  for (const j of await listDocs<Job>('jobs/')) {
    if (j.state === 'sending' && j.lease && Date.parse(j.lease.until) <= now.getTime())
      await updateDoc<Job | null>(jobName(j.day, j.revision, j.id.endsWith('-dry')), null, cur => (cur && cur.state === 'sending' && cur.lease && Date.parse(cur.lease.until) <= now.getTime() ? {...cur, state: 'delivery_unknown', lease: null, updatedAt: iso(now), note: 'The runner stopped while sending, so it is not known what reached Telegram — check the chat before resending.'} : cur))
  }
}
const nameOf = (id: string) => clubName(id)
export const textsFor = (j: Job) => ({
  header: headerCaption(j.snapshot, nameOf), caption: instagramCaption(j.snapshot),
  text: textPackage(j.snapshot, j.note ?? 'Graphics are not included today.'), alert: alertText(j.snapshot, j.note ?? 'Needs a look.'),
})

export async function claim(by: string, now: Date): Promise<{job: Job; texts: ReturnType<typeof textsFor>} | null> {
  await sweepLeases(now)
  const jobs = (await listDocs<Job>('jobs/')).filter(j => claimable(j, now)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const j of jobs) {
    let won = false
    const next = await updateDoc<Job | null>(jobName(j.day, j.revision, j.id.endsWith('-dry')), null, cur => {
      won = false
      if (!cur || !claimable(cur, now)) return cur
      if (cur.attempts >= MAX_ATTEMPTS) return {...cur, state: 'needs_review', note: `gave up after ${MAX_ATTEMPTS} attempts`, updatedAt: iso(now)}
      won = true
      return {...cur, state: 'rendering', attempts: cur.attempts + 1, lease: {by, until: iso(new Date(now.getTime() + LEASE_MS))}, updatedAt: iso(now)}
    })
    if (won && next) return {job: next, texts: textsFor(next)}
  }
  return null
}

type Step = (cur: Job) => Job | {error: string}
async function transition(id: string, by: string, now: Date, step: Step): Promise<{ok: true; job: Job} | {ok: false; error: string}> {
  const [day, rev, dry] = parseId(id)
  if (!day) return {ok: false, error: 'unknown job'}
  let err: string | null = null
  const next = await updateDoc<Job | null>(jobName(day, rev, dry), null, cur => {
    err = null
    if (!cur) { err = 'unknown job'; return cur }
    if (cur.lease && cur.lease.by !== by) { err = 'the job is leased to another runner'; return cur }
    const r = step(cur)
    if ('error' in r) { err = r.error; return cur }
    return {...r, updatedAt: iso(now)}
  })
  return err || !next ? {ok: false, error: err ?? 'unknown job'} : {ok: true, job: next}
}
function parseId(id: string): [string | null, number, boolean] {
  const dry = id.match(/^(\d{4}-\d{2}-\d{2})-dry$/); if (dry) return [dry[1]!, 1, true]
  const m = id.match(/^[a-z-]+-(\d{4}-\d{2}-\d{2})-r(\d+)$/); return m ? [m[1]!, Number(m[2]), false] : [null, 0, false]
}
export const markSending = (id: string, by: string, now: Date) => transition(id, by, now, c => c.state === 'sending' ? c : c.state !== 'rendering' ? {error: `cannot send from ${c.state}`} : {...c, state: 'sending', lease: {by, until: iso(new Date(now.getTime() + LEASE_MS))}})
/** remember one delivered part the moment Telegram confirmed it (so a restart never sends it again) */
export const checkpoint = (id: string, by: string, key: string, messageId: number, now: Date) => transition(id, by, now, c => !(['rendering', 'sending'].includes(c.state) || (key === 'alert' && c.state === 'needs_review')) ? {error: `cannot record from ${c.state}`} : {...c, delivered: {...c.delivered, [key]: messageId}})
export const complete = (id: string, by: string, now: Date) => transition(id, by, now, c => c.state === 'sent' ? c : !['rendering', 'sending'].includes(c.state) ? {error: `cannot complete from ${c.state}`} : {...c, state: 'sent', lease: null, sentAt: iso(now), note: c.dryRun ? 'Dry run: drawn and checked, nothing was sent.' : c.note})
export const fail = (id: string, by: string, o: {error: string; retryable: boolean; retryAfterSec?: number; definite?: boolean}, now: Date) => transition(id, by, now, c =>
  c.state === 'sent' ? c
    : c.state === 'sending' && !o.definite ? {...c, state: 'delivery_unknown', lease: null, note: `${o.error.slice(0, 200)} — check the chat before resending`}
    : o.retryable && c.attempts < MAX_ATTEMPTS ? {...c, state: 'retryable_failed', lease: null, retryAfter: iso(new Date(now.getTime() + (o.retryAfterSec ?? 120 * c.attempts) * 1000)), note: o.error.slice(0, 300)}
    : {...c, state: 'needs_review', lease: null, note: o.error.slice(0, 300)})
export const uncertain = (id: string, by: string, o: {error: string}, now: Date) => transition(id, by, now, c => c.state === 'sent' ? c : {...c, state: 'delivery_unknown', lease: null, note: `${o.error.slice(0, 200)} — check the chat before resending`})

/** the owner's decisions; never automatic */
export async function ownerAction(id: string, action: 'retry' | 'dismiss' | 'revise', now: Date) {
  const [day, rev, dry] = parseId(id)
  if (!day) return {ok: false as const, error: 'unknown job'}
  let err: string | null = null
  if (action === 'revise') {
    const cur = (await readDoc<Job | null>(jobName(day, rev, dry), null)).value
    if (!cur || cur.state !== 'sent' || cur.dryRun) return {ok: false as const, error: 'Only a package that was really sent can be revised.'}
    const next = await updateDoc<Job | null>(jobName(day, rev + 1, false), null, c => c ?? {...cur, id: `${DESTINATION_ID}-${day}-r${rev + 1}`, revision: rev + 1, kind: 'UPDATED', state: 'ready', delivered: {}, notBefore: iso(now), createdAt: iso(now), updatedAt: iso(now), attempts: 0, lease: null, retryAfter: null, sentAt: null, note: 'UPDATED SCHEDULE — started by the owner; the next prepare run refreshes its data.'})
    return {ok: true as const, job: next!}
  }
  const next = await updateDoc<Job | null>(jobName(day, rev, dry), null, cur => {
    err = null
    if (!cur) { err = 'unknown job'; return cur }
    if (!['retryable_failed', 'needs_review', 'delivery_unknown'].includes(cur.state)) { err = `a ${cur.state} job cannot be changed`; return cur }
    return action === 'retry'
      ? {...cur, state: 'ready', attempts: 0, lease: null, retryAfter: null, updatedAt: iso(now), note: cur.state === 'delivery_unknown' ? 'resent by the owner after an unknown delivery — may be a duplicate' : 'resent by the owner'}
      : {...cur, state: 'superseded', lease: null, updatedAt: iso(now), note: 'dismissed by the owner'}
  })
  return err || !next ? {ok: false as const, error: err ?? 'unknown job'} : {ok: true as const, job: next}
}

/** blocked days the owner has not yet been told about (one Telegram alert per job, recorded under the key 'alert') */
export async function pendingAlerts(now: Date) {
  return (await listDocs<Job>('jobs/')).filter(j => j.mode === 'blocked' && j.state === 'needs_review' && !j.dryRun && !j.delivered.alert && Date.parse(j.notBefore) <= now.getTime())
    .map(j => ({jobId: j.id, text: textsFor(j).alert}))
}

export async function status() {
  const [config, jobs] = await Promise.all([getConfig(), listDocs<Job>('jobs/')])
  return {config, jobs: jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 14).map(j => ({id: j.id, day: j.day, revision: j.revision, kind: j.kind, state: j.state, mode: j.mode, dryRun: j.dryRun, notBefore: j.notBefore, attempts: j.attempts, note: j.note, sentAt: j.sentAt,
    coverage: j.snapshot.coverage, fixtures: j.snapshot.fixtures.length, updatedAt: j.snapshot.updatedAt, missingClubIds: j.snapshot.missingClubIds, missingCrests: j.snapshot.missingCrests, excluded: j.snapshot.excluded.length}))}
}
