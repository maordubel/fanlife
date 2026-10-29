/**
 * LIFE faces, looked at: the 2026 interview studio, one person at a time, through the moods a line can carry.
 * Writes a frame per person per mood (phone and desktop) for a human to look at; fails only on page errors.
 *
 *   npx tsx scripts/life/face-probe.ts http://127.0.0.1:3100 /tmp/faces [phone|desktop]
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {CAST_ROLES} from '../../lib/life/universal/cast'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3100'
const out = process.argv[3] || '/tmp/faces'
const sizes = (process.argv[4] || 'phone,desktop').split(',')
const who = (process.argv[5] || 'dad,mum,neighbour,wild').split(',')
const moods = (process.argv[6] || 'rest,joy,tense,grief,wonder').split(',')
mkdirSync(out, {recursive: true})

type W = {__ready?: boolean; __vxPlay: {enter(c: unknown): boolean; studio(o: unknown): boolean; studioSay(m: string | false): boolean}}
// the studio is drawn inside a room's renderer: the living room is entered first (as town-people-probe does)
function roomCfg() {
  const room = ROOMS.room
  if (!room) throw new Error('no living room in ROOMS')
  return {room: room.id, club: 'hapoel-tel-aviv', time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn: Object.values(room.spawns)[0],
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear, actors: [], spots: [], exits: []}
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  for (const size of sizes) {
    const viewport = size === 'phone' ? {width: 390, height: 844} : {width: 1280, height: 800}
    const page = await (await browser.newContext({viewport, deviceScaleFactor: 1})).newPage()
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
    page.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()) })
    page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console', m.type(), m.text().slice(0, 300)) })
    await page.goto(`${base}/life/town/play.html?play=1&q=med&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as W).__ready, null, {timeout: 240000})
    await page.waitForFunction(() => (window as unknown as {PEOPLE?: {ready: boolean; failed: boolean}}).PEOPLE?.ready || (window as unknown as {PEOPLE?: {failed: boolean}}).PEOPLE?.failed, null, {timeout: 240000})
    await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), roomCfg())
    await page.waitForTimeout(3000)
    for (const id of who) {
      const role = CAST_ROLES.find(r => r.id === id)
      if (!role) { console.log('no role', id); continue }
      const ok = await page.evaluate(([look, w]) => (window as unknown as W).__vxPlay.studio({look, who: w}), [role.look, id] as const)
      if (!ok) { console.log('studio refused', id); continue }
      await page.waitForTimeout(2500)
      for (const mood of moods) {
        await page.evaluate(m => (window as unknown as W).__vxPlay.studioSay(m === 'rest' ? false : m), mood)
        await page.waitForTimeout(1600)
        await page.screenshot({path: `${out}/${size}-${id}-${mood}.png`, timeout: 180000})
      }
      await page.evaluate(() => (window as unknown as W).__vxPlay.studio(null))
    }
    await page.close()
  }
  await browser.close()
  console.log(`faces: ${errors} page error(s)`)
  process.exit(errors ? 1 : 0)
}
main()
