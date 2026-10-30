/**
 * LIFE · RUSH, the zoom missions looked at (rule 135): each one opened on the QA stand ON ITS EPISODE'S NIGHT
 * (`&episode=`), a frame of the briefing (the archive row printed as recorded), a frame in play, a frame with the thing
 * he came back for in his hand, and the find. Fails on a page error.
 *
 *   npx tsx scripts/life/rush-zoom-probe.ts http://127.0.0.1:3199 /tmp/zoom [first-step:S1E3,lost-scarf:S1E5,away-pen:S1E6:won,clipping-hunt:S1E4] [phone,desktop]
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3199'
const out = process.argv[3] || '/tmp/rush-zoom'
const runs = (process.argv[4] || 'first-step:S1E3,lost-scarf:S1E5,away-pen:S1E6:won,clipping-hunt:S1E4').split(',').map(x => x.split(':'))
const sizes = (process.argv[5] || 'phone').split(',')
mkdirSync(out, {recursive: true})

type Pt = {x: number; z: number}
type R = {__rush?: {sim: Pt & {t: number; ended: string | null; got: boolean[]; step: number}; level: {place: string; pickups: (Pt & {step: number | null; inside?: number})[]; targets: Pt[]; searches: Pt[]}}}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const size of sizes) for (const [m, ep, beat] of runs) {
    const phone = size === 'phone'
    const ctx = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1280, height: 800}, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone})
    const page = await ctx.newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', m, e.message) })
    await page.addInitScript(() => { try { localStorage.setItem('fan-life:life:probe', '1') } catch { /* */ } })
    const tag = `${m}-${size}`
    await page.goto(`${base}/qa/life-rush?club=hapoel-tel-aviv&mission=${m}&episode=${ep ?? ''}${beat ? `&beat=${beat}` : ''}&time=day&quality=lite`, {waitUntil: 'load', timeout: 600000})
    await page.locator('[data-life="rush-go"]').waitFor({timeout: 300000})
    await page.waitForTimeout(1200)
    await page.screenshot({path: `${out}/${tag}-brief.png`})
    console.log(tag, 'title:', await page.locator('h1, h2').first().textContent().catch(() => '?'))
    await page.locator('[data-life="rush-go"]').click({timeout: 60000})
    await page.waitForFunction(() => ((window as unknown as R).__rush?.sim.t ?? 0) > 0.3, null, {timeout: 120000})
    await page.waitForTimeout(1500)
    await page.screenshot({path: `${out}/${tag}-play.png`})
    const place = await page.evaluate(() => (window as unknown as R).__rush!.level.place)
    if (place === 'crowd') {
      // the thing he came back for, then the find
      await page.evaluate(() => { const r = (window as unknown as R).__rush!; const p = r.level.pickups.find(q => q.step !== null)!; r.sim.x = p.x; r.sim.z = p.z })
      await page.waitForTimeout(900)
      await page.screenshot({path: `${out}/${tag}-got.png`})
      await page.evaluate(() => { const r = (window as unknown as R).__rush!; const t = r.level.targets[0]!; r.sim.x = t.x; r.sim.z = t.z + 0.6 })
      await page.waitForTimeout(500)
      await page.keyboard.down('KeyE'); await page.waitForTimeout(80); await page.keyboard.up('KeyE')
      await page.waitForTimeout(900)
      await page.screenshot({path: `${out}/${tag}-found.png`})
      console.log(tag, 'ended:', await page.evaluate(() => (window as unknown as R).__rush!.sim.ended))
    }
    await ctx.close()
  }
  await browser.close()
  console.log(errors ? `${errors} page errors` : 'no page errors')
  process.exit(errors ? 1 : 0)
}
main()
