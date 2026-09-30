import { KitShirt } from '@/components/kit/KitShirt'
import type { ShirtLook } from '@/lib/kit/playerShirt'

/**
 * החולצה — one man's shirt, drawn from `lib/kit/playerShirt.ts` (delta 88).
 *
 * A photograph when the archive has one — the 168 shirts in `public/kits/` are already
 * cut out onto transparency, so the shirt stands straight on the grass or the paper with
 * no plate, no box and no frame (delta 87: no squares around shirts). Only where no
 * photograph of his era exists does the kit engine draw it (`KitShirt`, mini density).
 *
 * `alt`/`title` is the caller's sentence ("חולצת 1999/00") — this component holds no copy.
 */
export function PlayerShirt({
  look,
  title,
  className = '',
  eager = false,
}: {
  look: ShirtLook
  title?: string
  /** the box — its size and aspect; the shirt is contained inside it */
  className?: string
  /** a pitch shirt loads at once; a rail shirt waits until it scrolls near */
  eager?: boolean
}) {
  if (look.kind === 'photo') {
    return (
      <span className={`relative block ${className}`} data-shirt="photo">
        {/* eslint-disable-next-line @next/next/no-img-element -- the measured bytes ship as-is (rule 61) */}
        <img
          src={look.src}
          alt={title ?? ''}
          title={title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />
      </span>
    )
  }
  return (
    <span className={`relative block ${className}`} data-shirt="engine">
      <KitShirt spec={look.spec} density="mini" className="absolute inset-0 block h-full w-full" title={title} />
    </span>
  )
}
