/**
 * מריץ פרקים — plays a data chapter through the runtime by its ids, not by walking.
 *
 *   node scripts/life/chapter-probe.mjs 1993-cup [http://127.0.0.1:3000]
 *
 * Seeds a life at the chapter's start, then drives it: `talk` starts a conversation by id,
 * `choose` picks a choice by id, `go` travels by the map, `wait` lets the clock run, and
 * after every step the glass is read back. Screenshots land in data/life-shots/ch-*.png.
 * A fault is anything the run expected and did not see.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const CHAPTER = process.argv[2] ?? '1993-cup'
const BASE = process.argv[3] ?? 'http://127.0.0.1:3000'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = 'data/life-shots'
mkdirSync(OUT, { recursive: true })

const SCRIPTS = {
  // the 1986 final as the directed sequence (`final-86`): the film already seen → the authored 86th minute
  '1986-final': {
    seed: [{ t: 'flag.raised', flag: 'knows:match' }, { t: 'flag.raised', flag: 'kobi:left' }, { t: 'flag.raised', flag: 'entry:granted' }, { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'flag.raised', flag: 'cutscene:1986-championship' }, { t: 'clock.advanced', minutes: 16 * 60 + 5 - 14 * 60 }, { t: 'moved', to: 'bloomfield-inside' }],
    steps: [
      ['wait', 2500], ['shot', 'terrace'],
      ['match', 'fence,breathe'], ['clear'],
      ['expect-flag', 'saw:goal'], ['expect-flag', 'match:over'], ['shot', 'after'],
    ],
    noEnding: true,
  },
  // …and with the film not yet seen: the archive is asked for at the goal step, cannot play here, falls through
  '1986-final-film': {
    seed: [{ t: 'flag.raised', flag: 'knows:match' }, { t: 'flag.raised', flag: 'kobi:left' }, { t: 'flag.raised', flag: 'entry:granted' }, { t: 'flag.raised', flag: 'saw:reveal' }, { t: 'clock.advanced', minutes: 16 * 60 + 5 - 14 * 60 }, { t: 'moved', to: 'bloomfield-inside' }],
    steps: [
      ['wait', 2500], ['shot', 'terrace'],
      ['match', 'step,hand'], ['clear'],
      ['expect-flag', 'saw:goal'], ['expect-flag', 'match:over'], ['expect-flag', 'cutscene:1986-championship'], ['shot', 'after'],
    ],
    noEnding: true,
  },
  '1993-cup': {
    seed: [{ t: 'year.entered', year: 1993, weekday: 1, minute: 15 * 60 + 30 }, { t: 'chapter.entered', chapter: '1993-cup' }, { t: 'money.changed', agorot: 2200, why: 'seed' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'rachel-1993'], ['choose', 'own'], ['expect-flag', 'money:enough'],
      ['talk', 'kobi-1993'], ['choose', 'different'],
      ['go', 'street'], ['wait', 1500], ['shot', 'street'],
      ['talk', 'efi-1993'], ['choose', 'with-efi'], ['expect-flag', 'route:efi'],
      ['go', 'ussishkin-outside'], ['wait', 1500], ['shot', 'corner'],
      ['talk', 'shachor-1993'], ['choose', 'help'],
      ['jump-to', 18 * 60 + 20],
      ['talk', 'bus-1993'], ['choose', 'board'], ['shot', 'ride'], ['clear'], ['shot', 'hall'], ['clear'],
      ['choose', 'spot'], ['clear'], ['clear'], ['shot', 'horn'], ['clear'], ['choose', 'home'], ['clear'],
      ['expect-flag', 'final:over'],
      ['go', 'street'], ['wait', 800], ['go', 'home'], ['wait', 1200],
      ['talk', 'rachel-1993'], ['clear'],
      ['shot', 'after'],
    ],
  },
  '1993-galil': {
    seed: [{ t: 'year.entered', year: 1993, weekday: 0, minute: 18 * 60 }, { t: 'chapter.entered', chapter: '1993-galil' }, { t: 'money.changed', agorot: 9500, why: 'seed' }, { t: 'moved', to: 'ussishkin-outside' }],
    steps: [
      ['wait', 2500], ['shot', 'd1'], ['clear'],
      ['go', 'ussishkin-hall'], ['wait', 2500], ['shot', 'd1-hall'], ['match', 'high'], ['clear'],
      ['wait', 4500], ['clear'], ['shot', 'd2'],
      ['choose', 'stay'], ['clear'], ['wait', 4500], ['clear'], ['shot', 'd3'],
      ['go', 'ussishkin-hall'], ['wait', 2500], ['match', 'signup'], ['clear'], ['expect-flag', 'life:signed:bus'],
      ['wait', 4500], ['clear'], ['shot', 'd4'],
      ['talk', 'g4-limor'], ['choose', 'broke'], ['clear'], ['shot', 'd4-broke'],
      ['talk', 'g4-ofir'], ['choose', 'car'], ['clear'], ['clear'], ['clear'], ['expect-flag', 'life:galil:there'],
      ['wait', 6000], ['clear'], ['shot', 'd5'],
      ['choose', 'shachor'], ['clear'], ['choose', 'ask'], ['clear'], ['clear'],
      ['expect-flag', 'life:galil:after'],
    ],
  },
  '1995-sinai': {
    seed: [{ t: 'year.entered', year: 1994, weekday: 2, minute: 18 * 60 + 40 }, { t: 'chapter.entered', chapter: '1995-sinai' }, { t: 'money.changed', agorot: 1500, why: 'seed' }, { t: 'moved', to: 'kiosk' }],
    steps: [
      ['wait', 2500], ['shot', 's1'], ['clear'],
      ['choose', 'defend'], ['clear'], ['expect-flag', 's1:argued'],
      ['wait', 4500], ['clear'], ['shot', 's1-poster'],
      ['choose', 'kobi'], ['clear'], ['clear'],
      ['wait', 4500], ['clear'], ['shot', 's2'],
      ['choose', 'listen'], ['clear'], ['clear'], ['shot', 's2-verdict'],
      ['choose', 'keep'], ['clear'],
      ['expect-flag', 'life:poster:wall'],
    ],
  },
  '1996-army': {
    seed: [{ t: 'year.entered', year: 1996, weekday: 4, minute: 16 * 60 }, { t: 'chapter.entered', chapter: '1996-army' }, { t: 'money.changed', agorot: 2500, why: 'seed' }, { t: 'moved', to: 'street' }],
    steps: [
      ['wait', 2500], ['shot', 'a1'], ['clear'],
      ['talk', 'ofir-army'], ['clear'], ['expect-flag', 'knows:gate5'],
      ['go', 'home'], ['wait', 1200], ['talk', 'rachel-army'], ['choose', 'honest'], ['clear'],
      ['jump-to', 21 * 60 + 2], ['wait', 4500], ['clear'], ['shot', 'a2'],
      ['talk', 'asaf-gate5'], ['choose', 'rhythm'], ['clear'], ['talk', 'asaf-gate5'], ['choose', 'join'], ['clear'], ['clear'], ['expect-flag', 'life:melamed:rhythm'],
      ['wait', 4500], ['clear'], ['shot', 'a3'],
      ['jump-to', 5 * 60 + 56], ['wait', 1500], ['talk', 'a3-bus'], ['shot', 'a3-bus'], ['choose', 'refuse'], ['clear'], ['shot', 'a3-late'], ['choose', 'truth'], ['clear'], ['expect-flag', 'life:bus:refused'],
      ['wait', 4500], ['clear'], ['shot', 'a4'],
      ['choose', 'reconcile'], ['clear'], ['choose', 'go'], ['clear'], ['choose', 'nothing'], ['clear'], ['choose', 'stay'], ['clear'], ['clear'], ['clear'],
      ['expect-flag', 'a4:done'],
    ],
  },
  '1997-basket': {
    seed: [{ t: 'year.entered', year: 1997, weekday: 2, minute: 19 * 60 }, { t: 'chapter.entered', chapter: '1997-basket' }, { t: 'money.changed', agorot: 2000, why: 'seed' }, { t: 'moved', to: 'ussishkin-outside' }],
    steps: [
      ['wait', 2500], ['shot', 'h1'], ['clear'],
      ['choose', 'freddy'], ['clear'], ['clear'], ['choose', 'crates'], ['clear'], ['expect-flag', 'h1:crates'],
      ['go', 'ussishkin-hall'], ['wait', 2500], ['shot', 'h1-hall'], ['match', 'efi'], ['clear'], ['clear'],
      ['wait', 4500], ['clear'], ['shot', 'h2'],
      ['choose', 'doubt'], ['clear'], ['clear'],
      ['expect-flag', 'h2:done'],
    ],
  },
  '1998-laces': {
    seed: [{ t: 'year.entered', year: 1998, weekday: 6, minute: 13 * 60 }, { t: 'chapter.entered', chapter: '1998-laces' }, { t: 'money.changed', agorot: 4000, why: 'seed' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'l1'], ['clear'],
      ['talk', 'kobi-laces'], ['choose', 'fear'], ['clear'],
      ['go', 'street'], ['wait', 1200], ['talk', 'ofir-laces'], ['clear'],
      ['go', 'bloomfield-outside'], ['wait', 1500], ['shot', 'l1-gate'],
      ['go', 'bloomfield-inside'], ['wait', 1500], ['shot', 'l1-inside'],
      ['match', 'pitch,sing,stay'], ['clear'], ['shot', 'l1-whistle'], ['expect-flag', 'life:laces:d1'],
      ['wait', 4500], ['clear'], ['shot', 'l2'],
      ['choose', 'ask'], ['clear'], ['clear'], ['clear'],
      ['expect-flag', 'l2:done'],
    ],
  },
  '1999-basket': {
    seed: [{ t: 'year.entered', year: 1999, weekday: 3, minute: 18 * 60 + 30 }, { t: 'chapter.entered', chapter: '1999-basket' }, { t: 'money.changed', agorot: 2000, why: 'seed' }, { t: 'moved', to: 'ussishkin-outside' }],
    steps: [
      ['wait', 2500], ['shot', 'seed'], ['clear'],
      ['choose', 'work'], ['clear'],
      ['go', 'ussishkin-hall'], ['wait', 2500], ['match', 'help'], ['clear'], ['shot', 'seed-hall'],
      ['go', 'ussishkin-outside'], ['wait', 1000], ['go', 'kiosk'], ['wait', 2000], ['clear'], ['shot', 'seed-kiosk'],
      ['choose', 'list'], ['clear'], ['clear'],
      ['expect-flag', 'life:seed:list'],
    ],
  },
  '1999-cup': {
    seed: [{ t: 'year.entered', year: 1999, weekday: 3, minute: 14 * 60 }, { t: 'chapter.entered', chapter: '1999-cup' }, { t: 'money.changed', agorot: 3000, why: 'seed' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'c99'], ['clear'],
      ['talk', 'kobi-cup99'], ['choose', 'with-kobi'], ['clear'], ['wait', 3000], ['shot', 'c99-stadium'],
      ['match', 'scarf,shoulder,kobi'], ['clear'],
      ['expect-flag', 'life:cup99:together'],
    ],
  },
  '2000-title': {
    seed: [{ t: 'year.entered', year: 2000, weekday: 6, minute: 14 * 60 + 30 }, { t: 'chapter.entered', chapter: '2000-title' }, { t: 'money.changed', agorot: 3000, why: 'seed' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 't'], ['clear'],
      ['talk', 'kobi-title'], ['choose', 'yes'], ['clear'], ['wait', 3000], ['shot', 't-ground'],
      ['match', 'kobi,hold,believe'], ['clear'], ['clear'],
      ['expect-flag', 'life:title:kobi'],
    ],
  },
  'a2-alley': {
    seed: [{ t: 'year.entered', year: 1984, weekday: 2, minute: 15 * 60 + 40 }, { t: 'chapter.entered', chapter: 'a2-alley' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'rachel-a2'], ['choose', 'ok'], ['clear'],
      ['go', 'street'], ['wait', 1000], ['go', 'kiosk'], ['wait', 1500], ['talk', 'rafi-a2'], ['clear'], ['expect-flag', 'a2:bread'],
      ['go', 'street'], ['wait', 800], ['go', 'pitch'], ['wait', 1500], ['shot', 'alley'],
      ['talk', 'alley-a2'], ['choose', 'play'], ['wait', 4000], ['shot', 'game'],
    ],
    noEnding: true,
  },
  'a3-hall': {
    seed: [{ t: 'year.entered', year: 1984, weekday: 4, minute: 17 * 60 }, { t: 'chapter.entered', chapter: 'a3-hall' }, { t: 'moved', to: 'street' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'efi-a3'], ['clear'],
      ['go', 'ussishkin-outside'], ['wait', 1500], ['shot', 'door'],
      ['talk', 'usher-a3'], ['choose', 'name'], ['clear'], ['expect-flag', 'entry:granted'],
      ['go', 'ussishkin-hall'], ['wait', 4000], ['clear'], ['shot', 'hall'], ['clear'], ['clear'],
    ],
    dayEnd: true,
  },
  'a4-shirt': {
    // (delta 93) Kobi's five are gone — the probe seeds the rest; the chore scenes are not played here
    seed: [{ t: 'year.entered', year: 1985, weekday: 0, minute: 9 * 60 + 30 }, { t: 'chapter.entered', chapter: 'a4-shirt' }, { t: 'money.changed', agorot: 2000, why: 'seed' }, { t: 'moved', to: 'bedroom' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'tin-a4'], ['choose', 'take'], ['clear'],
      // bottles and crates first (11 + 3 + 4 = 18 is exactly the shirt), then Kobi's five: the day's three ways to earn, all seen
      ['go', 'street'], ['wait', 800], ['go', 'pitch'], ['wait', 1200], ['talk', 'bottles-a4'], ['choose', 'collect'], ['clear'],
      ['go', 'street'], ['wait', 800], ['go', 'kiosk'], ['wait', 1200], ['talk', 'rafi-a4'], ['clear'], ['talk', 'rafi-a4'], ['choose', 'work'], ['clear'],
      ['go', 'street'], ['wait', 800], ['go', 'home'], ['wait', 1000], ['talk', 'kobi-a4'], ['choose', 'almost'], ['clear'], ['expect-flag', 'a4:kobi-knows'],
      // the thirty on the counter, and the man at the door (delta 93)
      ['go', 'street'], ['wait', 800], ['go', 'kiosk'], ['wait', 1200], ['talk', 'rafi-a4'], ['shot', 'counter-ask'], ['choose', 'buy'],
      ['wait', 3200], ['shot', 'kobi-comes'], ['clear'], ['clear'], ['expect-flag', 'a4:kobi-gifted-shirt'], ['expect-flag', 'own:shirt85'],
    ],
    dayEnd: true,
  },
  'a5-first': {
    seed: [{ t: 'year.entered', year: 1985, weekday: 6, minute: 13 * 60 }, { t: 'chapter.entered', chapter: 'a5-first' }, { t: 'flag.raised', flag: 'own:shirt85' }, { t: 'moved', to: 'bedroom' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'shirt-a5'], ['choose', 'wear'], ['clear'],
      ['go', 'home'], ['wait', 800], ['go', 'street'], ['wait', 1200], ['shot', 'street'],
      ['talk', 'kobi-a5'], ['clear'], ['wait', 4000], ['clear'], ['shot', 'gate'], ['clear'], ['clear'],
    ],
    dayEnd: true,
  },
  'a6-radio': {
    seed: [{ t: 'year.entered', year: 1986, weekday: 6, minute: 14 * 60 }, { t: 'chapter.entered', chapter: 'a6-radio' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['go', 'kitchen'], ['wait', 1200], ['talk', 'radio-a6'], ['choose', 'on'], ['clear'], ['expect-flag', 'a6:on'],
      ['jump-to', 15 * 60 + 36], ['wait', 2500], ['shot', 'dead'],
      ['go', 'home'], ['wait', 800], ['go', 'street'], ['wait', 1200], ['talk', 'liron-a6'], ['choose', 'hold'], ['clear'],
      ['jump-to', 16 * 60 + 51], ['wait', 3000], ['clear'], ['shot', 'close'], ['clear'],
    ],
    dayEnd: true,
  },
  'a7-week': {
    seed: [{ t: 'year.entered', year: 1986, weekday: 6, minute: 16 * 60 }, { t: 'chapter.entered', chapter: 'a7-week' }, { t: 'moved', to: 'street' }],
    steps: [
      ['wait', 2500], ['shot', 'open'], ['clear'],
      ['talk', 'amit-a7'], ['clear'], ['expect-flag', 'a7:knows'],
      ['talk', 'ofir-a7'], ['choose', 'me-too'], ['clear'],
      ['go', 'home'], ['wait', 1200], ['talk', 'kobi-a7'], ['choose', 'ask'], ['clear'], ['shot', 'no'],
    ],
    dayEnd: true,
  },
  '2000-double': {
    seed: [{ t: 'year.entered', year: 2000, weekday: 3, minute: 15 * 60 }, { t: 'chapter.entered', chapter: '2000-double' }, { t: 'money.changed', agorot: 3000, why: 'seed' }, { t: 'moved', to: 'home' }],
    steps: [
      ['wait', 2500], ['shot', 'd'], ['clear'],
      ['choose', 'family'], ['clear'], ['choose', 'ticket'], ['clear'], ['clear'], ['wait', 3000], ['shot', 'd-stadium'],
      ['match', 'shoulders,hold'], ['clear'], ['clear'], ['shot', 'd-walk'],
      ['expect-flag', 'd:walked'],
    ],
  },
}

const script = SCRIPTS[CHAPTER]
if (!script) throw new Error(`no script for ${CHAPTER}`)

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu'] })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const page = await context.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
let faults = 0
const fault = (m) => { faults += 1; console.log('FAULT ' + m) }
const read = () =>
  page.evaluate(() => ({
    place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
    clock: document.querySelector('[data-life="clock"]')?.textContent?.trim() ?? null,
    dialogue: document.querySelector('[data-life="dialogue"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 90) ?? null,
    choices: [...document.querySelectorAll('[data-life="choice"]')].map((b) => b.textContent.trim()),
    toast: document.querySelector('[data-life="toast"]')?.textContent?.trim()?.replace(/\s+/g, ' ').slice(0, 80) ?? null,
    ending: !!document.querySelector('[data-life="ending"]'),
    finale: !!document.querySelector('[data-life="finale"]'),
    coda: !!document.querySelector('[data-life="coda"]'),
    card: document.querySelector('[data-life="chapter-card"],[data-life="title-card"]')?.textContent?.trim()?.slice(0, 40) ?? null,
    objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null,
    where: window.__life?.debug?.where?.() ?? null,
    flags: window.__life?.snapshot?.().state?.flags ?? {},
  }))
const open = async () => (await page.locator('[data-life="dialogue"]').count()) > 0
/** a reveal or a coda is a card a person taps; the probe taps it after a look */
const settle = async () => {
  if ((await page.locator('[data-life="reveal"]').count()) > 0) {
    await page.waitForTimeout(2200)
    await page.screenshot({ path: `${OUT}/ch-${CHAPTER}-reveal.png` })
    await page.locator('[data-life="reveal-close"]').click().catch(() => {})
    await page.waitForTimeout(500)
  }
}
/** cards and breaths take a few seconds; a step waits for the box before it reads it */
const untilOpen = async (ms = 2500) => {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    if (await open()) return true
    await page.waitForTimeout(300)
  }
  return false
}
const clear = async (max = 24) => {
  await untilOpen()
  for (let i = 0; i < max; i += 1) {
    if (!(await open())) return
    if ((await page.locator('[data-life="choice"]').count()) > 0) return
    await page.evaluate(() => window.__life.advance())
    await page.waitForTimeout(380)
  }
}
const shot = (name) => page.screenshot({ path: `${OUT}/ch-${CHAPTER}-${name}.png` })

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate((events) => {
  const base = [{ t: 'flag.raised', flag: 'life:opening' }, { t: 'flag.raised', flag: 'prologue:done' }, { t: 'chapter.entered', chapter: '1986' }, { t: 'flag.raised', flag: 'onboard:moved' }, { t: 'flag.raised', flag: 'onboard:acted' }, { t: 'flag.raised', flag: 'onboard:street' }]
  window.localStorage.setItem('the-worker:life', JSON.stringify({ version: 3, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: 1986, events: [...base, ...events], savedAt: new Date().toISOString() }))
  window.localStorage.setItem('the-worker:life:probe', '1')
}, script.seed)
await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('canvas')
await page.waitForTimeout(3000)

for (const [op, arg] of script.steps) {
  if (op === 'wait') await page.waitForTimeout(arg)
  else if (op === 'shot') await shot(arg)
  else if (op === 'clear') await clear()
  else if (op === 'talk') { await page.evaluate((id) => window.__life.talk(id), arg); await page.waitForTimeout(500); await clear() }
  else if (op === 'choose') {
    let ok = false
    for (let i = 0; i < 20 && !ok; i += 1) {
      ok = await page.evaluate((id) => { const li = document.querySelector(`[data-life="choice"][data-choice="${id}"]`); const b = li && li.querySelector("button"); if (!b) return false; b.click(); return true }, arg)
      if (!ok) { await clear(4); await page.waitForTimeout(300) }
    }
    if (!ok) { const r = await read(); fault(`choice ${arg} not offered; offered: ${r.choices.join(' | ')} dialogue: ${r.dialogue}`); }
    await page.waitForTimeout(600); await clear()
  }
  else if (op === 'go') { const ok = await page.evaluate((id) => window.__life.goTo(id), arg); if (!ok) fault(`cannot go to ${arg} from ${(await read()).where?.scene}`); await page.waitForTimeout(1600); await clear() }
  else if (op === 'jump-to') { const r = await read(); const now = r.where?.minute ?? 0; if (arg > now) await page.evaluate((m) => window.__life.debug.jump(m), arg - now); await page.waitForTimeout(600) }
  else if (op === 'expect-flag') { const r = await read(); if (!r.flags[arg]) fault(`flag ${arg} not raised`) }
  else if (op === 'match') {
    // a directed match: let it run, answer every prompt (preferred ids first), note the board
    const prefer = String(arg ?? '').split(',').filter(Boolean)
    const boards = []
    const t0 = Date.now()
    let started = false
    let shotBoard = false
    while (Date.now() - t0 < 150000) {
      const r = await read()
      const board = await page.evaluate(() => document.querySelector('[data-life="scoreboard"]')?.textContent?.trim()?.replace(/\s+/g, ' ') ?? null)
      if (board && boards[boards.length - 1] !== board) { boards.push(board); console.log(`   board: ${board}`) }
      if (board && !shotBoard) { shotBoard = true; await shot(`${CHAPTER}-board`) }
      if (r.where?.match) started = true
      if (r.choices.length > 0) {
        const ids = await page.evaluate(() => [...document.querySelectorAll('[data-life="choice"]')].map((li) => li.getAttribute('data-choice')))
        const pick = prefer.find((id) => ids.includes(id)) ?? ids[0]
        await page.evaluate((id) => { const li = document.querySelector(`[data-life="choice"][data-choice="${id}"]`); const b = li && li.querySelector('button'); if (b) b.click() }, pick)
        console.log(`   chose: ${pick}`)
        await page.waitForTimeout(500)
        continue
      }
      if (r.dialogue) { await page.evaluate(() => window.__life.advance()); await page.waitForTimeout(350); continue }
      // the archive film opened at the goal step: this sandbox has no YouTube — wait for its fallback, or skip it
      if ((await page.locator('[data-life="cutscene"]').count()) > 0) {
        console.log('   cutscene open')
        await page.waitForTimeout(4000)
        // the fallback's "המשך" button, or the skip: whichever the frame offers
        const button = page.locator('[data-life="cutscene"] button').first()
        if ((await button.count()) > 0) { const label = (await button.textContent().catch(() => ''))?.trim(); await button.click().catch(() => {}); console.log('   cutscene: pressed', label) }
        await page.waitForTimeout(800)
        continue
      }
      if (r.ending || r.finale) break
      if (started && (!r.where?.match || r.where.match.over)) { await page.waitForTimeout(1200); break }
      await page.waitForTimeout(600)
    }
    if (!started) fault('no match ran')
    console.log(`   match ${Math.round((Date.now() - t0) / 1000)}s, boards: ${boards.length}`)
    await shot(`${CHAPTER}-whistle`)
  }
  await settle()
  const r = await read()
  console.log(`${op} ${arg ?? ''} → ${r.where?.scene ?? '?'} ${r.clock ?? ''} | ${r.dialogue ? 'D:' + r.dialogue : ''} ${r.choices.length ? 'C:' + r.choices.join('|') : ''} ${r.toast ? 'T:' + r.toast : ''} ${r.ending ? 'ENDING' : ''} ${r.finale ? 'FINALE' : ''} ${r.coda ? 'CODA' : ''} ${r.card ? 'CARD:' + r.card : ''}`)
}
// the ending → finale → next chapter / coda
if (script.noEnding) {
  console.log('stopped before the ending (minigame)')
} else {
  const r1 = await read()
  if (!r1.ending) fault('no ending card at the end of the day')
  await page.locator('[data-life="ending"] button').last().click().catch(() => {})
  await page.waitForTimeout(1200)
  if (script.dayEnd) {
    // a Stage A day cuts straight to the next day's card
    await page.waitForTimeout(3000)
    await shot('next')
    const r3 = await read()
    if (r3.finale) fault('a day showed a finale')
    console.log('after the day →', r3.where?.scene, r3.card, r3.where?.chapter)
  } else {
    await shot('finale')
    const r2 = await read()
    if (!r2.finale) fault('no finale after the ending')
    await page.evaluate(() => window.__life.dismissFinale())
    await page.waitForTimeout(3600)
    await shot('next')
    const r3 = await read()
    console.log('after finale →', r3.where?.scene, r3.card, r3.coda ? 'CODA' : '')
    // the next chapter's first room must hand the deck back (5.9.2026: it did not, from 1993 on)
    if (!r3.coda && r3.where?.scene) {
      await page.waitForTimeout(2500)
      await clear()
      const deck = (await page.locator('.life-glass[data-controls="1"]').count()) > 0
      const covered = await open()
      if (!deck && !covered) fault('the joystick is gone in the next chapter\'s first room')
      else console.log(`controls in the next room: ${deck ? 'shown' : 'covered by a card/dialogue'}`)
    }
  }
}
await browser.close()
console.log(faults === 0 ? 'OK — no faults' : `${faults} faults`)
