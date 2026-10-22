/**
 * LIFE · the things a job is done with, drawn (owner spec §5, 22.10.2026: "a close-up on the hands and the
 * material — the sponge meets the window, the coin goes into the hand"). The games in MiniGame.tsx count;
 * this only draws what is in your hands and what your hands changed: a crate with its weight on it, a glass
 * bottle with its label, a cup on its saucer, a door with its number, a car under its dirt, a stencil, a
 * seam, a viewfinder, a radio dial.
 *
 * Inline SVG, the club's own tokens (--l-*) and mixes of them only — so a rival's colour, or a yellow on
 * Hapoel's page, cannot appear here: there is nothing to paint with but the club's own inks.
 */
import {useId, type CSSProperties, type ReactNode} from 'react'
import g from './MiniGame.module.css'

const P = 'var(--l-prime)', I = 'var(--l-ink)', PA = 'var(--l-paper)', G = 'var(--l-ground)', S = 'var(--l-soft)'
const m = (a: string, pct: number, b: string) => `color-mix(in srgb, ${a} ${pct}%, ${b})`
/** the materials, mixed from the club's inks: wood, glass, cardboard, skin, mud */
export const INK = {
  wood: m(I, 34, PA), woodDark: m(I, 55, PA), glass: m(PA, 62, S), glassEdge: m(S, 70, I), card: m(I, 22, PA),
  skin: m(PA, 84, I), mud: m(I, 62, G), dust: m(S, 55, PA), cloth: m(P, 82, I), steel: m(S, 60, PA),
} as const

const svg = (w: number, h: number, kids: ReactNode, style?: CSSProperties) => (
  <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" aria-hidden="true" focusable="false" style={style} preserveAspectRatio="xMidYMid meet">{kids}</svg>
)

/* ───────────── what is in your hands ───────────── */

/** the shape a label names — read from the label's own words, so every job's items draw without a table */
export function shapeOf(label: string): string {
  const l = label.toLowerCase()
  if (/long crate/.test(l)) return 'crate-long'
  if (/heavy|water/.test(l)) return 'crate-heavy'
  if (/fragile|eggs/.test(l)) return 'crate-glass'
  if (/crate/.test(l)) return 'crate'
  if (/glass bottle/.test(l)) return /chipped/.test(l) ? 'bottle-chipped' : /old label/.test(l) ? 'bottle-old' : 'bottle'
  if (/tin can/.test(l)) return 'can'
  if (/carton/.test(l)) return 'carton'
  if (/coffee|cup|mugs?\b/.test(l)) return 'cup'
  if (/juice/.test(l)) return 'juice'
  if (/cake/.test(l)) return 'cake'
  if (/beer/.test(l)) return 'beer'
  if (/toast/.test(l)) return 'toast'
  if (/plates?\b/.test(l)) return 'plate'
  if (/fork/.test(l)) return 'fork'
  if (/ashtray/.test(l)) return 'ashtray'
  if (/newspaper|^for no/.test(l)) return 'paper'
  if (/ticket/.test(l)) return 'ticket'
  if (/invoice/.test(l)) return 'invoice'
  if (/label roll/.test(l)) return 'roll'
  if (/lid/.test(l)) return 'lid'
  if (/\btin\b/.test(l)) return 'tin'
  if (/books/.test(l)) return 'books'
  if (/records/.test(l)) return 'record'
  if (/towels/.test(l)) return 'towel'
  if (/scarf/.test(l)) return 'scarf'
  return 'box'
}

/** one thing, drawn at 64×48 */
export function Thing({label, big = false}: {label: string; big?: boolean}) {
  const k = shapeOf(label)
  const tag = (label.split('·')[1] ?? '').trim()
  return <span className="hands-thing" data-shape={k} style={{display: 'block', inlineSize: big ? 112 : 34, blockSize: big ? 84 : 26}}>{svg(64, 48, art(k, tag))}</span>
}

function crate(fill: string, inside: ReactNode, w = 52, x = 6) {
  return (
    <g>
      {inside}
      <rect x={x} y={18} width={w} height={26} fill={fill} stroke={I} strokeWidth={2} />
      <path d={`M${x} 27h${w}M${x} 35h${w}`} stroke={INK.woodDark} strokeWidth={1.5} />
      <rect x={x + w / 2 - 9} y={22} width={18} height={9} fill={PA} stroke={I} strokeWidth={1} />
    </g>
  )
}
const necks = (fill: string, n = 4, y = 6, x0 = 12, gap = 11) => Array.from({length: n}, (_, i) => (
  <g key={i}><rect x={x0 + i * gap} y={y} width={6} height={14} rx={2} fill={fill} stroke={I} strokeWidth={1.2} /><rect x={x0 + i * gap + 1} y={y - 3} width={4} height={4} fill={P} /></g>
))

function art(k: string, tag: string): ReactNode {
  switch (k) {
    case 'crate-heavy': return <>{crate(INK.wood, necks(INK.glassEdge))}<text x={32} y={30} fontSize={7} fontWeight={700} textAnchor="middle" fill={I}>KG</text></>
    case 'crate': return <>{crate(INK.wood, necks(m(P, 60, PA)))}</>
    case 'crate-glass': return <>{crate(INK.card, necks(INK.glass, 4, 8))}<path d="M27 26l5 4 5-4M32 30v4" stroke={I} strokeWidth={1.3} fill="none" /></>
    case 'crate-long': return crate(INK.wood, null, 60, 2)
    case 'bottle': case 'bottle-old': case 'bottle-chipped': return (
      <g>
        <path d="M28 4h8v8c6 3 8 7 8 12v20H20V24c0-5 2-9 8-12z" fill={INK.glass} stroke={INK.glassEdge} strokeWidth={2} />
        <path d="M24 22v18" stroke={PA} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
        <rect x={21} y={28} width={22} height={10} fill={k === 'bottle-old' ? INK.card : P} opacity={k === 'bottle-old' ? 0.9 : 1} />
        {k === 'bottle-chipped' && <path d="M36 4l2 3 2-3" stroke={I} strokeWidth={1.5} fill="none" />}
        <rect x={27} y={2} width={10} height={4} fill={I} />
      </g>
    )
    case 'can': return <g><rect x={22} y={8} width={20} height={34} rx={3} fill={INK.steel} stroke={I} strokeWidth={2} /><rect x={22} y={18} width={20} height={12} fill={P} /><ellipse cx={32} cy={9} rx={10} ry={3} fill={PA} stroke={I} strokeWidth={1.5} /></g>
    case 'carton': return <g><path d="M20 14l12-8 12 8v30H20z" fill={PA} stroke={I} strokeWidth={2} /><path d="M20 14h24" stroke={I} strokeWidth={1.5} /><rect x={24} y={22} width={16} height={12} fill={m(P, 50, PA)} /></g>
    case 'cup': return <g><ellipse cx={32} cy={40} rx={22} ry={5} fill={PA} stroke={I} strokeWidth={2} /><path d="M20 18h22l-3 20H23z" fill={PA} stroke={I} strokeWidth={2} /><path d="M42 22c6 0 6 9 0 9" stroke={I} strokeWidth={2} fill="none" /><path d="M21 22h20" stroke={INK.woodDark} strokeWidth={4} /><path className={g.steam} d="M27 14c-3-4 3-6 0-10M35 14c-3-4 3-6 0-10" stroke={S} strokeWidth={1.6} fill="none" /></g>
    case 'juice': return <g><path d="M22 10h20l-3 32H25z" fill={INK.glass} stroke={INK.glassEdge} strokeWidth={2} /><path d="M23 20h18l-2 21H25z" fill={m(P, 55, PA)} /><path d="M36 4l-4 16" stroke={I} strokeWidth={2} /></g>
    case 'cake': return <g><ellipse cx={32} cy={40} rx={22} ry={5} fill={PA} stroke={I} strokeWidth={2} /><path d="M18 36V22l28-6v20z" fill={INK.card} stroke={I} strokeWidth={2} /><path d="M18 22l28-6" stroke={P} strokeWidth={4} /></g>
    case 'beer': return <g><path d="M22 12h18v30H22z" fill={INK.glass} stroke={INK.glassEdge} strokeWidth={2} /><path d="M23 20h16v21H23z" fill={INK.wood} /><path d="M20 14c2-6 22-6 22 0v6H20z" fill={PA} stroke={I} strokeWidth={1.5} /><path d="M40 20c6 0 6 12 0 12" stroke={I} strokeWidth={2} fill="none" /></g>
    case 'toast': return <g><path d="M18 40V18c0-8 28-8 28 0v22z" fill={INK.wood} stroke={I} strokeWidth={2} /><path d="M22 38V20c0-5 20-5 20 0v18z" fill={INK.card} /></g>
    case 'plate': return <g><ellipse cx={32} cy={30} rx={26} ry={12} fill={PA} stroke={I} strokeWidth={2} /><ellipse cx={32} cy={30} rx={16} ry={7} fill="none" stroke={S} strokeWidth={1.5} /></g>
    case 'fork': return <g><path d="M30 44V22M26 6v12c0 4 8 4 8 0V6M30 6v12" stroke={I} strokeWidth={2.4} fill="none" strokeLinecap="round" /></g>
    case 'ashtray': return <g><ellipse cx={32} cy={32} rx={22} ry={9} fill={INK.steel} stroke={I} strokeWidth={2} /><ellipse cx={32} cy={30} rx={13} ry={5} fill={INK.dust} /></g>
    case 'paper': return <g><path d="M10 12h40l4 4v26H10z" fill={PA} stroke={I} strokeWidth={2} /><path d="M14 18h22M14 23h34M14 28h34M14 33h26" stroke={S} strokeWidth={2} /><rect x={38} y={14} width={12} height={8} fill={P} />{tag && <text x={32} y={44} fontSize={6} textAnchor="middle" fill={I}>{tag}</text>}</g>
    case 'ticket': return <g><path d="M6 12h52v8a4 4 0 0 0 0 8v8H6v-8a4 4 0 0 0 0-8z" fill={PA} stroke={I} strokeWidth={2} /><path d="M40 12v24" stroke={I} strokeWidth={1.4} strokeDasharray="2 2" /><rect x={10} y={16} width={26} height={5} fill={P} /><text x={49} y={28} fontSize={11} fontWeight={700} textAnchor="middle" fill={I}>{(tag.match(/gate\s+(\w)/i)?.[1] ?? '?').toUpperCase()}</text></g>
    case 'invoice': return <g><path d="M14 4h30l6 6v34H14z" fill={PA} stroke={I} strokeWidth={2} /><path d="M18 14h20M18 20h28M18 26h28" stroke={S} strokeWidth={2} /><path d="M30 36h16" stroke={I} strokeWidth={3} /></g>
    case 'tin': return <g><rect x={20} y={10} width={24} height={32} fill={INK.steel} stroke={I} strokeWidth={2} /><ellipse cx={32} cy={10} rx={12} ry={3} fill={PA} stroke={I} strokeWidth={1.5} /></g>
    case 'lid': return <g><ellipse cx={32} cy={28} rx={20} ry={8} fill={INK.steel} stroke={I} strokeWidth={2} /><ellipse cx={32} cy={26} rx={14} ry={5} fill="none" stroke={I} strokeWidth={1.2} /></g>
    case 'roll': return <g><rect x={14} y={14} width={36} height={22} fill={PA} stroke={I} strokeWidth={2} /><ellipse cx={14} cy={25} rx={5} ry={11} fill={PA} stroke={I} strokeWidth={2} /><circle cx={14} cy={25} r={3} fill={I} /><path d="M24 20h8M36 20h8M24 30h8M36 30h8" stroke={P} strokeWidth={3} /></g>
    case 'books': return <g><rect x={12} y={30} width={40} height={8} fill={P} stroke={I} strokeWidth={2} /><rect x={14} y={22} width={36} height={8} fill={INK.card} stroke={I} strokeWidth={2} /><rect x={16} y={14} width={32} height={8} fill={INK.wood} stroke={I} strokeWidth={2} /></g>
    case 'record': return <g><circle cx={32} cy={26} r={18} fill={I} /><circle cx={32} cy={26} r={6} fill={P} /><circle cx={32} cy={26} r={12} fill="none" stroke={S} strokeWidth={0.8} /></g>
    case 'towel': return <g><rect x={12} y={14} width={40} height={24} rx={3} fill={PA} stroke={I} strokeWidth={2} /><path d="M12 32h40" stroke={P} strokeWidth={3} /></g>
    case 'scarf': return <g><path d="M8 18h40l8 6-8 6H8z" fill={P} stroke={I} strokeWidth={2} /><path d="M16 18v12M24 18v12M32 18v12M40 18v12" stroke={PA} strokeWidth={3} /><path d="M8 30v8M12 30v8M16 30v8" stroke={I} strokeWidth={1.5} /></g>
    default: return <rect x={12} y={12} width={40} height={30} fill={INK.card} stroke={I} strokeWidth={2} />
  }
}

/* ───────────── where it goes ───────────── */

/** the place a thing goes, drawn behind what has been put there */
export function PlaceArt({action, id, label}: {action: string; id: string; label: string}) {
  const k = `${action}:${id}`
  // the stack: a plank of a shelf the crates sit on, full width
  // the stack: a bay of the storeroom shelving — the boards of the wall behind, the plank on its two brackets,
  // and what the shelf is for chalked on the wall (heavy low, glass high), stretched to the slot it fills
  if (action === 'stack') {
    const chalk = id === 'bottom' ? 'HEAVY' : id === 'top' ? 'GLASS · LIGHT' : ''
    return (
      <svg viewBox="0 0 300 64" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <rect x={0} y={0} width={300} height={64} fill={m(I, 9, PA)} />
        {[0, 1, 2, 3].map(k => <path key={k} d={`M0 ${4 + k * 13}h300`} stroke={m(I, 18, PA)} strokeWidth={1} />)}
        <rect x={0} y={50} width={300} height={8} fill={INK.wood} stroke={I} strokeWidth={1.6} />
        <path d="M0 58h300" stroke={INK.woodDark} strokeWidth={2} />
        {[30, 270].map(x => <path key={x} d={`M${x} 58v6M${x - 6} 58l6 6`} stroke={I} strokeWidth={2} />)}
        {chalk && <text x={292} y={16} fontSize={9} fontWeight={700} textAnchor="end" fill={m(I, 45, PA)} letterSpacing={1}>{chalk}</text>}
      </svg>
    )
  }
  if (k === 'sort:crate') return svg(100, 40, crate(INK.wood, necks(INK.glass, 6, 4, 18, 11), 76, 12))
  if (k === 'sort:bin') return svg(100, 40, <g><path d="M30 10h40l-4 28H34z" fill={m(S, 70, PA)} stroke={I} strokeWidth={2} /><rect x={26} y={6} width={48} height={6} fill={S} stroke={I} strokeWidth={2} /><path d="M44 18l6 6 6-6M50 24v8" stroke={PA} strokeWidth={2} fill="none" /></g>)
  if (action === 'tray' && id !== 'back') return svg(100, 40, <ellipse cx={50} cy={26} rx={46} ry={11} fill={/table/i.test(label) ? INK.wood : INK.steel} stroke={I} strokeWidth={2} />)
  if (action === 'tray') return svg(100, 40, <><rect x={6} y={22} width={88} height={14} fill={INK.wood} stroke={I} strokeWidth={2} /><text x={50} y={33} fontSize={8} textAnchor="middle" fill={PA}>BAR</text></>)
  if (action === 'deliver') return svg(100, 40, <g><rect x={34} y={2} width={32} height={38} fill={INK.wood} stroke={I} strokeWidth={2} /><rect x={40} y={20} width={20} height={4} fill={I} /><circle cx={60} cy={28} r={1.6} fill={PA} /><rect x={42} y={6} width={16} height={9} fill={PA} stroke={I} strokeWidth={1} /><text x={50} y={13} fontSize={7} fontWeight={700} textAnchor="middle" fill={I}>{label.replace(/\D/g, '')}</text></g>)
  if (action === 'direct') return svg(100, 40, <g><rect x={22} y={4} width={56} height={24} fill={P} stroke={I} strokeWidth={2} /><text x={50} y={22} fontSize={16} fontWeight={700} textAnchor="middle" fill={PA}>{id}</text><path d="M46 28v10M54 28v10" stroke={I} strokeWidth={3} /></g>)
  if (action === 'invoice') return svg(100, 40, <g><path d="M14 10h22l4 4h46v24H14z" fill={INK.card} stroke={I} strokeWidth={2} /><rect x={30} y={20} width={40} height={10} fill={PA} /><text x={50} y={28} fontSize={7} textAnchor="middle" fill={I}>{label}</text></g>)
  if (action === 'assemble' || action === 'unpack') return svg(100, 40, <><rect x={4} y={32} width={92} height={5} fill={INK.wood} stroke={I} strokeWidth={1.5} /><path d="M10 37v3M90 37v3" stroke={I} strokeWidth={2} /></>)
  return null
}

/* ───────────── the car under its dirt ───────────── */

/**
 * The side of a small car, the panels the sponge works: bonnet, door, window. Each carries its own dirt,
 * thinning with `left` (1 = untouched, 0 = clean); a clean panel gets its shine back.
 */
export function Car({left, mud, wet}: {left: Record<string, number>; mud: boolean; wet: Record<string, boolean>}) {
  const dirt = mud ? INK.mud : INK.dust
  // a film of dirt over the whole panel, and splashes on it: both thin with every pass of the sponge
  const SPOTS: Record<string, [number, number, number][]> = {
    bonnet: [[30, 88, 6], [46, 100, 8], [64, 84, 5], [82, 104, 7], [100, 92, 6], [56, 112, 4], [24, 108, 5]],
    door: [[134, 86, 6], [152, 100, 8], [176, 90, 5], [196, 106, 7], [214, 94, 6], [164, 112, 5]],
    window: [[150, 58, 5], [168, 52, 6], [196, 56, 5], [214, 62, 6], [176, 66, 4]],
  }
  const blot = (id: string, d: string) => {
    const l = left[id] ?? 0
    return (
      <g style={{transition: 'opacity .25s'}} opacity={Math.min(1, l * 1.1)}>
        <path d={d} fill={dirt} opacity={mud ? 0.72 : 0.6} />
        {(SPOTS[id] ?? []).map(([x, y, r], k) => <ellipse key={k} cx={x} cy={y} rx={r * (mud ? 1.4 : 1)} ry={r * (mud ? 1.1 : 0.8)} fill={mud ? I : m(S, 70, PA)} opacity={mud ? 0.55 : 0.75} />)}
      </g>
    )
  }
  const shine = (id: string, d: string) => (left[id] ?? 1) <= 0 ? <path d={d} stroke={PA} strokeWidth={3} strokeLinecap="round" opacity={0.9} fill="none" /> : null
  const drip = (id: string, x: number, y: number) => wet[id] ? <path className={g.drip} d={`M${x} ${y}q2 6 0 9q-2-3 0-9`} fill={m(PA, 50, S)} /> : null
  const body = m(P, 78, PA)
  return svg(320, 150, <>
    {/* the road and the car's shadow */}
    <rect x={0} y={132} width={320} height={18} fill={m(I, 15, G)} />
    <ellipse cx={160} cy={134} rx={140} ry={6} fill={I} opacity={0.18} />
    {/* body */}
    <path d="M16 118V92c0-8 6-14 16-16l52-6 34-34c4-4 10-6 16-6h70c8 0 14 3 18 8l30 32 46 6c8 1 14 8 14 16v26z" fill={body} stroke={I} strokeWidth={3} />
    {/* window glass */}
    <path d="M124 72l26-26c3-3 6-4 10-4h52c5 0 8 2 11 5l22 25z" fill={INK.glass} stroke={I} strokeWidth={2.5} />
    <path d="M184 42v30" stroke={I} strokeWidth={4} />
    {/* door seams and handle */}
    <path d="M120 74v44M228 74v44" stroke={I} strokeWidth={2} />
    <rect x={198} y={86} width={18} height={5} rx={2} fill={I} />
    {/* bonnet line, lights, bumper */}
    <path d="M16 96h100" stroke={I} strokeWidth={1.6} opacity={0.6} />
    <rect x={14} y={98} width={14} height={8} fill={PA} stroke={I} strokeWidth={1.5} />
    <rect x={292} y={96} width={14} height={8} fill={P} stroke={I} strokeWidth={1.5} />
    {/* the dirt, panel by panel, under the sponge */}
    {blot('bonnet', mud ? 'M18 92c20-10 40-6 60-14 14-6 30-4 40-2v42H18z' : 'M18 84c30-6 60-10 98-12v46H18z')}
    {blot('door', mud ? 'M122 76h106v42H122c6-12-2-20 4-30z' : 'M122 76h106v42H122z')}
    {blot('window', 'M128 70l22-22c3-3 6-4 10-4h52c5 0 8 2 11 5l20 21z')}
    {shine('bonnet', 'M30 90l40-8')}{shine('door', 'M140 84l40-6')}{shine('window', 'M160 50l-12 14M200 48l-14 18')}
    {drip('bonnet', 60, 116)}{drip('door', 170, 118)}{drip('window', 190, 72)}
    {/* the sponge, in the hand, on the panel it is working */}
    {(() => {
      const at = (['bonnet', 'door', 'window'] as const).find(z => wet[z])
      if (!at) return null
      const [x, y] = at === 'bonnet' ? [70, 96] : at === 'door' ? [176, 98] : [186, 58]
      return (
        <g transform={`translate(${x} ${y}) rotate(-8)`}>
          <rect x={-16} y={-10} width={32} height={20} rx={5} fill={m(P, 30, PA)} stroke={I} strokeWidth={2} />
          {[-9, 0, 9].map(dx => <circle key={dx} cx={dx} cy={-2} r={2} fill={I} opacity={0.35} />)}
          <path d="M-6 10c0 10 18 12 22 4l2-14" fill={INK.skin} stroke={I} strokeWidth={2} />
          {[-14, 18, 4].map((dx, k) => <circle key={k} cx={dx} cy={-14 - k * 3} r={3 - k * 0.5} fill={PA} stroke={S} strokeWidth={0.8} />)}
        </g>
      )
    })()}
    {/* wheels */}
    {[78, 250].map(x => <g key={x}><circle cx={x} cy={120} r={17} fill={I} /><circle cx={x} cy={120} r={8} fill={INK.steel} /><circle cx={x} cy={120} r={3} fill={I} /></g>)}
  </>)
}

/* ───────────── the stencil, the seam, the flags ───────────── */

const WORD = 'STAND'
/** each letter sits over its own tap column (the zones are five equal columns across the drawing) */
const LX = (i: number) => 32 + i * 64
/**
 * The banner on the floor of the lock-up: a length of cloth with its hem and eyelets, the stencil plate
 * laid on top of it, the letters cut out of the plate. Paint builds through each hole (a thin coat, then
 * the full colour, a drip or two where the roller was heavy); the roller sits on the next letter; when
 * every letter is full the plate is peeled back and the word stays on the cloth — with the one crooked
 * letter the slip left, because the cloth keeps what happened to it.
 */
export function Stencil({fill, crooked, lifted}: {fill: number[]; crooked: number | null; lifted: boolean}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const next = fill.findIndex(f => f < 1)
  const at = (i: number) => (i === crooked ? `translate(3 4) rotate(5 ${LX(i)} 104)` : undefined)
  return svg(320, 190, <>
    <defs>
      {/* a mask is luminance, not a colour anyone sees: white keeps the plate, black cuts the letters out */}
      <mask id={`cut${id}`}>
        <rect x={0} y={0} width={320} height={190} fill="white" />
        {WORD.split('').map((ch, i) => <text key={i} x={LX(i)} y={128} fontSize={68} fontWeight={900} textAnchor="middle" fill="black">{ch}</text>)}
      </mask>
    </defs>
    {/* the floor and the cloth: a hem, eyelets, two soft folds */}
    <rect x={0} y={0} width={320} height={190} fill={m(I, 12, PA)} />
    <path d="M10 28 Q160 20 310 28 L314 176 Q160 184 6 176 Z" fill={m(P, 10, PA)} stroke={I} strokeWidth={2} />
    <path d="M14 38 Q160 31 306 38" stroke={I} strokeWidth={1} strokeDasharray="4 3" fill="none" opacity={0.5} />
    <path d="M12 166 Q160 173 308 166" stroke={I} strokeWidth={1} strokeDasharray="4 3" fill="none" opacity={0.5} />
    {[24, 120, 200, 296].map(x => <circle key={x} cx={x} cy={33} r={4} fill={PA} stroke={I} strokeWidth={1.6} />)}
    <path d="M100 30 Q104 100 98 174 M222 30 Q218 100 224 174" stroke={m(I, 10, PA)} strokeWidth={8} fill="none" opacity={0.6} />
    {/* the paint that went through the holes: a first coat, then the colour, then a drip */}
    {WORD.split('').map((ch, i) => {
      const f = fill[i] ?? 0
      return (
        <g key={i} transform={at(i)}>
          <text x={LX(i)} y={128} fontSize={68} fontWeight={900} textAnchor="middle" fill={P} opacity={f <= 0 ? 0 : 0.25 + 0.75 * f} style={{transition: 'opacity .25s'}}>{ch}</text>
          {f >= 0.5 && <path d={`M${LX(i) - 8} 129 v${6 + f * 10} a3 3 0 0 0 6 0 v-${4 + f * 8}`} fill={P} opacity={0.85} />}
          {f >= 1 && i % 2 === 0 && <path d={`M${LX(i) + 10} 129 v${7} a2.5 2.5 0 0 0 5 0 v-5`} fill={P} opacity={0.8} />}
        </g>
      )
    })}
    {/* the plate: card over the cloth with the word cut out of it, taped at two corners; peeled back at the end */}
    <g style={{transition: 'transform .7s, opacity .7s', transformOrigin: '300px 40px', transform: lifted ? 'translate(40px, -120px) rotate(16deg)' : 'none', opacity: lifted ? 0 : 1}}>
      <g transform={crooked !== null && !lifted ? 'rotate(-0.6 160 100)' : undefined}>
        <rect x={8} y={64} width={304} height={82} fill={INK.card} stroke={I} strokeWidth={2} mask={`url(#cut${id})`} opacity={0.94} />
        {WORD.split('').map((ch, i) => <text key={i} x={LX(i)} y={128} fontSize={68} fontWeight={900} textAnchor="middle" fill="none" stroke={I} strokeWidth={1.4}>{ch}</text>)}
        <path d="M4 60l22 10M316 60l-22 10" stroke={m(S, 60, PA)} strokeWidth={9} opacity={0.85} />
      </g>
      {/* the roller, resting on the next letter to paint */}
      {next >= 0 && <g transform={`translate(${LX(next)} 74)`} style={{transition: 'transform .3s'}}>
        <rect x={-20} y={-14} width={40} height={14} rx={6} fill={P} stroke={I} strokeWidth={2} />
        <path d="M20 -7h8v-20h-30" stroke={I} strokeWidth={2.4} fill="none" />
        <rect x={-10} y={-34} width={10} height={14} rx={2} fill={INK.wood} stroke={I} strokeWidth={1.6} />
      </g>}
    </g>
  </>)
}

/**
 * The scarf on your knee, in the club's own colours with its fringe: the tear runs across it, and every
 * stitch you put in stays on the cloth as a cross of thread. The needle waits on the next stitch, the
 * thread trailing back to the spool.
 */
export function Seam({done, next}: {done: boolean[]; next: number}) {
  const n = done.length
  /** each stitch sits over its own tap column (the zones are n equal columns across the drawing) */
  const sx = (i: number) => (i + 0.5) * (320 / n)
  return svg(320, 170, <>
    <rect x={0} y={0} width={320} height={170} fill={m(I, 10, PA)} />
    {/* the scarf: blocks of colour, a band of lettering, the fringe at both ends */}
    <rect x={20} y={24} width={280} height={118} fill={P} stroke={I} strokeWidth={2} />
    {[0, 1, 2, 3].map(k => <rect key={k} x={20 + k * 70 + 35} y={24} width={35} height={118} fill={PA} opacity={0.9} />)}
    <path d="M20 40h280M20 126h280" stroke={I} strokeWidth={1.4} opacity={0.35} />
    {Array.from({length: 14}, (_, k) => <path key={k} d={`M${24 + k * 20} 142v14M${30 + k * 20} 142v11`} stroke={P} strokeWidth={2.4} strokeLinecap="round" />)}
    {Array.from({length: 14}, (_, k) => <path key={`t${k}`} d={`M${24 + k * 20} 24v-12M${30 + k * 20} 24v-9`} stroke={P} strokeWidth={2.4} strokeLinecap="round" />)}
    {/* the tear: a ragged gap across the cloth, the floor showing through */}
    <path d={`M20 80${Array.from({length: n * 3}, (_, i) => ` L${20 + (i + 1) * (280 / (n * 3))} ${80 + (i % 2 ? -7 : 6)}`).join('')} L300 92${Array.from({length: n * 3}, (_, i) => ` L${300 - (i + 1) * (280 / (n * 3))} ${92 + (i % 2 ? 5 : -6)}`).join('')} Z`} fill={m(I, 70, PA)} stroke={I} strokeWidth={1.2} />
    {/* the stitches: sewn ones stay as crosses of thread; the next one is a dashed guide */}
    {done.map((d, i) => {
      const x = sx(i)
      return d
        ? <g key={i}><path d={`M${x - 10} 70l20 32M${x + 10} 70l-20 32`} stroke={I} strokeWidth={5} strokeLinecap="round" opacity={0.35} /><path d={`M${x - 10} 70l20 32M${x + 10} 70l-20 32`} stroke={PA} strokeWidth={3} strokeLinecap="round" /></g>
        : <g key={i} opacity={i === next ? 1 : 0.55}><circle cx={x - 10} cy={70} r={2.2} fill={I} /><circle cx={x + 10} cy={102} r={2.2} fill={I} /><path d={`M${x - 10} 70l20 32M${x + 10} 70l-20 32`} stroke={I} strokeWidth={1.2} strokeDasharray="3 3" /></g>
    })}
    {/* the needle on the next stitch, its thread back to the spool */}
    {next < n && <g style={{transition: 'transform .25s'}} transform={`translate(${sx(next) + 10} 66)`}>
      <path d="M0 0l16-44" stroke={INK.steel} strokeWidth={3} strokeLinecap="round" />
      <ellipse cx={15} cy={-40} rx={1.4} ry={3.4} fill={m(I, 10, PA)} transform="rotate(20 15 -40)" />
      <path d={`M15 -40c18-10 40 0 ${300 - sx(next) - 30} -14`} stroke={PA} strokeWidth={1.6} fill="none" />
    </g>}
    <g transform="translate(300 18)"><rect x={-12} y={-8} width={24} height={16} rx={3} fill={INK.wood} stroke={I} strokeWidth={1.6} /><rect x={-9} y={-5} width={18} height={10} fill={PA} /></g>
  </>)
}

/** a string of flags across: each hangs crooked until it is levelled */
export function Flags({tilt}: {tilt: number[]}) {
  const n = tilt.length, w = 300 / n
  return svg(320, 110, <>
    <path d={`M8 20Q160 46 312 20`} stroke={I} strokeWidth={2} fill="none" />
    {tilt.map((t, i) => {
      const x = 10 + i * w + w / 2, y = 20 + Math.sin(((i + 0.5) / n) * Math.PI) * 13
      return <g key={i} transform={`rotate(${t * 34} ${x} ${y})`} style={{transition: 'transform .25s'}}><path d={`M${x - 22} ${y}h44l-22 54z`} fill={i % 2 ? PA : P} stroke={I} strokeWidth={2} /></g>
    })}
  </>)
}

/* ───────────── the viewfinder ───────────── */

/** a person in the frame: head, hair, shoulders in a club shirt — and a head that turns away */
export function Person({away, i}: {away: boolean; i: number}) {
  const hair = [I, INK.woodDark, m(I, 80, P), INK.wood][i % 4]!
  return svg(60, 80, <g style={{transition: 'transform .2s', transformOrigin: '30px 30px', transform: away ? 'rotate(-10deg)' : 'none'}}>
    <path d="M6 80c0-18 10-26 24-26s24 8 24 26z" fill={i % 2 ? P : PA} stroke={I} strokeWidth={2} />
    <circle cx={30} cy={32} r={15} fill={INK.skin} stroke={I} strokeWidth={2} />
    <path d={i % 3 === 0 ? 'M15 30c0-12 30-14 30 0c-4-6-26-6-30 0z' : 'M15 30c2-14 28-14 30 0l-6-6c-6 3-12 3-18 0z'} fill={hair} />
    {away
      ? <><circle cx={20} cy={33} r={1.8} fill={I} /><path d="M17 40c2 1 4 1 5 0" stroke={I} strokeWidth={1.4} fill="none" /></>
      : <><circle cx={25} cy={33} r={1.8} fill={I} /><circle cx={35} cy={33} r={1.8} fill={I} /><path d="M25 40c3 2 7 2 10 0" stroke={I} strokeWidth={1.4} fill="none" /></>}
  </g>)
}

/* ───────────── the radio ───────────── */

/** the radio on the shelf: the needle moves along the scale with the dial */
export function Radio({value, clear}: {value: number; clear: boolean}) {
  const x = 40 + value * 2.4
  return svg(320, 96, <>
    <rect x={8} y={6} width={304} height={84} rx={14} fill={INK.wood} stroke={I} strokeWidth={3} />
    <rect x={24} y={18} width={272} height={30} rx={4} fill={PA} stroke={I} strokeWidth={2} />
    {Array.from({length: 23}, (_, i) => <path key={i} d={`M${40 + i * 10.9} 22v${i % 4 === 0 ? 10 : 5}`} stroke={I} strokeWidth={1.2} />)}
    {['88', '94', '100', '106'].map((t, i) => <text key={t} x={40 + i * 80} y={44} fontSize={8} textAnchor="middle" fill={S}>{t}</text>)}
    <path d={`M${x} 18v30`} stroke={clear ? P : I} strokeWidth={3} style={{transition: 'd .1s'}} />
    {Array.from({length: 18}, (_, i) => <circle key={i} cx={40 + (i % 9) * 12} cy={62 + Math.floor(i / 9) * 12} r={3.4} fill={INK.woodDark} />)}
    <circle cx={258} cy={68} r={16} fill={I} /><circle cx={258} cy={68} r={10} fill={INK.steel} />
    <path d={`M258 68l${Math.cos((value / 100) * Math.PI * 1.6 - 2.4) * 9} ${Math.sin((value / 100) * Math.PI * 1.6 - 2.4) * 9}`} stroke={I} strokeWidth={3} strokeLinecap="round" />
    <circle cx={210} cy={68} r={5} fill={clear ? P : S} />
  </>)
}
