/**
 * TOWN cast, looked at close: every role of `CAST_ROLES` (and the hero at his ages) standing in the street in daylight,
 * a close shot on each face, a wide of the line, and a line of unauthored extras (what `vary` does on its own).
 * Writes frames for a human to look at; fails only on page errors.
 *
 *   npx tsx scripts/life/town-cast-probe.ts http://127.0.0.1:3200 /tmp/cast [club] [w,h]
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'
import {CAST_ROLES, HERO_LOOKS} from '../../lib/life/universal/cast'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const out = process.argv[3] || '/tmp/cast'
const club = process.argv[4] || 'hapoel-tel-aviv'
const [W, H] = (process.argv[5] || '1280,800').split(',').map(Number) as [number, number]
mkdirSync(out, {recursive: true})

type W = {__ready?: boolean; __err: string[]; __vxPlay: {enter(c: unknown): boolean; focus(id: string | null): void; shot(o: unknown): boolean; emote(k: string | null): void; actor(id: string, p: unknown): boolean; freeze(b: boolean): void}}

function cfg(roomId: string, actors: {id: string; x: number; z: number; look: unknown; yaw?: number}[], spawn: {x: number; z: number; yaw: number}) {
  const room = ROOMS[roomId as keyof typeof ROOMS]!
  return {
    room: room.id, club, time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {...HERO_LOOKS.child, h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: actors.map(a => ({id: a.id, x: a.x, z: a.z, yaw: a.yaw ?? Math.PI, look: a.look})),
    spots: [], exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let errors = 0
  const page = await (await browser.newContext({viewport: {width: W, height: H}})).newPage()
  page.on('pageerror', e => { errors++; console.log('PAGE ERROR', e.message) })
  await page.goto(`${base}/life/town/play.html?play=1&q=med&capture=1`, {waitUntil: 'load'})
  await page.waitForFunction(() => (window as unknown as W).__ready, null, {timeout: 600000})
  const ev = (f: (w: W) => unknown, arg?: unknown) => page.evaluate(([src, a]) => (new Function('w', 'a', `return (${src})(w, a)`))(window as unknown as W, a), [f.toString(), arg] as const)

  // the cast in a line, facing the camera
  const cast = CAST_ROLES.map((r, i) => ({id: r.id, x: 3 + i * 2.5, z: 10.2, look: r.look, yaw: Math.PI}))
  const heroes = Object.entries(HERO_LOOKS).map(([k, l], i) => ({id: 'hero-' + k, x: 3 + (cast.length + i) * 2.5, z: 10.2, look: l, yaw: Math.PI}))
  const all = cast.concat(heroes)
  const BATCH = Number(process.env.BATCH || 5); const OVER = process.env.OVER === '1'
  for (let b = 0; b < all.length; b += BATCH) {
  const batch = all.slice(b, b + BATCH).map((a, i) => ({...a, x: 14 + i * 2.6}))
  const t0 = Date.now()
  await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), cfg('street', batch, {x: 20, z: 12.6, yaw: 0}))
  await page.waitForTimeout(2500)
  await page.screenshot({path: `${out}/line-${b / BATCH}.png`, timeout: 600000})
  console.log('batch', b / BATCH, 'ready in', Date.now() - t0, 'ms')
  for (const a of batch) {
    await page.evaluate(id => (window as unknown as W).__vxPlay.shot({cam: 'close', on: [id], ms: 9000}), a.id)
    await page.waitForTimeout(900)
    await page.screenshot({path: `${out}/close-${a.id}.png`, timeout: 600000})
    if (OVER) {
      await page.evaluate(id => (window as unknown as W).__vxPlay.shot({cam: 'over', on: [id], ms: 9000}), a.id)
      await page.waitForTimeout(700)
      await page.screenshot({path: `${out}/over-${a.id}.png`, timeout: 600000})
    }
  }
  await page.evaluate(() => (window as unknown as W).__vxPlay.shot(null))
  }

  // unauthored extras: what the street does on its own, adults and children
  const extras: {id: string; x: number; z: number; look: unknown; yaw: number}[] = []
  for (let i = 0; i < 6; i++) extras.push({id: 'extra-' + i, x: 14 + i * 2.6, z: 10.2, look: {h: i % 4 === 3 ? 4.4 : 6.2}, yaw: Math.PI})
  await page.evaluate(c => (window as unknown as W).__vxPlay.enter(c), cfg('street', extras, {x: 20, z: 12.6, yaw: 0}))
  await page.waitForTimeout(3000)
  await page.screenshot({path: `${out}/extras-wide.png`, timeout: 600000})
  for (const i of [0, 1, 2, 3, 5]) {
    await page.evaluate(id => (window as unknown as W).__vxPlay.shot({cam: 'close', on: [id], ms: 9000}), 'extra-' + i)
    await page.waitForTimeout(800)
    await page.screenshot({path: `${out}/extra-close-${i}.png`, timeout: 600000})
  }
  await page.evaluate(() => (window as unknown as W).__vxPlay.shot(null))
  console.log(`errors in page: ${errors}`, (await page.evaluate(() => (window as unknown as W).__err)).slice(0, 5))
  await browser.close()
  return errors
}

main().then(n => process.exit(n ? 1 : 0), e => { console.error(e); process.exit(1) })
