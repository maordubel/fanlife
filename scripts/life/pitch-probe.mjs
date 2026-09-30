/**
 * מדידת המגרש — the only place rule 8 can be enforced on a 3D scene at all.
 *
 * `tests/life.test.ts` proves the runtime palette holds no yellow and that no shipped PNG
 * holds a yellow pixel. Neither statement reaches the football engine, because a 3D scene
 * has **no file**: it builds its colours at runtime from geometry, lights and a canvas
 * texture, and the asset scanner has nothing to read. That gap is real — this project has
 * already had yellow re-enter once through mp4 frames that `count_yellow` never saw.
 *
 * So the frame itself is the evidence. This opens `/qa/life-pitch` at four viewports, lets
 * the match run, screenshots it, and counts yellow pixels in the picture a player would
 * actually be looking at.
 *
 *  · **`?away=plain` must be clean.** With the opponent in chalk there is no approved
 *    yellow anywhere in the scene, so anything above the browser's own resampling noise is
 *    a real yellow the engine invented. That is the assertion that matters: the ground, the
 *    grass, the light, the crowd and — above all — the Hapoel kit can never be yellow.
 *  · **The default frame is allowed to have yellow in it**, because Maor granted exactly
 *    that on 7.9.2026: yellow marks the OPPONENT, and only the opponent. The probe reports
 *    the count rather than failing on it, and `tests/life-football.test.ts` is what proves
 *    the colour is unreachable for the player's own side.
 *
 * It also measures what a screenshot cannot: frame times over a live match, and that the
 * scoreboard is DOM rather than text baked into the canvas — Hebrew in WebGL has no bidi,
 * no selection and no screen reader, and that rule does not stop being true in 3D.
 *
 * Usage: `npm run life:pitch` with a dev server already up on :3000.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'

const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35
/** the browser's own bilinear resampling can land a pixel in the band; a real asset lands far above */
const RESAMPLE_ALLOWANCE = 0.001

/** `PITCH_SIZES=phone,desktop` — a subset, when what changed is not layout */
const ONLY = process.env.PITCH_SIZES?.split(',').filter(Boolean) ?? null

const SIZES = [
  { name: 'small', width: 360, height: 640, touch: true, budget: 60 },
  { name: 'phone', width: 390, height: 844, touch: true, budget: 60 },
  { name: 'tablet', width: 768, height: 1024, touch: false, budget: 50 },
  { name: 'desktop', width: 1440, height: 900, touch: false, budget: 34 },
]

function yellowPixels(buffer) {
  const png = PNG.sync.read(buffer)
  let count = 0
  let sample = ''
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] < 8) continue
    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (delta === 0) continue
    if (delta / max < SAT_MIN || max / 255 < VAL_MIN) continue
    let hue
    if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue >= HUE_MIN && hue <= HUE_MAX) {
      count += 1
      if (!sample) sample = `rgb(${r} ${g} ${b})`
    }
  }
  return { count, sample, total: png.data.length / 4 }
}

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

let faults = 0
const report = []

for (const size of SIZES.filter((entry) => !ONLY || ONLY.includes(entry.name))) {
  for (const away of ['plain', 'yellow']) {
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      hasTouch: size.touch,
      isMobile: size.touch,
    })
    const page = await context.newPage()
    // the ad and analytics hosts are refused by this sandbox; the same line
    // `playthrough.mjs` and `tap-probe.mjs` already carry, for the same reason
    await page.route(
      '**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**',
      (route) => route.abort(),
    )
    const errors = []
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      if (message.text().startsWith('Failed to load resource')) return
      errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(String(error)))

    const label = `pitch-${size.name}-${away}`
    await page.goto(`${BASE}/qa/life-pitch?away=${away}&minute=84`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-life="pitch-card"] canvas', { timeout: 30000 })
    // let the match get going: the kickoff restart is about a second, and a screenshot of
    // twenty-two men standing on their anchors proves nothing about a match
    await page.waitForTimeout(4000)

    // --- the scoreboard is DOM, not baked into the canvas ---------------------------------
    const boardText = await page.textContent('[data-life="pitch-board"]').catch(() => null)
    if (!boardText || boardText.trim().length === 0) {
      faults += 1
      report.push(`BOARD   ${label}: no DOM scoreboard — Hebrew must never be drawn into the canvas`)
    }

    /**
     * --- frame times over a live match -----------------------------------------------------
     *
     * Reported always, asserted only on real hardware. This container has no GPU and falls
     * back to SwiftShader, where a 3D scene draws at six frames a second no matter how
     * cheap it is — so failing the budget here would be measuring the sandbox and calling
     * it the product. The renderer string is read first and the assertion is skipped when
     * it is software, with the reason printed rather than silently dropped.
     */
    const gpu = await page.evaluate(() => {
      const probe = document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')
      if (!probe) return 'none'
      const info = probe.getExtension('WEBGL_debug_renderer_info')
      return info ? String(probe.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown'
    })
    const software = /swiftshader|llvmpipe|software|none/i.test(gpu)
    const frames = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const times = []
          let last = performance.now()
          const tick = () => {
            const now = performance.now()
            times.push(now - last)
            last = now
            if (times.length < 180) requestAnimationFrame(tick)
            else resolve(times.slice(10))
          }
          requestAnimationFrame(tick)
        }),
    )
    const sorted = [...frames].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    report.push(`frame   ${label}: median ${median.toFixed(1)}ms · p95 ${p95.toFixed(1)}ms`)
    if (software) {
      report.push(`gpu     ${label}: ${gpu} — software rendering, frame budget not asserted`)
    } else if (p95 > size.budget) {
      faults += 1
      report.push(`SLOW    ${label}: p95 ${p95.toFixed(1)}ms is over the ${size.budget}ms budget`)
    }

    // --- the frame itself --------------------------------------------------------------------
    const buffer = await page.screenshot()
    writeFileSync(`${OUT}/${label}.png`, buffer)
    const { count, sample, total } = yellowPixels(buffer)
    const rate = count / Math.max(1, total)
    report.push(`hue     ${label}: ${count}px (${(rate * 100).toFixed(4)}%) ${sample}`)

    if (away === 'plain' && rate > RESAMPLE_ALLOWANCE) {
      faults += 1
      report.push(`YELLOW  ${label}: ${count}px with no opponent marking — the engine invented a yellow`)
    }
    if (away === 'yellow' && count === 0) {
      faults += 1
      report.push(`MARK    ${label}: the approved opponent marking did not render at all`)
    }

    for (const error of errors) {
      faults += 1
      report.push(`ERROR   ${label}: ${error}`)
    }

    await context.close()
  }
}

await browser.close()

for (const line of report) console.log(line)
console.log(faults === 0 ? '\nמגרש: תקין' : `\nמגרש: ${faults} תקלות`)
process.exit(faults === 0 ? 0 : 1)
