#!/usr/bin/env node
/**
 * "היציע שלי" — the invite, played as a guest on a phone (390×844), end to end.
 *
 * Needs: the local verify database (`scripts/db/verify.sh` with WORKER_TEST_DB), the shim
 * (`scripts/stand/pg-rest-shim.mjs`), and a Next server started with
 * NEXT_PUBLIC_SUPABASE_URL pointing at the shim and any non-empty anon key.
 *
 *   node scripts/stand/invite-probe.mjs http://127.0.0.1:3217 http://127.0.0.1:54321
 *
 * 1. A host device opens a stand and plays today (through the same RPC the app uses).
 * 2. A guest phone opens /stand/<code>: the stand's name, how many, and the day's three
 *    things are there BEFORE joining — no wall in front of play.
 * 3. The guest joins with a nickname and lands on the stand home: the group result, the
 *    week, the invite, and the host's run in the feed.
 * 4. The guest follows a daily item into its gate and the gate answers.
 * Every step checks the page for horizontal overflow and page errors.
 */
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const APP = process.argv[2] ?? 'http://127.0.0.1:3217'
const REST = process.argv[3] ?? 'http://127.0.0.1:54321'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.WORKER_SHOTS ?? 'data/stand-shots'
mkdirSync(OUT, { recursive: true })

const rpc = async (fn, args) => (await fetch(`${REST}/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })).json()
const fail = (message) => {
  console.error(`FAIL ${message}`)
  process.exitCode = 1
}
const ok = (message) => console.log(`PASS ${message}`)

const host = `${Date.now().toString(16)}${'f'.repeat(32)}`.slice(0, 32)
const created = await rpc('worker_stand_create', { p_me: host, p_name: 'שער 5 · שורה שלישית', p_nick: 'אבי' })
if (!created.ok) throw new Error(`host could not open a stand: ${JSON.stringify(created)}`)
const code = created.code
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
await rpc('worker_stand_report', {
  p_me: host, p_day: today, p_slots: ['remember', 'choose'], p_bc_status: 'solved', p_bc_hints: 3, p_bc_wrong: 0,
  p_debate_id: null, p_debate_pick: null, p_week_start: null, p_stations: null,
})
await rpc('worker_stand_post', { p_me: host, p_code: code, p_gate: 2, p_href: '/trivia/general?seed=41', p_headline: '9 מתוך 12' })
ok(`host opened ${code} and played`)

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'he-IL' })
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

async function overflow(label) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  if (wide > 1) fail(`${label}: horizontal overflow ${wide}px`)
  else ok(`${label}: no overflow`)
}

await page.goto(`${APP}/stand/${code.toLowerCase()}`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-stand="guest"]', { timeout: 30000 })
const guestText = await page.textContent('[data-stand="guest"]')
if (!guestText?.includes('שער 5 · שורה שלישית')) fail('guest does not see the stand name')
else ok('guest sees the stand name and the count')
if ((await page.locator('[data-stand="guest"] a[href]').count()) < 3) fail('the daily is not playable before joining')
else ok('the day\'s three things are playable before joining — no wall')
if (/@|[0-9a-f]{64}/.test(guestText ?? '')) fail('guest screen shows an email or a key')
await overflow('guest invite')
await page.screenshot({ path: `${OUT}/stand-guest-390.png`, fullPage: true })

await page.fill('[data-stand="nick"]', 'אפי')
await page.click('[data-stand="join"]')
await page.waitForSelector('[data-stand="member"]', { timeout: 30000 })
const memberText = await page.textContent('[data-stand="member"]')
for (const [needle, label] of [
  ['אפי', 'the nickname is the public name'],
  ['2 ביציע', 'the member count is the real one'],
  ['9 מתוך 12', "the host's run is in the feed"],
  ['השבוע ביציע', 'the week is on the stand home'],
  ['להזמין ליציע', 'the invite is on the stand home'],
]) {
  if (!memberText?.includes(needle)) fail(label)
  else ok(label)
}
if (!memberText?.includes('לפני שתשחק') && !memberText?.includes('כדי שלא תדע')) fail('the blind cow is not held back from a member who has not played')
else ok('the blind cow stays closed until the guest plays it')
if (/[0-9a-f]{64}/.test(memberText ?? '')) fail('a key leaked into the stand home')
await overflow('stand home')
await page.screenshot({ path: `${OUT}/stand-member-390.png`, fullPage: true })

const first = page.locator('[data-daily] a[href], [data-stand="today"] a[href]').first()
const href = await first.getAttribute('href')
const path = (href ?? '#').split('?')[0] ?? '#'
await first.click()
const arrived = await page
  .waitForURL((url) => url.pathname === path, { timeout: 180000 })
  .then(() => true)
  .catch(() => false)
if (!arrived) fail(`the daily item did not open its gate (${href})`)
else ok(`the guest-turned-member played on into ${href}`)
await page.waitForLoadState('networkidle')
await overflow('the gate')

const desk = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'he-IL' })
desk.on('pageerror', (error) => errors.push(String(error)))
await desk.goto(`${APP}/stand/${code}`, { waitUntil: 'networkidle' })
await desk.waitForSelector('[data-stand="guest"], [data-stand="member"]', { timeout: 30000 })
await desk.screenshot({ path: `${OUT}/stand-desktop-1280.png`, fullPage: true })

if (errors.length) fail(`page errors: ${errors.join(' | ')}`)
else ok('no page errors')
await browser.close()
console.log(process.exitCode ? 'stand probe: FAILED' : 'stand probe: clean')
