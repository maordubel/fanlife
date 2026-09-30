/**
 * סרטון ההליכה — a real clip of the child walking, both ways, from the current build.
 *
 *   node scripts/life/walk-clip.mjs [http://127.0.0.1:3000]
 *
 * Stills did not settle the argument and they should not have: a walk is a thing that
 * happens over time. This records the page while a direction is held — right for three
 * seconds, then left for three — and writes `data/life-shots/walk.mp4`, so the question
 * "which way is his back" is answered by watching him walk rather than by reading a graph.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(`${OUT}/walkvid`, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const context = await browser.newContext({
  viewport: { width: 900, height: 560 },
  recordVideo: { dir: `${OUT}/walkvid`, size: { width: 900, height: 560 } },
})
const page = await context.newPage()
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const e = [
    { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' }, { t: 'moved', to: 'street' },
    { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
  ]
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: e, savedAt: new Date().toISOString() }))
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(3000)
for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowRight']) {
  await page.keyboard.down(key)
  await page.waitForTimeout(2600)
  await page.keyboard.up(key)
  await page.waitForTimeout(900)
}
await context.close()
await browser.close()
console.log('recorded into', `${OUT}/walkvid`)
