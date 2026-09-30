/**
 * מסך אחרי מסך — every room THE WORKER LIFE can draw, on every glass it is played on.
 *
 * The playthrough (`playthrough.mjs`) proves a chapter can be PLAYED. This proves every
 * painting can be LOOKED AT: it enumerates each (room × painting) pair the scene registry
 * can produce across the chapters, seeds a save into that room the way the tour does,
 * reloads, and photographs it on nine viewports — seven phones, a tablet, a laptop, and
 * two of the phones turned sideways. For a sample of rooms it also opens the thumb deck,
 * a conversation and a sheet, because the HUD is what the owner sees over every painting.
 *
 * It measures what a screenshot alone cannot: the framing is read through
 * `__life.debug.view()` (camera, painting, child, doors, in canvas pixels), so "there is an
 * ink bar under the painting", "the boy's feet are under the deck", "the door is behind the
 * A button" are numbers and not opinions. The DOM is asked about overflow, the canvas about
 * its buffer versus the viewport × DPR, the network about 404s, and the PNG about rows of
 * ink at its edges.
 *
 *   npm run life:screens -- http://127.0.0.1:3104
 *
 *   SCREENS_TAG=before        → writes under .probe/before/ (default: run)
 *   SCREENS_SIZES=phone,small → a subset of the viewports (names below, or 390x844)
 *   SCREENS_ROOMS=bedroom@1986,street@1990,kiosk → a subset of the stops
 *   SCREENS_STATES=hud,deck,dialogue,sheet,nodeck → which states to photograph
 *   SCREENS_SAMPLE=1          → the sample rooms only (the ones that also get states)
 *   SCREENS_DPR=3             → device pixel ratio for the phones (default 3; tablet 2, laptop 2)
 *
 * Run with `tsx`, because the room list comes from `lib/life/world/scenes.ts` itself: a
 * list typed by hand would drift the day a room is added (rule 45).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { chromium } from 'playwright'
import { PNG } from 'pngjs'

import { ERA_KEYS, eraFor } from '../../lib/life/content/era'
import { CUTSCENES } from '../../lib/life/cutscenes'
import { ALL_SCENES, arrivalFor, artFor } from '../../lib/life/world/scenes'

const BASE = process.argv[2] ?? process.env.SCREENS_BASE ?? 'http://127.0.0.1:3104'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const TAG = process.env.SCREENS_TAG ?? 'run'
const OUT = join('.probe', TAG)
const PHONE_DPR = Number(process.env.SCREENS_DPR ?? 3)

/** the glasses. `touch` decides the deck the shell draws; `dpr` the buffer the canvas must fill */
const SIZES = [
  { name: 'small', width: 360, height: 640, touch: true, dpr: PHONE_DPR },
  { name: 'se', width: 375, height: 667, touch: true, dpr: 2 },
  { name: 'phone', width: 390, height: 844, touch: true, dpr: PHONE_DPR },
  { name: 'pixel', width: 412, height: 915, touch: true, dpr: PHONE_DPR },
  { name: 'max', width: 430, height: 932, touch: true, dpr: PHONE_DPR },
  { name: 'tablet', width: 768, height: 1024, touch: true, dpr: 2 },
  { name: 'laptop', width: 1280, height: 800, touch: false, dpr: 2 },
  { name: 'land', width: 844, height: 390, touch: true, dpr: PHONE_DPR },
  { name: 'landmax', width: 932, height: 430, touch: true, dpr: PHONE_DPR },
]

/**
 * The rooms that also get the deck, a conversation and a sheet: one of each shape of
 * painting (a 16:9 delivery, a 2.56:1 street, a 1536-high board cut, a 941-high 2000s
 * frame), one repaint, one terrace, one hall — enough to see the HUD against every kind
 * of picture without photographing fifty rooms four times each.
 */
const SAMPLE = new Set([
  'bedroom@1986', 'street@1986', 'kitchen@1986', 'pitch@1990', 'bloomfield-inside@1986',
  'bloomfield-outside@2018-return', 'home@2013-household', 'ussishkin-hall@1991', 'kiosk@1995-sinai', 'allenby@2000-title',
])

/**
 * When a painting was painted, by its name — so a 1986 chapter standing in `bedroom90`
 * is a mapping bug, and a 2010 chapter standing in the 1986 kiosk is a KNOWN stretch
 * (there is no other kiosk) that gets listed, not failed. Ranges are inclusive years.
 */
const ART_ERA = {
  living: [1980, 1999], bedroom: [1980, 1989], kitchen: [1980, 1999], kiosk: [1980, 1999], street: [1980, 1989],
  pitch: [1986, 1999], alley: [1980, 1989], approach: [1980, 2015], gate7: [1980, 2015], corridor: [1980, 2026],
  stand: [1980, 2015], ussExt: [1980, 2026], ussMain: [1980, 2026], ussEnd: [1980, 2026], ussHallNight: [1990, 1999],
  bedroom90: [1990, 1999], street90: [1990, 2026], street90Flags: [1998, 2000], classroom: [1986, 1999], classroom98: [1998, 1998],
  schoolyard: [1986, 1999], gate5: [1980, 1999], bloomOldGates: [2000, 2015], bloomOldTerrace: [2000, 2015], bloomNewPlaza: [2018, 2026],
  bloomNewTerrace: [2018, 2026], bloom80Goal: [1980, 1989], bloom90Side: [1990, 1999], bloom90Corner: [1990, 1999], kioskNight: [1990, 1999],
  allenby: [1980, 1989], allenby90: [1990, 1999], allenby2000: [2000, 2026], bedroom00: [2000, 2026], homeAdult: [2010, 2026],
  pitchSmall: [2000, 2026], ticketOffice: [1980, 2026], busStation: [1980, 1999], ramatGan: [1980, 2026], hatikva: [1980, 2026],
  hallNew: [2015, 2026], driveIn: [1980, 2026], rehearsal: [2000, 2026], deskNewsroom: [2000, 2026], officeOwner: [2000, 2026],
  communityRoom: [2000, 2026], storeroom: [2000, 2026], workshopFix: [2000, 2026], portEurope: [2000, 2026], arenaEuroOut: [2000, 2026],
  arenaEuroSeats: [2000, 2026], flatAway: [2000, 2026],
}

/** hue band of `lib/isYellow.ts`, as the playthrough scans it */
const HUE_MIN = 38
const HUE_MAX = 70
const SAT_MIN = 0.35
const VAL_MIN = 0.35

// ------------------------------------------------------------------ the stops ----

const ONLY_SIZES = process.env.SCREENS_SIZES?.split(',').filter(Boolean) ?? null
const ONLY_ROOMS = process.env.SCREENS_ROOMS?.split(',').filter(Boolean) ?? null
const STATES = new Set((process.env.SCREENS_STATES ?? 'hud,deck,dialogue,sheet,nodeck').split(',').filter(Boolean))
const SAMPLE_ONLY = process.env.SCREENS_SAMPLE === '1'

function sizeOf(spec) {
  const named = SIZES.find((s) => s.name === spec)
  if (named) return named
  const m = /^(\d+)x(\d+)$/.exec(spec)
  if (!m) return null
  const width = Number(m[1])
  const height = Number(m[2])
  return { name: spec, width, height, touch: width < 1000, dpr: width < 1000 ? PHONE_DPR : 2 }
}

const sizes = ONLY_SIZES ? ONLY_SIZES.map(sizeOf).filter(Boolean) : SIZES

/** every (room × painting) the registry can produce, with the FIRST chapter that produces it */
function enumerateStops() {
  const seen = new Map()
  for (const scene of ALL_SCENES) {
    for (const chapter of ERA_KEYS) {
      const art = artFor(scene, chapter)
      const key = `${scene.id}|${art}`
      if (!seen.has(key)) seen.set(key, { scene, chapter, art, chapters: [] })
      seen.get(key).chapters.push(chapter)
    }
  }
  const stops = []
  for (const { scene, art, chapters } of seen.values()) {
    // prefer a chapter the sample names, then one inside the painting's own years, then the first
    const era = ART_ERA[art]
    const chapter =
      chapters.find((c) => SAMPLE.has(`${scene.id}@${c}`)) ??
      (era ? chapters.find((c) => eraFor(c).year >= era[0] && eraFor(c).year <= era[1]) : undefined) ??
      chapters[0]
    const id = `${scene.id}@${chapter}`
    stops.push({ id, scene: scene.id, chapter, art, year: eraFor(chapter).year, chapters, sample: SAMPLE.has(id) })
  }
  return stops
}

let stops = enumerateStops()
if (ONLY_ROOMS) stops = stops.filter((s) => ONLY_ROOMS.includes(s.id) || ONLY_ROOMS.includes(s.scene))
if (SAMPLE_ONLY) stops = stops.filter((s) => s.sample)

/** the save that lands in this room, in this chapter, with every card already seen */
function saveFor(stop) {
  const scene = ALL_SCENES.find((s) => s.id === stop.scene)
  const flags = ['life:opening', 'prologue:done', 'onboard:moved', 'onboard:acted', 'onboard:street', `own:shopnews:${stop.chapter}`,
    'kobi:left', 'entry:granted', 'saw:reveal', 'saw:tunnelWalk', 'uss:arrived']
  const arrival = arrivalFor(scene, stop.chapter)
  if (arrival) flags.push(arrival.flag)
  for (const cut of Object.values(CUTSCENES)) flags.push(cut.completionFlag)
  const events = [
    { t: 'flag.raised', flag: 'prologue:done' },
    { t: 'year.entered', year: stop.year, weekday: 6, minute: 11 * 60 + 20 },
    { t: 'chapter.entered', chapter: stop.chapter },
    ...flags.map((flag) => ({ t: 'flag.raised', flag })),
    { t: 'moved', to: stop.scene },
  ]
  return { version: 4, identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 }, year: stop.year, events, savedAt: new Date().toISOString() }
}

// ------------------------------------------------------------------ pixels ----

function scanPng(buffer) {
  const png = PNG.sync.read(buffer)
  const { width, height, data } = png
  let yellow = 0
  const inkRow = new Array(height).fill(0)
  const inkCol = new Array(width).fill(0)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      if (max < 22) {
        inkRow[y] += 1
        inkCol[x] += 1
      }
      const delta = max - min
      if (delta === 0 || delta / max < SAT_MIN || max / 255 < VAL_MIN) continue
      let hue
      if (max === r) hue = 60 * (((g - b) / delta + 6) % 6)
      else if (max === g) hue = 60 * ((b - r) / delta + 2)
      else hue = 60 * ((r - g) / delta + 4)
      if (hue >= HUE_MIN && hue <= HUE_MAX) yellow += 1
    }
  }
  // contiguous rows/columns from each edge that are (almost) all ink
  const run = (arr, total, from, step) => {
    let n = 0
    for (let i = from; i >= 0 && i < arr.length; i += step) {
      if (arr[i] / total < 0.985) break
      n += 1
    }
    return n
  }
  return {
    width,
    height,
    yellow,
    bars: {
      top: run(inkRow, width, 0, 1),
      bottom: run(inkRow, width, height - 1, -1),
      start: run(inkCol, height, width - 1, -1), // RTL: the reading edge
      end: run(inkCol, height, 0, 1),
    },
  }
}

/** a contact sheet: thumbnails in a grid, box-filtered, labelled by their file name in the report */
function contactSheet(files, outPath, thumbW = 220, columns = 6) {
  const cells = []
  for (const file of files) {
    if (!existsSync(file)) continue
    const png = PNG.sync.read(readFileSync(file))
    const scale = thumbW / png.width
    const tw = Math.round(png.width * scale)
    const th = Math.round(png.height * scale)
    const thumb = new PNG({ width: tw, height: th })
    const f = 1 / scale
    for (let y = 0; y < th; y += 1) {
      for (let x = 0; x < tw; x += 1) {
        const x0 = Math.floor(x * f)
        const y0 = Math.floor(y * f)
        const x1 = Math.min(png.width, Math.ceil((x + 1) * f))
        const y1 = Math.min(png.height, Math.ceil((y + 1) * f))
        let r = 0
        let g = 0
        let b = 0
        let n = 0
        for (let yy = y0; yy < y1; yy += 1) {
          for (let xx = x0; xx < x1; xx += 1) {
            const i = (yy * png.width + xx) * 4
            r += png.data[i]
            g += png.data[i + 1]
            b += png.data[i + 2]
            n += 1
          }
        }
        const o = (y * tw + x) * 4
        thumb.data[o] = r / n
        thumb.data[o + 1] = g / n
        thumb.data[o + 2] = b / n
        thumb.data[o + 3] = 255
      }
    }
    cells.push(thumb)
  }
  if (cells.length === 0) return
  const cellH = Math.max(...cells.map((c) => c.height)) + 8
  const cellW = thumbW + 8
  const rows = Math.ceil(cells.length / columns)
  const sheet = new PNG({ width: cellW * Math.min(columns, cells.length), height: cellH * rows })
  sheet.data.fill(40)
  cells.forEach((cell, index) => {
    const cx = (index % columns) * cellW + 4
    const cy = Math.floor(index / columns) * cellH + 4
    for (let y = 0; y < cell.height; y += 1) {
      for (let x = 0; x < cell.width; x += 1) {
        const s = (y * cell.width + x) * 4
        const d = ((cy + y) * sheet.width + (cx + x)) * 4
        sheet.data[d] = cell.data[s]
        sheet.data[d + 1] = cell.data[s + 1]
        sheet.data[d + 2] = cell.data[s + 2]
        sheet.data[d + 3] = 255
      }
    }
  })
  writeFileSync(outPath, PNG.sync.write(sheet))
}

// ------------------------------------------------------------------ the run ----

mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--disable-lcd-text', '--disable-font-subpixel-positioning', '--font-render-hinting=none'],
})

const report = { base: BASE, tag: TAG, at: new Date().toISOString(), stops: stops.map((s) => s.id), shots: [], faults: [] }
const fault = (kind, where, detail) => report.faults.push({ kind, where, detail })

/** the DOM's own account of the glass: overflow, the canvas buffer, the floating pieces */
const measure = (page) =>
  page.evaluate(() => {
    const doc = document.documentElement
    const canvas = document.querySelector('canvas')
    const rect = canvas ? canvas.getBoundingClientRect() : null
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }
    const boxes = (sel) =>
      [...document.querySelectorAll(sel)].map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height }
      })
    const imgs = [...document.querySelectorAll('img')]
      .filter((img) => img.complete && img.naturalWidth > 0)
      .map((img) => {
        const r = img.getBoundingClientRect()
        return {
          src: img.getAttribute('src'),
          natural: [img.naturalWidth, img.naturalHeight],
          rendered: [Math.round(r.width), Math.round(r.height)],
          upscale: r.width > 0 ? Number(((r.width * devicePixelRatio) / img.naturalWidth).toFixed(2)) : 0,
        }
      })
    const life = window.__life
    let view = null
    let where = null
    try {
      view = life?.debug?.view?.() ?? null
      where = life?.debug?.where?.() ?? null
    } catch (e) {
      view = { error: String(e) }
    }
    const scroller = document.querySelector('[role="dialog"] .overflow-y-auto')
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: devicePixelRatio },
      overflow: { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, scrollHeight: doc.scrollHeight, clientHeight: doc.clientHeight },
      canvas: canvas ? { buffer: [canvas.width, canvas.height], css: [rect.width, rect.height], top: rect.top } : null,
      hud: box('[data-life="hud-plate"]'),
      chips: boxes('[data-life="menu-open"],[data-life="me-open"],[data-life="profile-open"],[data-life="map-open"],[data-life="help-open"]'),
      heart: box('[data-life="love-open"]'),
      objective: box('[data-life="objective-cloth"]'),
      deck: box('[data-life="deck"]'),
      tap: box('[data-life="prompt"]'),
      dialogue: box('[data-life="dialogue"]'),
      sheet: box('[role="dialog"]'),
      sheetScroll: scroller ? { scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight } : null,
      imgs: imgs.filter((i) => i.upscale > 2.5),
      place: document.querySelector('[data-life="place"]')?.textContent?.trim() ?? null,
      view,
      where,
    }
  })

for (const size of sizes) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: size.dpr,
    hasTouch: size.touch,
    isMobile: size.touch && size.width < 1000,
  })
  const page = await context.newPage()
  await page.route('**://{pagead2.googlesyndication.com,www.googletagmanager.com,www.google.com,accounts.google.com}/**', (r) => r.abort())
  const origin = new URL(BASE).origin
  const errors = []
  const missing = new Set()
  page.on('response', (response) => {
    const url = response.url()
    if (url.startsWith(origin) && response.status() >= 400 && !url.includes('/_next/')) missing.add(`${response.status()} ${url.slice(origin.length)}`)
  })
  page.on('pageerror', (error) => errors.push(String(error)))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    const text = message.text()
    if (text.startsWith('Failed to load resource') || text.startsWith('Failed to fetch RSC payload')) return
    errors.push(text)
  })

  const shotsHere = []
  const shoot = async (stop, state) => {
    const name = `${size.name}--${stop.id}--${state}.png`
    const file = join(OUT, name)
    const buffer = await page.screenshot()
    writeFileSync(file, buffer)
    const scan = scanPng(buffer)
    const dom = await measure(page)
    shotsHere.push(file)
    const entry = { size: size.name, stop: stop.id, art: stop.art, state, file, scan: { yellow: scan.yellow, bars: scan.bars }, dom, missing: [...missing], errors: [...errors] }
    report.shots.push(entry)
    judge(entry, size, stop)
    return entry
  }

  for (const stop of stops) {
    missing.clear()
    errors.length = 0
    // park on a page with no game on it, then write the save (see the tour in playthrough.mjs)
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(
      ([save, deck]) => {
        window.localStorage.setItem('the-worker:life', JSON.stringify(save))
        window.localStorage.setItem('the-worker:life:probe', '1')
        window.localStorage.setItem('the-worker:life:deck', deck)
        window.sessionStorage.setItem('the-worker:life:opening', '1')
      },
      [saveFor(stop), 'on'],
    )
    await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded' })
    try {
      await page.waitForSelector('canvas', { timeout: 30000 })
    } catch {
      fault('no-canvas', `${size.name}/${stop.id}`, 'the game never mounted')
      continue
    }
    const skip = page.locator('[data-life="opening-skip"]')
    if ((await skip.count()) > 0) await skip.first().click({ timeout: 2000 }).catch(() => {})
    // opening cards close on a tap, title cards close by themselves
    for (let round = 0; round < 4; round += 1) {
      let closed = false
      for (const selector of ['[data-life="shirt-card"]', '[data-life="album-card"]', '[data-life="ticket-card"]']) {
        const card = page.locator(selector)
        if ((await card.count()) > 0 && (await card.first().isVisible())) {
          await card.first().click({ timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(400)
          closed = true
        }
      }
      if (!closed) break
    }
    // arrive: the world scene running in the room asked for
    let landed = null
    for (let i = 0; i < 40; i += 1) {
      landed = await page.evaluate(() => {
        try {
          return window.__life?.debug?.where?.()?.scene ?? null
        } catch {
          return null
        }
      })
      if (landed === stop.scene) break
      await page.waitForTimeout(400)
    }
    if (landed !== stop.scene) {
      fault('lost', `${size.name}/${stop.id}`, `wanted ${stop.scene}, the game says ${landed ?? '—'}`)
    }
    // let the arrival zoom settle and any place card go
    await page.waitForTimeout(1800)
    for (let i = 0; i < 20; i += 1) {
      const busy = await page.evaluate(() => Boolean(document.querySelector('[data-life="chapter-card"],[data-life="title-card"],[data-life="place-card"]')))
      if (!busy) break
      await page.waitForTimeout(400)
    }

    // a place revealed on the map opens a card over the room — put it down
    for (let i = 0; i < 3; i += 1) {
      const reveal = page.locator('[data-life="reveal-close"]')
      if ((await reveal.count()) === 0) break
      await reveal.first().click({ timeout: 2000 }).catch(() => {})
      await page.waitForTimeout(700)
    }

    if (STATES.has('hud')) await shoot(stop, 'hud')

    if (!stop.sample) continue

    if (STATES.has('nodeck') && size.touch) {
      // the picture as the controller — the deck off through ☰, the TapChip at the foot of the glass
      const toggle = async () => {
        const menu = page.locator('[data-life="menu-open"]')
        if ((await menu.count()) === 0) return false
        await menu.first().click({ timeout: 2000 }).catch(() => {})
        await page.waitForSelector('[data-life="menu-deck"]', { timeout: 4000 }).catch(() => {})
        const row = page.locator('[data-life="menu-deck"]')
        if ((await row.count()) === 0) return false
        await row.first().click({ timeout: 2000 }).catch(() => {})
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
        await page.waitForTimeout(600)
        return true
      }
      if (await toggle()) {
        await shoot(stop, 'nodeck')
        await toggle()
      }
    }

    if (STATES.has('dialogue')) {
      const talk = await page.evaluate(() => {
        try {
          const targets = window.__life?.debug?.targets?.() ?? []
          const person = targets.find((t) => t.kind === 'talk')
          if (!person) return null
          window.__life.talk(person.id)
          return person.id
        } catch (e) {
          return `error: ${e}`
        }
      })
      if (talk && !String(talk).startsWith('error')) {
        // a first meeting opens the cast card over the room — page through it to the words
        for (let i = 0; i < 8; i += 1) {
          const card = page.locator('[data-life="cast-card"]')
          if ((await card.count()) === 0) break
          await card.first().click({ timeout: 2000 }).catch(() => {})
          await page.waitForTimeout(350)
        }
        await page.waitForSelector('[data-life="dialogue"]', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(900)
        await shoot(stop, 'dialogue')
        await page.evaluate(() => window.__life?.leave?.())
        await page.waitForTimeout(500)
      } else {
        report.shots.push({ size: size.name, stop: stop.id, state: 'dialogue', skipped: talk ?? 'nobody to talk to' })
      }
    }

    if (STATES.has('sheet')) {
      const help = page.locator('[data-life="help-open"]')
      if ((await help.count()) > 0) {
        await help.first().click({ timeout: 2000 }).catch(() => {})
        await page.waitForSelector('[data-life="help"]', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(700)
        await shoot(stop, 'sheet')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      }
      const menu = page.locator('[data-life="menu-open"]')
      if ((await menu.count()) > 0) {
        await menu.first().click({ timeout: 2000 }).catch(() => {})
        await page.waitForSelector('[data-life="menu"]', { timeout: 6000 }).catch(() => {})
        await page.waitForTimeout(700)
        await shoot(stop, 'menu')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
      }
    }
  }

  contactSheet(shotsHere, join(OUT, `sheet--${size.name}.png`), size.width > 700 ? 300 : 200, size.width > 700 ? 4 : 6)
  await context.close()
}

await browser.close()

// ------------------------------------------------------------------ judging ----

/**
 * What counts as a fault, and the number behind it. Every threshold is written next to
 * the rule it enforces so the next person can argue with the number and not the code.
 */
function judge(entry, size, stop) {
  const at = `${size.name}/${stop.id}/${entry.state}`
  const dom = entry.dom
  const cssPerCanvas = dom.canvas ? dom.canvas.css[0] / dom.canvas.buffer[0] : 1
  // ink rows/cols at the edge of the PNG (in device px); a HUD plate breaks a row, so > 3% of the height is a bar
  const H = entry.scan.bars
  const px = size.dpr
  if (H.top > size.height * px * 0.03) fault('bar-top', at, `${Math.round(H.top / px)}px of ink across the top`)
  if (H.bottom > size.height * px * 0.03) fault('bar-bottom', at, `${Math.round(H.bottom / px)}px of ink across the bottom`)
  if (H.start > size.width * px * 0.02) fault('bar-side', at, `${Math.round(H.start / px)}px of ink down the start edge`)
  if (H.end > size.width * px * 0.02) fault('bar-side', at, `${Math.round(H.end / px)}px of ink down the end edge`)
  if (entry.scan.yellow / (entry.scan.width * entry.scan.height) > 0.001) fault('yellow', at, `${entry.scan.yellow}px in the band`)
  if (dom.overflow.scrollWidth > dom.overflow.clientWidth + 1) fault('overflow-x', at, `scrollWidth ${dom.overflow.scrollWidth} > clientWidth ${dom.overflow.clientWidth}`)
  if (dom.canvas) {
    const want = [Math.round(size.width * size.dpr), Math.round(size.height * size.dpr)]
    const got = dom.canvas.buffer
    if (Math.abs(got[0] - want[0]) > 2 || Math.abs(got[1] - want[1]) > 2) fault('canvas-dpr', at, `buffer ${got.join('×')}, viewport×dpr ${want.join('×')}`)
    if (Math.abs(dom.canvas.css[0] - size.width) > 1 || Math.abs(dom.canvas.css[1] - size.height) > 1) fault('canvas-css', at, `canvas ${dom.canvas.css.join('×')} css, viewport ${size.width}×${size.height}`)
  }
  for (const img of dom.imgs) fault('blurry-img', at, `${img.src} ${img.natural.join('×')} drawn ${img.rendered.join('×')} = ${img.upscale}×`)
  for (const m of entry.missing) fault('missing', at, m)
  for (const e of entry.errors) fault('page-error', at, e)
  // era: the painting's own years against the chapter's year
  const era = ART_ERA[stop.art]
  if (era && (stop.year < era[0] || stop.year > era[1])) {
    if (entry.state === 'hud' && size.name === sizes[0].name) fault('era-stretch', stop.id, `${stop.art} (${era[0]}–${era[1]}) drawn for ${stop.year}; chapters ${stop.chapters.join(',')}`)
  }
  const view = dom.view
  if (!view || view.error) {
    if (entry.state === 'hud') fault('no-view', at, view?.error ?? 'the world scene did not answer')
    return
  }
  const k = cssPerCanvas
  const paintTop = view.painting.y * k
  const paintBottom = (view.painting.y + view.painting.h) * k
  const paintStart = view.painting.x * k
  const paintEnd = (view.painting.x + view.painting.w) * k
  const inkAbove = paintTop - view.strip.sky * k
  const inkBelow = size.height - (paintBottom + view.strip.ground * k)
  if (inkAbove > 4) fault('ink-above', at, `${Math.round(inkAbove)}px of ink above the sky strip`)
  if (inkBelow > 4) fault('ink-below', at, `${Math.round(inkBelow)}px of ink under the ground strip`)
  if (paintStart > 1) fault('ink-side', at, `${Math.round(paintStart)}px of ink before the painting`)
  if (paintEnd < size.width - 1) fault('ink-side', at, `${Math.round(size.width - paintEnd)}px of ink after the painting`)
  // the picture itself should fill most of the glass; strips are continuation, not picture
  const pictureShare = (Math.min(paintBottom, size.height) - Math.max(paintTop, 0)) / size.height
  if (pictureShare < 0.62) fault('picture-share', at, `the painting covers ${(pictureShare * 100).toFixed(0)}% of the glass height; the rest is strip`)
  // the child
  const p = view.player
  const feet = p.feet * k
  const head = p.y * k
  const px0 = p.x * k
  const px1 = (p.x + p.w) * k
  if (p.visible) {
    if (feet > size.height + 1) fault('child-clipped', at, `feet at ${Math.round(feet)}px, glass is ${size.height}px tall`)
    if (head < -1) fault('child-clipped', at, `head at ${Math.round(head)}px, above the glass`)
    if (px0 < -2 || px1 > size.width + 2) fault('child-clipped', at, `child spans ${Math.round(px0)}–${Math.round(px1)}px on a ${size.width}px glass`)
    const feetShare = feet / size.height
    if (entry.state === 'hud' && (feetShare < 0.4 || feetShare > 0.9)) fault('child-placement', at, `feet at ${(feetShare * 100).toFixed(0)}% of the glass (aim 55–80%)`)
    const tall = p.h * k / size.height
    if (entry.state === 'hud' && tall > 0.5) fault('child-huge', at, `the child is ${(tall * 100).toFixed(0)}% of the glass height`)
    if (entry.state === 'hud' && tall < 0.1) fault('child-tiny', at, `the child is ${(tall * 100).toFixed(0)}% of the glass height`)
  }
  // the floor line against the deck
  if (dom.deck && p.visible && feet > dom.deck.y + 12 && size.touch) fault('feet-under-deck', at, `feet at ${Math.round(feet)}px, deck starts at ${Math.round(dom.deck.y)}px`)
  // doors hidden by the deck / dialogue / chips
  const overlaps = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  const area = (a) => Math.max(0, a.w) * Math.max(0, a.h)
  const inter = (a, b) => {
    if (!overlaps(a, b)) return 0
    const x0 = Math.max(a.x, b.x)
    const y0 = Math.max(a.y, b.y)
    const x1 = Math.min(a.x + a.w, b.x + b.w)
    const y1 = Math.min(a.y + a.h, b.y + b.h)
    return (x1 - x0) * (y1 - y0)
  }
  for (const door of view.doors) {
    const d = { x: door.x * k, y: door.y * k, w: door.w * k, h: door.h * k }
    const onGlass = { x: Math.max(0, d.x), y: Math.max(0, d.y), w: Math.min(size.width, d.x + d.w) - Math.max(0, d.x), h: Math.min(size.height, d.y + d.h) - Math.max(0, d.y) }
    if (onGlass.w <= 0 || onGlass.h <= 0) continue
    if (dom.deck && entry.state === 'hud') {
      const covered = inter(onGlass, dom.deck) / area(onGlass)
      if (covered > 0.6) fault('door-under-deck', at, `${door.id}: ${(covered * 100).toFixed(0)}% under the deck`)
    }
  }
  // floating pieces against each other and the glass
  const inside = (b) => b && b.x >= -1 && b.y >= -1 && b.x + b.w <= size.width + 1 && b.y + b.h <= size.height + 1
  for (const [name, box] of [['hud', dom.hud], ['objective', dom.objective], ['deck', dom.deck], ['tap', dom.tap], ['dialogue', dom.dialogue], ['sheet', dom.sheet]]) {
    if (box && !inside(box)) fault('offglass', at, `${name} at ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}×${Math.round(box.h)}`)
  }
  for (const chip of dom.chips) {
    if (chip.h < 44 || chip.w < 32) fault('tap-size', at, `chip ${Math.round(chip.w)}×${Math.round(chip.h)}`)
    if (dom.objective && overlaps(chip, dom.objective)) fault('overlap', at, 'objective cloth over a chip')
  }
  if (dom.hud && dom.objective && overlaps(dom.hud, dom.objective)) fault('overlap', at, 'objective cloth over the clock plate')
  if (dom.dialogue && dom.deck && overlaps(dom.dialogue, dom.deck)) fault('overlap', at, 'dialogue over the deck')
  if (dom.sheetScroll && dom.sheetScroll.scrollHeight > dom.sheetScroll.clientHeight + 2 && size.height >= 800) fault('sheet-scroll', at, `sheet scrolls ${dom.sheetScroll.scrollHeight} in ${dom.sheetScroll.clientHeight}`)
}

// ------------------------------------------------------------------ output ----

const counts = {}
for (const f of report.faults) counts[f.kind] = (counts[f.kind] ?? 0) + 1
report.counts = counts
const suffix = ONLY_SIZES ? `--${ONLY_SIZES.join('+')}` : ''
writeFileSync(join(OUT, `report${suffix}.json`), JSON.stringify(report, null, 2))

const lines = []
lines.push(`# screens probe — ${TAG} — ${report.at}`)
lines.push(`stops: ${stops.length} · shots: ${report.shots.length} · faults: ${report.faults.length}`)
lines.push('')
for (const [kind, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) lines.push(`${String(n).padStart(4)}  ${kind}`)
lines.push('')
for (const f of report.faults) lines.push(`${f.kind.padEnd(16)} ${f.where.padEnd(44)} ${f.detail}`)
writeFileSync(join(OUT, `report${suffix}.md`), lines.join('\n'))
console.log(lines.slice(0, 40).join('\n'))
console.log(`\n${report.faults.length === 0 ? 'PASS' : 'FAULTS ' + report.faults.length} — ${OUT}/report${suffix}.md`)
