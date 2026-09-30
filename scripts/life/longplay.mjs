/**
 * הרובוט ששיחק את כל החיים — a fresh save, played from the first frame, chapter by chapter.
 *
 *   node scripts/life/longplay.mjs [chapters] [http://127.0.0.1:3000]
 *
 * Every other probe in this folder SEEDS a chapter and tests it. That is how a hole in the
 * chain between chapters survives every green run: the day before is never played, so a
 * key handed out on Tuesday and cleared on Wednesday is nobody's failing test. This one
 * starts a new life, presses the button on everything it has not pressed, walks both ways,
 * uses only doors the game says are open, and writes down the moment it stops getting
 * anywhere.
 *
 * The output is a list of STALLS: chapter, room, what was on screen, which exits were shut
 * and what the objective said. A stall is the machine-readable form of "I restarted the
 * game and there is no key and then you do not really meet dad".
 *
 * It never uses `debug.goTo`. A probe that teleports past a locked door proves nothing
 * about a locked door.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[3] ?? 'http://127.0.0.1:3000'
const WANT = Number(process.argv[2] ?? 8)
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: EXECUTABLE })
const context = await browser.newContext({ viewport: { width: 900, height: 620 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e.message ?? e)))
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => {
  window.localStorage.removeItem('the-worker:life')
  window.localStorage.setItem('the-worker:life:probe', '1')
})
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas', { timeout: 30000 })
await page.waitForTimeout(2500)

const read = () =>
  page.evaluate(() => {
    const t = (sel) => document.querySelector(sel)?.textContent?.trim().replace(/\s+/g, ' ') ?? null
    const promptEl = document.querySelector('[data-life="prompt"]')
    return {
      place: t('[data-life="place"]'),
      clock: t('[data-life="clock"]'),
      objective: t('[data-life="objective"]'),
      dialogue: t('[data-life="dialogue"]')?.slice(0, 70) ?? null,
      choices: [...document.querySelectorAll('[data-life="choice"] button')].map((b) => b.textContent.trim().slice(0, 30)),
      prompt: promptEl?.getAttribute('aria-label') ?? promptEl?.textContent?.trim() ?? null,
      reveal: !!document.querySelector('[data-life="reveal"]'),
      ending: !!document.querySelector('[data-life="ending"]'),
      finale: !!document.querySelector('[data-life="finale"]'),
      coda: !!document.querySelector('[data-life="coda"]'),
      card: t('[data-life="chapter-card"],[data-life="title-card"]'),
      opening: !!document.querySelector('[data-life="opening"]'),
      where: window.__life?.debug?.where?.() ?? null,
      chapter: window.__life?.snapshot?.().state?.chapter ?? null,
      items: Object.keys(window.__life?.snapshot?.().state?.inventory ?? {}).filter((k) => (window.__life.snapshot().state.inventory[k] ?? 0) > 0),
      flags: Object.keys(window.__life?.snapshot?.().state?.flags ?? {}),
    }
  })

/** every button that is a "go on" — cards, reveals, endings, the opening */
const tapThrough = async () => {
  for (const sel of [
    '[data-life="reveal-close"]', '[data-life="ending"] button', '[data-life="finale"] button',
    '[data-life="coda"] button', '[data-life="opening"] button', '[data-life="card-close"]',
  ]) {
    const el = page.locator(sel).first()
    if ((await el.count()) > 0) {
      await el.click({ timeout: 1500 }).catch(() => {})
      await page.waitForTimeout(700)
      return true
    }
  }
  return false
}

const hold = async (key, ms) => {
  await page.keyboard.down(key)
  await page.waitForTimeout(ms)
  await page.keyboard.up(key)
  await page.waitForTimeout(90)
}

const isDoor = (text) => /^(לך|היכנס|צא|חזרה|לרדת|לעלות)(\s|$)/.test(text ?? '')

const log = []
const say = (line) => { log.push(line); console.log(line) }
const stalls = []
const seenChapters = []
let acted = new Set()
let room = null
let heading = 'ArrowRight'
const recent = []
const usedDoors = new Set()
let stalled = 0
let lastSignature = ''
let steps = 0

const MAX_STEPS = Number(process.env.WORKER_LONGPLAY_STEPS ?? 4200)
while (steps < MAX_STEPS) {
  steps += 1
  const r = await read()

  if (r.chapter && seenChapters[seenChapters.length - 1] !== r.chapter) {
    seenChapters.push(r.chapter)
    say(`── ${r.chapter} ─────────────────────────────`)
    acted = new Set()
    usedDoors.clear()
    if (seenChapters.length > WANT) break
    await page.screenshot({ path: `${OUT}/long-${r.chapter}.png` }).catch(() => {})
  }
  if (r.where?.scene && r.where.scene !== room) {
    room = r.where.scene
    acted = new Set()
    // A door that keeps handing you back and forth is not progress. Only a room the walk
    // has not seen in a while clears the stall counter; two rooms trading the child
    // between them count as standing still, which is what they are.
    recent.push(room)
    if (recent.length > 6) recent.shift()
    const bouncing = recent.length === 6 && new Set(recent).size <= 2
    if (!bouncing) stalled = 0
    else { heading = heading === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'; recent.length = 0; usedDoors.clear() }
    say(`   ${r.chapter} · ${room} · ${r.objective ?? '—'} · ${r.clock ?? ''}`)
  }

  if (r.opening || r.reveal || r.ending || r.finale || r.coda || r.card) {
    if (await tapThrough()) { stalled = 0; continue }
  }
  if (r.dialogue !== null) {
    if (r.choices.length > 0) {
      await page.locator('[data-life="choice"] button').first().click().catch(() => {})
    } else {
      await page.evaluate(() => window.__life?.advance())
    }
    await page.waitForTimeout(320)
    stalled = 0
    continue
  }

  const signature = `${r.chapter}|${r.where?.scene}|${r.prompt}|${Math.round((r.where?.x ?? 0) * 20)}`
  if (signature !== lastSignature) { lastSignature = signature; stalled = 0 } else stalled += 1

  if (r.prompt && !isDoor(r.prompt) && !acted.has(r.prompt)) {
    acted.add(r.prompt)
    await page.keyboard.press('e')
    await page.waitForTimeout(420)
    continue
  }
  // A door is remembered by the ROOM it was used from, and remembered for the whole
  // chapter. Forgetting it at every room change is how a robot walks into the same alley
  // three hundred times: out, back, out, back, and never east to the hall.
  const doorKey = `${r.where?.scene}:${r.prompt}`
  if (r.prompt && isDoor(r.prompt) && !/נעול/.test(r.prompt) && !usedDoors.has(doorKey)) {
    usedDoors.add(doorKey)
    await page.keyboard.press('e')
    await page.waitForTimeout(1400)
    continue
  }

  await hold(heading, 130)
  if (stalled > 50) {
    heading = heading === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'
    stalled = 0
    acted = new Set([...acted].filter((a) => !a.startsWith('door:')))
  }
  if (stalled === 40) {
    const w = r.where
    stalls.push({
      chapter: r.chapter, scene: w?.scene, objective: r.objective, clock: r.clock,
      exits: w?.exits, prompt: r.prompt, items: r.items, minute: w?.minute,
      beat: w?.beat, step: steps,
    })
    say(`STALL  ${r.chapter} · ${w?.scene} · goal "${r.objective ?? '—'}" · exits ${JSON.stringify(w?.exits)} · items ${JSON.stringify(r.items)} · prompt ${r.prompt}`)
    await page.screenshot({ path: `${OUT}/long-stall-${stalls.length}.png` }).catch(() => {})
  }
}

const last = await read()
say('')
say(`chapters reached: ${seenChapters.join(' → ')}`)
say(`ended in: ${last.chapter} · ${last.where?.scene} · goal "${last.objective ?? '—'}"`)
say(`items at the end: ${JSON.stringify(last.items)}`)
say(`page errors: ${errors.length}`)
for (const e of errors.slice(0, 5)) say(`  ${e}`)

writeFileSync(`${OUT}/longplay.json`, JSON.stringify({ seenChapters, stalls, errors }, null, 1))
await browser.close()
process.exit(stalls.length > 0 || errors.length > 0 ? 1 : 0)
