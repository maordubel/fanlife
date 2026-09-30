import { chromium } from 'playwright'

/**
 * הוכחה שהעולם זז — two frames of the same room, with nobody touching the controls.
 *
 * Maor asked for micro-animation and environmental reaction (6.9.2026). "It feels alive"
 * is not a measurement; the share of pixels that changed between two still frames is. A
 * dead room scores near zero. Anything that breathes scores percent.
 */
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const ROOMS = process.argv[3]?.split(',') ?? ['street', 'kiosk', 'pitch', 'home']

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
      year: 1986,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'chapter.entered', chapter: '1986' },
        ...['onboard:street', 'onboard:moved', 'onboard:acted', 'saw:ussHigh'].map((flag) => ({ t: 'flag.raised', flag })),
      ],
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2500)

for (const room of ROOMS) {
  await page.evaluate((id) => window.__life?.debug.goTo(id), room)
  await page.waitForTimeout(4200)
  const where = await page.evaluate(() => window.__life?.debug.where()?.scene ?? null)
  const a = await page.screenshot()
  await page.waitForTimeout(1300)
  const b = await page.screenshot()
  await page.screenshot({ path: `/tmp/living-${room}.png` })

  // how much of the frame changed while nobody touched anything
  const { changed, total } = diff(a, b)
  const pct = ((changed / total) * 100).toFixed(2)
  console.log(`${room.padEnd(20)} at=${String(where).padEnd(20)} moving pixels: ${pct}%`)
}
console.log('page errors:', errors.length ? errors : 'none')
await browser.close()

/** PNG bytes in, changed-byte share out. Crude on purpose: it only has to prove motion. */
function diff(a, b) {
  const n = Math.min(a.length, b.length)
  let changed = 0
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) changed += 1
  return { changed: changed + Math.abs(a.length - b.length), total: Math.max(a.length, b.length) }
}
