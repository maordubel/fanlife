/**
 * הצעד — a filmstrip of the child mid-walk, so a moonwalk cannot hide in a still.
 *
 *   node scripts/life/stride-probe.mjs [http://127.0.0.1:3000]
 *
 * `facing-probe` proved which way he FACES. This one proves which way the cycle RUNS:
 * eight crops taken across a stride while a direction is held, laid out left to right.
 * Read the planted foot — in a walk it slides backwards under the body between contacts;
 * in a moonwalk it slides forwards.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
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
await page.waitForTimeout(2600)
for (const [key, name] of [['ArrowRight', 'right'], ['ArrowLeft', 'left']]) {
  await page.keyboard.down(key)
  for (let i = 0; i < 8; i += 1) {
    await page.waitForTimeout(110)
    writeFileSync(`${OUT}/stride-${name}-${i}.png`, await page.screenshot())
  }
  await page.keyboard.up(key)
  await page.waitForTimeout(700)
}
console.log('eight frames each way')
await browser.close()
