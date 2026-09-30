/**
 * הסרט מהארכיון — the 1986 vertical slice, played through every way a film can end (§23.5, §23.7).
 *
 * `cutscene-probe.mjs` proved one path (YouTube refused by the sandbox). This one lands on
 * the terrace of 24.5.1986 with the directed final unfinished and plays the goal step six
 * ways, each in a fresh browser context, at a phone glass and a desktop one:
 *
 *   blocked   — every youtube host refused (embed unavailable / offline)
 *   skip      — דלג pressed on the black card, before the film exists
 *   ended     — a stub iframe API that plays and then reports ENDED (the end callback)
 *   gate      — a stub API that is ready but never plays (autoplay blocked) → הפעל → ENDED
 *   escape    — Escape on the card
 *   reload    — the page reloaded while the film is on screen
 *
 * Each must converge on the same world: the cutscene gone, `cutscene:1986-championship`
 * raised, the match over, the objective `למצוא את אבא.`, Kobi a talk target on the
 * terrace, and his conversation reachable — i.e. the player can never be trapped behind
 * the iframe and always ends at the Stage A close.
 *
 *   node scripts/life/footage-probe.mjs [http://127.0.0.1:3200]   (WORKER_SIZES=phone,desktop)
 */
import { mkdirSync } from 'node:fs'

import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3200'
const EXECUTABLE = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const OUT = process.env.WORKER_SHOTS ?? 'data/life-shots/footage'
mkdirSync(OUT, { recursive: true })

const ALL_SIZES = {
  phone: { width: 390, height: 844, touch: true },
  desktop: { width: 1280, height: 800, touch: false },
}
const SIZES = (process.env.WORKER_SIZES ?? 'phone,desktop').split(',').filter((s) => ALL_SIZES[s])
const ONLY = process.env.WORKER_CASES?.split(',').filter(Boolean) ?? null
const CASES = ['blocked', 'skip', 'ended', 'gate', 'escape', 'reload'].filter((c) => !ONLY || ONLY.includes(c))

/** a fake iframe API: `mode` = 'plays' (PLAYING then ENDED) or 'stalls' (ready, never plays until playVideo) */
const fakeApi = (mode) => `
  window.YT = {
    PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
    Player: function (el, opts) {
      var ev = (opts && opts.events) || {}
      var self = this
      var ended = false
      function play() {
        setTimeout(function () { ev.onStateChange && ev.onStateChange({ data: 1 }) }, 200)
        setTimeout(function () { if (!ended) { ended = true; ev.onStateChange && ev.onStateChange({ data: 0 }) } }, 1600)
      }
      this.destroy = function () {}
      this.getCurrentTime = function () { return 0 }
      this.getDuration = function () { return 1 }
      this.playVideo = function () { if (${mode === 'plays' ? 'true' : 'self.__asked'}) play(); self.__asked = true }
      setTimeout(function () { ev.onReady && ev.onReady({ target: self }) }, 150)
    },
  };
  window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
`

function seed() {
  return {
    version: 4,
    identity: { name: 'פוגי', sex: 'boy', birthYear: 1978 },
    year: 1986,
    events: [
      { t: 'flag.raised', flag: 'life:opening' },
      { t: 'flag.raised', flag: 'prologue:done' },
      { t: 'year.entered', year: 1986, weekday: 6, minute: 15 * 60 + 56 },
      { t: 'chapter.entered', chapter: '1986' },
      { t: 'flag.raised', flag: 'onboard:street' },
      { t: 'flag.raised', flag: 'onboard:moved' },
      { t: 'flag.raised', flag: 'onboard:acted' },
      // the shop's "new shirt" card is announced on a chapter's first room; a save that
      // lands on the terrace has had its first room already
      { t: 'flag.raised', flag: 'own:shopnews:1986' },
      { t: 'moved', to: 'bloomfield-inside' },
      { t: 'flag.raised', flag: 'kobi:left' },
      { t: 'flag.raised', flag: 'entry:granted' },
      { t: 'flag.raised', flag: 'saw:reveal' },
    ],
    savedAt: new Date().toISOString(),
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=user-gesture-required'] })
const results = []
let faults = 0

for (const sizeName of SIZES) {
  const size = ALL_SIZES[sizeName]
  for (const kase of CASES) {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, hasTouch: size.touch, isMobile: size.touch })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    // The embed itself never loads in any case: the sandbox refuses it, and the cases that
    // need a "video" get a blank frame and a stub API instead.
    await ctx.route(/youtube(-nocookie)?\.com|ytimg|googlevideo/, async (route) => {
      const url = route.request().url()
      if (kase === 'blocked' || kase === 'skip' || kase === 'escape' || kase === 'reload') return route.abort()
      if (url.includes('/iframe_api')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fakeApi(kase === 'gate' ? 'stalls' : 'plays') })
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body style="background:#111"></body></html>' })
    })
    const line = { size: sizeName, kase, steps: [] }
    const log = (s) => line.steps.push(s)
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.evaluate((file) => {
        localStorage.setItem('the-worker:life', JSON.stringify(file))
        localStorage.setItem('the-worker:life:probe', '1')
        sessionStorage.setItem('the-worker:life:opening', '1')
      }, seed())
      await page.goto(`${BASE}/life`, { waitUntil: 'domcontentloaded', timeout: 180000 })
      await page.waitForSelector('canvas', { timeout: 90000 })
      const openingSkip = page.locator('[data-life="opening-skip"]')
      if (await openingSkip.count()) await openingSkip.click().catch(() => undefined)

      // the director runs the final; advance any line it opens until the film arrives
      const t0 = Date.now()
      let phase = null
      while (Date.now() - t0 < 150000) {
        phase = await page.evaluate(() => document.querySelector('[data-life="cutscene"]')?.getAttribute('data-phase') ?? null)
        if (phase) break
        await page.evaluate(() => window.__life?.advance?.())
        const choice = page.locator('[data-life="choice"]').first()
        if (await choice.count()) await choice.click({ timeout: 1000 }).catch(() => undefined)
        await page.waitForTimeout(700)
      }
      log(`film opened: ${phase ?? 'NEVER'} after ${Math.round((Date.now() - t0) / 1000)}s`)
      if (!phase) throw new Error('the goal step never opened the cutscene')
      await page.screenshot({ path: `${OUT}/${sizeName}-${kase}-card.png` })

      if (kase === 'skip') {
        await page.getByRole('button', { name: 'דלג' }).click()
      } else if (kase === 'escape') {
        await page.keyboard.press('Escape')
      } else if (kase === 'reload') {
        await page.waitForTimeout(1200)
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 })
        await page.waitForSelector('canvas', { timeout: 90000 })
        log('reloaded with the film on screen')
        // after a reload the film may come back (not yet completed) — it must still be skippable
        // (the save holds no mid-match state: the director replays the final from its
        // kick-off, so the film comes back at the goal step — give it the same 150 s)
        const t1 = Date.now()
        while (Date.now() - t1 < 150000) {
          const p = await page.evaluate(() => document.querySelector('[data-life="cutscene"]')?.getAttribute('data-phase') ?? null)
          const over = await page.evaluate(() => Boolean(window.__life?.snapshot?.().state.flags['match:over']))
          if (p) {
            log(`after reload the film is back (${p}) — skipping it`)
            await page.getByRole('button', { name: 'דלג' }).click()
            break
          }
          if (over) break
          await page.evaluate(() => window.__life?.advance?.())
          // the replayed final asks its terrace questions again — answer them, as the first pass does
          const again = page.locator('[data-life="choice"]').first()
          if (await again.count()) await again.click({ timeout: 1000 }).catch(() => undefined)
          await page.waitForTimeout(700)
        }
      } else if (kase === 'blocked') {
        await page.waitForFunction(() => document.querySelector('[data-life="cutscene"]')?.getAttribute('data-phase') === 'failed', null, { timeout: 30000 })
        log('phase failed (embed unavailable)')
        await page.screenshot({ path: `${OUT}/${sizeName}-${kase}-failed.png` })
        await page.getByRole('button', { name: 'המשך' }).click()
      } else if (kase === 'gate') {
        await page.waitForFunction(() => document.querySelector('[data-life="cutscene"]')?.getAttribute('data-phase') === 'gate', null, { timeout: 30000 })
        log('phase gate (autoplay blocked)')
        await page.screenshot({ path: `${OUT}/${sizeName}-${kase}-gate.png` })
        await page.locator('[data-life="cutscene"] button').first().click()
      } else if (kase === 'ended') {
        log('stub API plays and ends')
      }

      // converge: the film gone, the match over, the objective, Kobi
      await page.waitForFunction(() => !document.querySelector('[data-life="cutscene"]'), null, { timeout: 30000 })
      const t2 = Date.now()
      let snap = null
      while (Date.now() - t2 < 120000) {
        snap = await page.evaluate(() => {
          const s = window.__life?.snapshot?.()
          return s ? { over: Boolean(s.state.flags['match:over']), flags: Object.keys(s.state.flags).filter((f) => f.includes('1986-championship') || f.startsWith('cutscene:')), objective: document.querySelector('[data-life="objective"]')?.textContent?.trim() ?? null } : null
        })
        if (snap?.over && snap.objective) break
        await page.evaluate(() => window.__life?.advance?.())
        const choice = page.locator('[data-life="choice"]').first()
        if (await choice.count()) await choice.click({ timeout: 1000 }).catch(() => undefined)
        await page.waitForTimeout(800)
      }
      log(`match over=${snap?.over} objective="${snap?.objective}" flags=${snap?.flags?.join(',')}`)
      await page.screenshot({ path: `${OUT}/${sizeName}-${kase}-after.png` })
      const targets = await page.evaluate(() => window.__life?.debug?.targets?.() ?? [])
      const kobi = targets.find((t) => t.id === 'kobi-found')
      log(`kobi on the terrace: ${kobi ? 'yes' : 'NO'}`)
      const ok =
        snap?.over &&
        /למצוא את אבא|מצא את אבא/.test(snap?.objective ?? '') &&
        (snap?.flags ?? []).includes('cutscene:1986-championship') &&
        (kase !== 'ended' && kase !== 'gate' ? !(snap?.flags ?? []).includes('watched:1986-championship') : (snap?.flags ?? []).includes('watched:1986-championship')) &&
        Boolean(kobi)
      if (ok) {
        // and the ending is reachable: talk to him
        await page.evaluate(() => window.__life?.talk?.('kobi-found'))
        await page.waitForTimeout(800)
        const talking = await page.evaluate(() => Boolean(document.querySelector('[data-life="dialogue"]')))
        log(`kobi-found conversation opens: ${talking}`)
        if (!talking) throw new Error('kobi-found did not open')
      } else throw new Error('did not converge')
      line.ok = true
    } catch (error) {
      line.ok = false
      line.error = String(error).slice(0, 200)
      faults += 1
      await page.screenshot({ path: `${OUT}/${sizeName}-${kase}-FAIL.png` }).catch(() => undefined)
    }
    line.errors = errors
    results.push(line)
    console.log(`${line.ok ? 'OK  ' : 'FAIL'} ${sizeName}/${kase}  ${line.steps.join(' | ')}${line.error ? `  !! ${line.error}` : ''}${errors.length ? `  pageerrors: ${errors.join(' / ').slice(0, 200)}` : ''}`)
    await ctx.close()
  }
}
await browser.close()
console.log(faults ? `\n${faults} case(s) FAILED` : '\nall footage cases converge')
process.exit(faults ? 1 : 0)
