/**
 * LIFE · RUSH, the close-up home missions looked at (rule 132): each one started on the QA stand, the boy set down
 * beside a place to search, the search started — a frame mid-search (the camera down at his hands), a frame after
 * (what came out of it) — and, for the night, a frame with the watcher's look on the floor. Fails on a page error.
 *
 *   npx tsx scripts/life/rush-home-probe.ts http://127.0.0.1:3199 /tmp/home [flat-run,tin-hunt,ticket-hunt,night-window,pack-bag] [phone,desktop]
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3199'
const out = process.argv[3] || '/tmp/rush-home'
const missions = (process.argv[4] || 'flat-run,tin-hunt,ticket-hunt,night-window,pack-bag').split(',')
const sizes = (process.argv[5] || 'phone,desktop').split(',')
mkdirSync(out, {recursive: true})

type R = {__rush?: {sim: {x: number; z: number; t: number; searchI: number; searched: boolean[]; ended: string | null}; level: {searches: {x: number; z: number; kind: string}[]}}}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const size of sizes) for (const m of missions) {
    const phone = size === 'phone'
    const ctx = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1280, height: 800}, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone})
    const page = await ctx.newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', m, e.message) })
    await page.addInitScript(() => { try { localStorage.setItem('fan-life:life:probe', '1') } catch { /* */ } })
    await page.goto(`${base}/qa/life-rush?club=hapoel-tel-aviv&mission=${m}&time=day&quality=${phone ? 'lite' : 'high'}`, {waitUntil: 'load', timeout: 600000})
    await page.locator('[data-life="rush-go"]').click({timeout: 300000})
    await page.waitForFunction(() => ((window as unknown as R).__rush?.sim.t ?? 0) > 0.3, null, {timeout: 120000})
    // beside the first place to search, then E
    await page.evaluate(() => { const r = (window as unknown as R).__rush!; const q = r.level.searches[0]!; r.sim.x = q.x; r.sim.z = q.z })
    await page.waitForTimeout(600)
    await page.screenshot({path: `${out}/${m}-${size}-near.png`})
    await page.keyboard.down('KeyE'); await page.waitForTimeout(80); await page.keyboard.up('KeyE')
    await page.waitForFunction(() => ((window as unknown as R).__rush?.sim.searchI ?? -1) >= 0, null, {timeout: 30000}).catch(() => console.log(m, size, 'search did not start'))
    // hold the search open long enough for the camera to come down, take the frame, then let it finish
    await page.evaluate(() => { (window as unknown as R & {__rush: {sim: {searchT: number}}}).__rush.sim.searchT = -60 })
    await page.waitForTimeout(3500)
    await page.screenshot({path: `${out}/${m}-${size}-search.png`})
    await page.evaluate(() => { (window as unknown as R & {__rush: {sim: {searchT: number}}}).__rush.sim.searchT = 30 })
    await page.waitForFunction(() => (window as unknown as R).__rush?.sim.searched[0], null, {timeout: 60000}).catch(() => console.log(m, size, 'search did not finish'))
    await page.waitForTimeout(400)
    await page.screenshot({path: `${out}/${m}-${size}-after.png`})
    if (m === 'night-window') {
      // into the hall, in the open door's line, to see the look on the floor
      await page.evaluate(() => { const r = (window as unknown as R).__rush!; r.sim.x = 4.5; r.sim.z = 1.3 })
      await page.waitForTimeout(2500)
      await page.screenshot({path: `${out}/${m}-${size}-hall.png`})
    }
    console.log('✓', m, size)
    await ctx.close()
  }
  await browser.close()
  process.exit(errors ? 1 : 0)
}
main()
