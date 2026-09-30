/**
 * שער 4 — משחקים סבב שלם עד החשיפה, ורק אז מודדים.
 *
 *   node scripts/brand/gate4-probe.mjs [http://127.0.0.1:3000] [--shots <dir>] [--seed <n>]
 *   npm run gate4:probe
 *
 * `qa:sweep` נכנס ל-/kits/build ורואה את השלב הראשון בלבד — כלומר מסך של חמישה כפתורים
 * שאף אחד מהם עוד לא נלחץ. מה שנשבר בשער הזה נשבר אחרי זה: כרטיס שני עם שתי שורות של
 * אפשרויות, מסגרת הסקירה, החשיפה עם תצלום ארכיון, והסיכום. כלל 33 אומר את זה במילים:
 * "Play the whole thing, not one screen of it."
 *
 * לכל רוחב (320×568, 390×844, 430×932) הסקריפט משחק את חמש החולצות — בוחר אפשרות בכל
 * שלב, מחכה למעבר האוטומטי, לוחץ "בדוק את החולצה", עובר את החשיפה — ובכל מצב סופר:
 *   · גלישה אופקית (scrollWidth מול innerWidth);
 *   · כל כפתור, הכרטיסים והסרגל התחתון בתוך המסך (המשחק הוא מסך אחד בגובה הטלפון);
 *   · פיקסלים צהובים, בפס של lib/isYellow.ts, כשתצלומי הארכיון מוסתרים ([data-archive-photo]) —
 *     התיקייה פטורה (כלל 69), המסך לא.
 * יציאה בקוד שאינו 0 על כל תקלה.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const flag = (name) => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] : undefined
}
const BASE = args.find((arg) => /^https?:/.test(arg)) ?? 'http://127.0.0.1:3000'
const SHOTS = flag('--shots')
const SEED = flag('--seed') ?? '7'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// Kept in step with lib/isYellow.ts — the same band qa-sweep reads.
const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35

function yellowPixels(buffer) {
  const png = PNG.sync.read(buffer)
  const data = png.data
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
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

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})

let faults = 0
const fault = (message) => {
  faults += 1
  console.log(`  ✕ ${message}`)
}

for (const viewport of VIEWPORTS) {
  const tag = `${viewport.width}x${viewport.height}`
  console.log(`— ${tag}`)
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text())
  })
  await page.goto(`${BASE}/kits/build?seed=${SEED}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-kit-run]')

  async function measure(state) {
    const layout = await page.evaluate(() => {
      const out = { overflowX: document.documentElement.scrollWidth - window.innerWidth, outside: [] }
      const check = (selector) => {
        for (const el of document.querySelectorAll(selector)) {
          const box = el.getBoundingClientRect()
          if (box.width === 0) continue
          if (box.bottom > window.innerHeight + 1 || box.right > window.innerWidth + 1 || box.left < -1) {
            out.outside.push(`${selector} ${Math.round(box.left)},${Math.round(box.top)}–${Math.round(box.right)},${Math.round(box.bottom)}`)
          }
        }
      }
      if (document.querySelector('[data-kit-run]') && !document.querySelector('[data-kit-reveal]')) {
        check('[data-kit-footer]')
        check('[data-kit-option]')
        check('[data-kit-check]')
      }
      if (document.querySelector('[data-kit-reveal]')) check('[data-kit-next]')
      return out
    })
    if (layout.overflowX > 0) fault(`${tag} ${state}: horizontal overflow ${layout.overflowX}px`)
    for (const row of layout.outside) fault(`${tag} ${state}: off-screen ${row}`)
    const hidden = await page.evaluate(() => {
      const photos = [...document.querySelectorAll('[data-archive-photo]')]
      for (const photo of photos) photo.style.visibility = 'hidden'
      return photos.length
    })
    const shot = await page.screenshot({ fullPage: false })
    const yellow = yellowPixels(shot)
    if (yellow > 0) fault(`${tag} ${state}: ${yellow} yellow pixels (archive photos hidden: ${hidden})`)
    await page.evaluate(() => {
      for (const photo of document.querySelectorAll('[data-archive-photo]')) photo.style.visibility = ''
    })
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true })
      writeFileSync(join(SHOTS, `${tag}-${state}.png`), await page.screenshot({ fullPage: false }))
    }
    console.log(`  ✓ ${state} · yellow ${yellow} · overflow ${layout.overflowX}`)
  }

  for (let shirt = 0; shirt < 5; shirt += 1) {
    for (let step = 0; step < 5; step += 1) {
      await page.waitForSelector('[data-kit-option]')
      // wait for the step's own cards: the card grid changes when the advance lands
      await page.waitForTimeout(260)
      if (shirt === 0 && step === 0) await measure('s1-body')
      if (shirt === 1 && step === 1) await measure('s2-construction')
      if (shirt === 4 && step === 4) await measure('s5-sponsor')
      const options = await page.$$('[data-kit-option]')
      // not always the first card: a probe that always picks the first cannot see a wrong answer
      await options[(shirt + step) % options.length].click()
    }
    await page.waitForSelector('[data-kit-check]:not([disabled])', { timeout: 5000 })
    if (shirt === 0) await measure('s1-review')
    await page.click('[data-kit-check]')
    await page.waitForSelector('[data-kit-reveal]', { timeout: 15000 })
    await page.waitForTimeout(600)
    if (shirt === 0 || shirt === 4) await measure(`s${shirt + 1}-reveal`)
    await page.click('[data-kit-next]')
  }
  await page.waitForSelector('[data-kit-summary]', { timeout: 10000 })
  await page.waitForTimeout(400)
  await measure('summary')

  // the long-press/ⓘ sheet, on a fresh round
  await page.goto(`${BASE}/kits/build?seed=${SEED}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-kit-option]')
  await page.click('[data-kit-option] ~ button')
  await page.waitForSelector('[role="dialog"]')
  await measure('info')

  if (errors.length) for (const error of errors) fault(`${tag}: page error — ${error}`)
  await context.close()
}

await browser.close()
console.log(faults === 0 ? 'gate4:probe — clean' : `gate4:probe — ${faults} faults`)
process.exit(faults === 0 ? 0 : 1)
