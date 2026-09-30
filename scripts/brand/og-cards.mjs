/**
 * כרטיסי השיתוף — one 1200×630 OG image per gate, plus a default.
 *
 * `docs/05-growth.md` says the whole guerrilla strategy runs on ONE mechanic: the round
 * is a link. A link with no preview image is a bare blue line on WhatsApp, and a bare
 * blue line recruits nobody — so every gate needs a card before that strategy means
 * anything.
 *
 * Same tool as `scripts/brand/story-cards.mjs` (Playwright, the pinned Chromium under
 * `PLAYWRIGHT_BROWSERS_PATH`), but the story cards screenshot canvases the running app
 * already draws at `/qa/story`. There is no live route that draws an OG card, so this
 * script builds the whole card as an HTML string — badge, fonts and all three brand
 * colours read straight off disk and inlined as data URIs — and hands it to
 * `page.setContent()`. No dev server, no network, nothing that can 404.
 *
 * The two-plate print (rule 8): every numeral is drawn TWICE, a navy copy shifted
 * `PLATE_SHIFT` px right-and-down first, a second copy on top — vermilion, except on
 * the away plates (gate 11, both acts), which print navy over navy and carry no
 * vermilion at all, exactly as `components/gates/GatePlate.tsx` does it at UI scale.
 * The offset is the SAME 3px the CSS `.plate-shift` utility uses everywhere else in the
 * app — rule 8 calls it a constant, not a value that scales with the type size.
 *
 *   node scripts/brand/og-cards.mjs [outDir]
 */
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUT = process.argv[2] ?? join(ROOT, 'public', 'og')
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const W = 1200
const H = 630
/** rule 8 — the same constant `.plate-shift` uses in `app/globals.css`. Never scaled. */
const PLATE_SHIFT = 3

/**
 * BRAND, mirrored from `lib/brand.ts` (itself mirrored from `app/globals.css`, kept in
 * step by `tests/brand.test.ts`). This script cannot import a `.ts` module without a
 * build step, so the six hexes are re-typed here — there is no automated guard against
 * this specific copy drifting, which is stated rather than implied; a future pass could
 * add one to `tests/brand.test.ts` the way it already does for `lib/isYellow.ts` and the
 * hue band in `scripts/brand/qa-sweep.mjs`.
 */
const BRAND = {
  sheet: '#F0E8D4',
  ink: '#15120E',
  red: '#B02D10',
  sign: '#1E2C5A',
  concrete: '#C9BFA4',
  muted: '#5A5242',
}

// The catalogue ships as two files — the gates and LIFE — and this script reads both,
// exactly like `lib/i18n.ts` merges them. See the note there for why they are separate.
const he = {
  ...JSON.parse(readFileSync(join(ROOT, 'messages', 'he.json'), 'utf8')),
  ...JSON.parse(readFileSync(join(ROOT, 'messages', 'he.life.json'), 'utf8')),
  // the gate cluster catalogues of 21.9.2026 — same merge as `lib/i18n.ts`
  ...Object.assign(
    {},
    ...readdirSync(join(ROOT, 'messages'))
      .filter((name) => /^he\.gates\.[a-z]+\.json$/.test(name))
      .sort()
      .map((name) => JSON.parse(readFileSync(join(ROOT, 'messages', name), 'utf8'))),
  ),
}
const t = (key) => {
  const value = he[key]
  if (value === undefined) throw new Error(`missing message key: ${key}`)
  return value
}

function b64(path) {
  return readFileSync(join(ROOT, path)).toString('base64')
}

const BADGE_B64 = b64('public/brand/logo-192.png')

/**
 * Karantina only ever draws digits and the Latin wordmark on these cards — never
 * Hebrew — so only its LATIN subset is loaded. The self-hosted set in `public/fonts/`
 * ships each face as separate Hebrew/Latin files (see `app/globals.css`'s
 * `unicode-range` pairs); loading the Hebrew one here left every digit and "The
 * Worker" with no glyph to draw and rendering fell back to the system serif.
 */
const FONT_FILES = {
  frank: 'public/fonts/frank-ruhl-libre-hebrew-900-normal.woff2',
  karantina: 'public/fonts/karantina-latin-700-normal.woff2',
  archivo: 'public/fonts/archivo-latin-700-normal.woff2',
  heebo: 'public/fonts/heebo-hebrew-500-normal.woff2',
}

const FONT_FACES = Object.entries(FONT_FILES)
  .map(
    ([name, path]) => `
    @font-face {
      font-family: '${name}';
      src: url(data:font/woff2;base64,${b64(path)}) format('woff2');
      font-weight: 400 900;
    }`,
  )
  .join('\n')

/**
 * שערי הפועל — mirrors `lib/gates.ts` (READ-ONLY for this agent; another agent owns
 * it). `latin` is the exact poster caption already printed on that gate's plate in the
 * running app — reused verbatim, never invented, per rule 11 applied to a caption.
 */
const GATES_OG = [
  { slug: 'xi', number: 1, titleKey: 'screen.xi.title', latin: 'ALL-TIME XI · NORTH STAND', rays: false, away: false },
  { slug: 'trivia', number: 2, titleKey: 'screen.trivia.title', latin: 'TRIVIA WING · NORTH-EAST', rays: true, away: false },
  { slug: 'lineup', number: 3, titleKey: 'screen.lineup.title', latin: 'THE LINE-UP · NORTH', rays: false, away: false },
  { slug: 'kits-build', number: 4, titleKey: 'screen.kitgame.title', latin: 'GUESS THE KIT · EAST', rays: false, away: false },
  { slug: 'kits', number: 5, titleKey: 'screen.kits.title', latin: 'KIT DESIGNER · SOUTH-EAST · ULTRAS', rays: false, away: false },
  { slug: 'memory', number: 6, titleKey: 'screen.memory.title', latin: 'MEMORY · SOUTH-EAST', rays: false, away: false },
  { slug: 'polls', number: 7, titleKey: 'screen.polls.title', latin: 'THE BALLOT · SOUTH', rays: false, away: false },
  { slug: 'goal', number: 8, titleKey: 'screen.goal.title', latin: 'REBUILD THE GOAL · SOUTH-WEST', rays: true, away: false },
  { slug: 'tik', number: 10, titleKey: 'screen.tik.title', latin: 'MEMBER BOOK · WEST', rays: false, away: false },
  { slug: 'derby', number: 11, titleKey: 'screen.derby.title', latin: 'THE HATRED GAME · AWAY END', rays: false, away: true },
  { slug: 'derby-file', number: 11, titleKey: 'screen.file.title', latin: 'THE BLACK FILE · AWAY END', rays: false, away: true },
  { slug: 'timeline', number: 13, titleKey: 'screen.thread.title', latin: 'THE RED THREAD · NORTH-WEST', rays: false, away: false },
]

/** Un-numbered plates: a memorial wing, a vertical slice, and the ground itself. */
const PLAQUES = [
  {
    slug: 'ussishkin',
    titleKey: 'screen.ussishkin.title',
    latin: 'USSISHKIN HALL · TEL AVIV · 1980—2007',
  },
  { slug: 'life', titleKey: 'life.title', latin: null },
]

const shared = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
  ${FONT_FACES}
  body {
    background: ${BRAND.sheet};
    position: relative;
    font-family: 'heebo', sans-serif;
  }
  .badge {
    position: absolute; top: 44px; inset-inline-end: 48px;
    width: 92px; height: 92px;
  }
  .footer {
    position: absolute; inset-inline: 0; bottom: 0;
    height: 88px;
    background: ${BRAND.ink};
    display: flex; align-items: center; justify-content: center;
  }
  .address {
    font-family: 'archivo', sans-serif;
    font-weight: 700;
    font-size: 30px;
    letter-spacing: 0.14em;
    color: ${BRAND.sheet};
  }
  .latin {
    font-family: 'archivo', sans-serif;
    font-weight: 700;
    font-size: 22px;
    letter-spacing: 0.18em;
    color: ${BRAND.muted};
    direction: ltr;
  }
  .titleHe {
    font-family: 'frank', serif;
    font-weight: 900;
    color: ${BRAND.ink};
    line-height: 1.05;
    direction: rtl;
  }
  .rays {
    position: absolute;
    width: 900px; height: 900px;
    background: repeating-conic-gradient(${BRAND.red}22 0deg 6deg, transparent 6deg 18deg);
    border-radius: 0;
    opacity: 0.5;
  }
`

/** One gate: the big two-plate numeral on the start side, the plate on the end side. */
function gateCardHtml(gate) {
  const titleHe = t(gate.titleKey)
  const topColor = gate.away ? BRAND.sign : BRAND.red
  return `<!doctype html><html><head><meta charset="utf-8"><style>${shared}</style></head>
  <body>
    ${gate.rays ? `<div class="rays" style="inset-inline-start:-180px; top:-140px;"></div>` : ''}
    <img class="badge" src="data:image/png;base64,${BADGE_B64}" />

    <div style="position:absolute; inset-inline-start:64px; top:64px; font-family:'archivo'; font-weight:700; font-size:26px; letter-spacing:0.22em; color:${BRAND.sign};">
      GATE ${gate.number} · THE WORKER
    </div>

    <div style="position:absolute; inset-inline-start:56px; top:150px; width:480px; height:400px;">
      <span style="position:absolute; inset-inline-start:${PLATE_SHIFT}px; top:${PLATE_SHIFT}px; font-family:'karantina'; font-weight:700; font-size:380px; line-height:1; color:${BRAND.sign};">${gate.number}</span>
      <span style="position:absolute; inset-inline-start:0; top:0; font-family:'karantina'; font-weight:700; font-size:380px; line-height:1; color:${topColor};">${gate.number}</span>
    </div>

    <div style="position:absolute; inset-inline-end:64px; top:210px; width:560px; text-align:end;">
      <div class="titleHe" style="font-size:96px;">${titleHe}</div>
      <div class="latin" style="margin-top:22px;">${gate.latin}</div>
    </div>

    <div class="footer"><span class="address" dir="ltr">theworker.dubelteam.com</span></div>
  </body></html>`
}

/** A plaque: no numeral, the badge carries more weight, the Hebrew name is the hero. */
function plaqueCardHtml(plaque) {
  const titleHe = t(plaque.titleKey)
  return `<!doctype html><html><head><meta charset="utf-8"><style>${shared}</style></head>
  <body>
    <img class="badge" src="data:image/png;base64,${BADGE_B64}" style="top:64px; inset-inline-start:0; inset-inline-end:0; margin-inline:auto; width:150px; height:150px;" />
    <div style="position:absolute; inset-inline:0; top:270px; text-align:center;">
      <div class="titleHe" style="font-size:104px;">${titleHe}</div>
      ${plaque.latin ? `<div class="latin" style="margin-top:26px; text-align:center;">${plaque.latin}</div>` : ''}
    </div>
    <div class="footer"><span class="address" dir="ltr">theworker.dubelteam.com</span></div>
  </body></html>`
}

function defaultCardHtml() {
  const tagline = t('app.tagline')
  return `<!doctype html><html><head><meta charset="utf-8"><style>${shared}</style></head>
  <body>
    <img class="badge" src="data:image/png;base64,${BADGE_B64}" style="top:120px; inset-inline-start:0; inset-inline-end:0; margin-inline:auto; width:210px; height:210px;" />
    <div style="position:absolute; inset-inline:0; top:376px; text-align:center;">
      <div style="font-family:'karantina'; font-weight:700; font-size:96px; color:${BRAND.ink}; direction:ltr;">The Worker</div>
      <div class="titleHe" style="font-size:34px; margin-top:14px; font-family:'heebo'; font-weight:500;">${tagline}</div>
    </div>
    <div class="footer"><span class="address" dir="ltr">theworker.dubelteam.com</span></div>
  </body></html>`
}

/* ------------------------------------------------------------ yellow scanner */

/**
 * Mirrors `lib/isYellow.ts` exactly — same HUE test, same thresholds — because rule 8
 * says the check and the definition must never drift apart. A `.mjs` script cannot
 * import the `.ts` module directly, so the numbers are re-typed here rather than
 * approximated; change one, change both.
 */
function isYellow(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return false
  const saturation = delta / max
  const value = max / 255
  if (saturation < 0.35 || value < 0.35) return false
  let hue
  if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
  else if (max === g) hue = 60 * ((b - r) / delta + 2)
  else hue = 60 * ((r - g) / delta + 4)
  return hue >= 38 && hue <= 70
}

function yellowCount(pngPath) {
  const png = PNG.sync.read(readFileSync(pngPath))
  let count = 0
  for (let i = 0; i < png.data.length; i += 4) {
    if (isYellow(png.data[i], png.data[i + 1], png.data[i + 2])) count += 1
  }
  return count
}

/* ------------------------------------------------------------ render + scan */

async function main() {
  mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
  })
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })

  const jobs = [
    ...GATES_OG.map((gate) => ({ slug: gate.slug, html: gateCardHtml(gate) })),
    ...PLAQUES.map((plaque) => ({ slug: plaque.slug, html: plaqueCardHtml(plaque) })),
    { slug: 'default', html: defaultCardHtml() },
  ]

  for (const job of jobs) {
    await page.setContent(job.html, { waitUntil: 'load' })
    // Inline data-URI fonts/images need a beat past `load` to actually rasterise —
    // `story-cards.mjs` waits on a page signal instead; this page has none, so a fixed
    // settle is the honest equivalent for a static, non-interactive render.
    await page.waitForTimeout(150)
    await page.screenshot({ path: join(OUT, `${job.slug}.png`) })
  }
  await browser.close()

  console.log(`rendered ${jobs.length} card(s) → ${OUT}`)

  let faults = 0
  for (const job of jobs) {
    const path = join(OUT, `${job.slug}.png`)
    const yellow = yellowCount(path)
    const line = `${job.slug.padEnd(14)} yellow ${String(yellow).padStart(6)}`
    if (yellow > 0) {
      faults += 1
      console.error(`${line}   ← FAULT`)
    } else {
      console.log(line)
    }
  }

  const produced = readdirSync(OUT).filter((name) => name.endsWith('.png'))
  console.log(`\n${produced.length} PNG(s) on disk in ${OUT}.`)

  if (faults > 0) {
    console.error(`\n${faults} card(s) contain yellow. Fix before shipping — rule 8 is absolute.`)
    process.exit(1)
  }
  console.log('clean: no yellow in any OG card.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
