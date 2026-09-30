/**
 * הדף — a sheet of newspaper-weight paper on the table: a faint column rule so it reads as
 * paper and not as a blank, a corner turned. Cuts are drawn on it by the marks; the sheet
 * itself never changes shape, because counting pieces is the score's job.
 */

import { SURFACE_BOX } from '@/lib/game/craft/types'

import type { SurfaceProps } from './surface'
import { TOKEN } from './tokens'


export function PaperSurface({ surface, base, uid, children, overlay }: SurfaceProps) {
  const { w, h } = SURFACE_BOX[surface]
  const clip = `craft-paper-${uid}`
  const lines = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8]
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={w} height={h} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={TOKEN[base]} />
      <g stroke={TOKEN.ink} strokeWidth={1} opacity={0.14}>
        {lines.map((f) => (
          <path key={f} d={`M${w * 0.1} ${f * h} H${w * 0.9}`} />
        ))}
        <rect x={w * 0.1} y={h * 0.08} width={w * 0.8} height={h * 0.07} fill={TOKEN.ink} stroke="none" />
      </g>
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={TOKEN.ink} strokeWidth={2} />
      <path d={`M${w - 26} ${h} L${w} ${h - 26} V${h} Z`} fill={TOKEN.concrete} stroke={TOKEN.ink} strokeWidth={1.5} />
      {overlay}
    </g>
  )
}
