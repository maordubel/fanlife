// Stage A implementation pass (28.9.2026) — plays A1–A8 in a browser, one seeded save per
// chapter, at phone size, and screenshots the moments the pass added: the terrace before the
// first box, the scarf gesture, the loaf run home, Efi at the arch, the warm-up door, the
// father at the counter, Ofir walking up to the shirt, the wet father at the door, the knock
// at the window, and Ofir keeping the plan on 24.5.1986.
//
//   node scripts/life/pass-stage-a-probe.mjs [http://127.0.0.1:3211]   (W/H env for size)
//
// Choices are waited for by the ballot's own gate (`[data-life="choices"][data-armed="true"]`,
// lib/life/inputArm.ts), never by a clock — and then taken through the runtime (`choose`),
// because the arming frame on a shared, loaded headless box can lag the click.
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3211'
const W = Number(process.env.W ?? 390), H = Number(process.env.H ?? 844)
const OUT = 'data/life-shots/pass-stage-a'
mkdirSync(OUT, { recursive: true })
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: W < 800, isMobile: W < 800 })
let faults = 0
const fault = (m) => { faults++; console.log('FAULT', m) }
const onboard = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
const has = (page, sel) => page.evaluate((s) => !!document.querySelector(s), sel)
const q = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent?.replace(/\s+/g, ' ').trim() ?? null, sel)
const log = []
const shot = (page, name) => page.screenshot({ path: `${OUT}/${W}-${name}.png` })

/** read lines, and pick the choice whose text contains one of `pick` (else the first enabled) */
async function play(page, pick = [], rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (await has(page, '[data-life="ending"]')) return 'ending'
    let choices = await page.$$('[data-life="choice"]')
    if (choices.length) {
      await page.waitForSelector('[data-life="choices"][data-armed="true"]', { timeout: 6000 }).catch(() => {})
      choices = await page.$$('[data-life="choice"]')
      if (!choices.length) continue
      const texts = await Promise.all(choices.map((c) => c.textContent()))
      let idx = texts.findIndex((t) => pick.some((p) => (t ?? '').includes(p)))
      if (idx < 0) idx = texts.findIndex((_, k) => !(choices[k].getAttribute('aria-disabled') === 'true'))
      const said = `  » ${texts[Math.max(0, idx)]?.trim()}`
      if (log.at(-1) !== said) log.push(said)
      if (process.env.VERBOSE) log.push(`    [${texts.map((t) => t?.trim().slice(0, 24)).join(' | ')}] pick=${pick.join('/')}`)
      // the content is what this probe reads; the DOM gate (arming) has its own regression
      // (`tests/life-input-arm.test.ts`), and on a loaded 2-CPU box a frame can take seconds
      const id = await choices[Math.max(0, idx)].getAttribute('data-choice')
      await page.evaluate((c) => window.__life.choose(c), id)
      await page.waitForTimeout(600)
      if (pick.length) return 'picked'
      continue
    }
    if (await has(page, '[data-life="dialogue"]')) {
      const line = await q(page, '[data-life="line"]')
      if (line && log.at(-1) !== line) log.push(`  ${line}`)
      await page.evaluate(() => window.__life.advance())
      await page.waitForTimeout(350)
      continue
    }
    if (i > 3) return 'idle'
    await page.waitForTimeout(800)
  }
  return 'rounds'
}

const heardAny = (...parts) => log.some((line) => parts.some((p) => line.includes(p)))

async function run(name, events, fn, opts = {}) {
  if (ONLY && !ONLY.includes(name)) return
  log.push(`== ${name}`)
  const page = await context.newPage()
  page.on('pageerror', (e) => fault(`${name} pageerror ${e.message}`))
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ ev, year }) => {
    localStorage.setItem('the-worker:life', JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year, events: ev, savedAt: new Date().toISOString() }))
    localStorage.setItem('the-worker:life:probe', '1')
  }, { ev: events, year: opts.year ?? 1986 })
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 90000 })
  await page.waitForTimeout(opts.settle ?? 3500)
  try {
    await fn(page)
  } catch (e) {
    fault(`${name}: ${e.message}`)
  }
  await page.close()
}

const chapter = (id, year, weekday, minute, at, extra = []) => [
  ...onboard, { t: 'flag.raised', flag: 'prologue:done' },
  { t: 'year.entered', year, weekday, minute }, { t: 'chapter.entered', chapter: id }, ...extra, { t: 'moved', to: at },
]
const goTo = async (page, where) => { await page.evaluate((w) => window.__life.debug.goTo(w), where); await page.waitForTimeout(2600) }
const talk = async (page, id) => { await page.evaluate((c) => window.__life.talk(c), id); await page.waitForTimeout(700) }
const jump = async (page, m) => { await page.evaluate((x) => window.__life.debug.jump(x), m); await page.waitForTimeout(2200) }

// ------------------------------------------------------------------------------ A1 ---
await run('A1', [{ t: 'flag.raised', flag: 'life:opening' }], async (page) => {
  // the eye first: the terrace before the box
  const early = await has(page, '[data-life="dialogue"]')
  await shot(page, 'a1-01-terrace')
  if (early) log.push('  (the first box was already up at 3.5 s — the page was slow to boot)')
  await page.waitForTimeout(2000)
  await play(page, ['לגעת בצעיף'])
  await page.waitForTimeout(900)
  await shot(page, 'a1-02-scarf-mark')
  // the hand: a tap on the painting is the reach
  await page.mouse.click(W * 0.31, H * 0.64)
  await page.waitForTimeout(1200)
  await shot(page, 'a1-03-scarf-held')
  for (let i = 0; i < 6; i++) {
    await play(page, [], 20)
    await page.mouse.click(W * 0.5, H * 0.78)
    await page.waitForTimeout(900)
  }
  const flags = await page.evaluate(() => JSON.parse(localStorage.getItem('the-worker:life') ?? '{}').events?.filter((e) => String(e.flag ?? '').startsWith('life:a1')).map((e) => `${e.flag}=${e.value ?? true}`))
  log.push(`  flags: ${flags?.join(' ')}`)
  if (!flags?.some((f) => f.startsWith('life:a1:scarf'))) fault('A1: the scarf gesture left no mark on the life')
})

// ------------------------------------------------------------------------------ A2 ---
await run('A2', chapter('a2-alley', 1984, 2, 15 * 60 + 40, 'home'), async (page) => {
  await play(page)
  await talk(page, 'rachel-a2')
  await play(page, ['"טוב."'])
  await play(page)
  await goTo(page, 'kiosk')
  await talk(page, 'rafi-a2')
  await play(page)
  await goTo(page, 'pitch')
  await talk(page, 'alley-a2')
  await shot(page, 'a2-01-bread-at-pitch')
  await play(page, ['לרוץ איתו הביתה'])
  await page.waitForTimeout(3200)
  await play(page)
  await shot(page, 'a2-02-bread-home')
  if (!heardAny('לפני שאני מתחרטת')) fault('A2: the loaf run home was not met in the flat')
  await jump(page, 45)
  await goTo(page, 'pitch')
  await talk(page, 'alley-a2')
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a2-03-late')
  const ending = await q(page, '[data-life="ending"]')
  log.push(`  ending: ${ending?.slice(0, 60)}`)
  if (!ending) fault('A2: no ending card')
})

// ------------------------------------------------------------------------------ A3 ---
await run('A3', chapter('a3-hall', 1984, 4, 17 * 60, 'street'), async (page) => {
  await play(page)
  await shot(page, 'a3-01-stranger')
  await talk(page, 'efi-a3')
  await play(page, ['אתה גר פה'])
  await play(page)
  await page.waitForTimeout(2500)
  await shot(page, 'a3-02-efi-leads')
  await goTo(page, 'allenby')
  await play(page)
  await shot(page, 'a3-03-arch')
  await talk(page, 'efi-a3-arch')
  await play(page)
  await goTo(page, 'ussishkin-outside')
  await play(page)
  await talk(page, 'a3-queue')
  await play(page, ['"פוגי."'])
  await play(page)
  await goTo(page, 'ussishkin-hall')
  await play(page)
  await shot(page, 'a3-04-hall')
  await talk(page, 'a3-locker')
  await play(page, ['בהצלחה'])
  await play(page)
  await shot(page, 'a3-05-locker')
  await talk(page, 'usher-a3-hall')
  await play(page, ['להחזיק את הדלת'])
  await play(page)
  await jump(page, 60)
  await play(page)
  await shot(page, 'a3-06-tipoff')
  const targets = await page.evaluate(() => window.__life.debug.targets().map((t) => t.id))
  if (targets.includes('a3-locker')) fault('A3: the locker door is still open after the whistle')
  // he is shown the place by the boy who brought him; the room notices, and Efi says "נו?"
  await talk(page, 'efi-a3-hall')
  await play(page)
  await jump(page, 2)
  await play(page)
  await talk(page, 'efi-a3-hall')
  await play(page, ['בוא נלך'])
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a3-07-ending')
  if (!(await q(page, '[data-life="ending"]'))) fault('A3: no ending card')
})

// ------------------------------------------------------------------------------ A4 ---
await run('A4', chapter('a4-shirt', 1985, 0, 9 * 60 + 30, 'bedroom'), async (page) => {
  await play(page, ['לרוקן'])
  await play(page)
  await goTo(page, 'home')
  await play(page, ['מה שיישאר'])
  await play(page)
  await shot(page, 'a4-01-wallet')
  await page.evaluate(() => window.__life.debug.money(2000))
  await goTo(page, 'kiosk')
  await talk(page, 'rafi-a4')
  await play(page, ['לספור על הדלפק'])
  await page.waitForTimeout(1200)
  await shot(page, 'a4-02-kobi-walks-in')
  await play(page)
  await play(page, ['לשפוך'])
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a4-03-ending')
  if (!heardAny('הכיס המצלצל', 'נשאר הכל')) fault('A4: the promise to his mother was not collected')
})

// ------------------------------------------------------------------------------ A5 ---
await run('A5', chapter('a5-first', 1985, 6, 13 * 60, 'bedroom', [{ t: 'flag.raised', flag: 'own:shirt85' }]), async (page) => {
  await play(page, ['ללבוש.'])
  await play(page)
  await goTo(page, 'home')
  await goTo(page, 'street')
  await page.waitForTimeout(1500)
  await shot(page, 'a5-01-ofir-walks-up')
  await play(page, ['לבעוט'])
  await play(page)
  if (!heardAny('תן למדוד', 'באמת שלך')) fault('A5: Ofir never came to the shirt')
  await talk(page, 'kobi-a5')
  await play(page)
  await page.waitForTimeout(2600)
  await shot(page, 'a5-02-gate')
  await talk(page, 'a5-turnstile')
  await play(page)
  await page.waitForTimeout(2600)
  await talk(page, 'a5-kickoff')
  await play(page, ['לצעוק'])
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a5-03-ending')
  if (!heardAny('אבק מהסמטה')) fault('A5: the stain was not read at the close')
})

// ------------------------------------------------------------------------------ A6 ---
await run('A6', chapter('a6-radio', 1986, 6, 14 * 60, 'home'), async (page) => {
  await play(page, ['להדליק'])
  for (let i = 0; i < 20 && !(await has(page, '[data-life="dialogue"]')); i++) await page.waitForTimeout(1000)
  await play(page)
  // the radio is a still passage (`ride:radio-86`): wait for the kitchen to be the world again
  for (let i = 0; i < 30; i++) {
    const back = await page.evaluate(() => { try { return !!window.__life.debug.where() } catch { return false } })
    if (back) break
    await play(page, [], 4)
    await page.waitForTimeout(1500)
  }
  await jump(page, 100)
  await play(page, ['לכבות'])
  for (let i = 0; i < 8 && !(await has(page, '[data-life="choice"]')); i++) {
    await play(page, [], 8)
    await page.waitForTimeout(1000)
  }
  await shot(page, 'a6-01-father')
  await play(page, ['לשבת לידו'])
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a6-02-ending')
  if (!heardAny('מטפטף על הבלטות', 'רטוב עד הגרביים')) fault('A6: the father never came home')
})

// ------------------------------------------------------------------------------ A7 ---
await run('A7', chapter('a7-week', 1986, 6, 16 * 60, 'street'), async (page) => {
  await play(page)
  await talk(page, 'amit-a7')
  await play(page)
  await goTo(page, 'home')
  await play(page)
  await talk(page, 'rachel-a7')
  await play(page, ['תגידי לו'])
  await play(page)
  await talk(page, 'kobi-a7')
  await play(page, ['קח אותי'])
  await play(page)
  for (let i = 0; i < 6 && !(await has(page, '[data-life="choice"]')); i++) await page.waitForTimeout(1000)
  await shot(page, 'a7-01-knock')
  await play(page, ['שתיים'])
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a7-02-ending')
  if (!heardAny('דפיקה בזכוכית')) fault('A7: no knock at the window')
})

// ---------------------------------------------------------------------------- 1986 ---
await run('A8', chapter('1986', 1986, 6, 12 * 60 + 35, 'street', [
  { t: 'flag.set', flag: 'life:a7:plan', value: 'ofir' }, { t: 'flag.set', flag: 'life:a1:scarf', value: 'held' }, { t: 'flag.raised', flag: 'knows:match' },
]), async (page) => {
  await play(page)
  await talk(page, 'ofir-wall')
  await play(page)
  await shot(page, 'a8-01-plan-kept')
  if (!heardAny('אמרנו שתיים')) fault('1986: Ofir did not keep the plan')
  await talk(page, 'kobi-shoulders-1986')
  await play(page)
  await page.waitForTimeout(1500)
  await shot(page, 'a8-02-shoulders')
  if (!heardAny('אותו צמר')) fault('1986: the shoulders did not remember the scarf')
})

console.log(log.join('\n'))
console.log(faults ? `FAIL — ${faults} fault(s)` : 'PASS')
await browser.close()
process.exit(faults ? 1 : 0)
