/**
 * צילום כרטיס הסיום — the end-of-chapter card, at three widths, with its console watched.
 *
 *   node scripts/life/finale-shot-2026-09-16.mjs http://127.0.0.1:3117 2000-double 1999-cup
 *
 * The finale is the one screen in this game a player is meant to sit with, and since
 * 16.9.2026 it carries the match report: goals with minutes and scorers, a shootout that
 * arrives one kick at a time, the referee and the crowd with the disagreement about the
 * crowd kept, scans of real paper, and links to film. None of that can be judged from a
 * diff — rule 52, *a door is placed by looking* — and two of its properties can only be
 * checked in a browser:
 *
 *   · **The shootout finishes.** It reveals on an interval, so a card left open has to end
 *     up with every kick on it. The probe waits and counts.
 *   · **Nothing loads a third-party host.** The films are links and must stay links: this
 *     container's proxy refuses those hosts, so an embed would show up here as a failed
 *     request and would break the "no console errors" claim on a real deployment too.
 *     The probe records every request origin that is not this server.
 *
 * It scrolls the whole card before shooting, because the interesting half is below the
 * fold and a screenshot of a hero plate proves nothing.
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:3117'
const CHAPTERS = process.argv.slice(3).length ? process.argv.slice(3) : ['2000-double']
const OUT = process.env.SHOT_OUT ?? 'docs/life-shots'
const WIDTHS = [
  { w: 360, h: 740 },
  { w: 414, h: 896 },
  { w: 1280, h: 900 },
]
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
})

let failures = 0
for (const chapter of CHAPTERS) {
  for (const { w, h } of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
      isMobile: w < 700,
      hasTouch: w < 700,
    })
    const page = await ctx.newPage()
    /**
     * Two different things arrive as "console error", and rule 29 is explicit that
     * conflating them is how a checker gets ignored: a page that threw is a defect, and a
     * page whose AdSense or GA script the sandbox's egress proxy refused is this
     * ENVIRONMENT. They are told apart by the REQUEST'S ORIGIN, never by the message text,
     * which is the same separation `scripts/brand/qa-sweep.mjs` makes.
     *
     * `foreign` is a separate count and it is the one this probe exists for: the films on
     * this card are LINKS, so a request to a video host means somebody replaced a link
     * with an embed. The ad and analytics hosts are named and excused; anything else is a
     * fault whether it loaded or not.
     */
    const origin = new URL(BASE).origin
    const EXCUSED = new Set(['pagead2.googlesyndication.com', 'www.googletagmanager.com', 'www.google-analytics.com'])
    const errors = []
    const blocked = new Set()
    const foreign = new Set()
    page.on('console', (m) => {
      if (m.type() !== 'error') return
      if (m.text().startsWith('Failed to load resource')) return
      errors.push(m.text())
    })
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('requestfailed', (r) => {
      if (r.url().startsWith(origin)) errors.push(`requestfailed ${r.url()}`)
      else blocked.add(new URL(r.url()).host)
    })
    page.on('request', (r) => {
      if (r.url().startsWith(origin) || r.url().startsWith('data:') || r.url().startsWith('blob:')) return
      const host = new URL(r.url()).host
      if (!EXCUSED.has(host)) foreign.add(host)
    })

    await page.goto(`${BASE}/qa/life-finale?chapter=${chapter}&run=saw-the-goal`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-life="finale"]')

    // the shootout reveals on an interval; give it more than the whole sequence needs
    await page.waitForTimeout(7000)

    const counted = await page.evaluate(() => {
      const shoot = document.querySelector('[data-life="report-shootout"]')
      const kicks = shoot ? shoot.querySelectorAll('ol > li') : []
      const hidden = [...kicks].filter((li) => li.getAttribute('aria-hidden') === 'true').length
      return {
        goals: document.querySelectorAll('[data-life="report-goals"] > ol > li').length,
        kicks: kicks.length,
        hiddenKicks: hidden,
        docs: document.querySelectorAll('[data-life="report-docs"] figure').length,
        films: document.querySelectorAll('[data-life="report-films"] a').length,
        sources: document.querySelectorAll('[data-life="report-sources"] li').length,
        iframes: document.querySelectorAll('iframe').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }
    })

    const scroller = await page.$('[data-life="finale"] > div')
    if (scroller) {
      await page.evaluate(() => {
        const el = document.querySelector('[data-life="finale"] > div')
        if (el) el.scrollTop = el.scrollHeight * 0.42
      })
      await page.waitForTimeout(400)
    }
    const path = `${OUT}/finale-${chapter}-${w}x${h}.png`
    await page.screenshot({ path })

    const bad =
      counted.hiddenKicks > 0 || counted.iframes > 0 || counted.overflow || errors.length > 0 || foreign.size > 0
    if (bad) failures += 1
    console.log(
      `${chapter.padEnd(13)} ${String(w).padStart(4)}x${h}  goals=${counted.goals} kicks=${counted.kicks}` +
        ` hidden=${counted.hiddenKicks} docs=${counted.docs} films=${counted.films} sources=${counted.sources}` +
        ` iframes=${counted.iframes} overflow=${counted.overflow} errors=${errors.length}` +
        ` foreign=${[...foreign].join(',') || 'none'}` +
        ` blocked-by-this-environment=${[...blocked].join(',') || 'none'}  -> ${path}`,
    )
    for (const e of errors.slice(0, 5)) console.log(`    ! ${e}`)
    await ctx.close()
  }
}
await browser.close()
console.log(failures === 0 ? '\nall clean' : `\n${failures} viewport(s) reported a fault`)
process.exit(failures === 0 ? 0 : 1)
