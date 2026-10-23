/**
 * The matchday as each city lives it, in the rooms: the walk to the ground and the home street, per club and year.
 *   npx tsx scripts/life/culture-shots.ts http://127.0.0.1:3330 /tmp/out hapoel-tel-aviv:2010,hapoel-tel-aviv:2024,aek-athens:2000
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3330', out = process.argv[3] || '/tmp/culture-shots'
const runs = (process.argv[4] || 'hapoel-tel-aviv:2010,hapoel-tel-aviv:2024,aek-athens:2000,zrinjski-mostar:2010').split(',').map(s => s.split(':') as [string, string])
mkdirSync(out, {recursive: true})

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  const errors: string[] = []
  const rooms = (process.env.ROOMS || 'route,street').split(',')
  for (const [club, year] of runs) for (const id of rooms) {
    const ctx = await browser.newContext({viewport: {width: 960, height: 600}, deviceScaleFactor: 1}), page = await ctx.newPage()
    page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${base}/life/town/play.html?play=1&q=${process.env.Q || 'low'}&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as {__ready?: boolean}).__ready, null, {timeout: 180000})
    const room = ROOMS[id as keyof typeof ROOMS]!
    const cfg = {room: id, club, time: 'day', year: Number(year), floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn: Object.values(room.spawns)[0],
      frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6, shirt: '#5a7a9a', pants: '#3a4560'}, blocks: room.blocks, clear: room.clear,
      actors: [], spots: Object.entries(room.spots).map(([sid, s]) => ({id: sid, ...s})), exits: Object.entries(room.doors).map(([did, d]) => ({id: did, ...d})), made: []}
    const drawn = await page.evaluate(c => { const w = window as unknown as {__vxPlay: {enter(c: unknown): boolean}; __culture?: {drawn: number}}; w.__culture = undefined; w.__vxPlay.enter(c); return w.__culture?.drawn ?? 0 }, cfg)
    await page.waitForTimeout(1500)
    const file = `${out}/${club}-${year}-${id}.png`
    await page.screenshot({path: file, timeout: 180000})
    console.log(file, 'drawn', drawn)
    await ctx.close()
  }
  await browser.close()
  console.log(errors.length ? 'ERRORS ' + errors.join(' | ') : 'no page errors')
}
main().catch(e => { console.error(e); process.exit(1) })
