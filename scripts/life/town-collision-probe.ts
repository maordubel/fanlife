/**
 * TOWN · does anybody walk through the furniture? Opens every room, measures every piece of furniture the room
 * actually built (the same meshes `autoBlocks` reads), and asks the walk grid three questions:
 *   · open   — how much of a piece's floor the grid leaves walkable (a sofa you can walk through)
 *   · inside — a standing person (an actor's slot, the spawn) whose shoulders are inside a piece
 *   · tight  — a piece whose padding is thinner than a body's half-width (a shoulder through the back of a chair)
 * Prints one line per room and a total; exits 1 when anything is found (CI-free: a human runs it).
 *
 *   npx tsx scripts/life/town-collision-probe.ts http://127.0.0.1:3300 [room,room]
 */
import {chromium, type Page} from 'playwright'
import {ROOMS} from '../../lib/life/universal/rooms'

const base = process.argv[2] || 'http://127.0.0.1:3300'
const only = process.argv[3]?.split(',')

function cfgOf(roomId: string) {
  const room = ROOMS[roomId as keyof typeof ROOMS]!
  const spawn = Object.values(room.spawns)[0]
  return {
    room: room.id, club: 'hapoel-tel-aviv', time: 'day', floorY: room.floorY, walk: room.walk, viewH: room.viewH, surface: room.surface, spawn,
    frame: {top: 0.84, bottom: -0.72}, player: {h: 4.6}, blocks: room.blocks, clear: room.clear,
    actors: Object.entries(room.slots).map(([id, s]) => ({id, x: s.x, z: s.z, yaw: s.yaw, sit: !!s.sit, seat: s.sit?.seat, y: s.sit?.y, head: s.head, reach: s.reach, look: {h: 6.2}})),
    spots: Object.entries(room.spots).map(([id, s]) => ({id, ...s})),
    exits: Object.entries(room.doors).map(([id, d]) => ({id, ...d})),
  }
}

type Found = {open: string[]; inside: string[]; tight: string[]; reach: string[]}

async function measure(page: Page, id: string): Promise<Found> {
  const c = cfgOf(id)
  // every way into the room: from each spawn, every door, person and spot can still be reached (the runtime's own audit)
  const reach: string[] = []
  const room = ROOMS[id as keyof typeof ROOMS]!
  for (const [sp, at] of Object.entries(room.spawns)) {
    await page.evaluate(cf => (window as unknown as {__vxPlay: {enter(c: unknown): boolean}}).__vxPlay.enter(cf), {...c, spawn: at})
    await page.waitForTimeout(900)
    const issues = await page.evaluate(() => (window as unknown as {__vxPlay: {audit(): string[]}}).__vxPlay.audit())
    for (const i of issues) reach.push(`from ${sp}: ${i}`)
  }
  await page.evaluate(cf => (window as unknown as {__vxPlay: {enter(c: unknown): boolean}}).__vxPlay.enter(cf), c)
  await page.waitForTimeout(1800)
  const found = await page.evaluate(cf => {
    const W = window as unknown as {__town: {T: any; U: number; world: any}; __vxPlay: {grid(): {nx: number; nz: number; cell: number; x0: number; z0: number; rows: string[]} | null; seats(): Record<string, {x: number; z: number}>}}
    const K = W.__town, T = K.T, U = K.U, g = W.__vxPlay.grid()
    if (!g || !K.world) return {open: ['no grid'], inside: [], tight: []}
    const w = cf.walk, box = new T.Box3(), parts = new Map<string, any>(), pieces: {name: string; r: [number, number, number, number]}[] = []
    K.world.updateMatrixWorld(true)
    K.world.traverse((o: any) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isSprite || !o.visible) return
      let m = o.material; if (Array.isArray(m)) m = m[0]
      if (!m || m.isMeshBasicMaterial || m.blending === T.AdditiveBlending || (m.transparent && m.opacity < 0.6) || m.isShaderMaterial) return
      for (let q = o; q; q = q.parent) { if (q.userData && (q.userData.head || q.userData.arms || q.userData.noBlock)) return; if (!q.visible) return }
      box.setFromObject(o)
      // parts too thin to count alone (a chair's legs, seat and back) count as the object they belong to — as autoBlocks does
      const thin = box.max.y - box.min.y < 0.08 || ((box.max.x - box.min.x) / U < 0.3 && (box.max.z - box.min.z) / U < 0.3)
      if (thin && o.parent && o.parent !== K.world && box.min.y < 0.95) { const g = parts.get(o.parent.uuid) ?? new T.Box3(); g.union(box); parts.set(o.parent.uuid, g); return }
      judge(box, o.name || o.parent?.name || o.geometry?.type || 'mesh')
    })
    parts.forEach(b => { if ((b.max.x - b.min.x) / U <= 2.6 && (b.max.z - b.min.z) / U <= 2.6) judge(b, 'group') })
    function judge(b: any, name: string) {
      if (b.min.y > 0.95 || b.max.y < 0.3 || b.max.y - b.min.y < 0.08) return
      const x0 = b.min.x / U, x1 = b.max.x / U, z0 = b.min.z / U, z1 = b.max.z / U, dx = x1 - x0, dz = z1 - z0
      if (dx > (w[2] - w[0]) * 0.55 || dz > (w[3] - w[1]) * 0.75 || dx * dz > 70 || (dx < 0.3 && dz < 0.3)) return
      if (x1 < w[0] || x0 > w[2] || z1 < w[1] || z0 > w[3]) return
      pieces.push({name, r: [x0, z0, x1, z1]})
    }
    const freeAt = (x: number, z: number) => { const i = Math.floor((x - g.x0) / g.cell), j = Math.floor((z - g.z0) / g.cell); return i >= 0 && j >= 0 && i < g.nx && j < g.nz && g.rows[j]![i] === '.' }
    const out = {open: [] as string[], inside: [] as string[], tight: [] as string[], reach: [] as string[]}
    const HALF = 0.5 // a body's half-width at the shoulders, in room units
    // a door's own leaf and frame stand in its doorway, and a doorway (or floor the room clears on purpose) is always walkable
    const inDoor = (r: [number, number, number, number]) => cf.exits.some((e: any) => r[0] < e.x + e.w + 0.6 && r[2] > e.x - 0.6 && r[1] < e.z + e.d + 0.6 && r[3] > e.z - 0.6) ||
      (cf.clear ?? []).some((c: number[]) => r[0] < c[2]! && r[2] > c[0]! && r[1] < c[3]! && r[3] > c[1]!)
    for (const p of pieces) {
      const [x0, z0, x1, z1] = p.r
      if (inDoor(p.r)) continue
      let n = 0, f = 0
      for (let x = x0 + 0.1; x < x1 - 0.05; x += 0.2) for (let z = z0 + 0.1; z < z1 - 0.05; z += 0.2) { n++; if (freeAt(x, z)) f++ }
      if (n >= 3 && f / n > 0.34) out.open.push(`${p.name} ${(f / n * 100).toFixed(0)}% @${((x0 + x1) / 2).toFixed(1)},${((z0 + z1) / 2).toFixed(1)}`)
      else if (n >= 3) {
        // the band a shoulder sweeps: half a body out from each side — any free cell there is a shoulder inside the piece
        let tn = 0, tf = 0
        for (const [ax, az] of [[x0 - HALF + 0.15, (z0 + z1) / 2], [x1 + HALF - 0.15, (z0 + z1) / 2], [(x0 + x1) / 2, z0 - HALF + 0.15], [(x0 + x1) / 2, z1 + HALF - 0.15]] as [number, number][]) { tn++; if (freeAt(ax, az)) tf++ }
        if (tf) out.tight.push(`${p.name} ${tf}/${tn} sides @${((x0 + x1) / 2).toFixed(1)},${((z0 + z1) / 2).toFixed(1)}`)
      }
    }
    const seats = W.__vxPlay.seats()
    const people: [string, number, number, boolean][] = cf.actors.map((a: any) => [a.id, seats[a.id]?.x ?? a.x, seats[a.id]?.z ?? a.z, a.sit])
    if (cf.spawn) people.push(['spawn', cf.spawn.x, cf.spawn.z, false])
    for (const [who, x, z, sit] of people) {
      if (sit) continue
      const hit = pieces.filter(p => !inDoor(p.r)).find(p => x > p.r[0] - 0.35 && x < p.r[2] + 0.35 && z > p.r[1] - 0.35 && z < p.r[3] + 0.35)
      if (hit) out.inside.push(`${who} in ${hit.name} @${hit.r.map(v => v.toFixed(1)).join(',')}`)
    }
    return out
  }, c)
  return {...found, reach}
}

async function main() {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']})
  const page = await (await browser.newContext({viewport: {width: 900, height: 600}})).newPage()
  const errs: string[] = []
  page.on('pageerror', e => errs.push(e.message))
  // tsx keeps function names with a helper the page does not have
  await page.addInitScript('window.__name=function(f){return f}')
  await page.goto(`${base}/life/town/play.html?play=1&q=low&capture=1`, {waitUntil: 'load'})
  await page.waitForFunction(() => (window as unknown as {__ready?: boolean}).__ready, null, {timeout: 180000})
  let total = 0
  for (const id of Object.keys(ROOMS).filter(r => !only || only.includes(r))) {
    const f = await measure(page, id)
    // squeezed pieces (a body turning sideways past a chair) are reported, not failed
    const n = f.open.length + f.inside.length + f.reach.length
    total += n
    console.log(`${n ? '✗' : '✓'} ${id.padEnd(18)} open ${f.open.length} · inside ${f.inside.length} · unreachable ${f.reach.length} · squeezed ${f.tight.length}${n ? '\n    ' + [...f.open.map(s => 'open ' + s), ...f.inside.map(s => 'inside ' + s), ...f.reach].join('\n    ') : ''}`)
  }
  if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 5))
  console.log(`total ${total}`)
  await browser.close()
  process.exit(total || errs.length ? 1 : 0)
}
main()
