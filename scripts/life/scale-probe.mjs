/**
 * הסרגל — every room with the child standing in it, so a metre can be measured.
 *
 *   node scripts/life/scale-probe.mjs [http://127.0.0.1:3000]
 *
 * A room's `size` was, until 5.9.2026, a number somebody liked the look of. The rule now
 * is the one the terrace and the kiosk were cut to: find a thing in the painting whose
 * real height is known — a counter, a railing, a door, a step — measure it, and derive
 * every body in the room from that metre. This takes the picture that measurement is made
 * on: the player standing still, at the near line, with the room's own numbers printed
 * beside him.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })

const ROOMS = [
  ['home', '1986'], ['kitchen', '1986'], ['bedroom', '1986'],
  ['ussishkin-outside', 'a3-hall'], ['ussishkin-hall', 'a3-hall'],
  ['street', '1986'], ['pitch', '1986'], ['route', '1986'],
  ['bloomfield-outside', '1986'], ['bloomfield-tunnel', '1986'],
]

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } })
const report = []
for (const [where, chapter] of ROOMS) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([where, chapter]) => {
    const events = [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter }, { t: 'moved', to: where },
      { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'life:knows:hall' },
      { t: 'flag.raised', flag: 'saw:reveal' },
    ]
    window.localStorage.setItem('the-worker:life:probe', '1')
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
  }, [where, chapter])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(2800)
  writeFileSync(`${OUT}/scale-${where}.png`, await page.screenshot())
  const w = await page.evaluate(() => window.__life?.debug.where())
  report.push(`${where.padEnd(20)} scene=${w?.scene} x=${w?.x} y=${w?.y}`)
}
console.log(report.join('\n'))
await browser.close()
