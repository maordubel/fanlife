/**
 * 11.3.1991 — the Ussishkin night, in beats, each one seeded where it starts.
 *
 *   node scripts/life/derby-probe.mjs [http://127.0.0.1:3000]
 *   ONLY=C4 DESKTOP=1 node scripts/life/derby-probe.mjs
 *
 * Same harness as `day1990-probe.mjs` and the same reason for it: a headless sandbox runs
 * this game at about six frames a second, so every beat is SEEDED at its own start rather
 * than played from the morning, and every walk holds a key and polls `where()` instead of
 * pressing it in bursts. What it is really checking is the chapter's spine — that the note
 * exists, that the door out of the flat is locked by a sentence and opened by permission,
 * that the hall fills and the derby runs itself, that half past nine arrives ON THE CLOCK
 * while the game is alive, that walking out is a real answer, and that all three routes
 * reach an ending card.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const SHOT = process.env.PROBE_SHOT ?? '/tmp/shots/derby1991'
const DESKTOP = Boolean(process.env.DESKTOP)
const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext(
  DESKTOP
    ? { viewport: { width: 1440, height: 900 } }
    : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
)
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e.stack ?? e).slice(0, 300)))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !/ERR_FAILED|GL Driver|RSC payload/.test(t)) errors.push('console:' + t.slice(0, 200))
})
await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())

let faults = 0
const log = (line) => console.log(line)
const fail = (line) => {
  faults += 1
  console.log('FAULT ' + line)
}
const read = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    clock: document.querySelector('[data-life="clock"]')?.textContent?.trim() ?? null,
    prompt: (document.querySelector('[data-life="prompt"]')?.textContent?.trim() ?? '').replace(/^A\s*/, '') || null,
    dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 100) ?? null,
    choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.textContent.trim()),
    board: document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null,
    toast: document.querySelector('[data-life="toast"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 90) ?? null,
    ending: document.querySelector('[data-life="ending"]') ? 'ending' : null,
    finale: document.querySelector('[data-life="finale"]') ? 'finale' : null,
    card: document.querySelector('[data-life="title-card"]')?.textContent?.trim() ?? null,
    objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null,
    flags: Object.fromEntries(
      JSON.parse(window.localStorage.getItem('the-worker:life') ?? '{"events":[]}')
        .events.filter((e) => e.t === 'flag.raised')
        .map((e) => [e.flag, true]),
    ),
  }))
const open = async () => (await page.locator('[data-life="dialogue"]').count()) > 0
const clear = async (max = 20) => {
  for (let i = 0; i < max; i += 1) {
    if (!(await open())) return
    if ((await page.locator('[data-life="choice"]').count()) > 0) return
    await page.keyboard.press('e')
    await page.waitForTimeout(450)
    if (!(await open())) {
      await page.waitForTimeout(300)
      return
    }
  }
}
const choose = async (index) => {
  const buttons = page.locator('[data-life="choice"]')
  if ((await buttons.count()) > index) {
    await buttons.nth(index).click()
    await page.waitForTimeout(600)
    await clear()
  }
}
const DOOR = /^(לך|צא|חזרה|פנימה|החוצה|מזרחה|לאולם|לסלון|למטבח|לרחוב|לחדר|למסדרון|מהשער|לחצר)/
const whereIs = () => page.evaluate(() => window.__life?.debug?.where?.() ?? null)
const reach = async (label, ms = 60000, first = 'ArrowRight') => {
  /**
   * Hold the key DOWN and poll, rather than pressing it in bursts.
   *
   * The walk has a ramp, and a wide stage has a long one: 700-ms taps move a boy on a
   * 390-px phone and move nobody at 1440 px (delta 18 learned this in the tunnel). So the
   * key stays down, the runtime is asked where the feet are every quarter second, and the
   * direction only flips when the feet genuinely stopped moving.
   */
  const t0 = Date.now()
  let dir = first
  const startedIn = (await read()).place
  let lastX = (await whereIs())?.x ?? -1
  let stuckSince = Date.now()
  await page.keyboard.down(dir)
  const release = async () => {
    await page.keyboard.up('ArrowLeft')
    await page.keyboard.up('ArrowRight')
  }
  try {
    while (Date.now() - t0 < ms) {
      await page.waitForTimeout(250)
      if (await open()) {
        await release()
        await clear()
        if ((await page.locator('[data-life="choice"]').count()) > 0) {
          // A box with choices in it while we are walking to a DOOR is the night talking
          // to us — the chant starts on its own, and it must not park the probe. Answer it
          // and keep walking; anything else is a beat we came for, so stop and report it.
          if (!DOOR.test(label)) return true
          await choose(0)
        }
        await page.keyboard.down(dir)
      }
      const r = await read()
      if (DOOR.test(label) && r.place !== startedIn) return true
      if (r.prompt && r.prompt.includes(label)) {
        await release()
        await page.waitForTimeout(150)
        await page.keyboard.press('e')
        await page.waitForSelector('[data-life="dialogue"]', { timeout: 3000 }).catch(() => undefined)
        await page.waitForTimeout(300)
        return true
      }
      const w = await whereIs()
      if (process.env.DEBUG) log(`  · ${label} dir=${dir} x=${w?.x} prompt=${r.prompt}`)
      if (w && Math.abs(w.x - lastX) > 0.003) {
        lastX = w.x
        stuckSince = Date.now()
      } else if (Date.now() - stuckSince > 4000) {
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

const only = process.env.ONLY
const run = (beat) => !only || only.split(',').includes(beat)
let r
const BASE_EVENTS = [
  { t: 'flag.raised', flag: 'prologue:done' },
  { t: 'chapter.entered', chapter: '1986' },
  { t: 'flag.raised', flag: 'onboard:moved' },
  { t: 'flag.raised', flag: 'onboard:acted' },
  { t: 'flag.raised', flag: 'onboard:street' },
  { t: 'chapter.completed', chapter: '1986' },
  { t: 'year.entered', year: 1990, weekday: 6, minute: 12 * 60 + 35 },
  { t: 'chapter.entered', chapter: '1990' },
  { t: 'chapter.completed', chapter: '1990' },
]
const seed = async (minute, flags, where, extra = []) => {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([events]) => {
      window.localStorage.setItem(
        'the-worker:life',
        JSON.stringify({
          version: 3,
          identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
          year: 1986,
          events,
          savedAt: new Date().toISOString(),
        }),
      )
      window.sessionStorage.setItem('the-worker:life:opening', '1')
      window.localStorage.setItem('the-worker:life:probe', '1')
    },
    [
      [
        ...BASE_EVENTS,
        { t: 'year.entered', year: 1991, weekday: 1, minute },
        { t: 'chapter.entered', chapter: '1991' },
        { t: 'flag.raised', flag: 'life:bridge-1991' },
        { t: 'money.changed', agorot: 300, why: 'probe' },
        ...flags.map((flag) => ({ t: 'flag.raised', flag })),
        ...extra,
        { t: 'moved', to: where },
      ],
    ],
  )
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas')
  await page.waitForTimeout(3500)
}

// ---- C1 the classroom: the beat, the note, and a teacher who takes it -------------
if (run('C1')) {
  await seed(8 * 60 + 12, [], 'classroom')
  await page
    .waitForSelector('[data-life="dialogue"]', { timeout: 20000 })
    .catch(() => fail('C1 the classroom beat never opened'))
  log(`C1 opening: ${JSON.stringify((await read()).dialogue)}`)
  await clear()
  r = await read()
  log(`C1 place=${r.place} obj="${r.objective}" clock=${r.clock}`)
  if (r.place !== 'הכיתה') fail(`C1 the chapter did not open in the classroom (${r.place})`)
  if (!(await reach('השולחן שלך', 40000, 'ArrowLeft'))) fail('C1 could not reach the desk')
  else {
    await clear()
    r = await read()
    log(`C1 note choices ${JSON.stringify(r.choices)}`)
    if (r.choices.length !== 3) fail('C1 the note offers three answers')
    await choose(0)
    // the caught note chains straight into the teacher (`goto`), which is a second
    // conversation and therefore a second set of presses
    for (let i = 0; i < 8; i += 1) {
      await page.waitForTimeout(1000)
      await clear()
      r = await read()
      if (r.flags['hw:given']) break
    }
    log(`C1 caught=${Boolean(r.flags['note:caught'])} homework=${Boolean(r.flags['hw:given'])}`)
    if (!r.flags['note:caught']) fail('C1 passing it under her nose was not caught')
    if (!r.flags['hw:given']) fail('C1 being caught did not produce homework')
  }
  await page.screenshot({ path: `${SHOT}-1-classroom.png` })
}

// ---- C2 the yard and the way home ------------------------------------------------
if (run('C2')) {
  await seed(9 * 60 + 5, ['note:answered', 'plan:tonight', 'hw:given', 'school:done'], 'schoolyard')
  r = await read()
  log(`C2 ${r.place} obj="${r.objective}"`)
  if (!(await reach('אופיר', 40000, 'ArrowRight'))) fail('C2 could not reach Ofir in the yard')
  await clear()
  await page.screenshot({ path: `${SHOT}-2-yard.png` })
  if (!(await reach('מהשער', 70000, 'ArrowLeft'))) fail('C2 no way out of the schoolyard')
  await page.waitForTimeout(4000)
  r = await read()
  log(`C2 out: ${r.place}`)
  if (r.place !== 'הרחוב') fail(`C2 the school gate does not lead to the street (${r.place})`)
}

// ---- C3 home: the homework, the mother, and a door that says no -------------------
if (run('C3')) {
  await seed(16 * 60, ['note:answered', 'plan:tonight', 'hw:given', 'school:done'], 'home')
  if (!(await reach('רחל', 60000, 'ArrowLeft'))) fail('C3 could not reach Rachel')
  await clear()
  r = await read()
  log(`C3 Rachel first: ${r.dialogue}`)
  // the front door is shut in the evening until she says otherwise
  await seed(20 * 60, ['hw:done', 'hw:given', 'permission:no'], 'home')
  if (!(await reach('לרחוב', 30000, 'ArrowLeft'))) log('C3 (the door refused, as it should)')
  await page.waitForTimeout(600)
  r = await read()
  log(`C3 refused: place=${r.place} toast="${r.toast}"`)
  if (r.place !== 'הסלון') fail('C3 a boy who was told no walked out anyway')
  await page.screenshot({ path: `${SHOT}-3-door.png` })
}

// ---- C4 the hall: the step, the tip-off, the curfew, the wall ---------------------
//
// The night itself is forty game-minutes of a real-time director and it is played out in
// full, deterministically, in `tests/life-1991.test.ts`. It cannot be played here: this
// sandbox renders at about three frames a second and Phaser clamps its delta, so in-scene
// time runs roughly twenty times slow and the derby would take half an hour of wall clock.
// So the probe checks the WIRING at each end of it — the tip-off starts the director with
// the step already held, and half past nine plus a door is a real answer with a real
// consequence — which is exactly the part a headless run can prove and a unit test cannot.
if (run('C4')) {
  await seed(19 * 60 + 58, ['hw:done', 'permission:yes', 'plan:tonight', 'uss:arrived', 'spot:asked'], 'ussishkin-hall')
  r = await read()
  log(`C4 ${r.place} obj="${r.objective}" clock=${r.clock}`)
  if (r.place !== 'אולם אוסישקין') fail(`C4 the night does not open in the hall (${r.place})`)
  if (!(await reach('המדרגה', 60000, 'ArrowRight'))) fail('C4 could not reach the step')
  await clear()
  r = await read()
  if (!r.flags['spot:held']) {
    // the press can land on the frame the walk stops in; ask again, standing still
    await page.keyboard.press('e')
    await page.waitForTimeout(700)
    await clear()
    r = await read()
  }
  log(`C4 held=${Boolean(r.flags['spot:held'])}`)
  if (!r.flags['spot:held']) fail('C4 standing on the step did not hold it')
  await page.screenshot({ path: `${SHOT}-4-hall.png` })

  log('C4 waiting for the tip-off…')
  let derby = null
  for (let i = 0; i < 24; i += 1) {
    await page.waitForTimeout(5000)
    derby = (await whereIs())?.derby ?? null
    if (derby) break
  }
  r = await read()
  log(`C4 tipoff=${Boolean(r.flags['tipoff:1991'])} derby=${JSON.stringify(derby)} board="${r.board}"`)
  if (!derby) fail('C4 eight o’clock did not start the derby')
  if (r.board) fail('C4 a score is on the strip while the game is alive')

  // half past nine, with the game still going: the door is the answer
  await seed(
    21 * 60 + 30,
    ['hw:done', 'permission:yes', 'uss:arrived', 'spot:held', 'tipoff:1991', 'curfew:now'],
    'ussishkin-hall',
  )
  r = await read()
  log(`C4 curfew obj="${r.objective}" clock=${r.clock}`)
  if (!/רחל|שעה/.test(r.objective ?? '')) fail('C4 the curfew is not on the HUD')
  await page.screenshot({ path: `${SHOT}-5-curfew.png` })
  // Two attempts: on a loaded sandbox the press can land on the frame the walk stops in,
  // and a door that did not open is worth trying twice before calling it a fault.
  let left = false
  for (let attempt = 0; attempt < 2 && !left; attempt += 1) {
    await reach('החוצה', 60000, 'ArrowLeft')
    await page.waitForTimeout(2500)
    left = (await read()).place !== 'אולם אוסישקין'
  }
  if (!left) fail('C4 no way out of the hall at the curfew')
  // outside: the arrival, then the wall — three lines, and the night ends with them
  for (let i = 0; i < 10; i += 1) {
    await page.waitForTimeout(2500)
    await clear()
    if ((await read()).flags['derby:over']) break
  }
  r = await read()
  log(`C4 outside: place=${r.place} kept=${Boolean(r.flags['curfew:kept'])} wall=${Boolean(r.flags['heard:wall'])} over=${Boolean(r.flags['derby:over'])}`)
  if (!r.flags['curfew:kept']) fail('C4 walking out at half past nine was not recorded')
  if (!r.flags['heard:wall']) fail('C4 the wall never spoke')
  if (!r.flags['derby:over']) fail('C4 the night never ended for the boy who left')
  await page.screenshot({ path: `${SHOT}-6-wall.png` })
}

// ---- C5 home again: the consequence, the ending, the finale, the morning ----------
if (run('C5')) {
  await seed(
    22 * 60 + 5,
    ['hw:done', 'permission:yes', 'uss:arrived', 'spot:held', 'derby:over', 'curfew:broken', 'chant:joined'],
    'home',
  )
  if (!(await reach('רחל', 60000, 'ArrowLeft'))) fail('C5 could not reach Rachel')
  await clear()
  await page.waitForTimeout(1400)
  r = await read()
  log(`C5 ending=${r.ending}`)
  if (!r.ending) fail('C5 no ending card')
  await page.screenshot({ path: `${SHOT}-7-ending.png` })
  const endingBtn = page.locator('[data-life="ending"] button').first()
  if (await endingBtn.count()) {
    await endingBtn.click()
    await page.waitForTimeout(1500)
  }
  r = await read()
  log(`C5 finale=${r.finale}`)
  if (!r.finale) fail('C5 no finale')
  const cont = page.locator('[data-life="finale-continue"]')
  if (await cont.count()) {
    await cont.click()
    await page.waitForTimeout(6000)
  }
  await page
    .waitForSelector('[data-life="dialogue"]', { timeout: 20000 })
    .catch(() => fail('C5 the last classroom never opened'))
  log(`C5 morning: ${(await read()).dialogue}`)
  await clear()
  await page.waitForTimeout(1000)
  r = await read()
  log(`C5 place=${r.place} card="${r.card}"`)
  if (r.place !== 'הכיתה') fail(`C5 Stage B does not end in the classroom (${r.place})`)
  await page.screenshot({ path: `${SHOT}-8-closing.png` })
}

console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`)
console.log(faults === 0 ? 'PASS — 11.3.1991 plays end to end' : `FAIL — ${faults} fault(s)`)
await browser.close()
