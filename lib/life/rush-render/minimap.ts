/**
 * LIFE · RUSH — the little map in the corner (RUSH 2). An open place needs one: the side streets,
 * where the next step is, what is still lying on the ground, who walks with you.
 *
 * Drawn on a 2D canvas, the way to the ground is always "up" (−z). The colours are the club's own
 * (from the skin) on a dark plate; a rival's colour is never drawn because the skin never holds one.
 */
import type {Level} from '@/lib/life/rush/level'
import {stepTarget, type Sim} from '@/lib/life/rush/sim'
import type {VoxelSkin} from '@/lib/life/universal/skin'

const INK = 'rgba(8,10,18,.72)', STREET = 'rgba(214,208,196,.30)', EDGE = 'rgba(243,239,230,.55)', ITEM = 'rgba(243,239,230,.9)', DIM = 'rgba(243,239,230,.35)'

export function drawMap(ctx: CanvasRenderingContext2D, level: Level, sim: Sim, skin: Pick<VoxelSkin, 'p' | 's'>, size: number): void {
  const dpr = ctx.canvas.width / size
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = INK
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2); ctx.fill()
  ctx.save()
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2); ctx.clip()
  // the window: around him on a long street, the whole place when it is small
  const small = level.place === 'yard' || level.place === 'crowd'
  const span = small ? Math.max(level.bounds.x1 - level.bounds.x0, level.bounds.z1 - level.bounds.z0) + 8 : 110
  const k = size / span
  const cx = small ? (level.bounds.x0 + level.bounds.x1) / 2 : sim.x, cz = small ? (level.bounds.z0 + level.bounds.z1) / 2 : sim.z
  const X = (x: number) => size / 2 + (x - cx) * k, Y = (z: number) => size / 2 + (z - cz) * k
  ctx.fillStyle = STREET
  for (const a of level.areas) ctx.fillRect(X(a.x0), Y(a.z0), (a.x1 - a.x0) * k, (a.z1 - a.z0) * k)
  // the gate
  ctx.fillStyle = skin.p; ctx.fillRect(X(level.goal.x) - 4, Y(level.goal.z) - 2, 8, 4)
  // the knots of people singing
  // dashed, so a ring never reads as a step by colour alone
  ctx.strokeStyle = skin.s; ctx.lineWidth = 1.4; ctx.setLineDash([3, 2])
  level.rings.forEach((r, i) => { if (sim.ringDone[i]) return; ctx.beginPath(); ctx.arc(X(r.x), Y(r.z), Math.max(2.5, r.r * k), 0, Math.PI * 2); ctx.stroke() })
  ctx.setLineDash([])
  // what lies on the ground: the ones a step needs are bigger
  level.pickups.forEach((p, i) => {
    if (sim.got[i]) return
    ctx.fillStyle = p.step === null ? DIM : ITEM
    ctx.beginPath(); ctx.arc(X(p.x), Y(p.z), p.step === null ? 1.6 : 2.6, 0, Math.PI * 2); ctx.fill()
  })
  // bins to bang (sneak)
  ctx.fillStyle = DIM
  for (const n of level.noises) { ctx.fillRect(X(n.x) - 1.5, Y(n.z) - 1.5, 3, 3) }
  // the next step — at the edge with an arrow when it is off the map
  const tg = stepTarget(level, sim)
  if (tg && !(level.place === 'crowd' && level.steps[sim.step]?.kind === 'goal')) {
    let tx = X(tg.x), ty = Y(tg.z)
    const dx = tx - size / 2, dy = ty - size / 2, d = Math.hypot(dx, dy), rMax = size / 2 - 8
    const off = d > rMax
    if (off) { tx = size / 2 + dx / d * rMax; ty = size / 2 + dy / d * rMax }
    ctx.fillStyle = skin.p; ctx.strokeStyle = EDGE; ctx.lineWidth = 1.5
    ctx.beginPath()
    if (off) { const a = Math.atan2(dy, dx); ctx.moveTo(tx + Math.cos(a) * 6, ty + Math.sin(a) * 6); ctx.lineTo(tx + Math.cos(a + 2.4) * 5, ty + Math.sin(a + 2.4) * 5); ctx.lineTo(tx + Math.cos(a - 2.4) * 5, ty + Math.sin(a - 2.4) * 5) }
    else { ctx.moveTo(tx, ty - 5); ctx.lineTo(tx + 5, ty); ctx.lineTo(tx, ty + 5); ctx.lineTo(tx - 5, ty) } // a diamond: the step, by shape
    ctx.closePath(); ctx.fill(); ctx.stroke()
  }
  // the one who walks with you
  if (sim.esc) { ctx.fillStyle = sim.esc.lost ? EDGE : skin.s; ctx.beginPath(); ctx.arc(X(sim.esc.x), Y(sim.esc.z), 2.6, 0, Math.PI * 2); ctx.fill() }
  // him: a pointer the way he faces
  const hx = X(sim.x), hy = Y(sim.z), h = sim.heading
  ctx.fillStyle = ITEM; ctx.strokeStyle = INK; ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(hx + Math.sin(h) * 6, hy + Math.cos(h) * 6)
  ctx.lineTo(hx + Math.sin(h + 2.5) * 4.5, hy + Math.cos(h + 2.5) * 4.5)
  ctx.lineTo(hx + Math.sin(h - 2.5) * 4.5, hy + Math.cos(h - 2.5) * 4.5)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = EDGE; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2); ctx.stroke()
}
