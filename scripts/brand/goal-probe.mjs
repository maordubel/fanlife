/**
 * שער 8 — ריצה שלמה, בדפדפן, ולא צילום מסך אחד.
 *
 * `npm run qa:sweep` opens `/goal` and measures the screen it lands on. Rule 33 is explicit
 * that a mode is proven by PLAYING it, so this plays a whole run at three sizes and asserts,
 * at every step:
 *   · no horizontal overflow, and on a phone no page scroll (the delta-87 stage)
 *   · no page error and no console error from our own code
 *   · zero yellow pixels, on the same hue band `lib/isYellow.ts` defines — with the shirt
 *     PHOTOGRAPHS hidden for the scan (`[data-shirt="photo"]`, the `public/kits/` ledger's
 *     own exemption; the same move qa-sweep makes for `[data-archive-photo]`)
 *   · the document is still RTL and every control still clears 44px
 *
 * Delta 88 (Maor 24.9.2026: "נורא 'לחיצה' משעממת, שום תנועה") rebuilt the gate as a DRAG
 * game, so the probe drags: the first man onto the grass, the ball onto a team-mate, the
 * ball into the net. Then it proves the rest of the contract:
 *   · undo walks back ONE gesture, and the move can be rebuilt
 *   · the verb strip overrules what the gesture read
 *   · the caption on the board never takes a tap
 *   · the reception hint draws exactly one envelope before the whistle
 *   · the whistle plays a REPLAY (`[data-goal="rolling"]`) and then reveals — envelopes and
 *     bridges on the board, the verdict one tap away — left by its own button, never by
 *     waiting
 *   · goals 2 and 3 are played with TAPS only — the WCAG 2.5.7 single-pointer path
 *   · full time prints the good-touches figure and a way back in
 *
 *   npm run goal:probe [-- http://127.0.0.1:3000]
 *   GOAL_SHOTS=<dir>  where the pictures go (default docs/goal-shots, git-ignored)
 *   GOAL_PIN=<goalId> play a pinned run (/goal?g=…)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.GOAL_SHOTS ?? 'docs/goal-shots'
const PIN = process.env.GOAL_PIN ?? ''

// Kept in step with lib/isYellow.ts and scripts/brand/qa-sweep.mjs — all three or none.
const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35

const WIDTHS = [
  { w: 390, h: 844, name: 'phone' },
  { w: 360, h: 640, name: 'narrow' },
  { w: 430, h: 932, name: 'tall' },
  { w: 1280, h: 800, name: 'desktop' },
]

function yellowPixels(png) {
  let count = 0
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i] / 255
    const g = png.data[i + 1] / 255
    const b = png.data[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    if (max < VAL_MIN) continue
    const delta = max - min
    if (max === 0 || delta / max < SAT_MIN) continue
    let hue
    if (delta === 0) hue = 0
    else if (max === r) hue = 60 * (((g - b) / delta) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue < 0) hue += 360
    if (hue >= HUE_MIN && hue <= HUE_MAX) count += 1
  }
  return count
}

/** where the yellow is — a few sample pixels, for the person fixing it */
function yellowWhere(png) {
  const out = []
  for (let i = 0; i < png.data.length && out.length < 12; i += 4) {
    const r = png.data[i] / 255
    const g = png.data[i + 1] / 255
    const b = png.data[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (max < VAL_MIN || max === 0 || delta / max < SAT_MIN) continue
    let hue = max === r ? 60 * (((g - b) / delta) % 6) : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4)
    if (hue < 0) hue += 360
    if (hue >= HUE_MIN && hue <= HUE_MAX) {
      const p = i / 4
      out.push([p % png.width, Math.floor(p / png.width)])
    }
  }
  return out
}

const problems = []

async function shoot(page, label) {
  mkdirSync(OUT, { recursive: true })
  // the kit photographs are the public/kits/ ledger's exemption — hidden for the scan only
  const hidden = await page.evaluate(() => {
    const photos = [...document.querySelectorAll('[data-shirt="photo"] img')]
    for (const img of photos) img.style.visibility = 'hidden'
    return photos.length
  })
  const buffer = await page.screenshot({ fullPage: false })
  await page.evaluate(() => {
    for (const img of document.querySelectorAll('[data-shirt="photo"] img')) img.style.visibility = ''
  })
  writeFileSync(`${OUT}/${label}.png`, await page.screenshot({ fullPage: false }))
  const yellow = yellowPixels(PNG.sync.read(buffer))
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scroll: document.documentElement.scrollHeight - window.innerHeight,
  }))
  const small = await page.evaluate(() =>
    // the source note prints 28px and grows its HIT area to 48px with ::after (WCAG 2.5.8)
    [...document.querySelectorAll('button:not([disabled]), a[href]:not([data-source-note])')]
      .map((el) => {
        const box = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return { text: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24), h: Math.round(box.height), w: Math.round(box.width), shown: style.visibility !== 'hidden' }
      })
      .filter((row) => row.shown && row.h > 0 && row.w > 0 && row.text !== 'דילוג לתוכן')
      .filter((row) => row.h < 44 || row.w < 20),
  )
  const phone = page.viewportSize().width < 768
  console.log(`${label}: yellow=${yellow} overflow=${metrics.overflow} scroll=${metrics.scroll} tiny=${small.length} photos-hidden=${hidden}`)
  if (small.length > 0) console.log(`   tiny: ${JSON.stringify(small.slice(0, 4))}`)
  if (yellow > 0 && process.env.GOAL_WHERE) console.log(`   yellow at: ${JSON.stringify(yellowWhere(PNG.sync.read(buffer)))}`)
  if (yellow > 0) problems.push(`${label} — ${yellow} yellow pixels`)
  if (metrics.overflow > 1) problems.push(`${label} — ${metrics.overflow}px of horizontal overflow`)
  if (phone && metrics.scroll > 1) problems.push(`${label} — the phone page scrolls by ${metrics.scroll}px`)
  if (small.length > 0) problems.push(`${label} — ${small.length} controls under 44px: ${JSON.stringify(small.slice(0, 4))}`)
}

async function tap(page, selector, label) {
  const target = page.locator(selector).first()
  await target.waitFor({ state: 'visible', timeout: 10000 })
  await target.click()
  await page.waitForTimeout(160)
  if (label) console.log(`   · ${label}`)
}

async function centre(page, selector) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`no box for ${selector}`)
  return [box.x + box.width / 2, box.y + box.height / 2]
}

async function drag(page, from, to, label) {
  const [x1, y1] = from
  const [x2, y2] = to
  await page.mouse.move(x1, y1)
  await page.mouse.down()
  for (let k = 1; k <= 14; k += 1) {
    await page.mouse.move(x1 + ((x2 - x1) * k) / 14, y1 + ((y2 - y1) * k) / 14)
    await page.waitForTimeout(10)
  }
  await page.mouse.up()
  // the ball flies — let it land, and the hit fade
  await page.waitForTimeout(2100)
  if (label) console.log(`   · drag: ${label}`)
}

async function touchCount(page) {
  return page.locator('[data-goal="touch"]').count()
}

/**
 * The caption strip is `pointer-events: none`: a tap anywhere on it must land on whatever
 * is UNDER it — a zone, a man, or the drawing — and never on the strip itself.
 */
async function captionPassesTaps(page, tag) {
  const verdict = await page.evaluate(() => {
    const caption = document.querySelector('[data-goal="caption"]')
    if (!caption) return 'no-caption'
    const box = caption.getBoundingClientRect()
    for (const fx of [0.1, 0.5, 0.9]) {
      const el = document.elementFromPoint(box.left + box.width * fx, box.top + box.height / 2)
      if (!el) return 'nothing under the caption'
      if (caption.contains(el)) return 'the caption takes the tap'
    }
    return 'ok'
  })
  if (verdict !== 'ok') problems.push(`${tag} — ${verdict}`)
  else console.log('   · the caption lets the tap through')
}

async function men(page) {
  return page
    .locator('[data-goal="player"]:not([data-opponent])')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-token')))
}

async function openHints(page, phone) {
  if (phone) await tap(page, '[data-goal="hints"]', 'hints sheet')
}

async function whistleAndReveal(page, tag, phone, shots) {
  await tap(page, '[data-goal="finish"]', 'whistle')
  await page.locator('[data-goal="rolling"]').waitFor({ state: 'attached', timeout: 10000 })
  if (shots) {
    await page.waitForTimeout(900)
    await shoot(page, `${tag}-05-replay`)
  }
  await page.locator('[data-goal="continue"]').waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(500)
  if (phone) {
    await tap(page, '[data-goal="details"]', 'verdict sheet')
  }
  await page.locator('[data-goal="verdict"]').waitFor({ state: 'visible', timeout: 10000 })
  if (shots) await shoot(page, `${tag}-06-verdict`)
  if (phone) {
    // Escape, and the backdrop if a key did not reach it
    await page.keyboard.press('Escape')
    await page.waitForTimeout(350)
    if ((await page.locator('[role="dialog"]').count()) > 0) {
      await page.mouse.click(8, 8)
      await page.waitForTimeout(350)
    }
    if ((await page.locator('[role="dialog"]').count()) > 0) problems.push(`${tag} — the verdict sheet did not close`)
  }
}

async function playOne(page, view) {
  const tag = `${view.name}`
  const phone = view.w < 768
  await page.setViewportSize({ width: view.w, height: view.h })
  await page.goto(`${BASE}/goal?seed=1${PIN ? `&g=${PIN}` : ''}`, { waitUntil: 'networkidle' })
  await page.locator('[data-goal="player"]').first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(600)

  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
  if (dir !== 'rtl') problems.push(`${tag} — document dir is ${dir}`)
  const zones = await page.locator('[data-goal="zone"]').count()
  if (zones !== 20) problems.push(`${tag} — ${zones} zone buttons, not 20 (the tap path)`)
  await shoot(page, `${tag}-01-empty`)
  await captionPassesTaps(page, tag)

  const cast = await men(page)
  if (cast.length < 2) problems.push(`${tag} — only ${cast.length} men on the pitch`)

  // 1 · the first man onto the grass, 2 · the ball to a team-mate, 3 · the ball into the net
  await drag(page, await centre(page, `[data-token="${cast[0]}"]`), await centre(page, '[data-goal="zone"][data-zone="E2"]'), `${cast[0]} stands on the wing`)
  if ((await page.locator('[data-goal="ball"]').count()) !== 1) problems.push(`${tag} — nobody has the ball after the first drag`)
  await drag(page, await centre(page, '[data-goal="ball"]'), await centre(page, `[data-token="${cast[1]}"]`), `ball → ${cast[1]}`)
  await shoot(page, `${tag}-02-two-drags`)
  if ((await touchCount(page)) !== 1) problems.push(`${tag} — a pass to a team-mate made ${await touchCount(page)} touches, not 1`)
  await drag(page, await centre(page, '[data-goal="ball"]'), await centre(page, '[data-goal="mouth"]'), 'ball → the net')
  if ((await touchCount(page)) !== 2) problems.push(`${tag} — the move has ${await touchCount(page)} touches, not 2`)
  await shoot(page, `${tag}-03-in-the-net`)

  // undo is ONE gesture back; the shot can be played again
  await tap(page, '[data-goal="undo"]', 'undo the shot')
  if ((await touchCount(page)) !== 1) problems.push(`${tag} — undo left ${await touchCount(page)} touches, not 1`)
  await drag(page, await centre(page, '[data-goal="ball"]'), await centre(page, '[data-goal="mouth"]'), 'ball → the net, again')
  if ((await touchCount(page)) !== 2) problems.push(`${tag} — re-playing the shot left ${await touchCount(page)} touches`)

  // the verb strip overrules the gesture's reading (header = the sixth verb)
  await tap(page, '[data-goal="action"] >> nth=5', 'verb → header')
  const pressed = await page.locator('[data-goal="action"][aria-pressed="true"]').count()
  if (pressed !== 1) problems.push(`${tag} — ${pressed} verbs pressed after the correction, not 1`)

  // the reception hint — one envelope, drawn before the whistle
  await openHints(page, phone)
  await tap(page, '[data-goal="hint-reception"]', 'reception hint')
  await page.locator('[data-goal="reception"]').waitFor({ state: 'attached', timeout: 10000 })
  const hints = await page.locator('[data-goal="reception"]').count()
  if (hints !== 1) problems.push(`${tag} — the reception hint drew ${hints} envelopes`)
  await shoot(page, `${tag}-04-reception-hint`)

  await whistleAndReveal(page, tag, phone, true)
  const ellipses = await page.locator('svg ellipse[stroke-dasharray]').count()
  if (ellipses === 0) problems.push(`${tag} — the reveal drew no uncertainty envelope`)
  else console.log(`   · ${ellipses} envelopes drawn`)
  const marks = await page.locator('[data-goal="bridge"], [data-goal="extra"], [data-goal="missing"]').count()
  if (marks === 0) problems.push(`${tag} — the reveal drew no bridge, extra or missing mark`)
  else console.log(`   · ${marks} bridges / marks drawn`)
  await shoot(page, `${tag}-07-reveal`)
  await tap(page, '[data-goal="continue"]', 'continue')

  // goals 2 and 3 — TAPS only: tap a man, tap the grass, tap a team-mate, tap the goal
  for (let goal = 2; goal <= 3; goal += 1) {
    const next = await Promise.race([
      page.locator('[data-goal="player"]').first().waitFor({ timeout: 20000 }).then(() => 'builder'),
      page.locator('text=FULL TIME').waitFor({ state: 'visible', timeout: 20000 }).then(() => 'full-time'),
    ])
    if (next === 'full-time') {
      console.log(`   · the run ended after goal ${goal - 1}`)
      break
    }
    await page.waitForTimeout(400)
    const pool = await men(page)
    await tap(page, `[data-token="${pool[0]}"]`, `tap ${pool[0]}`)
    await tap(page, '[data-goal="zone"][data-zone="C3"]', 'tap the grass — he stands there')
    await page.waitForTimeout(400)
    await tap(page, `[data-token="${pool[1]}"]`, `tap ${pool[1]} — the pass`)
    await page.waitForTimeout(1100)
    await tap(page, '[data-goal="mouth"]', 'tap the goal — the finish')
    await page.waitForTimeout(1100)
    const count = await touchCount(page)
    if (count !== 2) problems.push(`${tag} — goal ${goal}: the tap path made ${count} touches, not 2`)
    await whistleAndReveal(page, `${tag}-g${goal}`, phone, false)
    await tap(page, '[data-goal="continue"]', `goal ${goal} done`)
  }

  await page.locator('text=FULL TIME').waitFor({ state: 'visible', timeout: 25000 })
  await page.waitForTimeout(600)
  await shoot(page, `${tag}-08-fulltime`)
  const again = await page.locator('a[href*="/goal"]').count()
  if (again === 0) problems.push(`${tag} — full time offers no way back into the gate`)
  const good = await page.locator('[data-goal="good-touches"]').count()
  if (good !== 1) problems.push(`${tag} — full time does not print the good-touches figure`)
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  // Subpixel antialiasing invents colour at every glyph edge — 23,643 false yellow
  // pixels the first time `qa:sweep` ran, and 638 the first time this did. Off, or the
  // scan measures the renderer instead of the product (rule 29).
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})
const context = await browser.newContext({ locale: 'he-IL', reducedMotion: process.env.GOAL_MOTION === 'reduce' ? 'reduce' : 'no-preference' })
await context.addInitScript(() => {
  try {
    sessionStorage.setItem('tw.intro.seen', '1')
    localStorage.setItem('tw.intro.seen', '1')
  } catch {}
})
const page = await context.newPage()
page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
page.on('console', (message) => {
  if (message.type() !== 'error') return
  const url = message.location()?.url ?? ''
  // The ad and analytics hosts do not resolve in this sandbox; the test is the REQUEST's
  // origin, never the message text (rule 29).
  if (url.includes(BASE)) problems.push(`console error: ${message.text().slice(0, 120)}`)
})

for (const view of WIDTHS.filter((row) => !process.env.GOAL_ONLY || process.env.GOAL_ONLY.split(',').includes(row.name))) {
  console.log(`\n— ${view.name} ${view.w}×${view.h}`)
  await playOne(page, view)
}

await browser.close()

if (problems.length > 0) {
  console.error('\ngoal:probe — נפל:')
  for (const problem of problems) console.error(`  · ${problem}`)
  process.exit(1)
}
console.log('\ngoal:probe — נקי. מהלך שלם, שלושה רוחבים, בלי צהוב ובלי גלישה.')
