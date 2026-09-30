/**
 * התפריט — does ☰ open, pause, toggle the deck, and close without eating the game?
 *
 *   node scripts/life/menu-probe.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986,
    events: [{ t: 'flag.raised', flag: 'prologue:done' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'moved', to: 'street' }], savedAt: new Date().toISOString() }))
  window.sessionStorage.setItem('the-worker:life:opening', '1')
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(2500)
const clock = () => page.evaluate(() => document.querySelector('[data-life="clock"]')?.textContent?.trim())
const has = (sel) => page.locator(sel).count()
const out = []
out.push(`deck before: ${await has('[data-life="deck"]')} (tap chip only when something is in reach)`)
await page.locator('[data-life="menu-open"]').tap()
await page.waitForTimeout(400)
out.push(`menu open: ${await has('[data-life="menu"]')}`)
const c1 = await clock()
await page.waitForTimeout(2500)
out.push(`paused: clock ${c1} -> ${await clock()}`)
await page.locator('[data-life="menu-deck"]').tap()
await page.waitForTimeout(300)
out.push(`deck pref stored: ${await page.evaluate(() => window.localStorage.getItem('the-worker:life:deck'))}`)
await page.locator('[data-life="menu-continue"]').tap()
await page.waitForTimeout(600)
out.push(`menu closed: ${await has('[data-life="menu"]')}  arcade deck now: ${await has('[role="application"]')}`)
await page.screenshot({ path: '/tmp/shots/menu-deck-on.png' })
await page.locator('[data-life="menu-open"]').tap()
await page.waitForTimeout(300)
await page.screenshot({ path: '/tmp/shots/menu-open.png' })
await page.locator('[data-life="menu-reset"]').tap()
await page.waitForTimeout(300)
out.push(`reset asks first: ${(await page.locator('[data-life="menu-reset"]').textContent()).trim()}`)
await page.locator('[data-life="menu-continue"]').tap()
await page.waitForTimeout(300)
out.push(`life still there: ${await page.evaluate(() => Boolean(window.localStorage.getItem('the-worker:life')))}`)
console.log(out.join('\n'))
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
await browser.close()
