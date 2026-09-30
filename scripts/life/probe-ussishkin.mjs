import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 420, height: 800 } })
page.on('pageerror', (err) => console.log('PAGEERROR', String(err).slice(0, 300)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1986,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: '1986' },
        { t: 'flag.raised', flag: 'saw:ussHigh' },
      ],
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2000)

const went1986 = await page.evaluate(() => window.__life?.debug.goTo('ussishkin-hall') ?? null)
console.log('goTo ussishkin-hall (1986):', went1986)
await page.waitForTimeout(4200)
console.log('where:', await page.evaluate(() => window.__life?.debug.where() ?? null))
console.log('bodies (1986, empty hall):', JSON.stringify(await page.evaluate(() => window.__life?.debug.bodies() ?? null), null, 1))
await page.screenshot({ path: '/tmp/uss-1986.png' })

// Now the 1991 derby night — different era, crowd should be present
await page.evaluate(() => {
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1991,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: '1986' },
        { t: 'chapter.entered', chapter: '1990' },
        { t: 'chapter.entered', chapter: '1991' },
        { t: 'flag.raised', flag: 'saw:ussNight' },
      ],
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2000)
const went1991 = await page.evaluate(() => window.__life?.debug.goTo('ussishkin-hall') ?? null)
console.log('goTo ussishkin-hall (1991):', went1991)
await page.waitForTimeout(3000)
console.log('where:', await page.evaluate(() => window.__life?.debug.where() ?? null))
console.log('bodies (1991, derby):', JSON.stringify(await page.evaluate(() => window.__life?.debug.bodies() ?? null), null, 1))
await page.screenshot({ path: '/tmp/uss-1991.png' })

await browser.close()
