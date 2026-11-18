import Image from 'next/image'
import {FANLIFE_LOGO,WORKER_BADGE} from '@/lib/brand/logos'

/**
 * הסמל — Maor's badge, and the only mark this product has.
 *
 * `unoptimized` is not laziness. Next's image pipeline re-encodes to WebP/AVIF, both of
 * which subsample chroma; on a 62px render of this drawing that pushed a handful of
 * dark edge pixels into the yellow hue band, and the yellow rule has no exemption for
 * "it's the compressor's fault". The PNG is 12 kB. It ships as drawn.
 */
export function Badge({
  size = 54,
  className = '',
  priority = false,
}: {
  size?: number
  className?: string
  priority?: boolean
}) {
  // both marks ship; <html data-edition> shows FAN LIFE's roundel everywhere but THE WORKER's own host (docs/rules/two-logos.md)
  return (
    <>
      {(['fanlife','worker'] as const).map(e=><Image key={e} data-mark={e}
      src={e==='fanlife'?FANLIFE_LOGO[192]:WORKER_BADGE[192]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      priority={priority}
      className={className}
    />
      )}
    </>
  )
}
