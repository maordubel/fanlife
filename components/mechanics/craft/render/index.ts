import type { ComponentType } from 'react'

import type { CraftSurface } from '@/lib/game/craft/types'

import { BannerSurface } from './BannerSurface'
import { PaperSurface } from './PaperSurface'
import { ShirtSurface } from './ShirtSurface'
import { StickerSurface } from './StickerSurface'
import type { SurfaceProps } from './surface'
import { WallSurface } from './WallSurface'

/** eight surfaces, five drawings: a flag is cloth, a poster and a stencil sheet are paper */
export const SURFACES: Record<CraftSurface, ComponentType<SurfaceProps>> = {
  shirt: ShirtSurface,
  banner: BannerSurface,
  paper: PaperSurface,
  wall: WallSurface,
  flag: BannerSurface,
  poster: PaperSurface,
  stencil: PaperSurface,
  sticker: StickerSurface,
}

export { GrainFilter, Marks, Mark } from './marks'
export type { SurfaceProps } from './surface'
