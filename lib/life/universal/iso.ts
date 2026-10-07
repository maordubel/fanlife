/**
 * LIFE, universal — the isometric city, as a pure drawing.
 *
 * One function turns a club colour and a time of day into SVG markup: ground tiles, buildings,
 * a skyline, cars and a cloud bank per district. It knows nothing about the story; the map
 * component decides which districts stand in the light. Every object carries `data-k` (its
 * district) so the shell can lift the fog over a district with one style rule.
 *
 * Geometry: a 25 × 20 tile board in 5 × 4 blocks of 5 tiles; the odd column and row is road.
 * Projection is plain 2:1 isometric, so a tile is 42 × 21 and a storey is 0.66 px per unit.
 */

const TW = 21, TH = 10.5, SC = .66, OX = 470, OY = 120, NI = 25, NJ = 20
type Pt = [number, number]
type Theme = ReturnType<typeof theme>

export const P = (x: number, y: number, z = 0): Pt => [(x - y) * TW + OX, (x + y) * TH - z * SC + OY]
const pts = (a: Pt[]) => a.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
const poly = (a: Pt[], fill: string, stroke?: string | null, sw = 1) =>
  `<polygon points="${pts(a)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"` : ''}/>`

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16), c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `#${((1 << 24) + (c(n >> 16) << 16) + (c(n >> 8 & 255) << 8) + c(n & 255)).toString(16).slice(1)}`
}
function rng(s: number) {
  return () => { s |= 0; s = s + 1831565813 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}

export type District = 'home' | 'housing' | 'street' | 'river' | 'work' | 'industry' | 'school' | 'plaza' | 'pitch' | 'towers' | 'park' | 'bus' | 'mall' | 'abroad' | 'away' | 'stadium'
/** where each district stands on the 5 × 4 board (bi across, bj deep — bj 3 is nearest the viewer) */
export const BOARD: {k: District; bi: number; bj: number}[] = [
  {k: 'home', bi: 0, bj: 3}, {k: 'street', bi: 1, bj: 3}, {k: 'river', bi: 2, bj: 3}, {k: 'work', bi: 3, bj: 3}, {k: 'industry', bi: 4, bj: 3},
  {k: 'housing', bi: 0, bj: 2}, {k: 'school', bi: 1, bj: 2}, {k: 'plaza', bi: 2, bj: 2}, {k: 'pitch', bi: 3, bj: 2}, {k: 'towers', bi: 4, bj: 2},
  {k: 'towers', bi: 0, bj: 1}, {k: 'park', bi: 1, bj: 1}, {k: 'bus', bi: 2, bj: 1}, {k: 'mall', bi: 3, bj: 1}, {k: 'towers', bi: 4, bj: 1},
  {k: 'abroad', bi: 0, bj: 0}, {k: 'towers', bi: 1, bj: 0}, {k: 'mall', bi: 2, bj: 0}, {k: 'away', bi: 3, bj: 0}, {k: 'stadium', bi: 4, bj: 0},
]
/** the district's centre in tile units */
export const centreOf = (k: District): Pt => { const b = BOARD.find(x => x.k === k)!; return [b.bi * 5 + 2, b.bj * 5 + 2] }
/** the district's centre on screen */
export const screenOf = (k: District, z = 0): Pt => { const c = centreOf(k); return P(c[0], c[1], z) }
/** the screen box a set of districts fills (for the camera) */
export function boxOf(keys: District[]): {minx: number; miny: number; maxx: number; maxy: number} {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9
  for (const b of BOARD) {
    if (!keys.includes(b.k)) continue
    const x0 = b.bi * 5, y0 = b.bj * 5
    for (const [x, y, z] of [[x0, y0, 80], [x0 + 5, y0, 0], [x0 + 5, y0 + 5, 0], [x0, y0 + 5, 0]] as const) {
      const p = P(x, y, z); minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1])
    }
  }
  return {minx, miny, maxx, maxy}
}

function theme(c: string) {
  return {
    ol: '#2b3a4a', ow: 1, lf: .88, rf: .72, tf: 1.08, gnd: '#8fc27a', gnd2: '#86b972', road: '#6c7380', roadl: '#e9ecef',
    walls: ['#f1e6d2', '#e8d3c3', '#d9e4ea', '#efe0d6'], roofs: [c, shade(c, .78), '#3f6aa5', '#8a4b3d'], shops: ['#e9d7c4', '#d8e0ea', '#efd0c8'],
    red: c, cream: '#f6efe2', blue: '#4f86c6', grey: '#aeb7c2', stone: '#d7d2c6', water: '#6ec0dd', pitch: '#58a64e', line: '#f7f7f2',
    leaf: '#4d9a4a', trunk: '#7a5a3e', shadow: 'rgba(0,0,0,.14)', towers: ['#cfd8e3', '#b7c7dc', '#e6d9ce', '#c3ccd8', '#dfe6ef'], cloud: '#ffffff',
  }
}

function wins(xa: number, ya: number, xb: number, yb: number, h: number, rows: number, cols: number, cls: string) {
  let s = ''
  const pad = .14, q = (u: number, z: number) => P(xa + (xb - xa) * u, ya + (yb - ya) * u, z)
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const u0 = (c + pad) / cols, u1 = (c + 1 - pad) / cols, z0 = (r + .3) / rows * h * .84 + h * .08, z1 = z0 + h / rows * .36
    s += `<polygon class="${cls}" points="${pts([q(u0, z0), q(u1, z0), q(u1, z1), q(u0, z1)])}"/>`
  }
  return s
}
type BoxOpt = {win?: boolean; wh?: number; wc?: number; top?: string}
function box(x0: number, y0: number, w: number, d: number, h: number, col: string, T: Theme, o: BoxOpt = {}) {
  const x1 = x0 + w, y1 = y0 + d, ol = T.ol
  let s = poly([P(x0, y1), P(x1, y1), P(x1, y1, h), P(x0, y1, h)], shade(col, T.lf), ol, T.ow) + poly([P(x1, y1), P(x1, y0), P(x1, y0, h), P(x1, y1, h)], shade(col, T.rf), ol, T.ow)
  if (o.win !== false && h > 16) {
    const rows = Math.max(1, Math.floor(h / (o.wh || 12))), cc = Math.max(1, Math.round(d * (o.wc || 2.2))), cc2 = Math.max(1, Math.round(w * (o.wc || 2.2)))
    s += wins(x1, y0, x1, y1, h, rows, cc, 'w2') + wins(x0, y1, x1, y1, h, rows, cc2, 'w1')
  }
  return s + poly([P(x0, y0, h), P(x1, y0, h), P(x1, y1, h), P(x0, y1, h)], o.top || shade(col, T.tf), ol, T.ow)
}
function gable(x0: number, y0: number, w: number, d: number, h: number, r: number, wall: string, roof: string, T: Theme) {
  const x1 = x0 + w, y1 = y0 + d, ym = y0 + d / 2
  return box(x0, y0, w, d, h, wall, T, {wh: 11, wc: 1.5}) + poly([P(x1, y0, h), P(x1, y1, h), P(x1, ym, h + r)], shade(wall, T.rf), T.ol, T.ow) + poly([P(x0, y1, h), P(x1, y1, h), P(x1, ym, h + r), P(x0, ym, h + r)], roof, T.ol, T.ow)
}
function tree(x: number, y: number, hh: number, T: Theme) {
  const b = P(x, y), t = P(x, y, hh * .55), r = hh * .5 * SC * 1.3
  return `<ellipse cx="${b[0]}" cy="${b[1] + 1}" rx="${r * .7}" ry="${r * .32}" fill="${T.shadow}"/><line x1="${b[0]}" y1="${b[1]}" x2="${t[0]}" y2="${t[1]}" stroke="${T.trunk}" stroke-width="2.4" stroke-linecap="round"/><circle cx="${t[0]}" cy="${t[1] - r * .35}" r="${r}" fill="${T.leaf}" stroke="${T.ol}" stroke-width="${T.ow}"/><circle cx="${t[0] - r * .3}" cy="${t[1] - r * .6}" r="${r * .5}" fill="${shade(T.leaf, 1.15)}"/>`
}
function ell(cx: number, cy: number, r: number, z: number, fill: string, T: Theme, sw?: number, ol?: string | false) {
  const c = P(cx, cy, z)
  return `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${r * TW * 1.4142}" ry="${r * TH * 1.4142}" fill="${fill}"${ol === false ? '' : ` stroke="${ol || T.ol}" stroke-width="${sw || T.ow}"`}/>`
}
function cyl(cx: number, cy: number, r: number, h: number, col: string, T: Theme) {
  const a = P(cx, cy), rx = r * TW * 1.4142, ry = r * TH * 1.4142, hh = h * SC
  return `<path d="M${a[0] - rx},${a[1]} L${a[0] - rx},${a[1] - hh} A${rx},${ry} 0 0 0 ${a[0] + rx},${a[1] - hh} L${a[0] + rx},${a[1]} A${rx},${ry} 0 0 1 ${a[0] - rx},${a[1]}Z" fill="${shade(col, T.lf)}" stroke="${T.ol}" stroke-width="${T.ow}"/>` + ell(cx, cy, r, h, col, T)
}
function stripes(x0: number, y0: number, w: number, d: number, h: number, c1: string, c2: string, T: Theme) {
  let s = ''
  for (let i = 0; i < 5; i++) { const u0 = x0 + w * i / 5, u1 = x0 + w * (i + 1) / 5; s += poly([P(u0, y0 + d, h), P(u1, y0 + d, h), P(u1, y0 + d + .18, h - 5), P(u0, y0 + d + .18, h - 5)], i % 2 ? c2 : c1, T.ol, T.ow * .7) }
  return s
}
const car = (x: number, y: number, col: string, T: Theme, ew: boolean) => box(x, y, ew ? .55 : .28, ew ? .28 : .55, 7, col, T, {win: false, top: shade(col, 1.18)})

type Obj = {s: number; svg: string}
function scene(b: {k: District; bi: number; bj: number}, T: Theme, seed: number): Obj[] {
  const R = rng(seed + b.bi * 13 + b.bj * 7 + 1), o: Obj[] = [], ox = b.bi * 5, oy = b.bj * 5, k = b.k, W = T.walls, RF = T.roofs
  const add = (i: number, j: number, svg: string, dz = 0) => { o.push({s: i + j + dz, svg}) }
  if (k === 'home') {
    ;([[0, 0], [2, 0], [0, 2], [2, 2]] as const).forEach((q, n) => {
      const x = ox + q[0] + .2, y = oy + q[1] + .2
      if (n === 3) { add(x + 1, y + 1, tree(x + 1, y + 1, 24, T)); return }
      add(x + 1.5, y + 1.5, gable(x, y, 1.6, 1.4, 18 + R() * 8, 14, W[n % 4]!, RF[n % 4]!, T))
    })
    add(ox + 1.9, oy + 1.9, tree(ox + 1.9, oy + 1.9, 22, T)); add(ox + 3.7, oy + 2.3, tree(ox + 3.7, oy + 2.3, 19, T))
  }
  if (k === 'housing') {
    for (let a = 0; a < 2; a++) for (let c = 0; c < 2; c++) { const x = ox + .25 + a * 2, y = oy + .25 + c * 2; add(x + 1.5, y + 1.5, gable(x, y, 1.5, 1.4, 16 + R() * 12, 13, W[(a + c * 2) % 4]!, RF[(a * 2 + c + 1) % 4]!, T)) }
    add(ox + 2, oy + 2, tree(ox + 2, oy + 2, 22, T))
  }
  if (k === 'street') {
    for (let n = 0; n < 3; n++) { const x = ox + .1 + n * 1.3, y = oy + .15, h = 26 + n * 8; add(x + 1.2, y + 1.6, box(x, y, 1.2, 1.6, h, T.shops[n % 3]!, T) + stripes(x, y, 1.2, 1.6, 17, T.red, T.cream, T)) }
    add(ox + .8, oy + 2.9, car(ox + .5, oy + 2.8, T.red, T, true)); add(ox + 2.7, oy + 3.3, car(ox + 2.4, oy + 3.2, T.blue, T, true))
    add(ox + 3.5, oy + 3.4, tree(ox + 3.5, oy + 3.4, 17, T)); add(ox + 3.7, oy + 1.6, box(ox + 3.4, oy + .3, .5, 1.4, 24, W[1]!, T))
  }
  if (k === 'work') {
    add(ox + 2.5, oy + 2.4, box(ox + .2, oy + .3, 2.4, 1.9, 22, T.grey, T, {wc: 1.2}) + poly([P(ox + .2, oy + 2.2, 22), P(ox + 2.6, oy + 2.2, 22), P(ox + 2.6, oy + 2.2, 26), P(ox + .2, oy + 2.2, 26)], T.red, null))
    add(ox + 3.2, oy + 1.2, cyl(ox + 3.2, oy + .9, .3, 44, W[0]!, T)); add(ox + 3.2, oy + 3.2, box(ox + 2.8, oy + 2.8, .55, .55, 9, T.red, T, {win: false}) + box(ox + 3.4, oy + 2.9, .55, .55, 9, T.blue, T, {win: false}))
  }
  if (k === 'industry') {
    add(ox + 1.6, oy + 1.6, box(ox + .2, oy + .3, 2, 1.4, 18, T.grey, T, {wc: 1})); add(ox + 3.1, oy + 1.2, cyl(ox + 3.1, oy + .8, .3, 52, T.stone, T)); add(ox + 3.5, oy + 1.7, cyl(ox + 3.5, oy + 1.5, .25, 40, T.stone, T))
    for (let i = 0; i < 4; i++) add(ox + .6 + i * .8, oy + 3.2, box(ox + .4 + i * .8, oy + 2.9, .7, .5, 9, i % 2 ? T.red : T.blue, T, {win: false}))
  }
  if (k === 'school') {
    add(ox + 3.4, oy + 1.5, box(ox + .2, oy + .2, 3.4, 1.1, 24, W[0]!, T, {wc: 2.6})); add(ox + 1.7, oy + 1.8, box(ox + 1.3, oy + 1.2, .9, .9, 36, W[2]!, T, {wc: 1.4}))
    const f = P(ox + 1.75, oy + 1.65, 52)
    add(ox + 1.9, oy + 1.9, `<line x1="${f[0]}" y1="${f[1] + 12}" x2="${f[0]}" y2="${f[1]}" stroke="${T.ol}" stroke-width="1.8"/><polygon points="${f[0]},${f[1]} ${f[0] + 11},${f[1] + 3} ${f[0]},${f[1] + 6}" fill="${T.red}"/>`)
    add(ox + 3.6, oy + 3.4, tree(ox + 3.5, oy + 3.4, 18, T)); add(ox + .5, oy + 3.4, tree(ox + .5, oy + 3.4, 18, T))
  }
  if (k === 'plaza') {
    add(ox + 2, oy + 2, cyl(ox + 2, oy + 2, .8, 5, T.stone, T) + ell(ox + 2, oy + 2, .62, 5, T.water, T, T.ow * .6), 3)
    ;([[.5, .5], [3.5, .5], [.5, 3.5], [3.5, 3.5], [2, .3], [2, 3.7]] as const).forEach(q => add(ox + q[0], oy + q[1], tree(ox + q[0], oy + q[1], 19, T)))
  }
  if (k === 'pitch') {
    o.push({s: ox + oy - 3, svg: poly([P(ox + .2, oy + .2), P(ox + 3.8, oy + .2), P(ox + 3.8, oy + 3.8), P(ox + .2, oy + 3.8)], T.pitch, T.ol, T.ow) + poly([P(ox + .45, oy + .45, .3), P(ox + 3.55, oy + .45, .3), P(ox + 3.55, oy + 3.55, .3), P(ox + .45, oy + 3.55, .3)], 'none', T.line, 1.6) + `<polyline points="${pts([P(ox + 2, oy + .45, .3), P(ox + 2, oy + 3.55, .3)])}" stroke="${T.line}" stroke-width="1.6" fill="none"/>` + ell(ox + 2, oy + 2, .55, .3, 'none', T, 1.6, T.line)})
    add(ox + 3.8, oy + 1.4, box(ox + 3.8, oy + .9, .1, 1.2, 12, T.line, T, {win: false, top: T.line})); add(ox + .2, oy + 1.4, box(ox + .1, oy + .9, .1, 1.2, 12, T.line, T, {win: false, top: T.line}))
    add(ox + 3.9, oy + 3.9, box(ox + 3.3, oy + 3.9, .9, .4, 7, T.red, T, {win: false}))
  }
  if (k === 'bus') {
    add(ox + 3, oy + 1, box(ox + .3, oy + .4, 3.2, .9, 6, T.stone, T, {win: false}) + box(ox + .5, oy + .6, .1, .1, 26, T.ol, T, {win: false}) + box(ox + 3.1, oy + .6, .1, .1, 26, T.ol, T, {win: false}))
    add(ox + 3.4, oy + 1.4, poly([P(ox + .2, oy + .3, 28), P(ox + 3.6, oy + .3, 28), P(ox + 3.6, oy + 1.5, 28), P(ox + .2, oy + 1.5, 28)], T.red, T.ol, T.ow), 3)
    add(ox + 2, oy + 2.6, box(ox + .6, oy + 2.2, 2.1, .8, 16, T.blue, T, {wc: 3, wh: 9})); add(ox + 3.5, oy + 3.4, box(ox + 2.9, oy + 3.1, 1, .7, 14, T.red, T, {wc: 3, wh: 9}))
  }
  if (k === 'away') {
    add(ox + 2, oy + 1.8, box(ox + .3, oy + .4, 3.3, 1.3, 26, T.walls[2]!, T, {wc: 2.4}) + poly([P(ox + .3, oy + 1.7, 26), P(ox + 3.6, oy + 1.7, 26), P(ox + 3.6, oy + 1.7, 32), P(ox + .3, oy + 1.7, 32)], T.blue, null), 2)
    add(ox + 3, oy + 3, box(ox + .8, oy + 2.5, 1.5, .7, 15, T.blue, T, {wc: 3, wh: 9})); add(ox + 3.2, oy + 3.5, box(ox + 2.6, oy + 3.1, 1, .7, 14, T.cream, T, {wc: 3, wh: 9}))
  }
  if (k === 'stadium') {
    const cx = ox + 2, cy = oy + 2
    o.push({s: cx + cy - 2, svg: ell(cx, cy, 2, 0, T.stone, T)})
    o.push({s: cx + cy + .2, svg: cyl(cx, cy, 1.85, 38, T.walls[0]!, T) + ell(cx, cy, 1.55, 38, shade(T.red, .9), T) + ell(cx, cy, 1.18, 28, T.pitch, T) + ell(cx, cy, .55, 28, 'none', T, 1.4, T.line) + `<polyline points="${pts([P(cx - .8, cy - .8, 28), P(cx + .8, cy + .8, 28)])}" stroke="${T.line}" stroke-width="1.4" fill="none"/>`})
    ;([[-1.7, -.9], [1.7, .9], [-.9, 1.7], [1.8, -1.4]] as const).forEach(q => { const p = P(cx + q[0], cy + q[1]), h = 72 * SC; o.push({s: cx + q[0] + cy + q[1] + 1, svg: `<line x1="${p[0]}" y1="${p[1]}" x2="${p[0]}" y2="${p[1] - h}" stroke="${T.ol}" stroke-width="2.4"/><rect x="${p[0] - 8}" y="${p[1] - h - 5}" width="16" height="8" fill="${T.cream}" stroke="${T.ol}" stroke-width="${T.ow}"/>`}) })
    o.push({s: cx + cy + 3, svg: tree(ox + .3, oy + 3.7, 16, T) + tree(ox + 3.7, oy + 3.7, 16, T)})
  }
  if (k === 'abroad') {
    add(ox + 1, oy + 1, box(ox + .4, oy + .4, 1, 1, 92, T.blue, T, {wc: 2.5, wh: 10})); add(ox + 2.4, oy + 1.2, box(ox + 1.9, oy + .8, 1.1, 1.1, 56, W[2]!, T, {wc: 2.5, wh: 10}))
    add(ox + 1.3, oy + 2.6, box(ox + .6, oy + 2.2, 1.4, 1.1, 34, T.grey, T, {wc: 2.5, wh: 10})); add(ox + 3.2, oy + 3, box(ox + 2.7, oy + 2.5, 1, 1, 70, T.red, T, {wc: 2.5, wh: 10}))
  }
  if (k === 'towers') {
    for (let i = 0; i < 4; i++) { const x = ox + .2 + (i % 2) * 2, y = oy + .2 + Math.floor(i / 2) * 2, h = 48 + R() * 72; add(x + 1.5, y + 1.5, box(x, y, 1.5, 1.5, h, T.towers[(i + b.bi + b.bj) % 5]!, T, {wc: 2.2, wh: 10})) }
  }
  if (k === 'mall') {
    add(ox + 2.5, oy + 1.8, box(ox + .3, oy + .3, 3.2, 1.6, 22, T.walls[3]!, T, {wc: 2}) + stripes(ox + .3, oy + .3, 3.2, 1.6, 15, T.red, T.cream, T))
    for (let i = 0; i < 5; i++) add(ox + .6 + i * .65, oy + 3.1, car(ox + .5 + i * .65, oy + 3, [T.red, T.blue, T.cream, T.grey, T.red][i]!, T, false))
    add(ox + 3.8, oy + 3.6, tree(ox + 3.8, oy + 3.6, 16, T))
  }
  if (k === 'park') {
    o.push({s: ox + oy - 2, svg: ell(ox + 2, oy + 2, 1.3, 0, T.water, T)})
    ;([[.5, .6], [3.4, .5], [.6, 3.3], [3.4, 3.4], [2, 3.7], [3.8, 2], [.3, 2], [1.2, .3], [2.8, .3]] as const).forEach(q => add(ox + q[0], oy + q[1], tree(ox + q[0], oy + q[1], 20 + R() * 8, T)))
  }
  if (k === 'river') for (let i = 0; i < 3; i++) add(ox + 1 + i, oy + .9, tree(ox + .8 + i * 1.4, oy + .35, 18, T), -1)
  return o
}

export type Iso = {
  /** everything that does not move, as markup; every group carries `data-k` */
  html: string
  /** the skyline, which belongs to no district */
  sky: string
  /** the reachable roads, as screen-space paths between district centres */
  road: (a: District, b: District) => string
}

export function buildIso(club: string, seed = 11): Iso {
  const T = theme(club), ground: string[] = [], all: {k: District; s: number; svg: string}[] = []
  const at = (i: number, j: number) => BOARD.find(b => b.bi === Math.floor(i / 5) && b.bj === Math.floor(j / 5))
  for (let s = 0; s < NI + NJ - 1; s++) for (let i = 0; i < NI; i++) {
    const j = s - i; if (j < 0 || j >= NJ) continue
    const road = i % 5 === 4 || j % 5 === 4, blk = road ? null : at(i, j) ?? null
    let fill = road ? T.road : (i + j) % 2 ? T.gnd2 : T.gnd
    if (blk) {
      const kk = blk.k
      if (['plaza', 'bus', 'stadium', 'away', 'mall', 'towers', 'abroad', 'street', 'work', 'school', 'industry'].includes(kk)) fill = (i + j) % 2 ? T.stone : shade(T.stone, .96)
      if (kk === 'river') fill = (i + j) % 2 ? T.water : shade(T.water, 1.06)
      if (kk === 'industry') fill = (i + j) % 2 ? shade(T.grey, 1.05) : T.grey
    }
    let g = `<polygon points="${pts([P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)])}" fill="${fill}"/>`
    if (road && i % 5 === 4 && j % 5 !== 4 && j % 2 === 0) g += `<polyline points="${pts([P(i + .5, j + .2), P(i + .5, j + .8)])}" stroke="${T.roadl}" stroke-width="1.2" fill="none"/>`
    if (road && j % 5 === 4 && i % 5 !== 4 && i % 2 === 0) g += `<polyline points="${pts([P(i + .2, j + .5), P(i + .8, j + .5)])}" stroke="${T.roadl}" stroke-width="1.2" fill="none"/>`
    ground.push(`<g class="tile" data-k="${blk ? blk.k + blk.bi + blk.bj : 'road'}">${g}</g>`)
  }
  for (const b of BOARD) for (const o of scene(b, T, seed)) all.push({k: b.k, s: o.s, svg: o.svg})
  all.sort((a, b) => a.s - b.s)
  const keyed = (b: {k: District; bi: number; bj: number}) => b.k + b.bi + b.bj
  // objects are sorted across the whole board, so each one carries the key of its own block
  const objs = BOARD.flatMap(b => scene(b, T, seed).map(o => ({key: keyed(b), s: o.s, svg: o.svg}))).sort((a, b) => a.s - b.s)
    .map(o => `<g class="obj" data-k="${o.key}">${o.svg}</g>`).join('')
  let fogs = ''
  for (const b of BOARD) {
    const c = P(b.bi * 5 + 2, b.bj * 5 + 2), rr = rng(b.bi * 31 + b.bj * 17 + 5)
    let f = ''
    for (let n = 0; n < 9; n++) { const dx = (rr() - .5) * 120, dy = (rr() - .5) * 40 - 6, r1 = 26 + rr() * 20; f += `<ellipse cx="${c[0] + dx}" cy="${c[1] + dy + 6}" rx="${r1}" ry="${r1 * .52}" fill="rgba(60,90,120,.16)"/>` }
    for (let m = 0; m < 9; m++) { const ex = (rr() - .5) * 120, ey = (rr() - .5) * 40 - 10, er = 26 + rr() * 20; f += `<ellipse cx="${c[0] + ex}" cy="${c[1] + ey}" rx="${er}" ry="${er * .52}" fill="${T.cloud}" opacity=".96"/>` }
    fogs += `<g class="fog" data-k="${keyed(b)}">${f}</g>`
  }
  const r = rng(77), SK = {...T, ol: 'none', ow: 0, lf: .94, rf: .84, tf: 1.03}
  let sky = ''
  const SKC = ['#bccbdb', '#aebfd2', '#c9d5e2']
  for (let n = 0; n < 40; n++) { const x = n * .62 - .5, w = .5 + r() * .6, h = 26 + r() * 52; sky += box(x, -3.6 - r() * 1.2, w, w, h, SKC[n % 3]!, SK, {win: false}) }
  for (let n = 0; n < 34; n++) { const y = n * .6 - .5, w = .5 + r() * .6, h = 26 + r() * 52; sky += box(-3.6 - r() * 1.2, y, w, w, h, SKC[n % 3]!, SK, {win: false}) }
  let cars = ''
  const C = [T.red, T.blue, T.cream, T.grey], o0 = P(0, 0)
  for (let q = 0; q < 10; q++) {
    const vert = q % 2 === 0, rd = (vert ? [4.5, 9.5, 14.5, 19.5, 24.5] : [4.5, 9.5, 14.5, 19.5])[Math.floor(r() * (vert ? 5 : 4))]!
    const a = vert ? P(rd, 0) : P(0, rd), b2 = vert ? P(rd, NJ) : P(NI, rd), fwd = q % 4 < 2
    const p0 = vert ? (fwd ? b2 : a) : (fwd ? a : b2), p1 = vert ? (fwd ? a : b2) : (fwd ? b2 : a)
    cars += `<g class="drive" transform="translate(${-o0[0]},${-o0[1]})">${box(0, 0, vert ? .28 : .55, vert ? .55 : .28, 7, C[q % 4]!, T, {win: false, top: shade(C[q % 4]!, 1.18)})}<animateMotion dur="${18 + q * 3}s" repeatCount="indefinite" begin="-${q * 4}s" path="M${p0[0].toFixed(0)},${p0[1].toFixed(0)} L${p1[0].toFixed(0)},${p1[1].toFixed(0)}"/></g>`
  }
  const road = (a: District, b: District) => {
    const A = centreOf(a), B = centreOf(b), ba = BOARD.find(x => x.k === a)!, bb = BOARD.find(x => x.k === b)!
    const ra = ba.bj > 0 ? ba.bj * 5 - .5 : 4.5, rb = bb.bi > 0 ? bb.bi * 5 - .5 : 4.5
    const path: Pt[] = [A, [A[0], ra], [rb, ra], [rb, B[1]], B]
    return `M${path.map(p => { const q = P(p[0], p[1], 1); return `${q[0].toFixed(1)},${q[1].toFixed(1)}` }).join(' L')}`
  }
  void all
  return {html: ground.join('') + cars + objs + fogs, sky: `<g opacity=".7">${sky}</g>`, road}
}
/** the colours the shell cannot read from a token: the sky behind the board and the lit windows */
export const SKY = {day: ['#bfe1ee', '#e5f4f7'], night: ['#0e1830', '#27345a']} as const
export const WINDOW = {day: ['#bfe0f4', '#9cc7e6'], night: ['#e9f4ff', '#cfe6ff']} as const
export const FALLBACK_CLUB = '#c8452d'
export const isoKey = (k: District) => { const b = BOARD.find(x => x.k === k)!; return k + b.bi + b.bj }
