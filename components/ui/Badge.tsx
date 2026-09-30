import Image from 'next/image'

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
  return (
    <Image
      src="/brand/logo-192.png"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      unoptimized
      priority={priority}
      className={className}
    />
  )
}
