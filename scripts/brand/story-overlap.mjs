/**
 * בדיקת חפיפה — does any text on a share card print through any other text?
 *
 * This exists because "I looked at it" failed three times in a row. Each card reports
 * every box of ink it laid down; this script renders the worst case of every template in
 * a real browser with the real faces and intersects those boxes pairwise. A collision is
 * an exit code, not a note in a review.
 *
 * Run against a dev server:
 *   node scripts/brand/story-overlap.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'

/**
 * A pair is only a fault if the overlap is real.
 *
 * Two boxes touching by a pixel is kerning, not a collision, and the second plate of the
 * screenprint is DELIBERATELY offset over the first — so a tolerance is not a fudge
 * here, it is the difference between reporting the press and reporting a defect.
 */
const TOLERANCE = 4

function overlaps(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return x > TOLERANCE && y > TOLERANCE ? { x, y } : null
}

/**
 * The build image ships one Chromium at a fixed path and Playwright's own resolver looks
 * for a version-stamped headless shell that is not there. `PW_CHROMIUM` overrides it;
 * the default is the path this container actually has.
 */
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})
const page = await browser.newPage({ viewport: { width: 800, height: 600 } })
await page.goto(`${BASE}/qa/story`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-story-proof="ready"]', { timeout: 20000 })
const report = await page.evaluate(() => window.__storyInk)
await browser.close()

/**
 * The safe zone, measured and not promised (rule 22): Instagram's furniture covers the top and the
 * bottom 260px. The collector cards (22.9.2026) are held to it box by box; the older templates put
 * their kicker a few pixels into the top zone by design and are not held to it here.
 */
const SAFE = 260
const STORY_H = 1920
// Share V2's artefacts (28.9.2026) are held to it too — every one of them, from the start.
const SAFE_STRICT = ['closet', 'wanted', 'gaps', 'match', 'slip', 'programme', 'collector', 'contact', 'debate', 'freeze', 'poster', 'clue', 'black', 'clipping', 'strip', 'ticket']

let faults = 0
for (const [template, boxes] of Object.entries(report ?? {})) {
  const strict = SAFE_STRICT.some((name) => template === name || template.startsWith(`${name}-`))
  const outside = boxes.filter((box) => box.y < SAFE - 1 || box.y + box.h > STORY_H - SAFE + 1)
  if (strict && outside.length > 0) {
    faults += outside.length
    for (const box of outside) console.log(`         ${template}: ${box.label} leaves the safe zone (${Math.round(box.y)}–${Math.round(box.y + box.h)})`)
  }
  const hits = []
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const hit = overlaps(boxes[i], boxes[j])
      if (hit) hits.push(`${boxes[i].label} × ${boxes[j].label}  (${Math.round(hit.x)}×${Math.round(hit.y)}px)`)
    }
  }
  faults += hits.length
  console.log(`${template.padEnd(8)} ${boxes.length} boxes  ${hits.length === 0 ? 'none' : hits.length + ' OVERLAP'}`)
  for (const hit of hits) console.log(`         ${hit}`)
}

if (faults > 0) {
  console.error(`\n${faults} overlapping pair(s). A card that prints text through text does not ship.`)
  process.exit(1)
}
console.log('\nno overlaps.')
