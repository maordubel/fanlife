/**
 * FINAL WHISTLE runner (GitHub Actions). Claims ready jobs from the site, renders each card in a real browser, checks the PNG,
 * and — unless the job is a dry run — sends it to the owner's Telegram chat. Secrets come from the environment only and are
 * never printed. Exit 0 even when a job fails: the failure is recorded on the job, and the next scheduled run decides what to do.
 */
import {chromium} from 'playwright'
import {mkdir, writeFile} from 'node:fs/promises'
import {captionFor, documentName, pngSize, sendDocument, sendPhoto} from '../../lib/final-whistle/telegram.ts'

const base = (process.env.FAN_LIFE_URL || '').replace(/\/$/, '')
const secret = process.env.CRON_SECRET || ''
const token = process.env.TELEGRAM_BOT_TOKEN || ''
const by = `gh-${process.env.GITHUB_RUN_ID || 'local'}-${process.env.GITHUB_RUN_ATTEMPT || '1'}`
const MAX_JOBS = 4
if (!base || secret.length < 32) { console.error('FAN_LIFE_URL or the scheduler secret is missing.'); process.exit(1) }

const api = async (action, body) => {
  const r = await fetch(`${base}/api/master/final-whistle/${action}`, {method: 'POST', headers: {authorization: `Bearer ${secret}`, 'content-type': 'application/json'}, body: JSON.stringify({by, ...body}), signal: AbortSignal.timeout(60_000)})
  const j = await r.json().catch(() => ({}))
  return {status: r.status, ...j}
}

await mkdir('out', {recursive: true})
const browser = await chromium.launch()
try {
  for (let n = 0; n < MAX_JOBS; n++) {
    const got = await api('claim', {})
    if (!got.job) { console.log('nothing to do'); break }
    const {job, renderUrl, chatId} = got
    const tag = `${job.clubId} ${job.result.home} ${job.result.homeScore}-${job.result.awayScore} ${job.result.away} (${job.kind}${job.dryRun ? ', dry run' : ''})`
    console.log('job', job.id, tag)
    try {
      const page = await browser.newPage({viewport: {width: 1100, height: 1000}})
      await page.goto(renderUrl, {waitUntil: 'domcontentloaded', timeout: 60_000})
      await page.waitForFunction(() => window.__fw?.ready === true, null, {timeout: 60_000})
      const fw = await page.evaluate(() => window.__fw)
      await page.close()
      if (fw.error || !fw.png) { await api('fail', {jobId: job.id, error: `render failed: ${fw.error ?? 'no image'}`, retryable: true}); continue }
      if (fw.warnings?.length) { await api('fail', {jobId: job.id, error: `render warnings: ${fw.warnings.join('; ').slice(0, 200)}`, retryable: false}); continue }
      const png = Buffer.from(fw.png.split(',')[1], 'base64')
      const size = pngSize(png)
      if (!size || size.w !== 1080 || size.h !== 1920) { await api('fail', {jobId: job.id, error: `render is not 1080x1920 (${size ? `${size.w}x${size.h}` : 'not a PNG'})`, retryable: true}); continue }
      await writeFile(`out/${documentName(job)}`, png)
      if (job.dryRun) { await api('complete', {jobId: job.id, delivered: {}}); console.log('dry run: rendered and checked, not sent'); continue }
      if (!token || !chatId) { await api('fail', {jobId: job.id, error: !token ? 'the Telegram bot token is not set in GitHub secrets' : 'no Telegram chat is linked yet', retryable: true, retryAfterSec: 1800}); continue }
      const mark = await api('sending', {jobId: job.id})
      if (!mark.ok) { console.log('could not take the job:', mark.error); continue }
      const delivered = {...job.delivered}
      const caption = captionFor(job)
      let stop = null
      if (!delivered.photo) { const s = await sendPhoto(token, chatId, png, caption); if (s.ok) delivered.photo = s.messageId; else stop = s }
      if (!stop && !delivered.document) { const s = await sendDocument(token, chatId, png, documentName(job), caption); if (s.ok) delivered.document = s.messageId; else stop = s }
      if (!stop) { await api('complete', {jobId: job.id, delivered}); console.log('sent'); continue }
      if (stop.kind === 'unknown') await api('uncertain', {jobId: job.id, error: stop.error, delivered})
      else await api('fail', {jobId: job.id, error: stop.error, retryable: stop.retryable, retryAfterSec: stop.retryAfterSec, delivered})
      console.log('not sent:', stop.kind)
    } catch (e) {
      // we do not know how far this got; before "sending" it is safe to retry, after it the lease will turn it into "unknown"
      console.error('job error', String(e?.message ?? e).replace(token || '\u0000', '[token]').slice(0, 200))
      await api('fail', {jobId: job.id, error: `runner error: ${String(e?.message ?? e).slice(0, 150)}`, retryable: true}).catch(() => {})
    }
  }
} finally { await browser.close() }
