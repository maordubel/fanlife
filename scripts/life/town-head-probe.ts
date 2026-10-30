/**
 * TOWN · do the heads stay on their necks? Opens every room (or the ones named), lets it run, and samples every
 * person's head turn relative to the body twice a second. Fails on a turn past a human neck, a head that keeps
 * turning one way (a spin), a head that jumps more than a head can turn in half a second, and on page errors.
 *
 *   npx tsx scripts/life/town-head-probe.ts http://127.0.0.1:3300 [room,room] [seconds]
 */
import {chromium} from 'playwright'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3300'
const only = process.argv[3]?.split(',').filter(Boolean)
const secs = Number(process.argv[4] || 8)

function cfgOf(roomId: string) {
  const room = ROOMS[roomId as keyof typeof ROOMS]!
  return {
    room: room.id, club: 'hapoel-tel-aviv', time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn: Object.values(room.spawns)[0],
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: Object.entries(room.slots).map(([id, s]) => ({id, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: {h: 6.2}})),
    spots: Object.entries(room.spots).map(([id, s]) => ({id, ...s})),
    exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  const page = await (await browser.newContext({viewport: {width: 640, height: 420}})).newPage()
  const errs: string[] = []
  page.on('pageerror', e => errs.push(e.message))
  await page.addInitScript('window.__name=function(f){return f}')
  await page.goto(`${base}/life/town/play.html?play=1&q=low&capture=1`, {waitUntil: 'load'})
  await page.waitForFunction(() => (window as unknown as {__ready?: boolean}).__ready, null, {timeout: 180000})
  let bad = 0
  for (const id of Object.keys(ROOMS).filter(r => !only?.length || only.includes(r))) {
    await page.evaluate(cf => (window as unknown as {__vxPlay: {enter(c: unknown): boolean}}).__vxPlay.enter(cf), cfgOf(id))
    await page.waitForTimeout(1200)
    const samples: Record<string, number[][]> = {}
    for (let k = 0; k < secs * 2; k++) {
      const now = await page.evaluate(() => {
        const K = (window as unknown as {__town: {world: {traverse(f: (o: any) => void): void}}}).__town, out: Record<string, number[]> = {}
        let n = 0
        K.world.traverse((o: any) => { const u = o.userData; if (u && u.head && u.torso && u.o) { const r = u.head.rotation; out[(u.o.id || u.o.name || 'p') + '#' + n++] = [r.x, r.y, r.z] } })
        return out
      })
      for (const [who, v] of Object.entries(now)) (samples[who] ||= []).push(v)
      await page.waitForTimeout(500)
    }
    const faults: string[] = []
    for (const [who, s] of Object.entries(samples)) {
      const mx = Math.max(...s.map(v => Math.max(Math.abs(v[0]!), Math.abs(v[1]!), Math.abs(v[2]!))))
      const drift = Math.abs(s[s.length - 1]![1]! - s[0]![1]!)
      const jump = Math.max(0, ...s.map((v, i) => i ? Math.abs(v[1]! - s[i - 1]![1]!) : 0))
      if (jump > 1.6) faults.push(`${who} jumps ${jump.toFixed(2)} rad`)
      if (mx > 1.15 || !Number.isFinite(mx)) faults.push(`${who} turns ${mx.toFixed(2)} rad`)
      else if (drift > 2 && s.length > 4 && s.every((v, i) => !i || Math.sign(v[1]! - s[i - 1]![1]!) === Math.sign(drift))) faults.push(`${who} keeps turning (${drift.toFixed(2)} rad)`)
    }
    bad += faults.length
    console.log(`${faults.length ? '✗' : '✓'} ${id.padEnd(18)} people ${Object.keys(samples).length}${faults.length ? '\n    ' + faults.join('\n    ') : ''}`)
  }
  if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5))
  console.log(`faults ${bad}`)
  await browser.close()
  process.exit(bad || errs.length ? 1 : 0)
}
main()
