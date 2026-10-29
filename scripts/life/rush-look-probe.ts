/**
 * LIFE · RUSH, looked at: the QA stand, a run started, a frame taken a few seconds in — with the loom ground and
 * kiln props, and (`before`) with those files blocked so the drawn stand-ins show. For a human to compare.
 *
 *   npx tsx scripts/life/rush-look-probe.ts http://127.0.0.1:3100 /tmp/rush "club=hapoel-tel-aviv&time=night&weather=rain" phone,desktop
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3100'
const out = process.argv[3] || '/tmp/rush'
const query = process.argv[4] || 'club=hapoel-tel-aviv&time=night&weather=rain'
const sizes = (process.argv[5] || 'phone,desktop').split(',')
const modes = (process.argv[6] || 'after,before').split(',')
mkdirSync(out, {recursive: true})

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const size of sizes) for (const mode of modes) {
    const phone = size === 'phone'
    const ctx = await browser.newContext({viewport: phone ? {width: 390, height: 844} : {width: 1280, height: 800}, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone})
    const page = await ctx.newPage()
    if (mode === 'before') await page.route(/\/life\/rush\/(tex|models)\//, r => r.abort())
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) console.log('console', m.text().slice(0, 300)) })
    await page.goto(`${base}/qa/life-rush?${query}&quality=${phone ? 'lite' : 'high'}`, {waitUntil: 'load', timeout: 600000})
    await page.locator('[data-life="rush-go"]').click({timeout: 300000})
    await page.waitForTimeout(4000)
    // NEAR=1: stand him a few steps short of the nearest pickups (and a bin), so the props are in the frame
    if (process.env.NEAR) await page.evaluate(() => {
      const r = (window as unknown as {__rush?: {sim: {x: number; z: number; heading: number}; level: {pickups: {x: number; z: number}[]; noises: {x: number; z: number}[]}}}).__rush
      if (!r) return
      const p = [...r.level.pickups].sort((a, b) => b.z - a.z)[0]
      if (p) { r.sim.x = p.x * 0.4; r.sim.z = p.z + 3.2; r.sim.heading = Math.PI }
    })
    await page.waitForTimeout(5000)
    await page.screenshot({path: `${out}/${size}-${mode}.png`, timeout: 180000})
    await ctx.close()
  }
  await browser.close()
  console.log(`rush look: ${errors} page error(s)`)
  process.exit(errors ? 1 : 0)
}
main()
