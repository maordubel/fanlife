/**
 * צילומי משחק — the directed 1986 final at three glasses: phone portrait, phone landscape,
 * desktop. One save, seeded at the turnstiles with the film already seen; the match runs,
 * the probe answers the two prompts, and a frame is kept at the kickoff board, at each
 * prompt and at the whistle. Faults: no board within ten seconds, a prompt never offered,
 * the board never reaching the archive's score, or a page error.
 *
 *   node scripts/life/match-shots.mjs [base]
 */
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })

const GLASSES = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
]

const SEED = [
  { t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'flag.raised', flag: 'knows:match' }, { t: 'flag.raised', flag: 'kobi:left' }, { t: 'flag.raised', flag: 'entry:granted' },
  { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'flag.raised', flag: 'cutscene:1986-championship' },
  { t: 'clock.advanced', minutes: 16 * 60 + 5 - 14 * 60 }, { t: 'moved', to: 'bloomfield-inside' },
]

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
let faults = 0
const report = []

for (const glass of GLASSES) {
  const context = await browser.newContext({ viewport: { width: glass.width, height: glass.height }, hasTouch: glass.touch, isMobile: glass.touch })
  const page = await context.newPage()
  page.on('pageerror', (e) => { faults += 1; report.push(`ERROR ${glass.name}: ${e.message}`) })
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((events) => {
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    window.localStorage.setItem('the-worker:life:probe', '1')
  }, SEED)
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas')
  const read = () => page.evaluate(() => ({
    board: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null,
    choices: [...document.querySelectorAll('[data-life="choice"]')].map((li) => li.getAttribute('data-choice')),
    dialogue: !!document.querySelector('[data-life="dialogue"]'),
    match: window.__life?.debug?.where?.()?.match ?? null,
  }))
  const t0 = Date.now()
  let boardAt = null
  let shots = 0
  let prompts = 0
  let lastBoard = null
  while (Date.now() - t0 < 120000) {
    const r = await read()
    if (r.board && !boardAt) {
      boardAt = Date.now() - t0
      await page.screenshot({ path: `${OUT}/match-${glass.name}-kickoff.png` })
      shots += 1
    }
    if (r.board && r.board !== lastBoard) {
      lastBoard = r.board
      report.push(`${glass.name} board: ${r.board}`)
    }
    if (r.choices.length > 0) {
      prompts += 1
      await page.screenshot({ path: `${OUT}/match-${glass.name}-prompt${prompts}.png` })
      await page.evaluate((id) => { const li = document.querySelector(`[data-life="choice"][data-choice="${id}"]`); li?.querySelector('button')?.click() }, r.choices[0])
      await page.waitForTimeout(500)
      continue
    }
    if (r.dialogue) { await page.evaluate(() => window.__life.advance()); await page.waitForTimeout(300); continue }
    if (r.board && r.board.includes('סיום') && !r.dialogue) {
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${OUT}/match-${glass.name}-whistle.png` })
      break
    }
    await page.waitForTimeout(500)
  }
  const final = await read()
  if (!boardAt || boardAt > 10000) { faults += 1; report.push(`FAULT ${glass.name}: no board within ten seconds (${boardAt ?? 'never'})`) }
  if (prompts < 2) { faults += 1; report.push(`FAULT ${glass.name}: ${prompts} prompt(s) offered, wanted 2`) }
  if (!final.board || !/1.*סיום|סיום.*1/.test(final.board)) { faults += 1; report.push(`FAULT ${glass.name}: the board did not close on the archive's result: ${final.board}`) }
  report.push(`${glass.name}: board after ${boardAt}ms, ${prompts} prompts, whistle at ${Math.round((Date.now() - t0) / 1000)}s (probe pace ×0.25)`)
  await context.close()
}
await browser.close()
for (const line of report) console.log(line)
console.log(faults === 0 ? 'OK — no faults' : `${faults} faults`)
process.exit(faults === 0 ? 0 : 1)
