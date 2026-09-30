/**
 * צילומי-מסך — every overlay the game can show, at the sizes it is played at.
 *
 *   node scripts/life/shots.mjs [http://127.0.0.1:3000]   → data/life-shots/ui-*.png
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })
const SIZES = [
  { name: 'small', width: 360, height: 640, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'land', width: 844, height: 390, touch: true },
]
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
for (const size of SIZES) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch })
  const page = await context.newPage()
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  const shot = (name) => page.screenshot({ path: `${OUT}/ui-${size.name}-${name}.png` })
  const seed = (events, opening = false) =>
    page.evaluate(([events, opening]) => {
      window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
      if (opening) window.sessionStorage.removeItem('the-worker:life:opening')
      else window.sessionStorage.setItem('the-worker:life:opening', '1')
    }, [events, opening])
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  // 1. opening + prologue (fresh life)
  await page.evaluate(() => { window.localStorage.removeItem('the-worker:life'); window.sessionStorage.removeItem('the-worker:life:opening') })
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await shot('01-opening')
  const skip = page.locator('[data-life="opening-skip"]')
  if ((await skip.count()) > 0) await skip.click()
  await page.waitForTimeout(3500)
  await shot('02-prologue')
  // 2. the ground, match on
  await seed([{ t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }, { t: 'flag.raised', flag: 'entry:granted' }, { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'clock.advanced', minutes: 220 }, { t: 'moved', to: 'bloomfield-inside' }])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas'); await page.waitForTimeout(6000)
  await shot('03-match')
  // 3. qa pages: finale / cutscene / opening card
  for (const [name, path] of [['04-finale', '/qa/life-finale'], ['05-cutscene', '/qa/life-cutscene']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    await shot(name)
  }
  // 4. dialogue with a choice, in the street
  await seed([{ t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }, { t: 'moved', to: 'street' }])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas'); await page.waitForTimeout(3000)
  const rect = await page.evaluate(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
  await page.touchscreen.tap(rect.x + rect.w * 0.9, rect.y + rect.h * 0.62)
  await page.waitForTimeout(3000)
  await shot('06-dialogue')
  await page.keyboard.press('Escape'); await page.waitForTimeout(400)
  await page.locator('[data-life="profile-open"]').tap(); await page.waitForTimeout(600)
  await shot('07-profile')
  await context.close()
}
await browser.close()
console.log('done')
