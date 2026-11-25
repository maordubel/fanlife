/**
 * LIFE · the hood's people on film (Playwright, software GL): the same four sequences every round, as frames to be
 * assembled into strips (scripts/life/hood-human-strips.py):
 *   npx tsx scripts/life/hood-human-shoot.ts http://127.0.0.1:3111 /tmp/human2 olympiacos,hapoel-tel-aviv lite [walk,talk,scarf,street,stills] [extra query]
 * walk (the boy down the street), talk (Dad's first line), scarf (the job done, the scarf going on), street (the main
 * street's people), stills (quality as given: the Dad two-shot and the street).
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'

const base = process.argv[2] || 'http://127.0.0.1:3111', out = process.argv[3] || '/tmp/human2'
const clubs = (process.argv[4] || 'olympiacos,hapoel-tel-aviv').split(','), quality = process.argv[5] || 'lite'
const seqs = (process.argv[6] || 'walk,talk,scarf,street').split(','), extra = process.argv[7] || ''
mkdirSync(out, {recursive: true})
type Run = {sim: {x: number; z: number; t: number; step: number; heading: number}; job: string; level: {hood: {people: {id: string; x: number; z: number}[]}; pickups: {x: number; z: number}[]}}
const H = () => (window as unknown as {__hood: Run}).__hood

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const club of clubs) {
    const ctx = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: false, isMobile: false})
    const page = await ctx.newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', club, e.message) })
    page.on('console', m => { if (m.type() === 'error') console.log('console.error', club, m.text().slice(0, 300)) })
    let bytes = 0
    page.on('response', r => { if (r.url().includes('/life/assets/')) r.body().then(b => { bytes += b.length; console.log('asset', r.url().split('/life/assets/')[1], b.length) }).catch(() => undefined) })
    await page.addInitScript(() => { (window as unknown as {H: () => unknown}).H = () => (window as unknown as {__hood: unknown}).__hood })
    const tag = `${club}-${quality}`
    const shot = (n: string) => page.screenshot({path: `${out}/${tag}-${n}.png`, timeout: 300000})
    const frames = async (n: string, count: number, gap = 400) => { for (let i = 0; i < count; i++) { await shot(`${n}-${i}`); await page.waitForTimeout(gap) } }
    const press = async (k: string, ms = 120) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k) }
    // finish the line, take the first answer (or go on), as a player would
    const answer = async (n: number) => { for (let i = 0; i < n; i++) { await press('KeyE'); await page.waitForTimeout(450); await press('Digit1'); await page.waitForTimeout(700) } }
    const beside = (id: string, dx: number, dz: number) => page.evaluate(([i, x, z]) => { const d = H().level.hood.people.find(p => p.id === i)!; H().sim.x = d.x + (x as number); H().sim.z = d.z + (z as number); H().sim.heading = Math.atan2(-(x as number), -(z as number)) }, [id, dx, dz] as const)
    await page.goto(`${base}/qa/life-world?club=${club}&start=play&time=dusk&quality=${quality}${extra ? '&' + extra : ''}`, {waitUntil: 'load', timeout: 600000})
    await page.waitForFunction(() => !!(window as unknown as {__hood?: Run}).__hood && (H().sim.t > 0.5), null, {timeout: 600000})
    await page.waitForTimeout(4000)
    if (seqs.includes('walk')) {
      await shot('idle')
      await page.keyboard.down('KeyW'); await page.waitForTimeout(1500); await frames('walk', 8); await page.keyboard.up('KeyW')
    }
    if (seqs.includes('talk') || seqs.includes('stills') || seqs.includes('scarf')) {
      await beside('dad', 1.5, 1.3)
      await page.waitForTimeout(2500)
      if (seqs.includes('talk')) await frames('approach', 2, 300)
      await press('KeyE'); await page.waitForTimeout(1600)
      if (seqs.includes('stills')) await shot('still-dad')
      if (seqs.includes('talk')) await frames('talk', 8)
      // accept the job (the first answer), so the street and the scarf can follow
      await answer(1)
      if (seqs.includes('talk')) await frames('accepted', 3)
      await answer(4); await press('Escape'); await page.waitForTimeout(600)
      console.log(tag, 'job after dad:', await page.evaluate(() => H().job))
    }
    if (seqs.includes('street') || seqs.includes('stills')) {
      await page.evaluate(() => { H().sim.x = 1.2; H().sim.z = -30; H().sim.heading = Math.PI })
      await page.waitForTimeout(3000)
      if (seqs.includes('stills')) await shot('still-street')
      if (seqs.includes('street')) { await page.keyboard.down('KeyW'); await page.waitForTimeout(800); await frames('street', 8); await page.keyboard.up('KeyW') }
    }
    if (seqs.includes('scarf')) {
      for (const k of [0, 1]) { await page.evaluate(i => { const p = H().level.pickups[i]!; H().sim.x = p.x; H().sim.z = p.z }, k); await page.waitForTimeout(700) }
      await beside('mate', 1.2, 0.9); await page.waitForTimeout(1500); await press('KeyE'); await page.waitForTimeout(2500); await shot('mate')
      await answer(4); await press('Escape'); await page.waitForTimeout(600)
      await beside('dad', 1.3, 1.1); await page.waitForTimeout(2200)
      console.log(tag, 'job before dad:', await page.evaluate(() => `${H().job} step ${H().sim.step}`))
      await press('KeyE'); await page.waitForTimeout(500)
      await frames('scarf', 10, 650)
      console.log(tag, 'job:', await page.evaluate(() => H().job))
    }
    console.log(tag, 'asset bytes over the wire:', bytes)
    await ctx.close()
  }
  await browser.close()
  console.log(errors ? `${errors} page errors` : 'no page errors')
  process.exit(errors ? 1 : 0)
}
main()
