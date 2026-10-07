/**
 * Every room a universal chapter can be set in, entered for real in the voxel engine:
 * each spawn is tried, and every slot, spot and door has to be reachable on foot from it.
 * Prints a top-down map per room (# = cannot stand, S spawn, a person, o thing, D door).
 *
 *   npx tsx scripts/life/universal-rooms-probe.ts http://127.0.0.1:3200 [room,room] [--shots=/tmp/dir]
 *   ENGINE=town …   the same probe against the smooth 3D picture (`public/life/town`)
 */
import {chromium} from 'playwright'
import {mkdirSync} from 'node:fs'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3200'
const only = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3].split(',') : null
const shots = (process.argv.find(a => a.startsWith('--shots=')) || '').split('=')[1]
const quiet = process.argv.includes('--quiet')
if (shots) mkdirSync(shots, {recursive: true})

async function main(): Promise<number> {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  let failures = 0
  for (const [w, h, tag] of [[1280, 800, 'd'], [390, 844, 'm']] as const) {
    if (tag === 'm' && !shots) continue
    const page = await (await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 1})).newPage()
    page.on('pageerror', e => { failures++; console.log('PAGE ERROR', e.message) })
    await page.goto(process.env.ENGINE === 'town' ? `${base}/life/town/play.html?play=1&q=${process.env.Q || 'med'}&capture=1` : `${base}/life/voxel/play.html?q=high&capture=1`, {waitUntil: 'load'})
    await page.waitForFunction(() => (window as unknown as {__ready?: boolean}).__ready, null, {timeout: 120000})
    for (const room of Object.values(ROOMS)) {
      if (only && !only.includes(room.id)) continue
      const spawns = Object.entries(room.spawns)
      for (const [name, spawn] of tag === 'd' ? spawns : spawns.slice(0, 1)) {
        const cfg = {
          room: room.id, club: process.env.CLUB || 'olympiacos', time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
          frame: tag === 'm' ? {top: 0.8, bottom: -0.36} : {top: 0.84, bottom: -0.72},
          player: {h: 4.6, shirt: '#5a7a9a', pants: '#3a4560'}, blocks: room.blocks, clear: room.clear,
          actors: Object.entries(room.slots).map(([id, s]) => ({id, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: {h: 6.2}})),
          spots: Object.entries(room.spots).map(([id, s]) => ({id, ...s})),
          exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
        }
        const res = await page.evaluate(cfg => {
          const w = window as unknown as {__ev: {type: string; issues?: string[]}[]; __err: string[]; __vxPlay: {on(f: (e: never) => void): void; enter(c: unknown): boolean; grid(): {rows: string[]; x0: number; z0: number; cell: number}}}
          w.__ev = []; w.__err.length = 0
          w.__vxPlay.on(((e: {type: string}) => w.__ev.push(e)) as never)
          const ok = w.__vxPlay.enter(cfg)
          return {ok, issues: w.__ev.find(e => e.type === 'entered')?.issues ?? ['never entered'], errors: w.__err.slice(), grid: w.__vxPlay.grid()}
        }, cfg)
        const bad = [...res.issues, ...res.errors]
        if (bad.length) failures += bad.length
        if (tag === 'd') {
          console.log(`${bad.length ? 'FAIL' : 'ok  '} ${room.id} · ${name}${bad.length ? ' — ' + bad.join('; ') : ''}`)
          if ((!quiet || bad.length) && name === spawns[0]![0] && res.grid) {
            const rows = res.grid.rows.map(r => r.split(''))
            const put = (x: number, z: number, ch: string) => { const i = Math.floor((x - res.grid.x0) / res.grid.cell), j = Math.floor((z - res.grid.z0) / res.grid.cell); if (rows[j] && rows[j]![i] !== undefined) rows[j]![i] = ch }
            Object.values(room.doors).forEach(d => { for (let x = d.x; x < d.x + d.w; x += 0.5) for (let z = d.z; z < d.z + d.d; z += 0.5) put(x, z, 'D') })
            Object.values(room.spots).forEach(s => put(s.x, s.z, 'o'))
            Object.values(room.slots).forEach(s => put(s.x, s.z, 'a'))
            Object.values(room.spawns).forEach(s => put(s.x, s.z, 'S'))
            console.log(rows.map(r => '   ' + r.join('')).join('\n'))
          }
        }
        if (shots && name === spawns[0]![0]) { await page.waitForTimeout(900); await page.screenshot({path: `${shots}/${room.id}-${tag}.png`}) }
      }
    }
    await page.close()
  }
  await browser.close()
  console.log(failures ? `${failures} problem(s)` : 'every spawn reaches every slot, spot and door')
  return failures
}

main().then(failures => process.exit(failures ? 1 : 0), error => { console.error(error); process.exit(1) })
