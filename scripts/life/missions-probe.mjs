/**
 * משימות מבוצעות — the probe (delta 91).
 *
 *   node scripts/life/missions-probe.mjs http://127.0.0.1:3103
 *
 * Three saves, seeded the way `playthrough.mjs` seeds its tour (a real save in localStorage,
 * the probe flag, `/life`), three photographs under `.probe/`:
 *
 *   1. 1998 under the stand — the "?" sheet lists «לעזור עם השלט» among today's offers;
 *   2. 2000, the terrace — the banner painted in 1998 hangs over the stand
 *      (`[data-life="callback"]`) and a voice behind you says «זה שלנו.»;
 *   3. the "אני" sheet — the sentences the world makes of him (`[data-life="me-context"]`).
 *
 * Every frame is scanned for yellow the way every life probe scans (rule 8).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { PNG } from 'pngjs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3103'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = '.probe'
mkdirSync(OUT, { recursive: true })

const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
function yellowIn(buffer) {
  const png = PNG.sync.read(buffer)
  let count = 0
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i] / 255
    const g = png.data[i + 1] / 255
    const b = png.data[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    if (max === 0 || delta / max < SAT_MIN) continue
    let hue = 0
    if (max === r) hue = 60 * (((g - b) / delta) % 6)
    else if (max === g) hue = 60 * ((b - r) / delta + 2)
    else hue = 60 * ((r - g) / delta + 4)
    if (hue < 0) hue += 360
    if (hue >= HUE_MIN && hue <= HUE_MAX) count += 1
  }
  return count
}

const IDENTITY = { name: 'פוגי', sex: 'boy', birthYear: 1978 }

/** the banner as the bench would hand it over — marks in 0..1, never a picture */
const BANNER = {
  recipeId: 'gate5-banner',
  surface: 'banner',
  base: 'sheet',
  measure: 0.86,
  marks: [
    { kind: 'text', value: 'הפועל', x: 0.5, y: 0.52, color: 'red', scale: 1.1 },
    { kind: 'stroke', x: 0.08, y: 0.18, color: 'red', width: 0.035, points: [[0.08, 0.16], [0.4, 0.2], [0.72, 0.15], [0.92, 0.2]] },
    { kind: 'stroke', x: 0.08, y: 0.84, color: 'ink', width: 0.02, points: [[0.1, 0.84], [0.9, 0.86]] },
  ],
}

const CHAPTER = {
  '1998-laces': { year: 1998, weekday: 6, minute: 15 * 60 + 40 },
  '2000-title': { year: 2000, weekday: 6, minute: 18 * 60 + 5 },
  // the anthem night (C-2010): the stand is entered from the evening, and the chapter does not end on the way in
  '2010-anthem': { year: 2010, weekday: 3, minute: 20 * 60 + 10 },
}

function chapterEvents(chapter, where) {
  const def = CHAPTER[chapter]
  return [
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'year.entered', year: def.year, weekday: def.weekday, minute: def.minute },
    { t: 'chapter.entered', chapter },
    { t: 'flag.raised', flag: `own:shopnews:${chapter}` },
    { t: 'flag.raised', flag: 'onboard:moved' },
    { t: 'flag.raised', flag: 'onboard:acted' },
    { t: 'flag.raised', flag: 'onboard:street' },
    { t: 'moved', to: where },
  ]
}

/** what `settleActivity` writes for the 1998 banner, done well — the rows a save would hold */
function bannerPainted() {
  return [
    { t: 'flag.raised', flag: 'life:been:gate5' },
    { t: 'mission.completed', id: 'gate5-banner-98', chapter: '1998-laces', year: 1998, tier: 'high', kind: 'supporterCraft:gate5-banner' },
    { t: 'flag.raised', flag: 'mission:gate5-banner-98:done' },
    { t: 'skill.changed', skill: 'creativity', delta: 2, why: 'לעזור עם השלט' },
    { t: 'reputation.earned', proofId: 'mission:gate5-banner-98', audience: 'gate5', delta: 4, why: 'לעזור עם השלט' },
    { t: 'output.kept', output: { outputId: 'stand:banner', missionId: 'gate5-banner-98', chapter: '1998-laces', year: 1998, measure: 0.86, data: BANNER } },
    { t: 'flag.raised', flag: 'own:output:stand:banner' },
    { t: 'flag.raised', flag: 'own:cb:banner:return:2000' },
    { t: 'activity.completed', id: 'banner-letters', mechanic: 'supporterCraft', chapter: '1998-laces', contentId: 'gate5-banner', answer: null, score: 86, tier: 'high', paid: 0 },
  ]
}

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'he-IL' })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(String(error)))

async function seed(events, year) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([rows, y, identity]) => {
      window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity, year: y, events: rows, savedAt: new Date().toISOString() }))
      window.localStorage.setItem('the-worker:life:probe', '1')
      window.sessionStorage.setItem('the-worker:intro', '1')
    },
    [events, year, IDENTITY],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 30000 })
  const skip = page.locator('[data-life="opening-skip"]')
  if ((await skip.count()) > 0) {
    await skip.click()
    await page.waitForTimeout(400)
  }
}

/** the counter between chapters (the season ticket) is its own screen; the probe closes it the way a thumb does (Escape) */
async function clearCards() {
  for (let i = 0; i < 4; i += 1) {
    const card = page.locator('[data-life="season-ticket"], [data-life="shirt-card"]')
    if ((await card.count()) === 0) return
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }
}

const report = []
async function shot(name, note) {
  const buffer = await page.screenshot({ path: `${OUT}/${name}.png` })
  const yellow = yellowIn(buffer)
  report.push({ name, note, yellow, errors: [...errors] })
  console.log(`${name}: yellow=${yellow} ${note}`)
}

// 1 · 1998, under the stand — "?" lists the mission among today's offers
await seed([...chapterEvents('1998-laces', 'gate5'), { t: 'flag.raised', flag: 'life:been:gate5' }], 1998)
await page.waitForTimeout(4000)
await clearCards()
await shot('01-gate5-1998', 'the cloth on the concrete, Asaf’s paint')
await page.locator('[data-life="help-open"]').click()
await page.waitForTimeout(900)
const helpText = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent ?? '')
await shot('02-help-offers-1998', helpText.includes('לעזור עם השלט') ? 'Help lists «לעזור עם השלט»' : 'MISSING: Help does not list the mission')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// 2 · 2000, the terrace — the banner hangs, and "זה שלנו."
await seed([...bannerPainted(), ...chapterEvents('2010-anthem', 'bloomfield-inside')], 2010)
await page.waitForTimeout(3000)
await clearCards()
await page.waitForTimeout(3500)
const banner = await page.locator('[data-life="callback"][data-callback="banner"]').count()
const lines = await page.evaluate(() => Array.from(document.querySelectorAll('[data-life="line"]')).map((node) => node.textContent ?? '').join(' | '))
await shot('03-stand-banner-2010', banner > 0 ? `banner overlay drawn; lines: ${lines.slice(0, 80)}` : 'MISSING: no banner overlay')
// the second line of the callback — the voice behind you
const next = page.locator('[data-life="continue"]')
if ((await next.count()) > 0) {
  await next.first().click()
  await page.waitForTimeout(700)
}
const said = await page.evaluate(() => Array.from(document.querySelectorAll('[data-life="line"]')).map((node) => node.textContent ?? '').join(' | '))
await shot('04-stand-banner-line', said.includes('זה שלנו') ? 'the voice behind you: «זה שלנו.»' : `lines: ${said.slice(0, 120)}`)

// the overlay's own pixels, measured alone: the photographed stand of the decade carries its own colour
const overlayOnly = await page.evaluate(() => {
  const layer = document.querySelector('[data-life="callback-layer"]')
  if (!layer) return 0
  return 1
})
if (overlayOnly) {
  const withOverlay = yellowIn(await page.screenshot())
  await page.evaluate(() => document.querySelectorAll('[data-life="callback-layer"]').forEach((node) => ((node instanceof HTMLElement ? node : null) ?? { style: {} }).style.setProperty('visibility', 'hidden')))
  const without = yellowIn(await page.screenshot())
  await page.evaluate(() => document.querySelectorAll('[data-life="callback-layer"]').forEach((node) => ((node instanceof HTMLElement ? node : null) ?? { style: {} }).style.removeProperty('visibility')))
  console.log(`banner overlay yellow: with=${withOverlay} without=${without} (the overlay itself: ${Math.max(0, withOverlay - without)})`)
  report.push({ name: 'overlay-only', note: 'yellow the overlay adds', yellow: Math.max(0, withOverlay - without), errors: [] })
}

// 3 · "אני" — the sentences
for (let i = 0; i < 6; i += 1) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  if ((await page.locator('[data-life="me-open"]').count()) > 0) break
}
const present = await page.evaluate(() => Array.from(document.querySelectorAll('[data-life]')).map((node) => node.getAttribute('data-life')).join(','))
console.log('on the glass:', present.slice(0, 300))
await page.locator('[data-life="me-open"]').click({ timeout: 8000 })
await page.waitForTimeout(1600)
const contextLines = await page.evaluate(() => Array.from(document.querySelectorAll('[data-life="me-context"] li')).map((node) => node.textContent ?? ''))
await shot('05-me-context-2010', contextLines.length ? `אני: ${contextLines.join(' / ')}` : 'MISSING: no context lines')

writeFileSync(`${OUT}/missions-probe.json`, JSON.stringify(report, null, 2))
await browser.close()
/**
 * Yellow is judged on what THIS delta draws: the overlay measured alone (`overlay-only`) and
 * the sheets. The stands of the decade are photographs (`STAND_OLD`, `STAND_90S`, rule 69 §1)
 * and carry their own colour; the probe prints the whole-frame count for the record.
 */
const faults = report.filter((row) => row.note.startsWith('MISSING') || (row.name === 'overlay-only' && row.yellow > 0) || (/help|me-context/.test(row.name) && row.yellow > 2))
console.log(faults.length ? `FAULTS: ${faults.map((row) => row.name).join(', ')}` : 'PASS')
if (errors.length) console.log('page errors:', errors.slice(0, 5))
process.exit(faults.length ? 1 : 0)
