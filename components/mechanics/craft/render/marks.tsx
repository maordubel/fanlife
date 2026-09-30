/**
 * הסימנים על המשטח — one renderer for a `CraftMark`, used by the bench and by the world.
 *
 * Everything here is SVG in the surface's own box (`SURFACE_BOX`), from marks in 0..1: a
 * word is `<text>` in the poster face, a stamp is a motif under a transform, a stripe is a
 * band, a stroke is a round-capped path, a spray is the same path under a grain filter, a
 * cut is a hairline, a stencil is its holes. The stencil job composes: spray through the
 * card's holes at full strength, spray outside the card as a faint mist — the card itself
 * is drawn only while the bench is open, because once the job is done the card comes off.
 *
 * No editor state in here: the bench passes its selection in, the wardrobe passes nothing.
 */

import type { ReactNode } from 'react'

import { stencilCard, stencilGrid, stencilHoles, type Rect } from '@/lib/game/craft/stencil'
import { SURFACE_BOX, type CraftMark, type CraftRecipe, type CraftSurface } from '@/lib/game/craft/types'

import { StampMotif } from './stamps'
import { TOKEN, contrastOn } from './tokens'

export type MarksRecipe = Pick<CraftRecipe, 'surface' | 'stencilText' | 'target'>

const pathOf = (mark: CraftMark, w: number, h: number): string => {
  const pts = mark.points && mark.points.length > 0 ? mark.points : [[mark.x, mark.y] as const]
  return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`).join(' ')
}

/** the holes, a hair oversize so two cells of one letter meet without an antialiased seam */
const rectsOf = (rects: readonly Rect[], w: number, h: number) =>
  rects.map((r, i) => <rect key={i} x={r.x * w - 0.4} y={r.y * h - 0.4} width={r.w * w + 0.8} height={r.h * h + 0.8} />)

/** one mark, drawn — `null` for a stencil card on a wall, which `Marks` composes separately */
export function Mark({ mark, surface, uid }: { mark: CraftMark; surface: CraftSurface; uid: string }): ReactNode {
  const { w, h } = SURFACE_BOX[surface]
  const color = TOKEN[mark.color ?? 'ink']
  const scale = mark.scale ?? 1
  const turn = `translate(${mark.x * w} ${mark.y * h}) rotate(${mark.rotate ?? 0})`
  switch (mark.kind) {
    case 'text':
      return (
        <text
          transform={turn}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={w * 0.16 * scale}
          fontWeight={700}
          className="font-poster"
          fill={color}
          direction="rtl"
        >
          {mark.value ?? ''}
        </text>
      )
    case 'stamp':
      return (
        <g transform={`${turn} scale(${(w * 0.24 * scale) / 40})`}>
          <StampMotif id={mark.value} fill={color} line={contrastOn(mark.color ?? 'ink')} />
        </g>
      )
    case 'stripe':
      return <rect transform={turn} x={-w} y={-(w * 0.08 * scale) / 2} width={w * 2} height={w * 0.08 * scale} fill={color} />
    case 'shape':
      return <rect transform={turn} x={-w * 0.06 * scale} y={-w * 0.06 * scale} width={w * 0.12 * scale} height={w * 0.12 * scale} fill={color} />
    case 'stroke':
      return <path d={pathOf(mark, w, h)} fill="none" stroke={color} strokeWidth={(mark.width ?? 0.05) * w} strokeLinecap="round" strokeLinejoin="round" />
    case 'spray':
      return (
        <path
          d={pathOf(mark, w, h)}
          fill="none"
          stroke={color}
          strokeWidth={(mark.width ?? 0.05) * w}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#craft-grain-${uid})`}
          opacity={0.92}
        />
      )
    case 'cut':
      return (
        <g>
          <path d={pathOf(mark, w, h)} fill="none" stroke={TOKEN.sheet} strokeWidth={w * 0.012} strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathOf(mark, w, h)} fill="none" stroke={TOKEN.ink} strokeWidth={w * 0.004} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${w * 0.012} ${w * 0.01}`} />
        </g>
      )
    case 'stencil': {
      const word = stencilGrid(mark.value ?? '')
      const card = stencilCard(word, mark.x, mark.y, scale, h / w)
      return <g fill={color}>{rectsOf(stencilHoles(word, card), w, h)}</g>
    }
    default:
      return null
  }
}

/** the wall's card while it is on: a sheet with holes, drawn even-odd so the wall shows through */
function StencilCardOn({ mark, recipe }: { mark: CraftMark; recipe: MarksRecipe }) {
  const { w, h } = SURFACE_BOX[recipe.surface]
  const word = stencilGrid(mark.value ?? recipe.stencilText ?? '')
  const card = stencilCard(word, mark.x, mark.y, mark.scale ?? 1, h / w)
  const holes = stencilHoles(word, card)
  const d =
    `M${card.x * w} ${card.y * h} h${card.w * w} v${card.h * h} h${-card.w * w} Z ` +
    holes.map((r) => `M${r.x * w} ${r.y * h} h${r.w * w} v${r.h * h} h${-r.w * w} Z`).join(' ')
  return (
    <g>
      <path d={d} fill={TOKEN.sheet} fillRule="evenodd" opacity={0.9} />
      <rect x={card.x * w} y={card.y * h} width={card.w * w} height={card.h * h} fill="none" stroke={TOKEN.ink} strokeWidth={1.5} opacity={0.6} />
    </g>
  )
}

/**
 * All the marks of an output, composed for the surface. `editing` keeps a wall's card on
 * and lets the bench draw its selection above; a world view passes nothing.
 */
export function Marks({
  marks,
  recipe,
  uid,
  editing = false,
  selected = null,
}: {
  marks: readonly CraftMark[]
  recipe: MarksRecipe
  uid: string
  editing?: boolean
  /** the bench's selection: that mark is wrapped in a group the canvas can move live */
  selected?: number | null
}) {
  const { w, h } = SURFACE_BOX[recipe.surface]
  const stencilJob = recipe.target.type === 'stencil-coverage'
  const cardIndex = stencilJob ? marks.findIndex((mark) => mark.kind === 'stencil') : -1
  const card = cardIndex >= 0 ? marks[cardIndex] : undefined
  const one = (mark: CraftMark, i: number, key: string) =>
    i === selected ? (
      <g key={key} data-craft-selected>
        <Mark mark={mark} surface={recipe.surface} uid={uid} />
      </g>
    ) : (
      <Mark key={key} mark={mark} surface={recipe.surface} uid={uid} />
    )
  if (!stencilJob || !card) {
    return <g>{marks.map((mark, i) => one(mark, i, String(i)))}</g>
  }
  const word = stencilGrid(card.value ?? recipe.stencilText ?? '')
  const box = stencilCard(word, card.x, card.y, card.scale ?? 1, h / w)
  const holes = stencilHoles(word, box)
  const sprays = marks.filter((mark) => mark.kind === 'spray' || mark.kind === 'stroke')
  const others = marks.filter((mark) => mark.kind !== 'spray' && mark.kind !== 'stroke' && mark.kind !== 'stencil')
  const holesId = `craft-holes-${uid}`
  const outsideId = `craft-outside-${uid}`
  return (
    <g>
      <defs>
        <clipPath id={holesId}>{rectsOf(holes, w, h)}</clipPath>
        <mask id={outsideId}>
          <rect x={0} y={0} width={w} height={h} fill="white" />
          <rect x={box.x * w} y={box.y * h} width={box.w * w} height={box.h * h} fill="black" />
        </mask>
      </defs>
      <g mask={`url(#${outsideId})`} opacity={0.4}>
        {sprays.map((mark, i) => (
          <Mark key={`o${i}`} mark={mark} surface={recipe.surface} uid={uid} />
        ))}
      </g>
      <g clipPath={`url(#${holesId})`}>
        {sprays.map((mark, i) => (
          <Mark key={`h${i}`} mark={mark} surface={recipe.surface} uid={uid} />
        ))}
      </g>
      {marks.map((mark, i) => (others.includes(mark) ? one(mark, i, `m${i}`) : null))}
      {editing &&
        (selected === cardIndex ? (
          <g data-craft-selected>
            <StencilCardOn mark={card} recipe={recipe} />
          </g>
        ) : (
          <StencilCardOn mark={card} recipe={recipe} />
        ))}
    </g>
  )
}

/** the spray's grain — one filter per svg, referenced by every spray mark on it */
export function GrainFilter({ uid }: { uid: string }) {
  return (
    // user-space bounds, not the path's own box: a near-horizontal stroke has a box a few units tall,
    // and a percentage region would clip the brush to it
    <filter id={`craft-grain-${uid}`} filterUnits="userSpaceOnUse" x="-100" y="-100" width="2000" height="2000">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
      <feGaussianBlur stdDeviation="0.6" />
    </filter>
  )
}
