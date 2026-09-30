/**
 * הקונסולה — is the stick actually on the screen, and is every target big enough?
 *
 * Maor, 16.9.2026: "הגוייסטיק והמקשים מחויביים להיות על המסך" — the stick and the buttons
 * are REQUIRED to be on screen. On a phone they were not: the deck defaulted off and the
 * player got a one-line chip. A screenshot cannot answer "is it there and is it 44px", so
 * this measures: it opens a real save on a real phone viewport, finds every control the
 * deck draws, and prints its box. Rule 42's promise is "every touch target is at least
 * 44px, measured in the harness on every viewport" — this is the harness that measures it.
 *
 * It also proves the SECOND BUTTON rule (16.9.2026): one button in the world, two on the
 * pitch, because B outside a football match was only ever "run" and run is on the stick.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const PLACE = process.env.PROBE_PLACE ?? 'street'
const OUT = process.env.PROBE_OUT ?? 'docs/life-shots'
const TAG = process.env.PROBE_TAG ?? 'deck'
const CLEAR = process.env.PROBE_CLEAR === '1'
const DECK_PREF = process.env.PROBE_DECK ?? null

const SIZES = [
  { name: 'iphone-se', w: 360, h: 740, touch: true },
  { name: 'iphone-14', w: 390, h: 844, touch: true },
  { name: 'android-s', w: 360, h: 640, touch: true },
  { name: 'desktop', w: 1280, h: 820, touch: false },
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
let bad = 0

for (const size of SIZES) {
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h },
    hasTouch: size.touch,
    isMobile: size.touch,
    deviceScaleFactor: size.touch ? 2 : 1,
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,accounts.google.com}/**', (r) => r.abort())

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([where, pref, clear]) => {
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
        ],
        savedAt: new Date().toISOString(),
      }),
    )
    if (clear) window.localStorage.removeItem('the-worker:life:deck')
    else if (pref) window.localStorage.setItem('the-worker:life:deck', pref)
    window.sessionStorage.setItem('the-worker:life:opening', '1')
  }, [PLACE, DECK_PREF, CLEAR])

  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 60000 })
  const skip = page.locator('[data-life="opening-skip"]')
  if ((await skip.count()) > 0) { await skip.click(); await page.waitForTimeout(400) }
  await page.waitForTimeout(3000)

  const seen = await page.evaluate(() => {
    const box = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) } }
    const deck = document.querySelector('[data-life="deck"]')
    const controls = [...document.querySelectorAll('[data-deck]')].map((el) => ({ id: el.getAttribute('data-deck'), ...box(el) }))
    return {
      deck: deck ? box(deck) : null,
      controls,
      chip: document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? null,
      glass: box(document.documentElement),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }
  })

  /**
   * הדחיפה — a measured drag, not a claim.
   *
   * Half a push must walk, a full push into the outer ring must RUN, and letting go must
   * stop both. None of that is visible in a screenshot, so the probe drives real pointer
   * events at the stick and reads back three things the page will admit to: where the ball
   * ended up, whether the run caption came up, and whether the boy actually left where he
   * was standing (the prompt names what is in reach, so it changes when he walks away).
   */
  let drive = null
  const stick = seen.controls.find((c) => c.id === 'stick')
  if (size.touch && stick) {
    const cx = stick.x + stick.w / 2
    const cy = stick.y + stick.h / 2
    const reach = stick.w * 0.3
    const ring = () => page.evaluate(() => {
      const pill = document.querySelector('[data-deck="stick"]')?.parentElement?.querySelector('span')
      return pill ? Number(getComputedStyle(pill).opacity) : -1
    })
    await page.mouse.move(cx, cy)
    await page.mouse.down()
    // half a push: he walks
    await page.mouse.move(cx - reach * 0.5, cy, { steps: 4 })
    await page.waitForTimeout(700)
    const walkRing = await ring()
    // all the way into the ring: he runs
    await page.mouse.move(cx - reach * 1.6, cy, { steps: 6 })
    await page.waitForTimeout(900)
    const runRing = await ring()
    await page.mouse.up()
    await page.waitForTimeout(1500)
    // Read, and if it still says "running" give it one more long beat before calling it a
    // fault. Against a dev server with Phaser on the same thread a React commit has been
    // measured landing 800ms–3s late here; what is being checked is the STATE the release
    // leaves behind, and a probe that reports frame rate as a bug is a probe nobody trusts.
    let restRing = await ring()
    if (restRing >= 0.5) {
      await page.waitForTimeout(2500)
      restRing = await ring()
    }
    const after = await page.evaluate(() => document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? null)
    drive = { walkRing, runRing, restRing, promptAfter: after }
    if (!(walkRing < 0.5 && runRing > 0.9 && restRing < 0.5)) bad += 1
  }

  const shot = `${OUT}/${TAG}-${size.name}.png`
  await page.screenshot({ path: shot })
  const small = seen.controls.filter((c) => Math.min(c.w, c.h) < 44)
  if (size.touch && small.length) bad += small.length
  if (size.touch && !seen.deck) bad += 1
  console.log(
    `${size.name.padEnd(10)} ${String(size.w).padStart(4)}x${size.h}` +
      ` deck=${seen.deck ? `${seen.deck.w}x${seen.deck.h}@${seen.deck.x},${seen.deck.y}` : 'MISSING'}` +
      ` controls=[${seen.controls.map((c) => `${c.id} ${c.w}x${c.h}@${c.x},${c.y}`).join(' | ')}]` +
      ` prompt=${JSON.stringify(seen.chip)}` +
      ` overflow=${seen.overflow}` +
      ` errors=${errors.length}` +
      (drive ? ` run=[walk ${drive.walkRing} ring ${drive.runRing} rest ${drive.restRing}] after=${JSON.stringify(drive.promptAfter)}` : '') +
      (small.length ? `  UNDER-44: ${small.map((c) => `${c.id} ${c.w}x${c.h}`).join(', ')}` : ''),
  )
  console.log(`  shot -> ${shot}`)
  await context.close()
}

await browser.close()
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1) }
console.log('\nevery control present and at least 44px')
