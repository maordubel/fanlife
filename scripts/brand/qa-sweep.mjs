/**
 * סריקת קבלה — every route, every width, in one pass.
 *
 * The three claims each delta makes — no horizontal overflow, no console errors, no
 * yellow pixels — were being made from memory and a handful of screenshots. This is the
 * script that actually establishes them, so the claim and the check are the same thing.
 *
 * On yellow: the hue band is duplicated from `lib/isYellow.ts` because a browser script
 * cannot import TypeScript, and duplication is how "no yellow" quietly became "no yellow
 * according to whichever check ran last". `tests/brand.test.ts` reads the numbers back
 * out of this file and fails if they drift from the module.
 *
 * The opening animation is a NAMED exemption (`lib/brand/yellowExemptions.ts`, approved
 * by Maor on 1.9.2026 for the opposition shirt). The sweep dismisses it before measuring
 * rather than allowing yellow on the wall: the exemption covers one file, not one route,
 * and a scanner that looked away from a whole screen would hide the next real defect.
 *
 * The kit archive is the same principle applied to the THIRD exemption. `public/kits/`
 * holds 168 photographs of real shirts, 71 of which carry yellow that belongs to the
 * garment — a Europa League badge, Visa's gold band, an orange keeper's jersey — and
 * the exemption is the folder, not the screen. So the sweep hides every element marked
 * `data-archive-photo` and measures what is left: the chrome, the type, the filter rail
 * and the background of `/kits/archive` are held to rule 8 exactly like every other
 * screen. Hiding the photographs rather than skipping the route is the whole point —
 * the next defect on that page is still caught.
 *
 *   node scripts/brand/qa-sweep.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'
// A missing canvas must fail the run, not silently skip the yellow count: a scanner
// that reports nothing and exits 0 is worse than no scanner, because it is believed.
import { createCanvas, loadImage } from 'canvas'
import { readFileSync } from 'node:fs'

// The exempt files, read out of lib/brand/yellowExemptions.ts rather than copied (a script
// cannot import TypeScript, and a copied list is how two lists drift).
const EXEMPT_PATHS = [...readFileSync(new URL('../../lib/brand/yellowExemptions.ts', import.meta.url), 'utf8')
  .matchAll(/path: '(public\/[^']+)'/g)].map((m) => m[1].slice('public'.length))
// ...and the approved photograph FOLDERS (rule 69: public/kits/ — the archive's photographed
// shirts, which gates 1, 3, 8 and 9 now print on the pitch through PlayerShirt).
const EXEMPT_FOLDERS = [...readFileSync(new URL('../../lib/brand/yellowExemptions.ts', import.meta.url), 'utf8')
  .matchAll(/folder: '(public\/[^']+)'/g)].map((m) => m[1].slice('public'.length))

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// Kept in step with lib/isYellow.ts by tests/brand.test.ts — change both or neither.
const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35

const ROUTES = [
  '/', '/xi', '/trivia', '/trivia/general', '/lineup', '/kits', '/kits/build',
  '/memory', '/polls', '/goal', '/tik', '/derby', '/timeline', '/ussishkin',
  // שער 12 — the archive wing. A screen that is not swept is a screen nobody is
  // measuring (rule 69 §3), and this one prints press copy at four widths.
  '/archive',
  // the photograph archive — swept with the photographs hidden, see the header
  '/kits/archive',
  // המקורות — the one page that prints every source and credit (spec §0.3, 22.9.2026).
  // Three hundred titles in two scripts at four widths is exactly where a line overflows.
  '/credits',
  // הארון, שוק האדומים והמכירה הפומבית (rule 90). The live routes are swept as a build without
  // keys draws them (the invitation, the empty table), and the /qa harnesses draw the states a
  // database would — a listing, a thread, a lot with bids, the admin console — from fixtures.
  '/kits/closet', '/kits/market', '/kits/auction',
  '/qa/collector', '/qa/collector?view=public', '/qa/collector?view=editor',
  '/qa/market?show=board', '/qa/market?show=listing', '/qa/market?show=thread',
  '/qa/auction?view=board', '/qa/auction?view=lot-live', '/qa/auction?view=lot-won', '/qa/auction?view=admin',
  // THE WORKER LIFE is swept like any other screen — its canvas is pixels on the wall
  // and rule 8 does not care that they were drawn by a Graphics call. What this sweep
  // cannot do is PLAY it; `scripts/life/playthrough.mjs` does that.
  '/life',
  // ONE RED WORLD (28.9.2026): the stand, the personal file, a challenge landing, the red thread
  '/stand', '/tik/file', '/blind-cow', '/royal-rumble', '/timeline/order',
]
const WIDTHS = [320, 390, 768, 1440]

function yellowPixels(data) {
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

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  // Subpixel antialiasing invents colour at every glyph edge and produced 23,643 false
  // yellow pixels the first time this ran. Off, or the scan measures the renderer.
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})

let faults = 0
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  for (const route of ROUTES) {
    const page = await context.newPage()
    const errors = []
    const blocked = []
    /** RSC prefetches this sweep's own reload cancelled — counted, never a fault */
    const cancelled = []

    /**
     * Two different things arrive as "console error", and conflating them is how a
     * checker gets ignored.
     *
     * A page that throws is a defect. A page whose AdSense or GA script was refused by
     * the sandbox's egress proxy is this ENVIRONMENT, not the product — and it happens
     * on all 56 screens, so counting it as a fault meant every screen failed and the
     * real signal was buried. The two are told apart by the request, not by the text:
     * a failed load of an OFF-ORIGIN url is reported as blocked; anything else, and
     * every uncaught exception, is a fault.
     */
    const origin = new URL(BASE).origin
    page.on('requestfailed', (request) => {
      if (!request.url().startsWith(origin)) {
        blocked.push(new URL(request.url()).host)
        return
      }
      /**
       * A third case, and it is this scanner's own doing.
       *
       * Next prefetches every `<Link>` on screen as an RSC fetch. Two lines below, the
       * sweep RELOADS the page to dismiss the opening animation — and the reload
       * cancels whichever prefetches are still in flight, which arrive here as
       * `net::ERR_ABORTED` on a `_rsc=` url. That is the checker measuring itself: the
       * wall, the trivia wing and the member book "failed" on 10 of 56 screens for
       * weeks, always on a prefetch, never on anything a reader could see.
       *
       * The exemption is as narrow as the evidence: ABORTED, and an RSC prefetch. A
       * same-origin request that fails for any other reason, or an aborted anything
       * else, is still a fault — and the count is printed, so a page that suddenly
       * cancels forty prefetches is visible rather than silent.
       */
      const aborted = request.failure()?.errorText === 'net::ERR_ABORTED'
      // ...and, from 28.9.2026, a server action the page fired on mount (the personal area
      // asks the server which LIFE chapters it may name). The reload cancels it the same way.
      const action = request.method() === 'POST' && Boolean(request.headers()['next-action'])
      if (aborted && (request.url().includes('_rsc=') || action)) {
        cancelled.push(request.url())
        return
      }
      errors.push(`request failed: ${request.url()} — ${request.failure()?.errorText ?? 'unknown'}`)
    })
    page.on('console', (message) => {
      if (message.type() !== 'error') return
      // A resource that failed is already accounted for by `requestfailed`; this is the
      // browser narrating the same event, so it is not counted twice.
      if (message.text().startsWith('Failed to load resource')) return
      errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(String(error)))
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })

    // The opening animation is exempt as a file, not as a screen — see the header.
    await page.evaluate(() => {
      try { window.sessionStorage.setItem('worker.intro.v1', '1') } catch { /* blocked */ }
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    /**
     * The archive photographs come out before the screenshot, and the count of what was
     * removed is reported — a selector that silently matched nothing would turn this
     * into a route the sweep pretends to check. `visibility: hidden` rather than
     * `display: none` so the layout, and therefore the overflow measurement, is the
     * layout a reader actually gets.
     */
    const hidden = await page.evaluate(([exempt, folders]) => {
      const photos = [...document.querySelectorAll('[data-archive-photo]')]
      for (const photo of photos) photo.style.visibility = 'hidden'
      // photographs collectors uploaded of their own shirts: the colour is the object's (rule 90)
      for (const photo of document.querySelectorAll('[data-user-photo]')) photo.style.visibility = 'hidden'
      // ...and every owner-approved FILE, by its exact path (lib/brand/yellowExemptions.ts) —
      // the 1997–2000 crest prints on shirts of that era, wherever a shirt is drawn.
      const files = [...document.querySelectorAll('img, image, video, source')].filter((node) => {
        const src = node.getAttribute('src') || node.getAttribute('href') || node.getAttribute('xlink:href') || ''
        const path = src.split('?')[0].replace(/^https?:\/\/[^/]+/, '')
        return exempt.includes(path) || folders.some((folder) => path.startsWith(folder))
      })
      for (const node of files) (node.style ? node.style : node).visibility = 'hidden'
      for (const node of files) node.setAttribute('visibility', 'hidden')
      return photos.length + files.length
    }, [EXEMPT_PATHS, EXEMPT_FOLDERS])
    if (route === '/kits/archive' && hidden === 0) {
      errors.push('no [data-archive-photo] found on the archive — the sweep would be measuring a page that is not there')
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    const shot = await page.screenshot({ fullPage: true })
    const image = await loadImage(shot)
    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0)
    const yellow = yellowPixels(ctx.getImageData(0, 0, image.width, image.height).data)

    const bad = overflow > 0 || errors.length > 0 || yellow > 0
    if (bad) faults += 1
    const ext = [...new Set(blocked)]
    const line =
      `${String(width).padStart(4)}  ${route.padEnd(18)} overflow ${String(overflow).padStart(3)}` +
      `  errors ${String(errors.length).padStart(2)}  yellow ${String(yellow).padStart(6)}` +
      (hidden > 0 ? `  (${hidden} archive photo(s) hidden before the count)` : '') +
      (cancelled.length > 0 ? `  (${cancelled.length} prefetch(es) cancelled by the reload)` : '') +
      (ext.length > 0 ? `  (blocked by this environment: ${ext.join(', ')})` : '')
    console.log(bad ? `${line}   ← FAULT` : line)
    for (const error of errors.slice(0, 3)) console.log(`        ${error}`)
    await page.close()
  }
  await context.close()
}
await browser.close()

if (faults > 0) {
  console.error(`\n${faults} screen(s) with a fault. Fix before the delta goes out.`)
  process.exit(1)
}
console.log('\nclean: no overflow, no console errors, no yellow.')
console.log('Hosts marked "blocked by this environment" are the sandbox egress proxy')
console.log('refusing Google\'s ad and analytics scripts — not a defect in the app.')
