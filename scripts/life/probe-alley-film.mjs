import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 420, height: 800 } })
page.on('console', (msg) => console.log('CONSOLE', msg.type(), msg.text().slice(0, 200)))
page.on('pageerror', (err) => console.log('PAGEERROR', String(err).slice(0, 300)))
page.on('requestfailed', (req) => console.log('REQFAILED', req.url(), req.failure()?.errorText))

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const events = [
    { t: 'flag.raised', flag: 'life:opening' },
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: 'a2-alley' },
    { t: 'moved', to: 'street' },
    ...['onboard:street', 'onboard:moved', 'onboard:acted'].map((flag) => ({ t: 'flag.raised', flag })),
  ]
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1985,
      events,
      savedAt: new Date().toISOString(),
    }),
  )
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2000)

console.log('where before:', await page.evaluate(() => window.__life?.debug.where()?.scene ?? null))
const went = await page.evaluate(() => window.__life?.goTo('pitch') ?? null)
console.log('goTo result:', went)

// watch for the film-cut overlay and inspect its <video> element over time
for (let i = 0; i < 20; i += 1) {
  await page.waitForTimeout(200)
  const info = await page.evaluate(() => {
    const el = document.querySelector('[data-life="film-cut"]')
    const video = document.querySelector('[data-life="film-cut"] video')
    return {
      hasCard: Boolean(el),
      src: video?.getAttribute('src') ?? null,
      paused: video ? video.paused : null,
      currentTime: video ? video.currentTime : null,
      readyState: video ? video.readyState : null,
      networkState: video ? video.networkState : null,
      error: video?.error ? { code: video.error.code, message: video.error.message } : null,
      ended: video ? video.ended : null,
    }
  })
  console.log(`t=${i * 200}ms`, JSON.stringify(info))
}

console.log('where after:', await page.evaluate(() => window.__life?.debug.where()?.scene ?? null))
await page.screenshot({ path: 'data/life-shots/alley-film-probe.png' })
await browser.close()
