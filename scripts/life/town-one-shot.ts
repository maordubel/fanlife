/**
 * One quick TOWN frame for iterating on a person: actors from a JSON spec, a camera, one PNG.
 *   npx tsx scripts/life/town-one-shot.ts <out.png> '<actors json>' [close|over|wide:<id>] [q=low] [w,h] [room]
 * actors json: [{"id":"dad","look":{...},"x":16,"z":10.2}] — ids of CAST_ROLES may be given as {"id":"dad"} alone.
 */
import {chromium} from 'playwright'
import {ROOMS} from '../../lib/life/universal/rooms'
import {CAST_ROLES, HERO_LOOKS} from '../../lib/life/universal/cast'

const [out = 'out.png', actorsJson = '[]', camSpec = 'wide', q = 'low', size = '960,600', roomId = 'street', time = 'day'] = process.argv.slice(2)
const [W, H] = size.split(",").map(Number) as [number, number]
type Wn = {__ready?: boolean; __err: string[]; __vxPlay: {enter(c: unknown): boolean; shot(o: unknown): boolean; emote(k: string | null): void; focus(id: string | null): void}}

function main() {
  const room = ROOMS[roomId as keyof typeof ROOMS]!
  const spec = JSON.parse(actorsJson) as {id: string; look?: Record<string, unknown>; x?: number; z?: number; yaw?: number}[]
  const actors = spec.map((a, i) => {
    const role = CAST_ROLES.find(r => r.id === a.id)
    const hero = (HERO_LOOKS as Record<string, unknown>)[a.id.replace(/^hero-/, '')]
    const look = Object.assign({}, role ? role.look : a.id.startsWith('hero-') ? hero : {h: 6.2}, a.look || {})
    return {id: a.id, x: a.x ?? 14 + i * 2.4, z: a.z ?? 10.2, yaw: a.yaw ?? Math.PI, look}
  })
  const spawn = roomId === 'street' ? {x: 20, z: 12.6, yaw: 0} : Object.values(room.spawns)[0]
  const cfg = {
    room: room.id, club: 'hapoel-tel-aviv', time, floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {...HERO_LOOKS.child, h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors, spots: [], exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
  return (async () => {
    const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
    const page = await (await browser.newContext({viewport: {width: W, height: H}})).newPage()
    let errors = 0
    page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('console', m.type(), m.text().slice(0, 200)) })
    let t0 = Date.now()
    await page.goto(`http://127.0.0.1:3200/life/town/play.html?play=1&q=${q}&capture=1${process.env.YEAR ? `&year=${process.env.YEAR}` : ""}`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as Wn).__ready, null, {timeout: 180000})
    console.log('ready', Date.now() - t0, 'ms'); t0 = Date.now()
    await page.evaluate(c => (window as unknown as Wn).__vxPlay.enter(c), cfg)
    console.log('enter', Date.now() - t0, 'ms'); t0 = Date.now()
    await page.waitForTimeout(1500)
    const [cam, id] = camSpec.split(':')
    if (cam !== 'wide') { await page.evaluate(([c, i]) => (window as unknown as Wn).__vxPlay.shot({cam: c, on: [i], ms: 9000}), [cam, id || actors[0]!.id]); await page.waitForTimeout(900) }
    await page.screenshot({path: out, timeout: 300000})
    console.log('shot', Date.now() - t0, 'ms', 'errors', errors, (await page.evaluate(() => (window as unknown as Wn).__err)).slice(0, 3))
    await browser.close()
    process.exit(errors ? 1 : 0)
  })()
}
main()
