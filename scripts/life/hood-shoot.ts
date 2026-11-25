/**
 * LIFE · the hood stage shots (Playwright, software GL) and a sim-seconds-per-wall-second read:
 *   npx tsx scripts/life/hood-shoot.ts http://127.0.0.1:3111 /tmp/hood olympiacos,hapoel-tel-aviv phone,desktop
 * Per club and size: spawn, after ~20 s of held input, the talk with Dad, the job marker, the job done.
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3111', out = process.argv[3] || '/tmp/hood'
const clubs = (process.argv[4] || 'olympiacos,hapoel-tel-aviv,zrinjski-mostar').split(','), sizes = (process.argv[5] || 'phone').split(',')
mkdirSync(out, {recursive: true})
type Run = {sim: {x: number; z: number; t: number; step: number; heading: number}; job: string; level: {hood: {people: {id: string; x: number; z: number}[]}; pickups: {x: number; z: number}[]}}
const H = () => (window as unknown as {__hood: Run}).__hood

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const size of sizes) for (const club of clubs) {
    const phone = size === 'phone'
    const ctx = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1440, height: 900}, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone})
    const page = await ctx.newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', club, e.message) })
    await page.addInitScript(() => { (window as unknown as {H: () => unknown}).H = () => (window as unknown as {__hood: unknown}).__hood })
    const tag = `${club}-${size}`, shot = (n: string) => page.screenshot({path: `${out}/${tag}-${n}.png`, timeout: 300000})
    await page.goto(`${base}/qa/life-world?club=${club}&time=day&quality=${phone ? 'lite' : 'high'}`, {waitUntil: 'load', timeout: 600000})
    await page.waitForFunction(() => !!(window as unknown as {__hood?: Run}).__hood && (H().sim.t > 0.5), null, {timeout: 300000})
    await page.waitForTimeout(1500)
    await shot('1-spawn')
    const t0 = await page.evaluate(() => H().sim.t), w0 = Date.now()
    // held input ~20 s: down the main street
    await page.keyboard.down('KeyW'); await page.waitForTimeout(20000); await page.keyboard.up('KeyW')
    const t1 = await page.evaluate(() => H().sim.t)
    console.log(tag, 'sim seconds per wall second:', ((t1 - t0) / ((Date.now() - w0) / 1000)).toFixed(2))
    await shot('2-walked')
    // the talk with Dad: stand beside him and press E
    await page.evaluate(() => { const d = H().level.hood.people.find(p => p.id === 'dad')!; H().sim.x = d.x + 1.6; H().sim.z = d.z + 1.2; H().sim.heading = Math.atan2(d.x - (d.x + 1.6), d.z - (d.z + 1.2)) })
    await page.waitForTimeout(800)
    await page.keyboard.down('KeyE'); await page.waitForTimeout(120); await page.keyboard.up('KeyE')
    await page.waitForTimeout(900)
    await shot('3-dad')
    // the marker: walk (by teleport, then a real step) to the kiosk
    await page.evaluate(() => { const p = H().level.pickups[0]!; H().sim.x = p.x + 3; H().sim.z = p.z + 6; H().sim.heading = Math.PI })
    await page.waitForTimeout(1200)
    await shot('4-target')
    // done state: do the job by teleports + real presses
    await page.evaluate(() => { const p = H().level.pickups[0]!; H().sim.x = p.x; H().sim.z = p.z })
    await page.waitForTimeout(500)
    await page.evaluate(() => { const p = H().level.pickups[1]!; H().sim.x = p.x; H().sim.z = p.z })
    await page.waitForTimeout(500)
    for (const id of ['mate', 'dad']) {
      await page.evaluate(i => { const d = H().level.hood.people.find(p => p.id === i)!; H().sim.x = d.x + 1.2; H().sim.z = d.z + 0.8 }, id)
      await page.waitForTimeout(600)
      await page.keyboard.down('KeyE'); await page.waitForTimeout(120); await page.keyboard.up('KeyE')
      await page.waitForTimeout(700)
    }
    await page.waitForTimeout(1000)
    console.log(tag, 'job:', await page.evaluate(() => H().job))
    await shot('5-done')
    await ctx.close()
  }
  await browser.close()
  console.log(errors ? `${errors} page errors` : 'no page errors')
  process.exit(errors ? 1 : 0)
}
main()
