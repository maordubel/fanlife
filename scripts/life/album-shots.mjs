/**
 * צילומי האלבום — the sticker album, the packet and the menu on a phone and a laptop.
 *
 *   node scripts/life/album-shots.mjs [http://127.0.0.1:3000]
 *
 * Seeds a life that already has stickers in it, opens the album from the menu, and takes
 * one shot per page. The packet is opened through the debug facade rather than by walking
 * to the kiosk, because what is being looked at here is the SHEET, not the errand.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-gpu'] })

const SEED = [
  { t: 'flag.raised', flag: 'prologue:done' },
  { t: 'flag.raised', flag: 'onboard:moved' },
  { t: 'flag.raised', flag: 'onboard:acted' },
  { t: 'flag.raised', flag: 'album:seen' },
  { t: 'flag.set', flag: 'album:sg:landau', value: 2 },
  { t: 'flag.set', flag: 'album:sg:eli-cohen', value: 1 },
  { t: 'flag.set', flag: 'album:sg:sinai', value: 1 },
  { t: 'flag.set', flag: 'album:sg:talias', value: 3 },
  { t: 'flag.set', flag: 'album:sg:amar', value: 1 },
  { t: 'flag.set', flag: 'album:sg:bezredno', value: 1 },
  { t: 'flag.set', flag: 'album:sg:halfon', value: 1 },
  { t: 'flag.set', flag: 'album:sg:tikva', value: 1 },
  // one page of every new album, so a shot shows a page that is being filled rather than
  // an empty grid — the pages are the thing being looked at
  { t: 'flag.set', flag: 'album:sg:a-sg80a-00', value: 1 },
  { t: 'flag.set', flag: 'album:sg:a-sg80a-02', value: 2 },
  { t: 'flag.set', flag: 'album:sg:a-sg80a-05', value: 1 },
  { t: 'flag.set', flag: 'album:sg:a-sg80a-10', value: 1 },
  { t: 'flag.set', flag: 'album:sg:c-sgcup-00', value: 1 },
  { t: 'flag.set', flag: 'album:sg:c-sgcup-04', value: 1 },
  { t: 'flag.set', flag: 'album:sg:b-sg80b-03', value: 1 },
  { t: 'flag.set', flag: 'album:sg:b-sg80b-09', value: 1 },
  { t: 'flag.set', flag: 'album:sg:d-sg978-00', value: 1 },
  { t: 'flag.set', flag: 'album:sg:d-sg978-07', value: 1 },
  { t: 'flag.set', flag: 'album:sg:d-kt-dreslia', value: 1 },
  { t: 'flag.set', flag: 'album:sg:box-ace-chodorov', value: 1 },
  { t: 'flag.set', flag: 'album:sg:box-ace-levkovich', value: 1 },
  { t: 'flag.set', flag: 'album:sg:e-sg90-00', value: 1 },
  { t: 'flag.set', flag: 'album:sg:e-sg90-03', value: 1 },
  { t: 'flag.set', flag: 'album:sg:d-sg978-07', value: 1 },
  { t: 'flag.raised', flag: 'album:torn:d-sg978-02' },
  { t: 'moved', to: 'street' },
]

for (const [name, vp, mobile] of [
  ['phone', { width: 390, height: 844 }, true],
  ['desk', { width: 1280, height: 800 }, false],
]) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: mobile, isMobile: mobile })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  // the ad and analytics hosts are unreachable from this container and hold the page open
  await page.route(/googlesyndication|googletagmanager|google\.com|doubleclick/, (r) => r.abort())
  page.setDefaultTimeout(15000)
  page.setDefaultNavigationTimeout(30000)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((events) => {
    window.localStorage.setItem(
      'the-worker:life',
      JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }),
    )
    window.sessionStorage.setItem('the-worker:life:opening', '1')
  }, SEED)
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  console.log(name, 'loaded')
  await page.waitForSelector('canvas', { timeout: 40000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `/tmp/shots/ui-${name}-world.png` })

  await page.locator('[data-life="menu-open"]').first().tap({ force: true }).catch(() => page.locator('[data-life="menu-open"]').first().click())
  await page.waitForTimeout(400)
  await page.screenshot({ path: `/tmp/shots/ui-${name}-menu.png` })
  const row = page.locator('[data-life="menu-album"]')
  console.log(name, 'menu open, album row:', await row.count())
  if (await row.count()) {
    await row.click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `/tmp/shots/ui-${name}-album.png` })
    // one sticker held up on its own, which is where the halo is meant to be felt
    const filled = page.locator('[data-life="album-slot"]:not([data-have="0"])').first()
    if (await filled.count()) {
      await filled.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: `/tmp/shots/ui-${name}-held.png` })
      await page.locator('[data-life="album-held"]').click({ force: true }).catch(() => {})
      await page.waitForTimeout(300)
    }
    const tabs = page.locator('[data-life="album-tab"]')
    const n = await tabs.count()
    for (let i = 0; i < n; i += 1) {
      await tabs.nth(i).click({ force: true })
      await page.waitForTimeout(350)
      await page.screenshot({ path: `/tmp/shots/ui-${name}-album-${i + 1}.png` })
    }
  }
  // the packet, the box and a torn page are shot on the QA screen (`/qa/life-album`)
  // rather than by poking the bus: the runtime does not expose one, and a screen that
  // exists to be looked at is the project's own convention for exactly this (rule 19).
  for (const [show, waits] of [['packet', [400, 300, 1900]], ['box', [1500]], ['album', [700]]]) {
    await page.goto(`${BASE}/qa/life-album?show=${show}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(waits[0])
    await page.screenshot({ path: `/tmp/shots/qa-${name}-${show}-1.png` })
    if (show === 'packet') {
      await page.locator('[data-life="packet-open"]').click({ force: true }).catch(() => {})
      await page.waitForTimeout(waits[1])
      await page.screenshot({ path: `/tmp/shots/qa-${name}-${show}-2.png` })
      await page.waitForTimeout(waits[2])
      await page.screenshot({ path: `/tmp/shots/qa-${name}-${show}-3.png` })
    }
  }
  console.log(name, 'errors:', errors.length ? errors.join(' | ') : 'none')
  await ctx.close()
}
await browser.close()
console.log('shots written to /tmp/shots')
