/**
 * גוף ראשון — the tunnel walk, the panorama at its end, a look-around in the hall, a
 * close-up in a conversation. Screenshots to /tmp/shots/fp-*.png.
 *   node scripts/life/firstperson-probe.mjs
 */
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const DESKTOP = process.env.DESKTOP === '1'
const SHOT = DESKTOP ? '/tmp/shots/fpd' : '/tmp/shots/fp'
const context = await browser.newContext(DESKTOP ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
let faults = 0
const fail = (m) => { faults += 1; console.log('FAULT ' + m) }
const BASE_EVENTS = [{ t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const seed = async (events, where) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([events]) => { window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() })); window.sessionStorage.setItem('the-worker:life:opening', '1'); window.localStorage.setItem('the-worker:life:probe', '1') }, [[...events, { t: 'moved', to: where }]])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
}
const has = (sel) => page.locator(sel).count().then((n) => n > 0)
const where = () => page.evaluate(() => window.__life?.debug?.where?.() ?? null)

// 1. the tunnel: seeded outside with the ticket, walk into the doorway
await seed([...BASE_EVENTS, { t: 'flag.raised', flag: 'knows:match' }, { t: 'flag.raised', flag: 'saw:road' }, { t: 'flag.raised', flag: 'saw:ground' }, { t: 'flag.raised', flag: 'entry:granted' }], 'bloomfield-outside')
await page.keyboard.down('ArrowRight'); for (let i = 0; i < 200 && !(await has('[data-life="tunnel"]')); i += 1) await page.waitForTimeout(200); await page.keyboard.up('ArrowRight')
if (!(await has('[data-life="tunnel"]'))) fail('the doorway did not open the first-person tunnel')
else {
  await page.waitForTimeout(1200); await page.screenshot({ path: `${SHOT}-1-tunnel-start.png` })
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(4500); await page.screenshot({ path: `${SHOT}-2-tunnel-mid.png` })
  for (let i = 0; i < 30 && (await has('[data-life="tunnel"]')); i += 1) await page.waitForTimeout(500)
  await page.keyboard.up('ArrowUp')
  if (await has('[data-life="tunnel"]')) fail('walked for 20 s and never reached the light')
  else console.log('tunnel: walked through')
}
// 2. the arrival card, then the panorama
await page.waitForSelector('[data-life="panorama"]', { timeout: 20000 }).catch(() => fail('no panorama after the reveal card'))
if (await has('[data-life="panorama"]')) {
  await page.waitForTimeout(800); await page.screenshot({ path: `${SHOT}-3-pano.png` })
  const spots = await page.locator('[data-life="pano-spot"]').count(); console.log('pano marks on screen:', spots)
  // drag to turn
  await page.mouse.move(300, 400); await page.mouse.down(); await page.mouse.move(120, 400, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(600)
  await page.screenshot({ path: `${SHOT}-4-pano-turned.png` })
  const spot = page.locator('[data-life="pano-spot"]').first()
  if (await spot.count()) { await spot.click(); await page.waitForTimeout(600); console.log('mark said:', await page.locator('[data-life="line"]').first().textContent()); await page.keyboard.press('e'); await page.waitForTimeout(400); await page.keyboard.press('e'); await page.waitForTimeout(400) }
  await page.locator('[data-life="pano-close"]').click(); await page.waitForTimeout(1500)
  if (await has('[data-life="panorama"]')) fail('panorama did not close')
  await page.waitForTimeout(3000); await page.screenshot({ path: `${SHOT}-5-after.png` })
  const board = await page.locator('[data-life="scoreboard"]').count(); console.log('match began after the look:', board > 0)
}
// 3. the hall: look around
await seed(BASE_EVENTS, 'ussishkin-hall'); await page.waitForTimeout(5000)
await page.keyboard.down('ArrowRight'); for (let i = 0; i < 300; i += 1) { const p = await page.evaluate(() => document.querySelector('[data-life="prompt"]')?.textContent ?? ''); if (p.includes('הסתכל סביב')) { await page.keyboard.up('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.press('e'); break } await page.waitForTimeout(120) }; await page.keyboard.up('ArrowRight')
console.log('hall position:', JSON.stringify(await page.evaluate(() => window.__life?.debug?.where?.() ?? null)), 'prompt:', await page.evaluate(() => document.querySelector('[data-life="prompt"]')?.textContent ?? ''))
await page.waitForTimeout(800)
if (!(await has('[data-life="panorama"]'))) fail('the hall look-around did not open'); else { await page.screenshot({ path: `${SHOT}-6-hall-pano.png` }); await page.locator('[data-life="pano-close"]').click() }
// 4. a close-up: the 1990 kitchen opening ("נו, כמה צריך?")
const E90 = [...BASE_EVENTS, { t: 'chapter.completed', chapter: '1986' }, { t: 'year.entered', year: 1990, weekday: 6, minute: 12 * 60 + 35 }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'life:passage-1990' }]
await seed(E90, 'kitchen')
await page.waitForSelector('[data-life="dialogue"]', { timeout: 15000 }).catch(() => fail('kitchen opening did not play'))
await page.keyboard.press('e'); await page.waitForTimeout(700)
if (!(await has('[data-life="close-up"]'))) fail('no close-up on "נו, כמה צריך?"'); else await page.screenshot({ path: `${SHOT}-7-closeup.png` })
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(faults === 0 ? 'PASS — first person plays' : `FAIL — ${faults} fault(s)`)
await browser.close()
