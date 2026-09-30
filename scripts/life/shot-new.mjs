/**
 * הצילומים של דלתא 28 — the shop screen and one shirt held up.
 *
 *   node scripts/life/shot-new.mjs [http://127.0.0.1:3000]
 *
 * A screen nobody has looked at is a screen nobody has finished.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 900, height: 620 } })
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 160)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const events = [
    { t: 'flag.raised', flag: 'life:opening' },
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1999-cup' },
    { t: 'moved', to: 'street' },
    { t: 'flag.raised', flag: 'onboard:street' },
    { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
    { t: 'money.changed', agorot: 40000, why: 'x' },
  ]
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1999,
      events,
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(3500)

await page.evaluate(() => window.__life?.talk('fan-shop-1999-cup'))
await page.waitForTimeout(800)
// the first tap closes whichever card is up (a cast introduction, most likely)
await page.mouse.click(450, 310)
await page.waitForTimeout(500)
await page.mouse.click(450, 310)
await page.waitForTimeout(500)
await page.evaluate(() => window.__life?.advance())
await page.waitForTimeout(2500)
// scroll the rail so the drawn kits load, then come back to the top for the shot
await page.evaluate(() => document.querySelector('[data-life="shop-card"] .overflow-y-auto')?.scrollTo(0, 2000))
await page.waitForTimeout(1200)
await page.screenshot({ path: 'data/life-shots/shop-drawn.png' })
await page.evaluate(() => document.querySelector('[data-life="shop-card"] .overflow-y-auto')?.scrollTo(0, 0))
await page.waitForTimeout(900)
await page.screenshot({ path: 'data/life-shots/shop-screen.png' })
console.log('shop open:', await page.evaluate(() => Boolean(document.querySelector('[data-life="shop-card"]'))))

const hanger = await page.$('[data-shirt]')
if (hanger) {
  await hanger.click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'data/life-shots/shop-shirt.png' })
  console.log('shirt held up')
}
await browser.close()
