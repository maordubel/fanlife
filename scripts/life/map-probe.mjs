/**
 * המפה — does the list tell the truth, does choosing a place walk there, and does the
 * day restart from the morning?
 *
 *   node scripts/life/map-probe.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
// console errors too — but not the ad hosts this sandbox refuses, nor the headless GPU's own chatter
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|GL Driver/.test(t)) errors.push('console:' + t.slice(0, 200)) })
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986,
    events: [{ t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }, { t: 'moved', to: 'street' }], savedAt: new Date().toISOString() }))
  window.sessionStorage.setItem('the-worker:life:opening', '1')
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(2500)
const read = () => page.evaluate(() => ({
  clock: document.querySelector('[data-life="clock"]')?.textContent?.trim(),
  place: document.querySelector('[data-life="place"]')?.textContent?.trim(),
}))
const out = []
out.push(`hud: ${JSON.stringify(await read())}`)
await page.locator('[data-life="map-open"]').tap()
await page.waitForTimeout(400)
const rows = await page.evaluate(() => [...document.querySelectorAll('[data-life="map-place"]')].map((b) => `${b.dataset.place}${b.disabled ? ' (shut/here)' : ''}: ${b.textContent.trim().replace(/\s+/g, ' ')}`))
out.push('map:\n  ' + rows.join('\n  '))
await page.screenshot({ path: '/tmp/shots/map-open.png' })
const before = await read()
await page.locator('[data-life="map-place"][data-place="kiosk"]').tap()
// a room takes a second or two to load its painting and strips in headless; wait for the walk
await page.waitForTimeout(5000)
const after = await read()
out.push(`went: ${before.place} @ ${before.clock} -> ${after.place} @ ${after.clock}`)
await page.screenshot({ path: '/tmp/shots/map-after.png' })
// restart the day
await page.locator('[data-life="menu-open"]').tap()
await page.waitForTimeout(300)
await page.locator('[data-life="menu-day"]').tap()
await page.waitForTimeout(200)
out.push(`day asks: ${(await page.locator('[data-life="menu-day"]').textContent()).trim()}`)
await page.locator('[data-life="menu-day"]').tap()
await page.waitForTimeout(3500)
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(2500)
const events = await page.evaluate(() => JSON.parse(window.localStorage.getItem('the-worker:life')).events.map((e) => e.t + (e.flag ? ':' + e.flag : e.to ? ':' + e.to : '')))
out.push(`after restart: ${JSON.stringify(await read())}\n  log: ${events.join(' | ')}`)
console.log(out.join('\n'))
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
await browser.close()
