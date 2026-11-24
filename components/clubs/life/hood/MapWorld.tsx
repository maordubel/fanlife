'use client'
/**
 * LIFE · the game — the district drawn from above at dusk: roofs, courtyards, streets with lanes and crossings, parked cars,
 * trees, the neighbourhood pitch, the school yard, the kiosk and the ground as a stadium. Everything comes from the level's
 * own data (`districtModel`); colours live in hood.module.css classes, never here. Deterministic from the level seed.
 */
import {memo, useMemo} from 'react'
import type {DistrictModel, Rect} from '@/lib/life/hood/district'
import css from './hood.module.css'

type Dot = {x: number; y: number; r: number; v: number}
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
const inRect = (r: Rect, x: number, y: number, pad = 0) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad

type Scene = {far: Rect[]; trees: Dot[]; cars: {x: number; y: number; v: number}[]; lamps: {x: number; y: number}[]; zebras: number[]; mainW: number; crossings: number[]; farTrees: Dot[]}

function build(m: DistrictModel, seed: number, crossings: number[], half: number, walk: number): Scene {
  const r = mulberry(seed * 977 + 13), b = m.bounds
  const far: Rect[] = []
  // the city beyond the hood, in haze: blocks on a loose grid around it
  for (let x = -330; x < 330; x += 31) for (let y = b.y - 150; y < b.y + b.h + 150; y += 29) {
    if (x > b.x - 6 && x < b.x + b.w + 6 && y > b.y - 30 && y < b.y + b.h + 8) continue
    const w = 18 + r() * 10, h = 17 + r() * 9
    far.push({x: x + r() * 4, y: y + r() * 4, w, h})
  }
  const trees: Dot[] = [], cars: Scene['cars'] = [], lamps: Scene['lamps'] = [], farTrees: Dot[] = []
  const nearCross = (y: number, d: number) => crossings.some(c => Math.abs(y - c) < d)
  const top = b.y + 52, bot = b.y + b.h - 4
  for (let y = top; y < bot; y += 8.5 + r() * 3) for (const sd of [-1, 1]) {
    if (nearCross(y, 9.5)) continue
    trees.push({x: sd * (walk - 1.5 + (r() - 0.5) * 0.6), y, r: 2 + r() * 0.9, v: Math.floor(r() * 3)})
  }
  for (let y = top + 6; y < bot - 6; y += 13 + r() * 9) for (const sd of [-1, 1]) {
    if (nearCross(y, 11) || r() < 0.4) continue
    cars.push({x: sd * (half - 1.3), y, v: Math.floor(r() * 6)})
  }
  for (let y = top + 4; y < bot; y += 22) for (const sd of [-1, 1]) lamps.push({x: sd * (half + 0.6), y})
  for (let i = 0; i < 90; i++) { const x = (r() - 0.5) * 560, y = b.y - 140 + r() * (b.h + 280); if (!inRect(b, x, y, 10)) farTrees.push({x, y, r: 2.2 + r() * 1.6, v: Math.floor(r() * 3)}) }
  const zebras = crossings.flatMap(c => [c - 12.4, c + 9.8])
  return {far, trees, cars, lamps, zebras, mainW: half, crossings, farTrees}
}

function Stadium({g, accent}: {g: Rect; accent: string}) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2, pw = g.w - 26, ph = g.h - 18, px = g.x + 13, py = g.y + 9
  const masts: [number, number][] = [[g.x + 3, g.y + 3], [g.x + g.w - 3, g.y + 3], [g.x + 3, g.y + g.h - 3], [g.x + g.w - 3, g.y + g.h - 3]]
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={g.w * 0.78} ry={g.h * 0.95} fill="url(#lgGlowG)" />
      <rect x={g.x + 2.5} y={g.y + 3} width={g.w} height={g.h} rx={11} className={css.lgMShadow} />
      <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={11} className={css.lgMBowl} />
      <rect x={g.x + 3} y={g.y + 3} width={g.w - 6} height={g.h - 6} rx={9} className={css.lgMSeats} style={{fill: accent}} opacity={0.55} />
      <rect x={g.x + 6} y={g.y + 5.5} width={g.w - 12} height={g.h - 11} rx={7} className={css.lgMSeats2} />
      <path className={css.lgMRoofG} fillRule="evenodd" d={`M${g.x} ${g.y + 11}a11 11 0 0 1 11 -11h${g.w - 22}a11 11 0 0 1 11 11v${g.h - 22}a11 11 0 0 1 -11 11h${-(g.w - 22)}a11 11 0 0 1 -11 -11z M${g.x + 8} ${g.y + 18}a7 7 0 0 0 -0 0v${g.h - 36}a7 7 0 0 0 7 7h${g.w - 30}a7 7 0 0 0 7 -7v${-(g.h - 36)}a7 7 0 0 0 -7 -7h${-(g.w - 30)}z`} />
      <rect x={g.x + 1.2} y={g.y + 1.2} width={g.w - 2.4} height={g.h - 2.4} rx={10} className={css.lgMRoofSeg} />
      <rect x={px} y={py} width={pw} height={ph} rx={1.2} className={css.lgMGrass} />
      {Array.from({length: 9}, (_, i) => i % 2 ? <rect key={i} x={px + (pw / 9) * i} y={py} width={pw / 9} height={ph} className={css.lgMMow} /> : null)}
      <g className={css.lgMLine}>
        <rect x={px + 1.2} y={py + 1.2} width={pw - 2.4} height={ph - 2.4} />
        <line x1={cx} x2={cx} y1={py + 1.2} y2={py + ph - 1.2} />
        <circle cx={cx} cy={cy} r={Math.min(pw, ph) * 0.17} />
        <rect x={px + 1.2} y={cy - ph * 0.3} width={pw * 0.14} height={ph * 0.6} />
        <rect x={px + pw - 1.2 - pw * 0.14} y={cy - ph * 0.3} width={pw * 0.14} height={ph * 0.6} />
        <rect x={px + 1.2} y={cy - ph * 0.14} width={pw * 0.05} height={ph * 0.28} />
        <rect x={px + pw - 1.2 - pw * 0.05} y={cy - ph * 0.14} width={pw * 0.05} height={ph * 0.28} />
      </g>
      {masts.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={13} fill="url(#lgGlowF)" className={css.lgMFlood} /><circle cx={x} cy={y} r={1.5} className={css.lgMMast} /><path d={`M${x - 3} ${y}h6M${x} ${y - 3}v6`} className={css.lgMBeam} /></g>)}
      <rect x={cx - 9} y={g.y + g.h - 2.4} width={18} height={3.4} rx={1} className={css.lgMGate} />
    </g>
  )
}

function Tree({t}: {t: Dot}) {
  return <g><circle cx={t.x + t.r * 0.55} cy={t.y + t.r * 0.6} r={t.r} className={css.lgMShadow} /><circle cx={t.x} cy={t.y} r={t.r} className={[css.lgMTree0, css.lgMTree1, css.lgMTree2][t.v]} /><circle cx={t.x - t.r * 0.3} cy={t.y - t.r * 0.3} r={t.r * 0.55} className={css.lgMTreeHi} /></g>
}

/** the town's painted aerial (the Flow bake), laid under the drawing; `world` is the rect it covers in metres, else the district */
export type MapAerial = {href: string; world: {x: number; y: number; w: number; h: number} | null}

export const MapWorld = memo(function MapWorld({model, seed, crossings, half, walk, accent, schoolAt, aerial = null}: {model: DistrictModel; seed: number; crossings: number[]; half: number; walk: number; accent: string; schoolAt: {x: number; y: number} | null; aerial?: MapAerial | null}) {
  const sc = useMemo(() => build(model, seed, crossings, half, walk), [model, seed, crossings, half, walk])
  const b = model.bounds
  const mains = model.streets.filter(s => s.w < 30), sides = model.streets.filter(s => s.w >= 30)
  const roofCls = [css.lgMRoof0, css.lgMRoof1, css.lgMRoof2, css.lgMRoof3, css.lgMRoof4, css.lgMRoof5]
  return (
    <g>
      <defs>
        <radialGradient id="lgGlowL"><stop offset="0" className={css.lgMLampA} /><stop offset="1" className={css.lgMLampB} /></radialGradient>
        <radialGradient id="lgGlowF"><stop offset="0" className={css.lgMFloodA} /><stop offset="1" className={css.lgMFloodB} /></radialGradient>
        <radialGradient id="lgGlowG"><stop offset="0" className={css.lgMGroundA} /><stop offset="1" className={css.lgMGroundB} /></radialGradient>
        <radialGradient id="lgHaze" cx="0" cy={b.y + b.h / 2} r={b.h * 0.62} gradientUnits="userSpaceOnUse" gradientTransform={`translate(0 ${b.y + b.h / 2}) scale(0.62 1) translate(0 ${-(b.y + b.h / 2)})`}><stop offset="0.55" className={css.lgMHazeA} /><stop offset="1" className={css.lgMHazeB} /></radialGradient>
        <pattern id="lgTiles" width="2.2" height="1.6" patternUnits="userSpaceOnUse"><path d="M0 1.6H2.2M1.1 0V1.6" className={css.lgMTileLine} /></pattern>
      </defs>
      <rect x={-700} y={b.y - 500} width={1400} height={b.h + 1000} className={css.lgMGround} />
      {/* the city beyond, faded into haze */}
      {sc.far.map((r, i) => <g key={i}><rect x={r.x + 2} y={r.y + 2} width={r.w} height={r.h} className={css.lgMShadow} /><rect x={r.x} y={r.y} width={r.w} height={r.h} rx={1} className={roofCls[i % 6]} /><rect x={r.x} y={r.y} width={r.w} height={r.h} fill="url(#lgTiles)" /></g>)}
      {sc.farTrees.map((t, i) => <Tree key={i} t={t} />)}
      <rect x={-700} y={b.y - 500} width={1400} height={b.h + 1000} fill="url(#lgHaze)" />
      {/* the painted aerial under the streets, at a third: the drawing on top keeps every street and pin crisp */}
      {aerial && <image href={aerial.href} x={(aerial.world ?? b).x} y={(aerial.world ?? b).y} width={(aerial.world ?? b).w} height={(aerial.world ?? b).h} preserveAspectRatio="xMidYMid slice" opacity={0.35} className={css.lgMAerial} />}
      {/* pavements, then roads */}
      {model.streets.map((s, i) => <rect key={i} x={s.x - 0.8} y={s.y - 0.8} width={s.w + 1.6} height={s.h + 1.6} rx={1.5} className={css.lgMWalk} />)}
      {mains.map((s, i) => <rect key={i} x={-sc.mainW} y={s.y} width={sc.mainW * 2} height={s.h} className={css.lgMRoad} />)}
      {sides.map((s, i) => <rect key={i} x={s.x} y={s.y + 1.7} width={s.w} height={s.h - 3.4} className={css.lgMRoad} />)}
      {/* lane markings */}
      {mains.map((s, i) => <g key={i}><line x1={0} x2={0} y1={s.y} y2={s.y + s.h} className={css.lgMLaneC} /><line x1={-sc.mainW + 0.5} x2={-sc.mainW + 0.5} y1={s.y} y2={s.y + s.h} className={css.lgMLaneE} /><line x1={sc.mainW - 0.5} x2={sc.mainW - 0.5} y1={s.y} y2={s.y + s.h} className={css.lgMLaneE} /></g>)}
      {sides.map((s, i) => <line key={i} x1={s.x + 1} x2={s.x + s.w - 1} y1={s.y + s.h / 2} y2={s.y + s.h / 2} className={css.lgMLaneC} />)}
      {sc.zebras.map((z, k) => <g key={k}>{Array.from({length: 8}, (_, i) => <rect key={i} x={-sc.mainW + 0.9 + i * 1.65} y={z} width={0.95} height={2.6} className={css.lgMZebra} />)}</g>)}
      {/* the blocks, each its own roof */}
      {model.blocks.map((bl, i) => {
        const big = bl.w > 20 && bl.h > 15, v = (i * 5 + bl.tone * 2) % 6, ix = bl.x + bl.w * 0.5, mainSide = bl.x < 0 ? bl.x + bl.w : bl.x
        return (
          <g key={i}>
            <rect x={bl.x + 2.6} y={bl.y + 2.2} width={bl.w} height={bl.h} rx={1.2} className={css.lgMShadow} />
            <rect x={bl.x - 0.4} y={bl.y - 0.4} width={bl.w + 0.8} height={bl.h + 0.8} rx={1.4} className={css.lgMWall} />
            <rect x={bl.x + 0.7} y={bl.y + 0.7} width={bl.w - 1.4} height={bl.h - 1.4} rx={1} className={roofCls[v]} />
            <rect x={bl.x + 0.7} y={bl.y + 0.7} width={bl.w - 1.4} height={bl.h - 1.4} rx={1} fill="url(#lgTiles)" />
            <line x1={bl.x + 1} x2={bl.x + bl.w - 1} y1={bl.y + bl.h / 2} y2={bl.y + bl.h / 2} className={css.lgMRidge} />
            {big && <g><rect x={ix - bl.w * 0.2} y={bl.y + bl.h * 0.3} width={bl.w * 0.4} height={bl.h * 0.4} rx={1} className={css.lgMCourt} /><circle cx={ix} cy={bl.y + bl.h * 0.5} r={2.4} className={css.lgMTree1} /></g>}
            <rect x={ix - 1.4} y={bl.y + 2} width={2.8} height={1.8} className={css.lgMVent} />
            {Array.from({length: Math.max(2, Math.floor(bl.h / 3.6))}, (_, k) => <rect key={k} x={mainSide + (bl.x < 0 ? -1.3 : 0.2)} y={bl.y + 1.6 + k * 3.6} width={1.1} height={1.5} className={css.lgMWin} />)}
          </g>
        )
      })}
      {sc.trees.map((t, i) => <Tree key={i} t={t} />)}
      {sc.cars.map((c, i) => <g key={i}><rect x={c.x - 0.6} y={c.y - 1.7} width={2.1} height={4.4} rx={0.8} className={css.lgMShadow} /><rect x={c.x - 1} y={c.y - 2.1} width={2} height={4.3} rx={0.8} className={[css.lgMCar0, css.lgMCar1, css.lgMCar2, css.lgMCar3, css.lgMCar4, css.lgMCar5][c.v]} /><rect x={c.x - 0.7} y={c.y - 1} width={1.4} height={1.3} rx={0.3} className={css.lgMGlass} /></g>)}
      {/* the school yard, the neighbourhood pitch, the kiosk */}
      {schoolAt && <g>
        <rect x={schoolAt.x - 8} y={schoolAt.y - 14} width={16} height={8.5} rx={1} className={css.lgMShadow} transform="translate(2 2)" />
        <rect x={schoolAt.x - 8} y={schoolAt.y - 14} width={16} height={8.5} rx={1} className={css.lgMWall} /><rect x={schoolAt.x - 7.3} y={schoolAt.y - 13.3} width={14.6} height={7.1} className={css.lgMRoof3} />
        <rect x={schoolAt.x - 3} y={schoolAt.y - 7.1} width={6} height={1.6} className={css.lgMVent} />
        <rect x={schoolAt.x - 8} y={schoolAt.y - 5} width={16} height={9.5} rx={1.2} className={css.lgMYard} />
        <g className={css.lgMLine}><rect x={schoolAt.x - 6.5} y={schoolAt.y - 3.5} width={13} height={6.5} /><line x1={schoolAt.x} x2={schoolAt.x} y1={schoolAt.y - 3.5} y2={schoolAt.y + 3} /><circle cx={schoolAt.x} cy={schoolAt.y - 0.3} r={1.6} /></g>
        <line x1={schoolAt.x + 6} y1={schoolAt.y - 5.2} x2={schoolAt.x + 6} y2={schoolAt.y - 9} className={css.lgMFlag} />
      </g>}
      <g>
        <rect x={model.pitch.x - 0.6} y={model.pitch.y - 0.6} width={model.pitch.w + 1.2} height={model.pitch.h + 1.2} rx={1} className={css.lgMFence} />
        <rect x={model.pitch.x} y={model.pitch.y} width={model.pitch.w} height={model.pitch.h} rx={0.6} className={css.lgMGrass} />
        {[1, 3].map(i => <rect key={i} x={model.pitch.x} y={model.pitch.y + (model.pitch.h / 4) * i} width={model.pitch.w} height={model.pitch.h / 4} className={css.lgMMow} />)}
        <g className={css.lgMLine}><rect x={model.pitch.x + 0.8} y={model.pitch.y + 0.8} width={model.pitch.w - 1.6} height={model.pitch.h - 1.6} /><line x1={model.pitch.x + 0.8} x2={model.pitch.x + model.pitch.w - 0.8} y1={model.pitch.y + model.pitch.h / 2} y2={model.pitch.y + model.pitch.h / 2} /><circle cx={model.pitch.x + model.pitch.w / 2} cy={model.pitch.y + model.pitch.h / 2} r={1.7} /><rect x={model.pitch.x + model.pitch.w / 2 - 2.6} y={model.pitch.y + 0.8} width={5.2} height={2.4} /><rect x={model.pitch.x + model.pitch.w / 2 - 2.6} y={model.pitch.y + model.pitch.h - 3.2} width={5.2} height={2.4} /></g>
      </g>
      <g>
        <rect x={model.kiosk.x + 1} y={model.kiosk.y + 1} width={model.kiosk.w} height={model.kiosk.h} className={css.lgMShadow} />
        {Array.from({length: 6}, (_, i) => <rect key={i} x={model.kiosk.x + (model.kiosk.w / 6) * i} y={model.kiosk.y} width={model.kiosk.w / 6} height={model.kiosk.h} className={i % 2 ? css.lgMAw1 : css.lgMAw0} />)}
      </g>
      {sc.lamps.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={9} fill="url(#lgGlowL)" className={css.lgMLamp} />)}
      <Stadium g={{...model.ground, y: model.ground.y}} accent={accent} />
    </g>
  )
})
