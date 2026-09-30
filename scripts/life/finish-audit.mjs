/**
 * לסיים כל משימה — a robot that plays each chapter with its thumb and reports the ones it
 * cannot finish.
 *
 *   node scripts/life/finish-audit.mjs [base] [chapter…]
 *
 * The static audit (`deadend-audit.ts`) proves that nothing in the CONTENT points at a
 * ghost. It cannot prove that a chapter ENDS, because ending is a chain of state: a flag
 * raised by a conversation that only appears after an hour that only passes if somebody
 * leaves a room. That chain is what broke for Maor twice in one week — 11.3.1991 with the
 * mother who never came home, and again on 6.9.2026 in the first mission of a new life.
 *
 * So this plays. For each chapter it seeds a save at that chapter's opening, then loops:
 *   read what the room offers (`debug.targets()`), press one thing, walk the dialogue,
 *   move on when the room is exhausted, and let the clock run.
 * It stops when the chapter reports done — or when it has pressed everything reachable and
 * the day is over, which is the definition of a dead end, and prints the room, the minute,
 * the objective and the hint the game was giving at that moment.
 *
 * It is deliberately not clever: a chapter a stupid robot can finish is a chapter a person
 * cannot get stuck in.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const ONLY = process.argv.slice(3)
const CHAPTERS = ONLY.length ? ONLY : [
  'a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week', '1986',
  '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army',
  '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double',
]
/** every chapter before this one has to be "entered" for the save to be legal */
const ORDER = [
  'a2-alley', 'a3-hall', 'a4-shirt', 'a5-first', 'a6-radio', 'a7-week', '1986',
  '1990', '1991', '1993-cup', '1993-galil', '1995-sinai', '1996-army',
  '1997-basket', '1998-laces', '1999-basket', '1999-cup', '2000-title', '2000-double',
]

/** the room each chapter opens in — the robot stands there first so the opening beat fires */
const START_ROOM = {
  'a2-alley': 'home', 'a3-hall': 'street', 'a4-shirt': 'bedroom', 'a5-first': 'bedroom',
  'a6-radio': 'home', 'a7-week': 'street', '1986': 'bedroom', '1990': 'kitchen',
  '1991': 'classroom', '1993-cup': 'home', '1993-galil': 'ussishkin-hall',
  '1995-sinai': 'kiosk', '1996-army': 'street', '1997-basket': 'ussishkin-outside',
  '1998-laces': 'home', '1999-basket': 'ussishkin-hall', '1999-cup': 'street',
  '2000-title': 'street', '2000-double': 'street',
}

/** the year each chapter is played in — the save file will not load without one */
const YEAR_OF = {
  'a2-alley': 1984, 'a3-hall': 1984, 'a4-shirt': 1985, 'a5-first': 1985, 'a6-radio': 1986,
  'a7-week': 1986, '1986': 1986, '1990': 1990, '1991': 1991, '1993-cup': 1993,
  '1993-galil': 1993, '1995-sinai': 1995, '1996-army': 1996, '1997-basket': 1997,
  '1998-laces': 1998, '1999-basket': 1999, '1999-cup': 1999, '2000-title': 2000,
  '2000-double': 2000,
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})

const results = []
for (const chapter of CHAPTERS) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  // the page pulls fonts and analytics it does not need here; every one of them is a
  // second of wall clock on a probe that runs nineteen times
  await context.route('**/*', (route) => {
    const url = route.request().url()
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue()
    return route.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)))

  const entered = ORDER.slice(0, ORDER.indexOf(chapter) + 1)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ events, year }) => {
    localStorage.clear()
    localStorage.setItem('the-worker:life:probe', '1')
    localStorage.setItem('the-worker:life', JSON.stringify({
      version: 3,
      identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
      // `year` is not decoration: a save without a NUMBER here fails validation and is
      // dropped silently, and the probe then plays the prologue nineteen times and calls
      // every chapter a dead end. (Found the hard way, 6.9.2026.)
      year,
      events: [
        { t: 'flag.raised', flag: 'life:opening' },
        { t: 'flag.raised', flag: 'prologue:done' },
        ...events.map((c) => ({ t: 'chapter.entered', chapter: c })),
      ],
      savedAt: new Date().toISOString(),
    }))
  }, { events: entered, year: YEAR_OF[chapter] ?? 1986 })
  await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('canvas', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2200)

  /**
   * A seeded save enters a chapter without ever standing in the room the chapter opens in,
   * so the `enter` beat that raises the chapter's DAY flag (`life:a:d3`, `life:galil:d2`)
   * never fires — and every later beat, which reads that flag, reports itself as waiting
   * for something the robot cannot give it. That is a fact about the seeding, not about the
   * game, and it was making the audit accuse working chapters. So the robot walks to the
   * chapter's own starting room first, the way a player arrives.
   */
  await page.evaluate((room) => window.__life?.debug.goTo(room), START_ROOM[chapter] ?? 'home').catch(() => {})
  await page.waitForTimeout(1200)

  const look = () => page.evaluate(() => {
    const l = window.__life
    const snap = l?.snapshot?.()
    return {
      where: l?.debug?.where?.() ?? null,
      targets: l?.debug?.targets?.() ?? [],
      hint: l?.debug?.hint?.() ?? null,
      // what the chapter's own writing is still waiting for — the difference between
      // "there is no way to end this" and "the way is there and nobody can find it"
      pending: (l?.debug?.pending?.() ?? []).filter((b) => !b.fired && b.ends).slice(0, 4),
      done: Boolean(snap?.state?.chapterDone),
      // a chapter closed by the engine's backstop rather than by its own writing
      rescued: Object.keys(snap?.state?.flags ?? {}).some((flag) => flag.startsWith('life:lastResort:')),
      chapter: snap?.state?.chapter ?? null,
      minute: snap?.state?.minute ?? -1,
      objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null,
      dialogue: Boolean(document.querySelector('[data-life="dialogue"]')),
      ending: Boolean(document.querySelector('[data-life="ending"],[data-life="finale"]')),
      overlay: document.querySelector('[data-life="penalty-card"],[data-life="hoops-card"],[data-life="book"],[data-life="doc"],[data-life="pano"],[data-life="toto"],[data-life="shop"]') !== null,
    }
  })

  const pressed = new Set()
  let last = null
  let done = false
  let steps = 0
  let stuckOverlay = 0
  let lap = 0
  const visited = new Set()
  const deadline = Date.now() + 150_000
  for (; steps < 500 && !done && Date.now() < deadline; steps += 1) {
    const t0 = Date.now()
    const now = await look()
    if (process.env.TRACE) process.stdout.write(`    step ${steps} look=${Date.now() - t0}ms scene=${now.where?.scene} dlg=${now.dialogue} ov=${now.overlay} targets=${now.targets.length}\n`)
    if (now.done || now.ending) { done = true; last = now; break }
    last = now

    /*
     * "יש לך עוד קצת זמן" — the flow layer's offer (7.9.2026). A player who has nothing
     * left to do presses «להמשיך»; a robot that ignored it would keep reporting the exact
     * dead time the offer exists to end, so it presses it too. This is also the test: if
     * the card never appears in a chapter that RESCUEs, the flow layer did not see the
     * wait, and that is a bug in the flow layer rather than in the chapter.
     */
    // (delta 90) the offer is the free-time chip → planner → its world-action button
    const passed = await page.evaluate(() => {
      const go = document.querySelector('[data-life="free-time-go"]')
      if (go instanceof HTMLElement) { go.click(); return true }
      const chip = document.querySelector('[data-life="free-time-chip"]')
      if (chip instanceof HTMLElement) { chip.click(); return true }
      return false
    })
    if (passed) { await page.waitForTimeout(260); continue }

    /**
     * Any overlay: close it and carry on. Every card in this game closes on a press
     * SOMEWHERE — a close button, or the sheet itself — so the robot presses the close
     * button if there is one and the sheet if there is not. A card that survives both is a
     * trap, and is reported as one rather than looped on forever.
     */
    if (now.overlay) {
      const closed = await page.evaluate(() => {
        const sheet = document.querySelector('[data-life="penalty-card"],[data-life="hoops-card"],[data-life="book"],[data-life="doc"],[data-life="pano"],[data-life="toto"],[data-life="shop"]')
        if (!sheet) return true
        const button = sheet.querySelector('[data-life$="-close"]')
        const target = (button ?? sheet)
        if (target instanceof HTMLElement) { target.click(); return true }
        return false
      })
      if (!closed) stuckOverlay += 1
      else stuckOverlay = 0
      if (stuckOverlay > 4) { last = now; break }
      await page.waitForTimeout(220)
      continue
    }
    /**
     * A conversation on screen: walk it, always taking the first choice that is not
     * greyed out. This goes through the runtime rather than through a real click on
     * purpose — Playwright's click waits up to thirty seconds for a button to become
     * actionable, and three of those spend the whole budget for a chapter before the
     * robot has left the living room.
     */
    if (now.dialogue) {
      const choice = await page.evaluate((pick) => {
        const buttons = [...document.querySelectorAll('[data-life="choice"]:not([disabled])')]
        if (!buttons.length) return null
        return buttons[pick % buttons.length]?.getAttribute('data-choice') ?? null
      }, lap)
      // a choice can throw inside the runtime — that IS a finding, not a reason to stop
      try {
        if (choice) await page.evaluate((id) => window.__life?.choose(id), choice)
        else await page.evaluate(() => window.__life?.advance())
      } catch (error) {
        errors.push(`choose/advance: ${String(error).slice(0, 160)}`)
        await page.waitForTimeout(200)
      }
      await page.waitForTimeout(200)
      continue
    }

    const scene = now.where?.scene ?? '?'
    const fresh = now.targets.filter((t) => t.kind !== 'exit' && !pressed.has(`${scene}:${t.id}:${lap}`))
    if (fresh.length) {
      const target = fresh[0]
      pressed.add(`${scene}:${target.id}:${lap}`)
      try {
        await page.evaluate((id) => window.__life?.talk(id), target.id)
      } catch (error) {
        errors.push(`talk ${target.id}: ${String(error).slice(0, 140)}`)
      }
      await page.waitForTimeout(260)
      continue
    }

    /**
     * Nothing left in this room on this lap. Take a door — rotating, so a two-door room
     * does not become a corridor the robot paces forever — and when every room on the map
     * has been emptied, start a new LAP: forget what was pressed and go round again with a
     * different choice in every conversation.
     *
     * A person plays this way. They ask the shopkeeper again after they have the money;
     * they say the other thing to their mother. A chapter that only opens for the first
     * answer is a chapter that punishes curiosity, and a robot that only presses once
     * would never find out.
     */
    const doors = now.targets.filter((t) => t.kind === 'exit')
    if (doors.length) {
      visited.add(scene)
      const unseen = doors.filter((door) => !visited.has(door.id))
      const next = (unseen.length ? unseen : doors)[steps % (unseen.length || doors.length)]
      try {
        await page.evaluate((id) => window.__life?.debug.goTo(id), next.id)
      } catch (error) {
        errors.push(`goTo ${next.id}: ${String(error).slice(0, 140)}`)
      }
      await page.waitForTimeout(460)
      if (visited.size >= 4 && steps % 40 === 39) { lap += 1; pressed.clear(); visited.clear() }
      continue
    }
    // sealed room with nothing in it: let time pass, which some chapters need
    await page.evaluate(() => window.__life?.debug.jump(30))
    await page.waitForTimeout(500)
  }

  /**
   * The day has to be allowed to PASS. Several chapters are ended by their own clock —
   * "after eight in the evening, if you never went" — and a robot that presses buttons
   * fast enough never reaches eight in the evening. So once it has run out of things to
   * press, it lets eighteen hours go by, which is what a person does by playing.
   */
  if (!done) {
    for (let i = 0; i < 24 && !done; i += 1) {
      await page.evaluate(() => window.__life?.debug.jump(45))
      await page.waitForTimeout(420)
      const now = await look()
      if (process.env.TRACE) process.stdout.write(`    hour ${i} minute=${now.minute} dlg=${now.dialogue} done=${now.done} beat=${JSON.stringify(now.where?.beat)}\n`)
      if (now.done || now.ending) { done = true; last = now }
      else if (now.dialogue) {
        // a clock beat opened a conversation: walk it, it is probably the ending
        for (let k = 0; k < 12; k += 1) {
          const pick = await page.evaluate(() => document.querySelector('[data-life="choice"]:not([disabled])')?.getAttribute('data-choice') ?? null)
          if (pick) await page.evaluate((id) => window.__life?.choose(id), pick).catch(() => {})
          else await page.evaluate(() => window.__life?.advance()).catch(() => {})
          await page.waitForTimeout(200)
          const after = await look()
          if (after.done || after.ending) { done = true; last = after; break }
          if (!after.dialogue) break
        }
      } else last = now
    }
  }

  /**
   * 24.5.1986 is the one chapter that is not allowed to be missed (Stage A §14): failing
   * to get inside does not complete it, it GIVES THE MORNING BACK — the log is cut to the
   * start of the chapter and the day is played again. So a robot that never gets in loops
   * for ever, correctly, and `chapterDone` is never set. That is the design, not a dead
   * end, and the probe recognises it by the day having been handed back rather than by the
   * chapter having closed.
   */
  const restarted = chapter === '1986' && !done && (last?.minute ?? 0) < 14 * 60
  if (restarted) done = true

  results.push({ chapter, done, restarted, rescued: Boolean(last?.rescued), steps, at: last?.where?.scene ?? '?', minute: last?.minute ?? -1, objective: last?.objective, hint: last?.hint, errors: errors.slice(0, 2) })
  console.log(`${done ? (restarted ? 'REPLAY ' : last?.rescued ? 'RESCUE ' : 'PASS   ') : 'FAIL   '}${chapter.padEnd(13)} steps=${String(steps).padStart(3)}  at=${(last?.where?.scene ?? '?').padEnd(20)} ${done ? '' : `objective=«${last?.objective ?? '—'}» hint=«${last?.hint ?? '—'}»`}`)
  if ((!done || last?.rescued) && last?.pending?.length) {
    for (const beat of last.pending) {
      console.log(`      ממתין · ${beat.id}: ${beat.needs.join(' · ') || 'תנאי מתקיים — הביט פשוט לא רץ'}${beat.waitingHe ? `  («${beat.waitingHe}»)` : ''}`)
    }
  }
  if (errors.length) console.log(`      errors: ${errors.slice(0, 2).join(' | ')}`)
  await context.close()
}

await browser.close()
const failed = results.filter((r) => !r.done)
const rescued = results.filter((r) => r.done && r.rescued)
console.log(`\n${results.length - failed.length}/${results.length} chapters finish.`)
if (rescued.length) console.log(`נסגרו ע"י רשת הביטחון (יש להם חור כתוב): ${rescued.map((r) => r.chapter).join(', ')}`)
if (failed.length) console.log('לא נסגרו:', failed.map((r) => r.chapter).join(', '))
process.exit(failed.length ? 1 : 0)
