import { chromium } from 'playwright'

/**
 * 11.3.1991 — האם השעון בכלל זז, והאם אמא מגיעה.
 *
 * Maor restarted the day and could not find Rachel at any hour. The cause was a stopped
 * clock: the 1986 tutorial guard (`onboard:street`) froze time in a chapter that starts in
 * a classroom and never passes through the street, so three o'clock — when she comes home
 * — was never going to arrive. This plays the day the way he did and asserts two things:
 * the minute advances on its own, and Rachel is in the flat in the afternoon.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 420, height: 800 } })
const errors = []
page.on('pageerror', (err) => errors.push(String(err).slice(0, 200)))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1991,
      // exactly what "start the day again" leaves behind: the chapter, and nothing else
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: '1986' },
        { t: 'chapter.entered', chapter: '1990' },
        { t: 'chapter.entered', chapter: '1991' },
      ],
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(3000)

const minute = async () => page.evaluate(() => window.__life?.snapshot?.().state?.minute ?? -1)
const first = await minute()
await page.waitForTimeout(6000)
const second = await minute()
console.log(`clock: ${first} → ${second} (${second > first ? 'RUNNING' : 'FROZEN'})`)

// walk the day forward to the afternoon and look for her in the flat
await page.evaluate(() => window.__life?.debug.jump(60 * 8))
await page.waitForTimeout(1200)
await page.evaluate(() => window.__life?.debug.goTo('home'))
await page.waitForTimeout(3000)
const where = await page.evaluate(() => window.__life?.debug.where() ?? null)
const bodies = await page.evaluate(() => window.__life?.debug.bodies() ?? [])
const rachel = bodies.find((b) => b.who === 'rachel-1991' || String(b.art).includes('rachel'))
console.log('at:', where?.scene, 'minute:', where?.minute)
console.log('bodies:', bodies.map((b) => b.who).join(', '))
console.log('Rachel in the flat:', Boolean(rachel))
console.log('errors:', errors.length ? errors : 'none')
const ok = second > first && Boolean(rachel)
console.log(ok ? 'PASS — the day runs and she is home' : 'FAIL')
await browser.close()
process.exit(ok ? 0 : 1)
