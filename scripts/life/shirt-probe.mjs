/**
 * הקולב והכרטיס — the shirt on the rail, and the card that holds it up.
 *
 *   node scripts/life/shirt-probe.mjs [http://127.0.0.1:3000]
 *
 * Two pictures: Rafi's kiosk in the summer of 1985 with the shirt hanging in it, and the
 * card the first purchase raises. A collection is a thing you look at, so it gets a probe
 * that looks at it.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })

for (const [name, viewport, chapter, money] of [
  ['kiosk', { width: 900, height: 620 }, 'a4-shirt', 200000],
  ['shop', { width: 900, height: 620 }, '1998-laces', 200000],
  ['card-phone', { width: 390, height: 844 }, 'a4-shirt', 200000],
]) {
  const page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([chapter, money]) => {
    const events = [
      { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'chapter.entered', chapter }, { t: 'moved', to: 'kiosk' },
      { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'money.changed', agorot: money, why: 'probe' },
    ]
    window.localStorage.setItem('the-worker:life:probe', '1')
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1985, events, savedAt: new Date().toISOString() }))
  }, [chapter, money])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 20000 })
  await page.waitForTimeout(3200)
  if (name === 'card-phone') {
    // through the real path: talk to Rafi and count the money out on the counter
    await page.evaluate(() => window.__life?.talk('rafi-a4'))
    await page.waitForTimeout(700)
    for (let i = 0; i < 8; i += 1) {
      const bought = await page.evaluate(() => {
        const li = document.querySelector('[data-life="choice"][data-choice="buy"]')
        const b = li && li.querySelector('button')
        if (b) { b.click(); return true }
        return false
      })
      if (bought) break
      await page.evaluate(() => window.__life?.advance())
      await page.waitForTimeout(320)
    }
    await page.waitForTimeout(2600)
    for (let i = 0; i < 10; i += 1) {
      if (await page.locator('[data-life="shirt-card"]').count()) break
      await page.evaluate(() => window.__life?.advance())
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(600)
  }
  writeFileSync(`${OUT}/shirt-${name}.png`, await page.screenshot())
  console.log(name, JSON.stringify(await page.evaluate(() => window.__life?.debug.where())))
  await page.close()
}
await browser.close()
