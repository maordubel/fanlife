import plates from '@/lib/ussishkin/plates.json'

/**
 * לוח — one painting of the hall, printed at the width the screen actually has.
 *
 * Not `next/image`. Two reasons, and both are specific rather than stylistic. Next's
 * pipeline re-encodes on demand and subsamples chroma, which is exactly the step that
 * pushed edge pixels into the yellow band on the badge (see `components/ui/Badge.tsx`)
 * — and these paintings have vermilion seats against cream walls in every frame, which
 * is the worst case for that. Second, the derivatives are already made: two widths,
 * WebP, scanned pixel by pixel against `lib/isYellow.ts` after they were written
 * (`scripts/uss/make-web-art.py` corrected 182 pixels the resize introduced). A
 * pipeline that re-encodes them would undo a check that has already passed.
 *
 * `width`/`height` come from the manifest, so every plate reserves its own box and the
 * page never shifts under a reader's thumb.
 */

type PlateKey = keyof typeof plates.plates

export function HallPlate({
  plate,
  alt,
  eager = false,
  className = '',
}: {
  plate: PlateKey
  alt: string
  eager?: boolean
  className?: string
}) {
  const entry = plates.plates[plate]
  const sizes = entry.sizes
  const largest = sizes[sizes.length - 1] ?? sizes[0]
  if (!largest) return null

  return (
    // Deliberate, and explained in the block above: these derivatives are already WebP
    // at two widths and were scanned pixel by pixel against `lib/isYellow.ts` AFTER
    // they were written. Next's optimizer would re-encode them and subsample chroma,
    // which is the exact step that has put yellow back into this project's artwork
    // twice over (rules 8 and 27).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/uss/${plate}-${largest.w}.webp`}
      srcSet={sizes.map((size) => `/uss/${plate}-${size.w}.webp ${size.w}w`).join(', ')}
      sizes="(min-width: 64rem) 64rem, 100vw"
      width={largest.w}
      height={largest.h}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={eager ? 'sync' : 'async'}
      // `fetchPriority` on the one plate above the fold: it is the largest paint on the
      // screen, and letting it queue behind the fonts is what makes a heavy page feel
      // slow even when it is not.
      fetchPriority={eager ? 'high' : undefined}
      className={`block w-full ${className}`}
    />
  )
}

export function plateSize(plate: PlateKey): { w: number; h: number } {
  const sizes = plates.plates[plate].sizes
  const largest = sizes[sizes.length - 1] ?? { w: 1520, h: 856 }
  return { w: largest.w, h: largest.h }
}
