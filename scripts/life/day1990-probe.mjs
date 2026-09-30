/**
 * 12.5.1990 — the day in beats, each seeded where it starts, so a slow headless frame
 * rate cannot turn a walk across a room into a walk out of it.
 *
 *   node scripts/life/day1990-probe.mjs [http://127.0.0.1:3000]
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SHOT = process.env.PROBE_SHOT ?? '/tmp/shots/day1990'
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e.stack ?? e).slice(0, 300)))
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' && !/ERR_FAILED|GL Driver/.test(t)) errors.push('console:' + t.slice(0, 200)) })
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
let faults = 0
const log = (line) => console.log(line)
const fail = (line) => { faults += 1; console.log('FAULT ' + line) }
const read = () => page.evaluate(() => ({
  place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
  clock: document.querySelector('[data-life="clock"]')?.textContent?.trim() ?? null,
  prompt: (document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? '').replace(/^A\s*/, '') || null,
  dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 90) ?? null,
  choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.textContent.trim()),
  board: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null,
  ending: document.querySelector('[data-life="ending"]') ? 'ending' : null,
  finale: document.querySelector('[data-life="finale"]') ? 'finale' : null,
  card: document.querySelector('[data-life="title-card"]')?.textContent?.trim() ?? null,
  objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null,
  flags: Object.fromEntries(JSON.parse(window.localStorage.getItem('the-worker:life') ?? '{"events":[]}').events.filter((e) => e.t === 'flag.raised').map((e) => [e.flag, true])),
}))
const open = async () => (await page.locator('[data-life="dialogue"]').count()) > 0
const clear = async (max = 16) => {
  for (let i = 0; i < max; i += 1) {
    if (!(await open())) return
    if ((await page.locator('[data-life="choice"]').count()) > 0) return
    await page.keyboard.press('e'); await page.waitForTimeout(450)
    if (!(await open())) { await page.waitForTimeout(300); return }
  }
}
const choose = async (index) => {
  const buttons = page.locator('[data-life="choice"]')
  if ((await buttons.count()) > index) { await buttons.nth(index).tap(); await page.waitForTimeout(500); await clear() }
}
const DOOR = /^(לך|צא|חזרה|פנימה|החוצה|מזרחה|לאולם|לסלון|למטבח|לרחוב|לחדר|אל האור)/
/**
 * walk until the prompt names `label`, then press A. Turns round only when the walk has
 * actually stopped (the runtime says where the feet are) — a door prompt at the spawn used
 * to flip the direction and walk the boy out of the room he was seeded into, and a flat
 * sixteen-second timer flipped him back before a slow first half-minute got him anywhere.
 */
const whereIs = () => page.evaluate(() => window.__life?.debug?.where?.() ?? null)
const reach = async (label, ms = 70000, first = 'ArrowRight') => {
  /**
   * Hold the key DOWN and poll (5.9.2026).
   *
   * This used to press the key for 700 ms at a time, which crosses a room at about a
   * hundredth of it per second — and the kitchen is two thirds of a frame wide, so the
   * beat was always one slow afternoon away from timing out. The walk has a ramp; holding
   * the key is what a player does and what the tunnel probe already did.
   */
  const t0 = Date.now()
  let dir = first
  const startedIn = (await read()).place
  let lastX = (await whereIs())?.x ?? -1
  let stuckSince = Date.now()
  const release = async () => { await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight') }
  await page.keyboard.down(dir)
  try {
    while (Date.now() - t0 < ms) {
      await page.waitForTimeout(250)
      if (await open()) {
        await release(); await clear()
        if ((await page.locator('[data-life="choice"]').count()) > 0) return true
        await page.keyboard.down(dir)
      }
      const r = await read()
      if (DOOR.test(label) && r.place !== startedIn) return true
      if (r.prompt && r.prompt.includes(label)) {
        await release(); await page.waitForTimeout(150)
        await page.keyboard.press('e')
        await page.waitForSelector('[data-life="dialogue"]', { timeout: 3000 }).catch(() => undefined)
        await page.waitForTimeout(300)
        return true
      }
      const w = await whereIs()
      if (process.env.DEBUG) log(`  · ${label} dir=${dir} x=${w?.x} y=${w?.y} prompt=${r.prompt}`)
      if (w && Math.abs(w.x - lastX) > 0.003) { lastX = w.x; stuckSince = Date.now() }
      else if (Date.now() - stuckSince > 4000) {
        await release()
        dir = dir === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft'
        stuckSince = Date.now()
        await page.keyboard.down(dir)
      }
    }
    return false
  } finally {
    await release()
  }
}
/** ONLY=B4 node scripts/life/day1990-probe.mjs — one beat, for chasing a fault */
const only = process.env.ONLY
const run = (beat) => !only || only.split(',').includes(beat)
let r
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'chapter.completed', chapter: '1986' },
]
const seed = async (minute, flags, where, extra = []) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([events]) => {
    window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events, savedAt: new Date().toISOString() }))
    window.sessionStorage.setItem('the-worker:life:opening', '1')
    window.localStorage.setItem('the-worker:life:probe', '1')
  }, [[...BASE_EVENTS, { t: 'year.entered', year: 1990, weekday: 6, minute }, { t: 'chapter.entered', chapter: '1990' }, { t: 'flag.raised', flag: 'life:passage-1990' }, ...flags.map((flag) => ({ t: 'flag.raised', flag })), ...extra, { t: 'moved', to: where }]])
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas'); await page.waitForTimeout(3500)
}

// ---- B1 the table: the exchange, the arithmetic, Rachel's pocket money, the radio
if (run('B1')) {
await seed(12 * 60 + 35, [], 'kitchen')
await page.waitForSelector('[data-life="dialogue"]', { timeout: 20000 }).catch(() => fail('B1 the table exchange never opened'))
log(`B1 ${JSON.stringify((await read()).dialogue)}`)
await clear()
if (!(await reach('הטבלה'))) fail('B1 could not reach the table')
else { await clear(); const r = await read(); log(`B1 choices ${JSON.stringify(r.choices)}`); if (r.choices.length !== 4) fail('B1 the table offers four ways'); await choose(1) }
await page.waitForTimeout(2600)
r = await read(); log(`B1 after: obj="${r.objective}" flags=${Object.keys(r.flags).filter((f) => f.startsWith('math') || f.startsWith('knows')).join(',')}`)
if (!r.flags['math:six']) fail('B1 choosing six did not raise math:six')
// The radio, Kobi and Rachel in this room are played headless in `tests/life-1990.test.ts`;
// walking to each at six frames a second is a test of the sandbox, not the game.
await page.screenshot({ path: `${SHOT}-1-table.png` })

// ---- B2 "יוצאים" — the choice by movement — is played headless in tests/life-1990.test.ts.

}
// ---- B3 the gate: Kobi's two tickets, in through gate seven, the tunnel, the terrace
if (run('B3')) {
await seed(15 * 60 + 45, ['knows:math', 'math:six', 'went:withKobi', 'kobi:left', 'saw:ground'], 'bloomfield-outside')
if (!(await reach('קובי'))) fail('B3 could not reach Kobi at the gate'); await clear()
r = await read(); log(`B3 after Kobi: entry=${Boolean(r.flags['entry:granted'])} prompt=${r.prompt}`)
if (!r.flags['entry:granted']) fail('B3 Kobi did not hand over the ticket')
if (!(await reach('פנימה', 40000, 'ArrowLeft'))) fail('B3 could not find the way in'); await page.waitForTimeout(5000)
r = await read(); log(`B3 ${r.place}`)
if (r.place === 'המנהרה') {
  // the tunnel's way up is a wide zone in the middle: hold up/right into the light
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(2500); await page.keyboard.up('ArrowUp')
  if ((await read()).place === 'המנהרה' && !(await reach('אל האור', 30000, 'ArrowRight'))) fail('B3 stuck in the tunnel')
  await page.waitForTimeout(9000)
}
await clear(); r = await read(); log(`B3 ${r.place} board="${r.board}" obj="${r.objective}"`)
// on the terrace the scoreboard replaces the place plate — the board IS the proof
if (!r.board) fail(`B3 never reached the terrace (${r.place}, no scoreboard)`)
await page.screenshot({ path: `${SHOT}-3-terrace.png` })
// the network: talk to three sources
for (const who of ['אוהד עם רדיו', 'אוהד שיודע', 'ילדים', 'קובי']) {
  if (await reach(who, 25000, who === 'קובי' ? 'ArrowLeft' : 'ArrowRight')) { await page.waitForTimeout(400); const d = (await read()).dialogue; log(`B3 ${who}: ${d}`); await clear() } else log(`B3 ${who}: not reached`)
}
r = await read(); log(`B3 board="${r.board}" net:known=${JSON.stringify(Object.keys(r.flags).filter((f) => f.startsWith('net')))}`)
await page.screenshot({ path: `${SHOT}-4-network.png` })

}
// ---- B4 after the whistle: find him, the way home
if (run('B4')) {
await seed(17 * 60 + 46, ['knows:math', 'math:six', 'went:withKobi', 'entry:granted', 'entry:kobi', 'knows:pillar', 'match:over', 'saw:goal', 'net:six'], 'bloomfield-inside')
r = await read(); log(`B4 ${r.place} board="${r.board}" obj="${r.objective}"`)
if (!(await reach('קובי', 90000, 'ArrowRight'))) fail('B4 could not find Kobi in the crowd')
await page.waitForTimeout(400); log(`B4 ${(await read()).dialogue}`); await clear()
r = await read(); log(`B4 found=${Boolean(r.flags['found:kobi'])} obj="${r.objective}"`)
if (!r.flags['found:kobi']) fail('B4 the reunion did not raise found:kobi')
if (!(await reach('החוצה', 45000, 'ArrowLeft'))) fail('B4 no way out after finding him'); await page.waitForTimeout(6000)
r = await read(); log(`B4 out: ${r.place}`)
await page.screenshot({ path: `${SHOT}-5-out.png` })

}
// ---- B5 home: Rachel, the ending, the finale, the morning
if (run('B5')) {
await seed(18 * 60 + 30, ['knows:math', 'math:six', 'went:withKobi', 'entry:granted', 'match:over', 'saw:goal', 'net:six', 'found:kobi'], 'home')
if (!(await reach('רחל', 40000, 'ArrowRight'))) fail('B5 could not reach Rachel'); await clear(); await page.waitForTimeout(1200)
r = await read(); log(`B5 ending=${r.ending}`)
if (!r.ending) fail('B5 no ending card')
await page.screenshot({ path: `${SHOT}-6-ending.png` })
const endingBtn = page.locator('[data-life="ending"] button').first()
if (await endingBtn.count()) { await endingBtn.tap(); await page.waitForTimeout(1500) }
r = await read(); log(`B5 finale=${r.finale}`)
if (!r.finale) fail('B5 no finale')
await page.screenshot({ path: `${SHOT}-7-finale.png` })
const cont = page.locator('[data-life="finale-continue"]')
if (await cont.count()) { await cont.tap(); await page.waitForTimeout(5000) }
await page.waitForSelector('[data-life="dialogue"]', { timeout: 15000 }).catch(() => fail('B5 the school morning never opened'))
log(`B5 morning: ${(await read()).dialogue}`)
await clear(); await page.waitForTimeout(800)
r = await read(); log(`B5 card="${r.card}" place=${r.place}`)
await page.screenshot({ path: `${SHOT}-8-morning.png` })

}
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(faults === 0 ? 'PASS — 1990 plays end to end' : `FAIL — ${faults} fault(s)`)
await browser.close()
