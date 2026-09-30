/**
 * הבד — a length of cloth on a rope: eyelets along the top, a weave, a hem. The paint is
 * clipped to the cloth; the rope and the eyelets sit above it, because paint does not reach
 * a rope.
 */

import { SURFACE_BOX } from '@/lib/game/craft/types'

import type { SurfaceProps } from './surface'
import { TOKEN } from './tokens'

const TOP = 14

export function BannerSurface({ surface, base, uid, children, overlay }: SurfaceProps) {
  const { w, h } = SURFACE_BOX[surface]
  const cloth = `M0 ${TOP} H${w} V${h - 6} Q${w * 0.75} ${h} ${w * 0.5} ${h - 4} Q${w * 0.25} ${h - 8} 0 ${h - 2} Z`
  const clip = `craft-banner-${uid}`
  const weave = `craft-weave-${uid}`
  const eyelets = [0.06, 0.28, 0.5, 0.72, 0.94]
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={cloth} />
        </clipPath>
        <pattern id={weave} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 H6" stroke={TOKEN.ink} strokeWidth="0.5" opacity="0.12" />
        </pattern>
      </defs>
      <path d={cloth} fill={TOKEN[base]} />
      <path d={cloth} fill={`url(#${weave})`} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <path d={cloth} fill="none" stroke={TOKEN.ink} strokeWidth={2} />
      <path d={`M0 6 Q${w * 0.5} 0 ${w} 6`} fill="none" stroke={TOKEN.ink} strokeWidth={3} />
      {eyelets.map((f) => (
        <circle key={f} cx={f * w} cy={TOP + 6} r={4} fill={TOKEN.sheet} stroke={TOKEN.ink} strokeWidth={2} />
      ))}
      {overlay}
    </g>
  )
}
