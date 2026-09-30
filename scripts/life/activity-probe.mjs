/**
 * הפעילויות, מנוגנות — does every activity open from its room, show the gate's board over a
 * paused room, and come back to the same room with somebody saying something? (21.9.2026)
 *
 *   node scripts/life/activity-probe.mjs [http://127.0.0.1:3000] [out-dir] [390x844,320x640]
 *
 * For each activity: a real save (the year, then the chapter, then the room — the order the
 * game writes them, rule 81), the entry conversation up to its choice, the choice, the
 * board, and then either a short honest play (the paper round, the kitchen pile) or walking
 * away with Escape — which is the one way out every board shares — and the room's reaction.
 * Three pictures per activity per width: `<id>-<w>-1-entry.png`, `-2-board.png`,
 * `-3-back.png`. It prints what it saw; the pictures are for looking at.
 */
import { mkdirSync, writeFileSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000'
const OUT = process.argv[3] ?? 'data/life-shots/activities'
const SIZES = (process.argv[4] ?? '390x844,320x640').split(',').map((size) => size.split('x').map(Number))
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null

const CARDS = ['[data-life="opening-skip"]', '[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]', '[data-life="reveal-close"]', '[data-life="cast-card"]']

const CARRIED = ['prologue:done', 'life:opening', 'life:knows:hall', 'onboard:moved', 'onboard:acted', 'onboard:street']

/** [activity, chapter, year, weekday, minute, room, conversation, choices, play] */
const STOPS = [
  ['kiosk-trivia', '1993-cup', 1993, 1, 15 * 60 + 30, 'kiosk', 'gig-toto-slip-1993-cup', ['do'], 'none'],
  ['cafe-shift', '1993-cup', 1993, 1, 15 * 60 + 30, 'allenby', 'gig-sweep-allenby-1993-cup', ['do'], 'leave'],
  ['shop-order', '1993-cup', 1993, 1, 15 * 60 + 30, 'allenby', 'fan-shop-1993-cup', ['order', 'do'], 'leave'],
  ['busstop-memory', '1993-cup', 1993, 1, 15 * 60 + 30, 'route', 'act-busstop-memory', ['sit'], 'leave'],
  ['pitch-rumble', '1993-cup', 1993, 1, 15 * 60 + 30, 'pitch', 'gig-rumble-pitch-1993-cup', ['do'], 'leave'],
  ['yard-lineup', '1993-cup', 1993, 1, 15 * 60 + 30, 'schoolyard', 'gig-lineup-yard-1993-cup', ['do'], 'leave'],
  ['shachor-lesson', '1993-cup', 1993, 1, 15 * 60 + 30, 'ussishkin-outside', 'act-shachor-lesson', ['sit'], 'leave'],
  ['ussishkin-help', '1993-cup', 1993, 1, 15 * 60 + 30, 'ussishkin-end', 'gig-chairs-end-1993-cup', ['do-right'], 'chore'],
  ['parliament', '1993-cup', 1993, 1, 15 * 60 + 30, 'bloomfield-outside', 'act-parliament', ['join'], 'leave'],
  ['ticket-poll', '1993-cup', 1993, 1, 15 * 60 + 30, 'ticket-office', 'act-ticket-poll', ['answer'], 'leave'],
  ['bottles', '1993-cup', 1993, 1, 17 * 60 + 30, 'bloomfield-outside', 'gig-bottles-ground-1993-cup', ['do'], 'chore'],
  ['papers', '1993-cup', 1993, 1, 15 * 60 + 30, 'street', 'gig-papers-round-1993-cup', ['do'], 'papers'],
  ['neighbour', '1993-cup', 1993, 1, 15 * 60 + 30, 'street', 'act-neighbour', ['help'], 'chore'],
  ['bedroom-bag', '1993-cup', 1993, 1, 15 * 60 + 30, 'bedroom', 'act-bedroom-bag', ['open'], 'none'],
  ['lounge-xi', '1993-cup', 1993, 1, 15 * 60 + 30, 'home', 'act-lounge-xi', ['build'], 'leave'],
  ['kitchen-archive', '1993-cup', 1993, 1, 15 * 60 + 30, 'kitchen', 'act-kitchen-archive', ['dig'], 'archive'],
]

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: EXECUTABLE })
const report = []

for (const [w, h] of SIZES) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 })
  const page = await context.newPage()
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())

  for (const [id, chapter, year, weekday, minute, room, conversation, choices, play] of STOPS) {
    if (ONLY && !ONLY.includes(id)) continue
    const errors = []
    const onError = (error) => errors.push(String(error).slice(0, 160))
    page.on('pageerror', onError)
    const shot = async (step) => writeFileSync(`${OUT}/${id}-${w}-${step}.png`, await page.screenshot())
    /** the cards a room can put up by itself (a first sight on the map, a new shirt) — not the activity's */
    const dismiss = async () => {
      for (let round = 0; round < 5; round += 1) {
        let any = false
        for (const selector of CARDS) {
          const card = page.locator(selector)
          if ((await card.count()) > 0) {
            any = true
            await card.first().click({ timeout: 2000 }).catch(() => {})
            await page.waitForTimeout(300)
          }
        }
        if (!any) return
      }
    }

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([ch, where, carried, y, wd, min]) => {
        const events = carried.map((flag) => ({ t: 'flag.raised', flag }))
        events.push({ t: 'year.entered', year: y, weekday: wd, minute: min })
        events.push({ t: 'chapter.entered', chapter: ch })
        events.push({ t: 'moved', to: where })
        window.localStorage.setItem(
          'the-worker:life',
          JSON.stringify({ version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: y, events, savedAt: new Date().toISOString() }),
        )
        window.localStorage.setItem('the-worker:life:probe', '1')
      },
      [chapter, room, CARRIED, year, weekday, minute],
    )
    await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('canvas', { timeout: 60000 }).catch(() => {})
    for (let i = 0; i < 60; i += 1) {
      const where = await page.evaluate(() => window.__life?.debug?.where?.() ?? null).catch(() => null)
      if (where) break
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(1500)
    // whatever the room opened with on its own is not what this probe is about: the opening,
    // the new shirt on the rail, the album, the season ticket, a line somebody started
    for (let round = 0; round < 6; round += 1) {
      let any = false
      for (const selector of CARDS) {
        const card = page.locator(selector)
        if ((await card.count()) > 0) {
          any = true
          await card.first().click({ timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(400)
        }
      }
      await page.evaluate(() => window.__life?.leave()).catch(() => {})
      if (!any) break
      await page.waitForTimeout(400)
    }

    await page.evaluate((c) => window.__life?.talk(c), conversation)
    await page.waitForTimeout(700)
    let entered = false
    for (const [index, choice] of choices.entries()) {
      for (let i = 0; i < 8; i += 1) {
        await page.evaluate(() => window.__life?.advance())
        await page.waitForTimeout(250)
      }
      if (index === 0) {
        await dismiss()
        await shot('1-entry')
        entered = true
      }
      await page.evaluate((c) => window.__life?.choose(c), choice)
      await page.waitForTimeout(900)
    }

    // the board: the sheet over the paused room (or the chore scene, or the slip, or the bag)
    const sheet = page.locator('[data-life="mechanic"]')
    let board = false
    for (let i = 0; i < 60; i += 1) {
      const loading = await page.locator('[data-life="mechanic-loading"]').count()
      if ((await sheet.count()) > 0 && loading === 0) {
        board = true
        break
      }
      if (play === 'chore' || play === 'none') break
      await page.waitForTimeout(500)
    }
    await page.waitForTimeout(play === 'chore' ? 2500 : 1200)
    await shot('2-board')
    const empty = (await page.locator('[data-life="mechanic-empty"]').count()) > 0

    if (play === 'leave') {
      await page.keyboard.press('Escape')
    } else if (play === 'papers') {
      const stops = page.locator('[data-paper-stop]')
      while ((await stops.count()) > 0) {
        await stops.first().click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(150)
      }
      await page.locator('[data-life="papers-go"]').click({ timeout: 5000 }).catch(() => {})
    } else if (play === 'archive') {
      await page.locator('[data-life="archive"] li button').first().click({ timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(1500)
      await page.locator('[data-life="archive-back"]').click({ timeout: 5000 }).catch(() => {})
    } else if (play === 'chore' && w === SIZES[0][0]) {
      for (let i = 0; i < 16; i += 1) {
        await page.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight')
        await page.waitForTimeout(4200)
        await page.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight')
      }
    }
    // the room answers: the sheet is gone and a line is in the box
    let line = null
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(400)
      line = await page.evaluate(() => document.querySelector('[data-life="line"]')?.textContent?.trim() ?? null)
      if (line && (await sheet.count()) === 0) break
    }
    await dismiss()
    await shot('3-back')
    const agorot = await page.evaluate(() => window.__life?.snapshot().state.agorot ?? null).catch(() => null)
    const flags = await page.evaluate((a) => {
      const f = window.__life?.snapshot().state.flags ?? {}
      return { tier: f[`act:${a}:tier`] ?? null, done: Boolean(f[`act:${a}:done`]) }
    }, id).catch(() => ({}))
    report.push({ w, id, entered, board, empty, line: line?.slice(0, 60) ?? null, agorot, ...flags, errors: errors.slice(0, 2) })
    page.off('pageerror', onError)
  }
  await context.close()
}
await browser.close()
for (const row of report) console.log(JSON.stringify(row))
