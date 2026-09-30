/**
 * החולצה — the kit engine's own nineties cut (`lib/kit/body-templates.ts`), laid flat: body,
 * sleeves, seams and a round neck, in the base colour, with the marks clipped to the body
 * so a stripe stops at the seam like a printed one does. Nothing here is a season's shirt —
 * it is the blank a fan draws on.
 */

import { BODY_TEMPLATES } from '@/lib/kit/body-templates'
import { SURFACE_BOX } from '@/lib/game/craft/types'

import type { SurfaceProps } from './surface'
import { TOKEN } from './tokens'

const CUT = BODY_TEMPLATES['retro-90s-boxy']

export function ShirtSurface({ surface, base, uid, children, overlay }: SurfaceProps) {
  const { w, h } = SURFACE_BOX[surface]
  const cloth = TOKEN[base]
  const clip = `craft-shirt-${uid}`
  const neck = CUT.neck
  const collar = `M${neck.cx - neck.width / 2} ${neck.cy} Q${neck.cx} ${neck.cy + neck.depth * 1.6} ${neck.cx + neck.width / 2} ${neck.cy}`
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={CUT.bodyPath} />
          <path d={CUT.leftSleevePath} />
          <path d={CUT.rightSleevePath} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={TOKEN.concrete} opacity={0.25} />
      <path d={CUT.leftSleevePath} fill={cloth} />
      <path d={CUT.rightSleevePath} fill={cloth} />
      <path d={CUT.bodyPath} fill={cloth} />
      <g clipPath={`url(#${clip})`}>{children}</g>
      <g fill="none" stroke={TOKEN.ink} strokeWidth={1.2} opacity={0.55}>
        <path d={CUT.leftSleeveSeam} />
        <path d={CUT.rightSleeveSeam} />
        <path d={CUT.hemPath} />
        <path d={CUT.cuffLeftPath} />
        <path d={CUT.cuffRightPath} />
      </g>
      <g fill="none" stroke={TOKEN.ink} strokeWidth={2}>
        <path d={CUT.bodyPath} />
        <path d={CUT.leftSleevePath} />
        <path d={CUT.rightSleevePath} />
        <path d={collar} strokeWidth={4} />
      </g>
      {overlay}
    </g>
  )
}
