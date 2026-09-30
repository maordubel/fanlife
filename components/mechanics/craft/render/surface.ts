import type { ReactNode } from 'react'

import type { CraftColor, CraftSurface } from '@/lib/game/craft/types'

/**
 * A surface draws the thing itself — the cloth, the sheet, the wall — and clips whatever is
 * drawn on it to its own shape. It is SVG content for a `<svg viewBox>` of its `SURFACE_BOX`;
 * the bench and the world view supply the `<svg>`. `surface` names the box, because a flag
 * is drawn like a banner but is not the banner's size.
 */
export type SurfaceProps = {
  surface: CraftSurface
  base: CraftColor
  uid: string
  /** the marks (and the bench's live stroke), clipped to the surface */
  children?: ReactNode
  /** the bench's selection and handles — above the marks, never clipped */
  overlay?: ReactNode
}
