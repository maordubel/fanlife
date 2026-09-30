/**
 * הג׳וב, מנוגן — does a job actually open, play and pay?
 *
 *   node scripts/life/gig-probe.mjs [http://127.0.0.1:3000]
 *
 * A minigame written and never run is a minigame that crashes on the first player. This
 * walks the child to the kiosk in 1990, opens the crates gig, plays it by holding a
 * direction for the whole clock, and prints the money before and after. It is not a
 * quality check — it is the check that the scene exists, starts, ends, and pays.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)) })

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  const events = [
    { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1990' }, { t: 'moved', to: 'kiosk' },
    { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
  ]
  localStorage.setItem('the-worker:life:probe', '1')
  localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1990, events, savedAt: new Date().toISOString() }))
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(2500)
for (let i = 0; i < 40; i += 1) {
  const w = await page.evaluate(() => window.__life?.debug.where())
  if (w) break
  await page.waitForTimeout(500)
}
console.log('booted at        ', JSON.stringify(await page.evaluate(() => window.__life?.debug.where())))

const before = await page.evaluate(() => window.__life?.snapshot().state.agorot ?? -1)
await page.evaluate(() => window.__life?.talk('gig-crates-kiosk-1990'))
await page.waitForTimeout(600)
for (let i = 0; i < 4; i += 1) { await page.evaluate(() => window.__life?.advance()); await page.waitForTimeout(350) }
const opened = await page.evaluate(() => document.body.innerText.includes('ארגז'))
await page.evaluate(() => window.__life?.choose('do'))
await page.waitForTimeout(2500)
const scene = await page.evaluate(() => window.__life?.debug.where())
await page.screenshot({ path: 'data/life-shots/gig-during.png' })

// play it: hold right, then left, for the whole clock
for (let i = 0; i < 16; i += 1) {
  await page.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight')
  await page.waitForTimeout(4200)
  await page.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight')
}
await page.waitForTimeout(3000)
const after = await page.evaluate(() => window.__life?.snapshot().state.agorot ?? -1)
const back = await page.evaluate(() => window.__life?.debug.where())
await page.screenshot({ path: 'data/life-shots/gig-crates.png' })

console.log('talk opened      ', opened)
console.log('scene during job ', JSON.stringify(scene))
console.log('agorot before    ', before)
console.log('agorot after     ', after, after > before ? '— PAID' : '— NOT PAID')
console.log('back in          ', JSON.stringify(back))
console.log('page errors      ', errors.length ? errors.slice(0, 4) : 'none')
await browser.close()
