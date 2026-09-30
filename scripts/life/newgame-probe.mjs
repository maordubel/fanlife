/**
 * משחק חדש — the first five minutes, as a new player sees them.
 *
 *   node scripts/life/newgame-probe.mjs [http://127.0.0.1:3000]
 *
 * No seed: a clean browser, the opening film, the prologue, the first day. Every screen
 * is photographed and the run says where it ended up.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { window.localStorage.clear(); window.localStorage.setItem('the-worker:life:probe', '1') })
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
const shot = (n) => page.screenshot({ path: `${OUT}/new-${n}.png` })
const read = () => page.evaluate(() => ({
  opening: !!document.querySelector('[data-life="opening-skip"]'),
  dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 80) ?? null,
  card: document.querySelector('[data-life="chapter-card"],[data-life="title-card"]')?.textContent?.trim()?.slice(0, 40) ?? null,
  where: window.__life?.debug?.where?.() ?? null,
  place: document.querySelector('[data-life="place"]')?.textContent ?? null,
  help: !!document.querySelector('[data-life="help"]'),
}))
await page.waitForTimeout(4000)
await shot('opening')
console.log('opening', JSON.stringify(await read()).slice(0, 200))
// the opening film: tap through / skip
for (let i = 0; i < 12; i += 1) {
  const r = await read()
  if (!r.opening) break
  await page.locator('[data-life="opening-skip"]').first().click().catch(() => {})
  await page.waitForTimeout(2500)
}
await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(3000)
await shot('prologue')
console.log('prologue', JSON.stringify(await read()).slice(0, 200))
// the prologue: advance the lines until the world
for (let i = 0; i < 30; i += 1) {
  const r = await read()
  if (r.where?.scene && r.where.scene !== 'prologue') break
  await page.evaluate(() => { window.__life?.skipIntro?.() })
  await page.waitForTimeout(1500)
}
await page.waitForTimeout(4000)
await shot('first-room')
const r = await read()
console.log('first room', JSON.stringify(r).slice(0, 300))
// the balloon: a spoken line, photographed
await page.evaluate(() => window.__life.talk('rachel-a2'))
await page.waitForTimeout(2500)
await shot('balloon')
console.log('balloon', JSON.stringify(await read()).slice(0, 200))
// the help sheet
await page.evaluate(() => window.__life.leave?.())
await page.waitForTimeout(600)
await page.locator('[data-life="help-open"]').click().catch(() => {})
await page.waitForTimeout(1200)
await shot('help')
await page.locator('[data-life="help-more"]').click().catch(() => {})
await page.waitForTimeout(800)
await shot('help-more')
console.log('help', JSON.stringify(await read()).slice(0, 200))
await browser.close()
