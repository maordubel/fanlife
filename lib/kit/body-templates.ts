import type { KitPlacement } from './assembly'

export type KitBodyTemplateId =
  | 'retro-70s-boxy'
  | 'retro-80s-long'
  | 'retro-90s-boxy'
  | 'early-2000s-athletic'
  | '2010s-fitted'
  | 'modern-athletic'

export type KitBodyTemplate = {
  id: KitBodyTemplateId
  labelHe: string
  yearFrom: number
  yearTo: number
  viewBox: string
  bodyPath: string
  leftSleevePath: string
  rightSleevePath: string
  leftSleeveSeam: string
  rightSleeveSeam: string
  hemPath: string
  cuffLeftPath: string
  cuffRightPath: string
  neck: { cx: number; cy: number; width: number; depth: number }
  anchors: Record<'maker' | 'crest' | 'sponsor', KitPlacement>
  /** where a raglan/yoke construction meets the body */
  shoulderPanelLeft: string
  shoulderPanelRight: string
  /** delta 88: the top line of each sleeve, neck to cuff (three stripes over the shoulder) */
  sleeveTopLeft: string
  sleeveTopRight: string
  /** delta 88: a side panel along each side seam */
  sidePanelLeft: string
  sidePanelRight: string
}

/**
 * Canonical garment anatomy. These are NOT season designs: they are sewing silhouettes.
 * Historical surface details (pattern, colours, marks) are layered on top by KitEngine.
 * Keeping anatomy separate is the key to avoiding one generic T-shirt for 50 years.
 *
 * Delta 88 (24.9.2026) — Maor: *"החולצות ניראות מגוכחות בגרפיקה"*. The old outlines were drawn
 * by hand and read as a narrow tunic with wings: a torso 0.44 as wide as it was long, sleeves
 * straight out in a T, and a neck ring floating above the shoulder line. A real shirt laid
 * flat (the fka-* / vp-* photographs in `public/kits/`) is about 0.68 as wide as it is long,
 * its sleeves fall 35–50° below the shoulder line, and the collar sits IN the neckline.
 * So every cut is now built by `cut()` from a handful of sewing measurements, measured off
 * those photographs, and the paths follow from them — one set of proportions, six eras.
 */
type Pt = readonly [number, number]
type CutSpec = {
  id: KitBodyTemplateId
  labelHe: string
  yearFrom: number
  yearTo: number
  /** half the neck opening, the neck edge's y, and how far the front neckline drops */
  neck: { half: number; y: number; depth: number }
  /** the shoulder point (left side, board units) — the shoulder line runs from the neck edge to it */
  shoulder: Pt
  /** where the sleeve meets the side seam */
  armpit: Pt
  /** the narrowest point of the side seam (a fitted cut draws in, a boxy one does not) */
  waist: Pt
  /** the side seam at the hem, and how much the hem curves down at the centre */
  hem: Pt
  hemDrop: number
  /** the sleeve's cuff: the outer (top-edge) corner and the inner (underarm) corner */
  cuffOuter: Pt
  cuffInner: Pt
  anchors: Record<'maker' | 'crest' | 'sponsor', KitPlacement>
}

const CX = 180
const f = (n: number) => Number(n.toFixed(1))
const mirror = ([x, y]: Pt): Pt => [2 * CX - x, y]
const pt = ([x, y]: Pt) => `${f(x)} ${f(y)}`
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

function cut(c: CutSpec): KitBodyTemplate {
  const nL: Pt = [CX - c.neck.half, c.neck.y]
  const nR = mirror(nL)
  const sL = c.shoulder, sR = mirror(sL)
  const aL = c.armpit, aR = mirror(aL)
  const wL = c.waist, wR = mirror(wL)
  const hL = c.hem, hR = mirror(hL)
  const oL = c.cuffOuter, oR = mirror(oL)
  const iL = c.cuffInner, iR = mirror(iL)
  // the armhole bows outward a little between the shoulder point and the armpit
  const armCtl = (s: Pt, a: Pt, side: 1 | -1): Pt => [(s[0] + a[0]) / 2 - side * 6, (s[1] + a[1]) / 2]
  const backNeckY = c.neck.y + c.neck.depth * 0.22
  const bodyPath = [
    `M${pt(nL)}`,
    // the shoulder line, very slightly convex
    `Q${pt([(nL[0] + sL[0]) / 2, (nL[1] + sL[1]) / 2 - 2])} ${pt(sL)}`,
    `Q${pt(armCtl(sL, aL, 1))} ${pt(aL)}`,
    `Q${pt(wL)} ${pt(lerp(wL, hL, 0.55))}`,
    `L${pt(hL)}`,
    `Q${pt([CX, hL[1] + c.hemDrop * 2])} ${pt(hR)}`,
    `L${pt(lerp(wR, hR, 0.55))}`,
    `Q${pt(wR)} ${pt(aR)}`,
    `Q${pt(armCtl(sR, aR, -1))} ${pt(sR)}`,
    `Q${pt([(nR[0] + sR[0]) / 2, (nR[1] + sR[1]) / 2 - 2])} ${pt(nR)}`,
    // the BACK neckline: the front one is the collar's, drawn over this
    `Q${pt([CX, backNeckY + c.neck.depth * 0.1])} ${pt(nL)}Z`,
  ].join('')
  const sleeve = (s: Pt, o: Pt, i: Pt, a: Pt, side: 1 | -1) => {
    // the top edge falls from the shoulder in a soft curve; the underarm edge runs back to the armpit
    const top: Pt = [(s[0] + o[0]) / 2 - side * 4, (s[1] + o[1]) / 2 - 3]
    const under: Pt = [(i[0] + a[0]) / 2 + side * 2, (i[1] + a[1]) / 2 + 2]
    return `M${pt(s)}Q${pt(top)} ${pt(o)}L${pt(i)}Q${pt(under)} ${pt(a)}Q${pt(armCtl(s, a, side))} ${pt(s)}Z`
  }
  const seam = (s: Pt, a: Pt, side: 1 | -1) => `M${pt(s)}Q${pt(armCtl(s, a, side))} ${pt(a)}`
  // a cuff band: the cuff edge moved back up the sleeve by `inset`
  const cuffLine = (o: Pt, i: Pt, s: Pt, a: Pt, inset: number) => {
    const oo = lerp(o, s, inset / Math.hypot(s[0] - o[0], s[1] - o[1]))
    const ii = lerp(i, a, inset / Math.hypot(a[0] - i[0], a[1] - i[1]))
    return `M${pt(oo)}L${pt(ii)}`
  }
  // along the top of the sleeve, from the neck to the cuff (the three stripes of an 80s shirt)
  // (moved 11 units inside the outline, so a stroke along it lies on the cloth, not over the edge)
  const topLine = (n: Pt, s: Pt, o: Pt, i: Pt) => {
    const dx = o[0] - s[0], dy = o[1] - s[1], len = Math.hypot(dx, dy)
    let nx = -dy / len, ny = dx / len
    if (nx * (i[0] - o[0]) + ny * (i[1] - o[1]) < 0) { nx = -nx; ny = -ny }
    const k = 11
    const sh = (p: Pt): Pt => [p[0] + nx * k, p[1] + ny * k]
    const a = lerp(n, s, 0.3), b = lerp(n, s, 0.3)
    return `M${pt([a[0], b[1] + k])}L${pt(sh(s))}L${pt(sh(lerp(s, o, 0.97)))}`
  }
  const raglan = (n: Pt, s: Pt, a: Pt, side: 1 | -1) => {
    const inner: Pt = [n[0] + side * 6, n[1] + 4]
    return `M${pt(inner)}L${pt(n)}Q${pt([(n[0] + s[0]) / 2, (n[1] + s[1]) / 2 - 2])} ${pt(s)}Q${pt(armCtl(s, a, side))} ${pt(a)}Q${pt([(inner[0] + a[0]) / 2 + side * 10, (inner[1] + a[1]) / 2 - 6])} ${pt(inner)}Z`
  }
  const sidePanel = (a: Pt, w: Pt, h: Pt, side: 1 | -1, width: number) => {
    const d = side * width
    return `M${pt(a)}Q${pt(w)} ${pt(lerp(w, h, 0.55))}L${pt(h)}L${pt([h[0] + d, h[1] + 2])}L${pt([lerp(w, h, 0.55)[0] + d, lerp(w, h, 0.55)[1]])}Q${pt([w[0] + d, w[1]])} ${pt([a[0] + d * 0.8, a[1] + 10])}Z`
  }
  const hemIn = 11
  return {
    id: c.id, labelHe: c.labelHe, yearFrom: c.yearFrom, yearTo: c.yearTo,
    viewBox: '0 0 360 420',
    bodyPath,
    leftSleevePath: sleeve(sL, oL, iL, aL, 1),
    rightSleevePath: sleeve(sR, oR, iR, aR, -1),
    leftSleeveSeam: seam(sL, aL, 1),
    rightSleeveSeam: seam(sR, aR, -1),
    hemPath: `M${pt([hL[0] + 1.5, hL[1] - hemIn])}Q${pt([CX, hL[1] - hemIn + c.hemDrop * 2])} ${pt([hR[0] - 1.5, hR[1] - hemIn])}`,
    cuffLeftPath: cuffLine(oL, iL, sL, aL, 7),
    cuffRightPath: cuffLine(oR, iR, sR, aR, 7),
    neck: { cx: CX, cy: c.neck.y, width: c.neck.half * 2, depth: c.neck.depth },
    anchors: c.anchors,
    shoulderPanelLeft: raglan(nL, sL, aL, 1),
    shoulderPanelRight: raglan(nR, sR, aR, -1),
    sleeveTopLeft: topLine(nL, sL, oL, iL),
    sleeveTopRight: topLine(nR, sR, oR, iR),
    sidePanelLeft: sidePanel(aL, wL, hL, 1, 22),
    sidePanelRight: sidePanel(aR, wR, hR, -1, 22),
  }
}

const RAW: CutSpec[] = [
  {
    // wide and square, short sleeves cut straight — the 1950s–70s cotton shirt
    id: 'retro-70s-boxy', labelHe: 'גזרת שנות ה־70', yearFrom: 1949, yearTo: 1982,
    neck: { half: 30, y: 50, depth: 26 },
    shoulder: [72, 70], armpit: [66, 158], waist: [66, 262], hem: [67, 388], hemDrop: 2,
    cuffOuter: [14, 168], cuffInner: [54, 196],
    anchors: { maker: { x: 29, y: 22, w: 11, h: 9 }, crest: { x: 59, y: 20, w: 14, h: 16 }, sponsor: { x: 27, y: 39, w: 46, h: 14 } },
  },
  {
    // long sleeves falling close to the body, a longer, slightly flared body — mid-80s adidas
    id: 'retro-80s-long', labelHe: 'גזרת אמצע שנות ה־80', yearFrom: 1983, yearTo: 1989,
    neck: { half: 31, y: 48, depth: 28 },
    shoulder: [76, 70], armpit: [72, 156], waist: [74, 262], hem: [72, 392], hemDrop: 3,
    cuffOuter: [16, 340], cuffInner: [54, 346],
    anchors: { maker: { x: 29, y: 22, w: 11, h: 9 }, crest: { x: 59, y: 20, w: 14, h: 16 }, sponsor: { x: 26, y: 40, w: 48, h: 16 } },
  },
  {
    // the baggy 90s: the widest body, dropped shoulders, sleeves to the elbow
    id: 'retro-90s-boxy', labelHe: 'גזרת שנות ה־90', yearFrom: 1990, yearTo: 1999,
    neck: { half: 32, y: 48, depth: 26 },
    shoulder: [64, 78], armpit: [60, 176], waist: [62, 270], hem: [62, 392], hemDrop: 2,
    cuffOuter: [4, 196], cuffInner: [44, 228],
    anchors: { maker: { x: 28, y: 22, w: 13, h: 10 }, crest: { x: 59, y: 20, w: 15, h: 16 }, sponsor: { x: 26, y: 40, w: 48, h: 17 } },
  },
  {
    id: 'early-2000s-athletic', labelHe: 'גזרת תחילת שנות ה־2000', yearFrom: 2000, yearTo: 2007,
    neck: { half: 30, y: 48, depth: 25 },
    shoulder: [72, 70], armpit: [70, 158], waist: [76, 260], hem: [72, 390], hemDrop: 3,
    cuffOuter: [16, 170], cuffInner: [54, 198],
    anchors: { maker: { x: 29, y: 22, w: 12, h: 9 }, crest: { x: 59, y: 20, w: 15, h: 16 }, sponsor: { x: 27, y: 40, w: 46, h: 16 } },
  },
  {
    // drawn in at the waist
    id: '2010s-fitted', labelHe: 'גזרה צמודה 2008–2016', yearFrom: 2008, yearTo: 2016,
    neck: { half: 29, y: 48, depth: 24 },
    shoulder: [76, 68], armpit: [76, 152], waist: [86, 258], hem: [80, 388], hemDrop: 3,
    cuffOuter: [22, 160], cuffInner: [60, 186],
    anchors: { maker: { x: 29, y: 22, w: 13, h: 9 }, crest: { x: 59, y: 20, w: 15, h: 16 }, sponsor: { x: 28, y: 40, w: 44, h: 16 } },
  },
  {
    // straight athletic body, short sleeves
    id: 'modern-athletic', labelHe: 'גזרה מודרנית', yearFrom: 2017, yearTo: 2100,
    neck: { half: 28, y: 48, depth: 22 },
    shoulder: [76, 66], armpit: [76, 150], waist: [82, 258], hem: [78, 388], hemDrop: 2,
    cuffOuter: [24, 152], cuffInner: [62, 178],
    anchors: { maker: { x: 29, y: 21, w: 12, h: 9 }, crest: { x: 59, y: 19, w: 15, h: 16 }, sponsor: { x: 28, y: 39, w: 44, h: 16 } },
  },
]

export const BODY_TEMPLATES = Object.fromEntries(RAW.map((row) => [row.id, cut(row)])) as Record<KitBodyTemplateId, KitBodyTemplate>

const SEASON_TEMPLATE_OVERRIDES: Record<string, KitBodyTemplateId> = {
  '1985/86': 'retro-80s-long',
  '2009/10': '2010s-fitted',
}

export function bodyTemplateForSeason(seasonLabel: string): KitBodyTemplate {
  const override = SEASON_TEMPLATE_OVERRIDES[seasonLabel]
  if (override) return BODY_TEMPLATES[override]
  const year = Number(seasonLabel.slice(0, 4))
  if (!Number.isFinite(year)) return BODY_TEMPLATES['modern-athletic']
  return Object.values(BODY_TEMPLATES).find((row) => year >= row.yearFrom && year <= row.yearTo) ?? BODY_TEMPLATES['modern-athletic']
}
