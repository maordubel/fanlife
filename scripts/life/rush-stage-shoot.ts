/**
 * LIFE · RUSH stage shots with a patient screenshot (the crowd end is heavy under software GL) and a frame-time read:
 *   npx tsx scripts/life/rush-stage-shoot.ts http://127.0.0.1:3199 /tmp/rush/zoom first-step:S1E3,away-pen:S1E6:won phone,desktop
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3199'
const out = process.argv[3] || '/tmp/rush-stage'
const runs = (process.argv[4] || 'first-step:S1E3,away-pen:S1E6:won').split(',').map(x => x.split(':'))
const sizes = (process.argv[5] || 'phone,desktop').split(',')
mkdirSync(out, {recursive: true})
type R = {__rush?: {sim: {x: number; z: number; t: number; ended: string | null}; level: {place: string; pickups: {x: number; z: number; step: number | null}[]; targets: {x: number; z: number}[]}}}

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
    await page.goto(`${base}/qa/life-rush?club=hapoel-tel-aviv&mission=${m}&episode=${ep ?? ''}${beat ? `&beat=${beat}` : ''}&time=${m === 'away-pen' ? 'night' : 'day'}&quality=${phone ? 'lite' : 'high'}`, {waitUntil: 'load', timeout: 600000})
    await page.locator('[data-life="rush-go"]').waitFor({timeout: 300000})
    await page.waitForTimeout(1500)
    await page.screenshot({path: `${out}/${tag}-brief.png`, timeout: 300000})
    await page.locator('[data-life="rush-go"]').click({timeout: 60000})
    await page.waitForFunction(() => ((window as unknown as R).__rush?.sim.t ?? 0) > 0.3, null, {timeout: 300000})
    const t0 = await page.evaluate(() => (window as unknown as R).__rush!.sim.t), w0 = Date.now()
    await page.waitForTimeout(3000)
    const t1 = await page.evaluate(() => (window as unknown as R).__rush!.sim.t)
    console.log(tag, 'sim seconds per wall second (software GL):', ((t1 - t0) / ((Date.now() - w0) / 1000)).toFixed(2))
    await page.screenshot({path: `${out}/${tag}-play.png`, timeout: 300000})
    const place = await page.evaluate(() => (window as unknown as R).__rush!.level.place)
    if (place === 'crowd') {
      await page.evaluate(() => { const r = (window as unknown as R).__rush!; const t = r.level.targets[0]!; r.sim.x = t.x; r.sim.z = t.z + 0.6 })
      await page.waitForTimeout(800)
      await page.keyboard.down('KeyE'); await page.waitForTimeout(80); await page.keyboard.up('KeyE')
      await page.waitForTimeout(1500)
      await page.screenshot({path: `${out}/${tag}-found.png`, timeout: 300000})
      console.log(tag, 'ended:', await page.evaluate(() => (window as unknown as R).__rush!.sim.ended))
    }
    await ctx.close()
  }
  await browser.close()
  console.log(errors ? `${errors} page errors` : 'no page errors')
  process.exit(errors ? 1 : 0)
}
main()
