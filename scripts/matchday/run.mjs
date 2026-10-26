/**
 * TODAY'S FOOTBALL runner (GitHub Actions). Phase 1 asks the site to look at the provider until one snapshot is closed (resumable, ~40 s per call).
 * Phase 2 claims due jobs, draws every story/post page with the kit template, checks each PNG, and — unless the job is a dry run —
 * sends it to the owner's Telegram chat, recording each delivered part so a restart never repeats one. Secrets stay in the environment.
 * Exit 0 even when a job fails: the failure is recorded on the job.
 */
import sharp from 'sharp'
import {mkdir, writeFile} from 'node:fs/promises'
import {callTelegram, pngSize, sendDocument, sendPhoto} from '../../lib/final-whistle/telegram.ts'
import {renderSvg, hasCrest, libCrestFile, LIB_CACHE} from './template.mjs'
import {existsSync} from 'node:fs'
import {CREST_BASE, crestSlug} from '../../ecosystem/crests/index.mjs'
// the day's crests from the universe's library, fetched once into the template's folder (a miss draws initials)
async function fetchCrests(fixtures) {
  await mkdir(LIB_CACHE, {recursive: true})
  for (const t of fixtures.flatMap(f => [f.home, f.away])) {
    if (hasCrest(t.id)) continue
    const file = libCrestFile(t.name), slug = crestSlug(t.name)
    if (!file || existsSync(file)) continue
    try { const r = await fetch(`${CREST_BASE}/${slug}.png`, {signal: AbortSignal.timeout(10_000)}); if (r.ok) await writeFile(file, Buffer.from(await r.arrayBuffer())) } catch { /* initials */ }
  }
}

const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const by = `gh-${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
const dryInput = process.env.DRY_RUN === '1'
const dayInput = process.env.DAY || ''
const MAX_PREPARE = 8
const PER_PAGE = 4
const sleep = ms => new Promise(r => setTimeout(r, ms))
if (!base || secret.length < 32) { console.error('FAN_LIFE_URL or the scheduler secret is missing.'); process.exit(1) }

const api = async (action, body) => {
  const r = await fetch(`${base}/api/master/matchday/${action}`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify({by, ...body}), signal: AbortSignal.timeout(65_000)})
  const j = await r.json().catch(() => ({}))
  return {status: r.status, ...j}
}
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
const foldData = d => ({...d, fixtures: d.fixtures.map(f => ({...f, home: {...f.home, name: fold(f.home.name)}, away: {...f.away, name: fold(f.away.name)}, competition: f.competition ? fold(f.competition) : null}))})
const pagesFor = n => Math.max(1, Math.ceil(n / PER_PAGE))
const nameOf = (day, format, i) => `matchday-${day}-${format}-${String(i + 1).padStart(2, '0')}.png`

async function draw(data, format, page) {
  let svg
  try { svg = renderSvg(data, format, page) } catch (e) {
    if (!/no glyph/i.test(String(e?.message))) throw e
    svg = renderSvg(foldData(data), format, page) // a missing diacritic is drawn plain, never a missing letter
  }
  const png = await sharp(Buffer.from(svg), {density: 72}).png().toBuffer()
  const want = format === 'story' ? [1080, 1920] : [1080, 1350]
  const size = pngSize(png)
  if (!size || size.w !== want[0] || size.h !== want[1]) throw new Error(`${format} page ${page + 1} is ${size ? `${size.w}x${size.h}` : 'not a PNG'}, expected ${want.join('x')}`)
  return png
}

await mkdir('out', {recursive: true})

// ── phase 1: the snapshot
let prepared = null
for (let i = 0; i < MAX_PREPARE; i++) {
  const p = await api('prepare', {dryRun: dryInput, ...(dryInput && dayInput ? {day: dayInput} : {})})
  if (p.status !== 200) { console.error(`::error title=Today's Football prepare answered ${p.status}::${String(p.error ?? '').slice(0, 200)}`); break }
  if (!p.enabled) { console.log('switched off'); break }
  prepared = p
  console.log('prepare', JSON.stringify(p.progress), p.job ? `${p.job.id} ${p.job.state}/${p.job.mode}` : '')
  if (p.progress?.done) break
}

// ── owner alerts for blocked days (once per job)
if (!dryInput && token) {
  const al = await api('alerts', {})
  for (const a of al.alerts ?? []) {
    if (!al.chatId) break
    const s = await callTelegram(token, 'sendMessage', {chat_id: al.chatId, text: a.text, disable_web_page_preview: true})
    if (s.ok) await api('checkpoint', {jobId: a.jobId, key: 'alert', messageId: s.messageId})
    else console.log('alert not sent:', s.kind)
  }
}

// ── phase 2: deliver
for (let n = 0; n < 3; n++) {
  const got = await api('claim', {})
  if (!got.job) { console.log('nothing to deliver'); break }
  const {job, texts, chatId} = got
  console.log('job', job.id, job.mode, job.dryRun ? '(dry run)' : '', `${job.snapshot.fixtures.length} fixtures, ${job.snapshot.coverage}`)
  let marked = false
  const done = {...job.delivered}
  const record = async (key, messageId) => { done[key] = messageId; await api('checkpoint', {jobId: job.id, key, messageId}) }
  try {
    const data = {sample: false, day: job.snapshot.day, coverage: job.snapshot.coverage, updatedAt: job.snapshot.updatedAt, fixtures: job.snapshot.fixtures}
    await fetchCrests(data.fixtures)
    const pages = pagesFor(data.fixtures.length)
    const files = []
    if (job.mode === 'images') {
      for (const format of ['story', 'post']) for (let i = 0; i < pages; i++) {
        const png = await draw(data, format, i)
        const name = nameOf(data.day, format, i)
        await writeFile(`out/${name}`, png)
        files.push({key: `${format}-${String(i + 1).padStart(2, '0')}`, name, png})
      }
    }
    if (job.dryRun) { await api('complete', {jobId: job.id}); console.log(`dry run: drew and checked ${files.length} images, nothing sent`); continue }
    if (!token || !chatId) { await api('fail', {jobId: job.id, error: !token ? 'the Telegram bot token is not set in GitHub secrets' : 'no Telegram chat is linked yet', retryable: true, retryAfterSec: 1800}); continue }
    const mark = await api('sending', {jobId: job.id})
    if (!mark.ok) { console.log('could not take the job:', mark.error); continue }
    marked = true
    let stop = null
    const step = async (key, send) => {
      if (stop || done[key]) return
      await sleep(1100)
      const s = await send()
      if (s.ok) await record(key, s.messageId); else stop = s
    }
    if (job.mode === 'images') {
      await step('header', () => sendPhoto(token, chatId, files[0].png, texts.header))
      for (const f of files) await step(f.key, () => sendDocument(token, chatId, f.png, f.name, f.name.replace('.png', '')))
      await step('caption', () => callTelegram(token, 'sendMessage', {chat_id: chatId, text: texts.caption, disable_web_page_preview: true}))
    } else {
      await step('text', () => callTelegram(token, 'sendMessage', {chat_id: chatId, text: texts.text, disable_web_page_preview: true}))
      await step('alert', () => callTelegram(token, 'sendMessage', {chat_id: chatId, text: texts.alert, disable_web_page_preview: true}))
    }
    if (!stop) { await api('complete', {jobId: job.id}); console.log('sent'); continue }
    if (stop.kind === 'unknown') await api('uncertain', {jobId: job.id, error: stop.error})
    else await api('fail', {jobId: job.id, error: stop.error, retryable: stop.retryable, retryAfterSec: stop.retryAfterSec, definite: true})
    console.log('not sent:', stop.kind)
  } catch (e) {
    const msg = String(e?.message ?? e).replace(token || '\u0000', '[token]').slice(0, 150)
    console.error('job error', msg)
    if (marked) await api('uncertain', {jobId: job.id, error: `runner error after sending began: ${msg}`}).catch(() => {})
    else await api('fail', {jobId: job.id, error: `runner error: ${msg}`, retryable: true}).catch(() => {})
  }
}
