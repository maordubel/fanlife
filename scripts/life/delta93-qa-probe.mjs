// Delta 93 manual QA runs D, E, F as a probe (brief §49): A5 wardrobe with the first shirt,
// the 2007 demolition with the HUD off, an old save standing in Ussishkin after 2007.
// node scripts/life/delta93-qa-probe.mjs [http://127.0.0.1:3100]   (W/H env for size)
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3100'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = 'data/life-shots'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
async function run(name, events, fn) {
  const page = await context.newPage()
  page.on('pageerror', (e) => fault(`${name} pageerror ${e.message}`))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((ev) => {
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: ev, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, [...base, ...events])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 60000 })
  await page.waitForTimeout(3500)
  await fn(page)
  await page.close()
}
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)

// D · A5 — the wardrobe opens, the first shirt is on the rail
await run('A5', [
  { t: 'year.entered', year: 1985, weekday: 6, minute: 13 * 60 }, { t: 'chapter.entered', chapter: 'a5-first' },
  { t: 'flag.raised', flag: 'own:shirt85' }, { t: 'flag.raised', flag: 'own:shirt:visa86' }, { t: 'flag.raised', flag: 'life:first-shirt:gift' },
  { t: 'flag.raised', flag: 'own:shopnews:a5-first' }, { t: 'moved', to: 'bedroom' },
], async (page) => {
  for (let i = 0; i < 20 && !(await has(page, '[data-life="ritual"]')); i++) {
    if (await has(page, '[data-life="dialogue"]')) await page.evaluate(() => window.__life.advance())
    await page.waitForTimeout(500)
  }
  await page.screenshot({ path: `${OUT}/d93-qa-${W}-A5-ritual.png` })
  const text = await q(page, '[data-life="ritual"]')
  if (!text) fault('A5: no wardrobe before the match')
  else if (!text.includes('VISA') && !text.includes('פסים')) fault(`A5: the first shirt is not on the rail: ${text.slice(0, 120)}`)
  else console.log('A5 ok:', text.slice(0, 90))
})

// E · 2007 — the demolition card with the HUD off, then the label on the map
await run('2007', [
  { t: 'year.entered', year: 2007, weekday: 3, minute: 9 * 60 }, { t: 'chapter.entered', chapter: '2007-registered' },
  { t: 'flag.raised', flag: 'u:deliver' }, { t: 'flag.raised', flag: 'u:lastEve' }, { t: 'flag.raised', flag: 'u:last' }, { t: 'flag.raised', flag: 'u:morning' }, { t: 'flag.raised', flag: 'u:news' },
  { t: 'moved', to: 'ussishkin-outside' },
], async (page) => {
  let sawOff = false
  for (let i = 0; i < 40; i++) {
    const hud = await has(page, '[data-life="clock"]')
    const card = await has(page, '[data-life="chapter-card"],[data-life="title-card"],[data-life="card"]')
    if (!hud && (card || i > 4)) { await page.screenshot({ path: `${OUT}/d93-qa-${W}-2007-dust-${String(i).padStart(2, '0')}.png` }); sawOff = true }
    if (await has(page, '[data-life="choice"]')) break
    if (await has(page, '[data-life="dialogue"]')) await page.evaluate(() => window.__life.advance())
    await page.waitForTimeout(450)
  }
  if (!sawOff) fault('2007: the HUD never went off during the demolition')
  await page.screenshot({ path: `${OUT}/d93-qa-${W}-2007-choice.png` })
  const hudBack = await has(page, '[data-life="clock"]')
  console.log('2007: hud off seen', sawOff, '· hud back at the choice', hudBack)
  if (!hudBack) fault('2007: HUD not back at the choice')
})

// F · an old save standing inside the hall in 2009 — moved out, once, and the map says so
await run('old-save', [
  { t: 'year.entered', year: 2009, weekday: 6, minute: 17 * 60 }, { t: 'chapter.entered', chapter: '2009-up' }, { t: 'flag.raised', flag: 'own:shopnews:2009-up' }, { t: 'moved', to: 'ussishkin-hall' },
], async (page) => {
  await page.waitForTimeout(1500)
  const where = await page.evaluate(() => window.__life?.debug?.where?.()?.scene ?? null)
  await page.screenshot({ path: `${OUT}/d93-qa-${W}-old-save.png` })
  if (where === 'ussishkin-hall' || where === 'ussishkin-outside') fault(`old save still in ${where}`)
  else console.log('old save relocated to', where)
  await page.locator('[data-life="map-open"]').click().catch(() => {})
  await page.waitForTimeout(900)
  const map = await q(page, '[data-life="map"]')
  await page.screenshot({ path: `${OUT}/d93-qa-${W}-old-save-map.png` })
  console.log('map:', (map ?? '').slice(0, 160))
})
await browser.close()
console.log(faults ? `FAIL — ${faults}` : 'PASS')
process.exit(faults ? 1 : 0)
