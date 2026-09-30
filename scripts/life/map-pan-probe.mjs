/**
 * המפה הזזה — does the city actually move, does it stay inside its own frame, and is
 * anything on it readable at 360 pixels?
 *
 * Maor's ask on 16.9.2026 was "מפה אינטרקטיבית, שאפשר להזיז אותה". `map-probe.mjs` proves
 * the LIST tells the truth; this one proves the DRAWING does, and the two together are
 * what the map is allowed to claim. Everything here is read back out of the browser: the
 * camera is on `[data-life="city-map"]`'s own `data-cam` (`x,y,side` in map units), so a
 * pan is a number before it is a screenshot.
 *
 * Four things it will fail on, and each one was a way the first cut of the camera broke:
 *  · a drag that does not move the camera at all (a pointer handler on the wrong element);
 *  · a fling that leaves the city — the clamp is the difference between a map and a void;
 *  · a tap on a pin that is swallowed as a drag, or a drag that walks you somewhere;
 *  · a name printed under about nine screen pixels, which is what the whole wide view was.
 *
 *   node scripts/life/map-pan-probe.mjs [http://127.0.0.1:3000] [outDir]
 */
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = process.argv[3] ?? '/tmp/shots'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
mkdirSync(OUT, { recursive: true })

const SAVE = {
  version: 3,
  identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
  year: 1986,
  events: [
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'chapter.entered', chapter: '1986' },
    { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
    { t: 'flag.raised', flag: 'onboard:street' },
    // the pins a Saturday afternoon has already put on the map, so the drawing has work to do
    { t: 'flag.raised', flag: 'life:reveal:kiosk' },
    { t: 'flag.raised', flag: 'life:reveal:pitch' },
    { t: 'flag.raised', flag: 'life:reveal:route' },
    { t: 'flag.raised', flag: 'life:reveal:bloomfield' },
    { t: 'flag.raised', flag: 'life:reveal:allenby' },
    { t: 'moved', to: 'street' },
  ],
}

const out = []
/** printed as it happens: a probe that only speaks at the end tells you nothing when it dies */
const say = (line) => { out.push(line); console.log(line) }
const errors = []
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
const page = await context.newPage()
page.on('pageerror', (e) => errors.push(String(e)))
// the ad and analytics hosts this sandbox refuses are not the page's fault (rule 29)
page.on('console', (m) => {
  const text = m.text()
  if (m.type() === 'error' && !/ERR_FAILED|GL Driver|Failed to fetch RSC/.test(text)) errors.push('console:' + text.slice(0, 180))
})
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())

const cam = () => page.getAttribute('[data-life="city-map"]', 'data-cam')
/**
 * המתנה עד שהמצלמה נחה — poll until the camera says the same thing twice.
 *
 * A fixed `waitForTimeout` is a guess about a frame rate, and on this browser the guess is
 * always wrong: the page draws once or twice a second (rule 54 measured six on a phone), so
 * a flight that takes 400ms of wall clock on a real device can take four seconds here. The
 * probe waits for the ANSWER instead of for a number of milliseconds.
 */
async function settle(maxMs = 30000) {
  // give the click and the first frame of the flight time to happen at all: at one frame a
  // second an input event can wait a second before the page even hears it
  await page.waitForTimeout(2500)
  let last = null
  let same = 0
  const until = Date.now() + maxMs
  while (Date.now() < until) {
    const now = await cam()
    same = now === last ? same + 1 : 0
    last = now
    if (same >= 2) return now
    await page.waitForTimeout(700)
  }
  return last
}

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate((save) => {
  window.localStorage.setItem('the-worker:life', JSON.stringify({ ...save, savedAt: new Date().toISOString() }))
  window.sessionStorage.setItem('the-worker:life:opening', '1')
}, SAVE)
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 60000 })
await page.waitForTimeout(3000)

await page.locator('[data-life="map-open"]').tap()
// read in the same poll that finds the map, because the hint is only up for three seconds
const first = await page
  .waitForFunction(() => {
    const map = document.querySelector('[data-life="city-map"]')
    return map ? { hint: Boolean(document.querySelector('[data-life="map-hint"]')), scale: document.querySelector('[data-life="map-scale"]')?.textContent } : false
  }, null, { timeout: 30000 })
  .then((handle) => handle.jsonValue())
say(`the drag hint is printed: ${first.hint ? 'yes' : 'NO'} · the scale bar says ${first.scale}`)
await settle()

const box = await page.locator('[data-life="city-map-box"]').boundingBox()
const mid = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

/** frames per second with the sheet open — the number that caught the first cut of the camera */
const fps = () => page.evaluate(() => new Promise((resolve) => {
  let frames = 0
  const t0 = performance.now()
  const tick = () => { frames += 1; if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else resolve(Math.round((frames * 1000) / (performance.now() - t0))) }
  requestAnimationFrame(tick)
}))
say(`fit: cam=${await cam()} box=${Math.round(box.width)}×${Math.round(box.height)} · ${await fps()} fps at rest`)
await page.screenshot({ path: `${OUT}/map-fit.png` })

/**
 * לחיצה — a mouse click at a measured point, not `locator.click()`.
 *
 * This browser draws the page at one or two frames a second (rule 54 measured six on a
 * phone), and Playwright's actionability check wants two consecutive frames to agree on
 * where a button is before it will press it — which here costs a minute and then presses
 * nothing. `{ force: true }` skips the check and was still swallowed after a drag. Every
 * control on this glass is a fixed element that nothing moves, so the probe measures it
 * once and clicks the coordinate.
 */
async function press(selector) {
  const target = await page.locator(selector).boundingBox()
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
  await settle()
}

const fitLabel = () => page.locator('[data-life="map-wide"]').textContent()

/** a drag with the mouse, in steps, so the pointer handler sees movement rather than a jump */
async function drag(dx, dy, steps = 14) {
  await page.mouse.move(mid.x, mid.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i += 1) await page.mouse.move(mid.x + (dx * i) / steps, mid.y + (dy * i) / steps)
  await page.mouse.up()
}

// 1 · zoom in twice, then drag: the camera must move, and stay inside the city
await press('[data-life="map-zoom-in"]')
await press('[data-life="map-zoom-in"]')
say(`after two zoom-ins: cam=${await cam()} · ${await fps()} fps`)
const before = await cam()
await drag(120, -90)
await settle()
const after = await cam()
say(`after a drag: cam=${after} ${before === after ? '*** THE MAP DID NOT MOVE ***' : 'moved'}`)
await page.screenshot({ path: `${OUT}/map-panned.png` })

// 2 · fling it at the wall four times; the window must still be a window on the city
// three short hard flings a side rather than one long one, so the pointer never leaves the
// box: a mouse dragged past the viewport edge is a probe artefact, not a thumb
for (const [dx, dy] of [[150, 0], [-150, 0], [0, 150], [0, -150]]) {
  for (let i = 0; i < 3; i += 1) await drag(dx, dy, 4)
  await settle()
}
const [fx, fy, fw] = (await cam()).split(',').map(Number)
const inside = fx >= -1 && fy >= -1 && fx + fw <= 1001 && fy + fw <= 1001
say(`after four flings at the edges: cam=${fx},${fy},${fw} ${inside ? 'inside the city' : '*** OUT OF BOUNDS ***'}`)

// 3 · the way back
await press('[data-life="map-wide"]')
say(`the fit button (to the neighbourhood): cam=${await cam()} · it now offers ${await fitLabel()}`)
await page.screenshot({ path: `${OUT}/map-refit.png` })
await press('[data-life="map-wide"]')
say(`the fit button again (to the whole city): cam=${await cam()} · it now offers ${await fitLabel()}`)
await page.screenshot({ path: `${OUT}/map-near.png` })

// 4 · what is actually legible, in rendered pixels, and what the scale bar claims
const read = await page.evaluate(() => {
  const svg = document.querySelector('[data-life="city-map"]')
  const rect = svg.getBoundingClientRect()
  const texts = [...svg.querySelectorAll('text')]
    .map((node) => {
      const b = node.getBoundingClientRect()
      return { text: node.textContent, px: +(b.height).toFixed(1), on: b.width > 0 && b.right > rect.left && b.left < rect.right && b.bottom > rect.top && b.top < rect.bottom }
    })
    .filter((n) => n.on)
  return {
    names: texts.map((n) => `${n.text} ${n.px}px`),
    smallest: texts.length ? Math.min(...texts.map((n) => n.px)) : null,
    pins: [...svg.querySelectorAll('[data-life="map-pin"]')].map((n) => n.dataset.place),
  }
})
say(`names on the glass (${read.names.length}), smallest ${read.smallest}px:\n  ${read.names.join('\n  ')}`)
say(`pins drawn: ${read.pins.join(', ')}`)

// 5 · a tap on a pin still walks there, and costs the walk
const hud = () => page.evaluate(() => ({
  clock: document.querySelector('[data-life="clock"]')?.textContent?.trim(),
  place: document.querySelector('[data-life="place"]')?.textContent?.trim(),
}))
const was = await hud()
const pin = await page.locator('[data-life="map-pin"][data-place="kiosk"]').boundingBox()
if (!pin) say('*** the kiosk pin is not on the glass ***')
else {
  await page.mouse.click(pin.x + pin.width / 2, pin.y + pin.height / 2)
  await page.waitForTimeout(12000)
  const now = await hud()
  say(`tapped the kiosk pin: ${was.place} @ ${was.clock} -> ${now.place} @ ${now.clock} · the sheet closed: ${(await page.locator('[data-life="map"]').count()) ? 'no' : 'yes'}`)
  await page.screenshot({ path: `${OUT}/map-after-pin.png` })
}

console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
await browser.close()
