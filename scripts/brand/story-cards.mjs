/**
 * גיליון הכרטיסים — a contact sheet of every share card, at story size.
 *
 * `story-overlap.mjs` proves no text prints through other text. It cannot see a card
 * that is technically clear and still wrong — a hole in the middle of the plate, a panel
 * that is invisible against its own ground, a badge in the wrong corner. Both of those
 * were real on this project, and both were found by looking at this sheet after the
 * arithmetic said the cards were fine.
 *
 * Same harness as the overlap check (`/qa/story`), so the two always describe the same
 * render.
 *
 *   node scripts/brand/story-cards.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright'
const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = process.argv[3] ?? '/home/claude/o'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const b = await chromium.launch({ executablePath: EXECUTABLE,
  args:['--disable-lcd-text','--disable-font-subpixel-positioning','--font-render-hinting=none'] })
const p = await b.newPage({ viewport:{width:1400,height:900}, deviceScaleFactor:2 })
await p.goto(`${BASE}/qa/story`,{waitUntil:'networkidle'})
await p.waitForSelector('[data-story-proof="ready"]',{timeout:30000})
await p.waitForTimeout(600)
// Share V2 (28.9.2026) — the twelve artefacts join the sheet: one per gate (ONE RED WORLD §28)
const ARTEFACTS = ['slip','programme','collector','contact','debate','freeze','poster','clue','black','clipping','strip','strip-order','ticket']
for (const n of ['ballot','ink','xi','score','year', ...ARTEFACTS]) {
  await p.locator(`#proof-${n} canvas`).screenshot({ path:`${OUT}/card-${n}.png` })
}
await b.close()
console.log('ok')
