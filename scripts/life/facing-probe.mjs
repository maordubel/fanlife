/**
 * לאן הוא הולך — two screenshots, one walking right and one walking left.
 *
 *   node scripts/life/facing-probe.mjs [http://127.0.0.1:3000]
 *
 * The moonwalk was invisible to every test this project had, because no test ever looked
 * at the child while he was moving: the walk probe screenshots him standing, and a unit
 * test cannot see which way a painting faces. This one holds a direction and takes the
 * picture mid-stride, so the next time somebody changes `ART_FACES` or drops in a sheet
 * drawn the other way round, there is a pair of images to look at.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } })
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const events = [
    { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' }, { t: 'moved', to: 'street' },
    { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
  ]
  window.localStorage.setItem('the-worker:life:probe', '1')
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(3000)
for (const [key, name] of [['ArrowRight', 'right'], ['ArrowLeft', 'left']]) {
  await page.keyboard.down(key)
  await page.waitForTimeout(900)
  writeFileSync(`${OUT}/facing-${name}.png`, await page.screenshot())
  await page.keyboard.up(key)
  await page.waitForTimeout(500)
  console.log(name, JSON.stringify(await page.evaluate(() => window.__life?.debug.where())))
}
await browser.close()
