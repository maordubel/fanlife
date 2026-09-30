/**
 * המדבקה — a square sticker on its backing paper: a thick border, a corner already peeling.
 * The smallest thing on the bench.
 */

import { SURFACE_BOX } from '@/lib/game/craft/types'

import type { SurfaceProps } from './surface'
import { TOKEN } from './tokens'

const PAD = 22

export function StickerSurface({ surface, base, uid, children, overlay }: SurfaceProps) {
  const { w, h } = SURFACE_BOX[surface]
  const clip = `craft-sticker-${uid}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={PAD} y={PAD} width={w - PAD * 2} height={h - PAD * 2} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={TOKEN.concrete} opacity={0.35} />
      <rect x={PAD} y={PAD} width={w - PAD * 2} height={h - PAD * 2} fill={TOKEN[base]} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect x={PAD} y={PAD} width={w - PAD * 2} height={h - PAD * 2} fill="none" stroke={TOKEN.ink} strokeWidth={5} />
      <rect x={PAD + 7} y={PAD + 7} width={w - PAD * 2 - 14} height={h - PAD * 2 - 14} fill="none" stroke={TOKEN.ink} strokeWidth={1} opacity={0.5} />
      <path d={`M${PAD} ${h - PAD} L${PAD + 30} ${h - PAD} L${PAD} ${h - PAD - 30} Z`} fill={TOKEN.sheet} stroke={TOKEN.ink} strokeWidth={2} />
      {overlay}
    </g>
  )
}
