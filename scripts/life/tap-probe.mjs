/**
 * הצבעה — does a tap reach the boy, and does he walk over and talk?
 *
 * The two bugs a real playthrough found are both invisible in a picture: the child
 * circling his father forever, because the place you stand to talk to somebody is inside
 * that person's own footprint; and the console's drag zone swallowing every tap on the
 * lower half of a phone screen. So this fires real pointer events and asks the game's own
 * prompt what happened.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PLACE = process.env.PROBE_PLACE ?? 'home'
const FLAGS = (process.env.PROBE_FLAGS ?? '').split(',').filter(Boolean)
const TOUCH = process.env.PROBE_TOUCH === '1'
const W = Number(process.env.PROBE_W ?? 1280)
const H = Number(process.env.PROBE_H ?? 820)
const SHOT = process.env.PROBE_SHOT ?? null
const TAPS = (process.env.PROBE_TAPS ?? '').split(';').filter(Boolean).map((p) => p.split(',').map(Number))

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: TOUCH, isMobile: TOUCH })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
// The ad and analytics hosts are refused by this sandbox on every screen; waiting for the
// network to fall idle therefore waits forever. Rule 29's distinction, applied to a probe.
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,accounts.google.com}/**', (r) => r.abort())

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(([where, flags]) => {
  window.localStorage.setItem(
    'the-worker:life',
    JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      year: 1986,
      events: [
        { t: 'flag.raised', flag: 'prologue:done' },
        { t: 'flag.raised', flag: 'onboard:moved' },
        { t: 'flag.raised', flag: 'onboard:acted' },
        { t: 'moved', to: where },
        ...flags.map((flag) => ({ t: 'flag.raised', flag })),
      ],
      savedAt: new Date().toISOString(),
    }),
  )
  window.sessionStorage.setItem('the-worker:life:opening', '1')
}, [PLACE, FLAGS])
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 })
const skip = page.locator('[data-life="opening-skip"]')
if ((await skip.count()) > 0) {
  await skip.click()
  await page.waitForTimeout(500)
}
await page.waitForTimeout(3000)

const read = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    prompt: document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? null,
    dialogue: document.querySelectorAll('[data-life="dialogue"]').length,
    cutscene: document.querySelector('[data-life="cutscene"]') ? document.querySelector('[data-life="cutscene"]').textContent.trim().slice(0, 120) : null,
    text: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.slice(0, 90) ?? null,
  }))

const rect = await page.evaluate(() => {
  const r = document.querySelector('canvas').getBoundingClientRect()
  return { x: r.x, y: r.y, w: r.width, h: r.height }
})
const first = await read()
console.log(`cutscene=${first.cutscene}`)
console.log(`place=${first.place} canvas=${rect.w.toFixed(0)}x${rect.h.toFixed(0)} @${rect.x.toFixed(0)},${rect.y.toFixed(0)} ${TOUCH ? 'touch' : 'mouse'}`)

if (SHOT) {
  await page.screenshot({ path: SHOT })
  console.log(`shot -> ${SHOT}`)
}

for (const [fx, fy] of TAPS) {
  const cx = rect.x + rect.w * fx
  const cy = rect.y + rect.h * fy
  const top = await page.evaluate(
    ([x, y]) => {
      const el = document.elementFromPoint(x, y)
      if (!el) return 'none'
      return `${el.tagName}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''}`
    },
    [cx, cy],
  )
  if (TOUCH) await page.touchscreen.tap(cx, cy)
  else await page.mouse.click(cx, cy)
  await page.waitForTimeout(Number(process.env.PROBE_WAIT ?? 2600))
  const a = await read()
  console.log(`tap ${fx},${fy} over ${top} -> prompt="${a.prompt}" dialogue=${a.dialogue} ${a.text ?? ''}`)
  if (SHOT) await page.screenshot({ path: SHOT.replace(/\.png$/, `-${fx}x${fy}.png`) })
  if (a.dialogue > 0) {
    if (SHOT) await page.screenshot({ path: SHOT.replace(/\.png$/, `-talk.png`) })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(700)
  }
}
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
await browser.close()
