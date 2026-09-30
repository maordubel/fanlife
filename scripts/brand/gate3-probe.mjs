/**
 * שער 3 — playing the whole thing in a browser (rule 33), at two viewports.
 * Yellow band duplicated from lib/isYellow.ts; PNG decoded with pngjs.
 */
import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111'
const OUT = process.argv[3] ?? '/tmp/shots'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
mkdirSync(OUT, { recursive: true })

const HUE_MIN = 38, HUE_MAX = 70, SAT_MIN = 0.35, VAL_MIN = 0.35
function yellowPixels(data) {
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
    if (delta === 0) continue
    if (delta / max < SAT_MIN || max / 255 < VAL_MIN) continue
    let hue
    if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue >= HUE_MIN && hue <= HUE_MAX) count += 1
  }
  return count
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})

let faults = 0
const origin = new URL(BASE).origin

for (const [label, width, height] of [['phone', 390, 844], ['desk', 1280, 900]]) {
  const context = await browser.newContext({ viewport: { width, height } })
  const page = await context.newPage()
  const errors = []
  /*
   * A page that throws is a defect; a script this sandbox's egress proxy refused is the
   * ENVIRONMENT (rule 29). The two are told apart by the REQUEST's origin, never by the
   * message text — and `net::ERR_ABORTED` on our own origin is this probe cancelling an
   * in-flight prefetch when it navigates, which is the checker measuring itself.
   */
  const blocked = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const url = m.location()?.url ?? ''
    if (url && !url.startsWith(origin)) { blocked.push(url); return }
    if (m.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) { blocked.push(m.text()); return }
    if (m.text().includes('net::ERR_ABORTED')) { blocked.push(m.text()); return }
    errors.push(m.text())
  })
  page.on('requestfailed', (r) => {
    if (!r.url().startsWith(origin)) { blocked.push(new URL(r.url()).host); return }
    if (r.failure()?.errorText?.includes('ABORTED')) { blocked.push(r.url()); return }
    errors.push(`request ${r.url()} ${r.failure()?.errorText}`)
  })

  async function shot(step) {
    const buf = await page.screenshot({ fullPage: true })
    writeFileSync(`${OUT}/${label}-${step}.png`, buf)
    const png = PNG.sync.read(buf)
    const yellow = yellowPixels(png.data)
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth,
    }))
    const dir = await page.evaluate(() => document.documentElement.dir)
    const bad = yellow > 0 || overflow.doc > 0 || overflow.body > 0 || dir !== 'rtl'
    if (bad) faults += 1
    console.log(
      `${bad ? 'FAULT' : '  ok '} ${label}/${step}  yellow=${yellow}  overflowX=${overflow.doc}/${overflow.body}  dir=${dir}`,
    )
  }

  await page.goto(`${BASE}/lineup?seed=2`, { waitUntil: 'networkidle' })

  /*
   * The room has to be ALIVE before anything below is worth measuring.
   *
   * A stale `next start` holding the port serves a page whose client chunks no longer
   * exist, and it looks exactly like a working one: the markup is right, the screenshot
   * is right, and every click after it does nothing at all. That cost two passes here
   * and it is rule 50's `serve.sh` lesson in a second place. So the probe presses one
   * slot and refuses to continue unless the board answers.
   */
  const first = page.locator('[data-locker]:not([disabled])').first()
  await first.click()
  if ((await first.getAttribute('aria-pressed')) !== 'true') {
    throw new Error('the board did not react — a stale server is serving chunks that are gone')
  }
  await first.click()

  await shot('01-room')

  // a shirt taken off its peg and not yet placed — the one selected state that is drawn
  // in red, and the reason it is safe: a locker stands on paper, never on grass.
  await page.locator('[data-locker]').first().click()
  await shot('01b-held')
  await page.locator('[data-locker]').first().click()

  // tap counts / smallest control measurement
  const small = await page.evaluate(() => {
    const out = []
    for (const el of document.querySelectorAll('button, a[href]')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue
      if (r.height < 40) out.push(`${el.textContent?.trim().slice(0, 18)} ${Math.round(r.height)}px`)
    }
    return out
  })
  if (small.length) { console.log(`  note ${label} controls under 40px:`, small.slice(0, 6)) }

  // fill the eleven (Gate 3 V3, four bands): a shirt, then a band, eleven times. The band
  // is tapped at its corner — the men standing in it are buttons of their own.
  for (const line of ['GK', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'F', 'F']) {
    await page.locator('[data-locker]:not([disabled])').first().click()
    await page.locator(`[data-band="${line}"]`).click({ position: { x: 4, y: 4 } })
  }
  await shot('02-filled')

  // a coach note
  await page.getByRole('button', { name: 'פתק מהמאמן' }).click()
  await page.waitForTimeout(600)
  await shot('03-coach')

  // a LOCK on the first man on the pitch
  await page.locator('[data-man]').first().click()
  await page.getByRole('button', { name: /LOCK/ }).first().click()
  await shot('04-lock')

  // the tunnel
  await page.getByRole('button', { name: 'למנהרה' }).click()
  await page.waitForTimeout(250)
  await shot('05-tunnel')
  const dialogZ = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]')
    return d ? getComputedStyle(d).zIndex : null
  })
  console.log(`  note ${label} dialog z-index = ${dialogZ}`)

  await page.getByRole('button', { name: 'תשלחו את ההרכב' }).click()
  await page.waitForTimeout(1200)
  await shot('06-reveal')

  // step the reveal twice, then skip
  await page.getByRole('button', { name: 'תתחילו את הבדיקה' }).click()
  await page.waitForTimeout(150)
  await page.getByRole('button', { name: 'הבא' }).click()
  await page.waitForTimeout(150)
  await shot('07-reveal-step')
  await page.getByRole('button', { name: 'להציג הכול' }).click()
  await page.waitForTimeout(300)
  await shot('08-sheet')

  // second run on the same device: the reveal must open on the sheet
  await page.goto(`${BASE}/lineup?seed=2`, { waitUntil: 'networkidle' })
  for (const line of ['GK', 'D', 'D', 'D', 'D', 'M', 'M', 'M', 'M', 'F', 'F']) {
    await page.locator('[data-locker]:not([disabled])').first().click()
    await page.locator(`[data-band="${line}"]`).click({ position: { x: 4, y: 4 } })
  }
  await page.getByRole('button', { name: 'למנהרה' }).click()
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'תשלחו את ההרכב' }).click()
  await page.waitForTimeout(1200)
  const openedOnSheet = await page.getByRole('button', { name: 'לעבור שוב עמדה עמדה' }).count()
  console.log(`  note ${label} second run opens on the sheet: ${openedOnSheet === 1}`)
  if (openedOnSheet !== 1) faults += 1
  await shot('09-second-run')

  console.log(`  note ${label} off-origin/self-cancelled requests, not faults: ${blocked.length}`)
  if (errors.length) { faults += 1; console.log(`  FAULT ${label} console:`, errors.slice(0, 5)) }
  await context.close()
}

await browser.close()
console.log(faults === 0 ? 'gate 3 — clean' : `gate 3 — ${faults} faults`)
process.exit(faults === 0 ? 0 : 1)
