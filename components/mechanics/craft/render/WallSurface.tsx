/**
 * הקיר — concrete, from noise: a turbulence filter over the concrete token, a few shutter
 * joints, a darker foot. No image, no photograph; the wall is grey because the token is.
 */

import { SURFACE_BOX } from '@/lib/game/craft/types'

import type { SurfaceProps } from './surface'
import { TOKEN } from './tokens'


export function WallSurface({ surface, base, uid, children, overlay }: SurfaceProps) {
  const { w, h } = SURFACE_BOX[surface]
  const grain = `craft-concrete-${uid}`
  const clip = `craft-wall-${uid}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x={0} y={0} width={w} height={h} />
        </clipPath>
        <filter id={grain} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.08" numOctaves="3" seed="3" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey" result="soft">
            <feFuncA type="linear" slope="0.35" intercept="0" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="soft" mode="multiply" />
        </filter>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={TOKEN[base]} filter={`url(#${grain})`} />
      <rect x={0} y={0} width={w} height={h} fill={TOKEN.ink} opacity={0.32} />
      <rect x={0} y={0} width={w} height={h} fill={TOKEN.ink} filter={`url(#${grain})`} opacity={0.18} />
      <g stroke={TOKEN.ink} strokeWidth={1.5} opacity={0.35} fill="none">
        <path d={`M0 ${h * 0.34} H${w}`} />
        <path d={`M0 ${h * 0.67} H${w}`} />
        <path d={`M${w * 0.5} 0 V${h * 0.34}`} />
        <path d={`M${w * 0.25} ${h * 0.34} V${h * 0.67}`} />
        <path d={`M${w * 0.75} ${h * 0.34} V${h * 0.67}`} />
        <path d={`M${w * 0.5} ${h * 0.67} V${h}`} />
      </g>
      <rect x={0} y={h - 10} width={w} height={10} fill={TOKEN.ink} opacity={0.35} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <rect x={0} y={0} width={w} height={h} fill="none" stroke={TOKEN.ink} strokeWidth={2} />
      {overlay}
    </g>
  )
}
