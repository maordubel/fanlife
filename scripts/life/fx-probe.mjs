/**
 * 5.9.2026 — the director's cut, photographed: the 2026 cold open, the love meter, a
 * gauge pop, the gauges sheet, the city map, the reveal, a chapter card, the coda.
 *
 *   node scripts/life/fx-probe.mjs [http://127.0.0.1:3000]   → data/life-shots/fx-*.png
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
const shot = (name) => page.screenshot({ path: `${OUT}/fx-${name}.png` })
const seed = (events) =>
  page.evaluate((events) => {
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    window.localStorage.setItem('the-worker:life:probe', '1')
  }, events)
const BASE1986 = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'knows:match' }, { t: 'item.gained', item: 'house-key' }]

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
// 1. fresh life → the 2026 cold open
await page.evaluate(() => { window.localStorage.removeItem('the-worker:life'); window.localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
await shot('01-open-2026')
await page.waitForTimeout(4200)
await shot('02-open-1978')
// reload mid-life: no opening
await page.locator('[data-life="opening-skip"]').click().catch(() => {})
await page.waitForTimeout(1500)

// 2. the street, love meter on, a pop
await seed([...BASE1986, { t: 'moved', to: 'street' }])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
await shot('03-street-heart')
await page.evaluate(() => { window.__life.debug.bond('ofir', 12); })
await page.waitForTimeout(500)
await page.evaluate(() => { window.__life.engine?.dispatch?.({ t: 'redheart.changed', key: 'footballLove', delta: 9 }) })
await page.waitForTimeout(700)
await shot('04-gauge-pop')
await page.waitForTimeout(2600)
// 3. gauges sheet
await page.locator('[data-life="love-open"]').tap()
await page.waitForTimeout(1200)
await shot('05-gauges-sheet')
await page.keyboard.press('Escape'); await page.locator('[data-life="gauges"]').click({ position: { x: 5, y: 5 } }).catch(() => {})
await page.waitForTimeout(500)
// 4. the map
await page.locator('[data-life="map-open"]').tap()
await page.waitForTimeout(1200)
await shot('06-city-map')
await page.locator('[data-life="map"]').click({ position: { x: 5, y: 5 } }).catch(() => {})
await page.waitForTimeout(400)
// 5. reveal — the pylons over the rooftops
await page.evaluate(() => { window.__life.debug.raise('saw:road') })
await page.waitForTimeout(700)
await shot('07-reveal-a')
await page.waitForTimeout(1600)
await shot('08-reveal-b')
await page.locator('[data-life="reveal-close"]').tap().catch(() => {})
await page.waitForTimeout(500)

// 6. a chapter card (from 1991's end): seed the 1991 chapter done in the classroom
await seed([{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }, { t: 'year.entered', year: 1991, weekday: 1, minute: 490 }, { t: 'chapter.entered', chapter: '1991' }, { t: 'flag.raised', flag: 'saw:class1991' }, { t: 'flag.raised', flag: 'school:done' }, { t: 'flag.raised', flag: 'derby:over' }, { t: 'chapter.completed', chapter: '1991' }, { t: 'moved', to: 'classroom' }])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas'); await page.waitForTimeout(3000)
// advance the closing dialogue until the card
for (let i = 0; i < 24; i++) {
  const dlg = page.locator('[data-life="dialogue-next"], [data-life="dialogue"] button').first()
  if ((await page.locator('[data-life="chapter-card"], [data-life="coda"]').count()) > 0) break
  await page.keyboard.press(' ')
  await page.waitForTimeout(350)
}
await page.waitForTimeout(600)
await shot('09-after-1991')
await page.waitForTimeout(1500)
await shot('10-after-1991-b')
// 7. the QA finale page (hero push-in)
await page.goto(`${BASE}/qa/life-finale`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
await shot('11-finale-hero')
await browser.close()
console.log('done')
