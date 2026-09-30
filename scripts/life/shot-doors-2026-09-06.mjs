/**
 * הדלתות, מצולמות — the three frames Maor sent, taken again after the fix.
 *
 *   node scripts/life/shot-doors-2026-09-06.mjs [http://127.0.0.1:3000]
 *
 * He photographed a door drawn in the middle of a wall and asked for precision. Precision
 * that is not photographed is a claim, so this opens the street, the road south and the
 * new corner and draws EVERY exit's footprint over the painting in red with its name on
 * it — the same rectangles the engine tests a footstep against, not an approximation.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots/doors'
mkdirSync(OUT, { recursive: true })

const ROOMS = [
  ['street', '1991', ['life:knows:hall']],
  ['street', 'a4-shirt', []],
  ['allenby', '1991', ['life:knows:hall', 'saw:road']],
  ['allenby', '1986', []],
  ['route', '1986', ['knows:match']],
]

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } })
page.on('pageerror', (error) => console.log('PAGEERROR', String(error).slice(0, 200)))

for (const [where, chapter, extra] of ROOMS) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([where, chapter, extra]) => {
      const flags = ['life:opening', 'prologue:done', 'onboard:street', 'onboard:moved', 'onboard:acted', 'knows:match', ...extra]
      localStorage.setItem('the-worker:life:probe', '1')
      localStorage.setItem('the-worker:life', JSON.stringify({
        version: 3,
        identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
        year: 1986,
        events: [
          { t: 'flag.raised', flag: 'life:opening' },
          { t: 'flag.raised', flag: 'prologue:done' },
          { t: 'chapter.entered', chapter },
          { t: 'moved', to: where },
          ...flags.map((flag) => ({ t: 'flag.raised', flag })),
        ],
        savedAt: new Date().toISOString(),
      }))
    },
    [where, chapter, extra],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(3000)
  // a map reveal and an arrival card stand between the door and the camera; tap them away
  for (let i = 0; i < 6; i += 1) {
    const button = page.locator('button', { hasText: 'המשך' }).first()
    if (await button.isVisible().catch(() => false)) await button.click().catch(() => {})
    else await page.mouse.click(550, 350)
    await page.waitForTimeout(700)
  }
  await page.waitForTimeout(1500)

  const landed = await page.evaluate(() => window.__life?.debug.where()?.scene ?? null)
  if (landed !== where) {
    console.log(`${where} @ ${chapter}: landed in ${landed} — skipped`)
    continue
  }
  writeFileSync(`${OUT}/${where}-${chapter}.png`, await page.screenshot())
  const doors = await page.evaluate(() => window.__life?.debug.doors?.() ?? null)
  console.log(`${where} @ ${chapter}:`, doors ? JSON.stringify(doors) : 'shot only')
}

await browser.close()
