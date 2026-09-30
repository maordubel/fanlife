import type { ReactNode } from 'react'

/**
 * המגרש המודפס — the printed pitch, built to the DUBID recipe.
 *
 * Five flat layers, bottom to top: grass, mowing stripes, halftone, chalk markings,
 * and a goal drawn in perspective at the far end so the picture says which way we are
 * attacking without a word of text. Print cannot fade, so there is not one gradient on
 * the grass itself — the depth comes from the halftone screen, exactly as it did when
 * a photo of a pitch was reproduced in two inks on newsprint.
 *
 * The markings are a `viewBox="0 0 100 122"` SVG with `preserveAspectRatio="none"`, so
 * they stretch with the box and the geometry never has to be recomputed. Coordinates
 * are physical (`left`, not `start`): a pitch does not flip when the language does.
 */

export function PressPitch({
  children,
  className,
  /** a 3px identity band along the top edge */
  accent,
  /**
   * delta 87 — inside a `FitBox`: the box is already the biggest 100/122 rectangle the
   * stage has room for, so the pitch fills it (`h-full w-full`) instead of computing its
   * own aspect ratio from its width, which is what every other caller still does.
   */
  fill = false,
}: {
  children?: ReactNode
  className?: string
  accent?: string
  fill?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden bg-press-grass ${fill ? 'h-full w-full' : 'w-full'} ${className ?? ''}`}
      style={{
        ...(fill ? {} : { aspectRatio: '100 / 122' }),
        // The paper margin outside the pitch is a shadow, not a border, so it never
        // enters the box model. The ink line is drawn separately, above the textures.
        boxShadow: '0 0 0 5px rgb(var(--p-paper))',
      }}
    >
      {/* 2 · mowing stripes — seven wide flat bands. Thin stripes moiré on a phone. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgb(var(--p-grass-dark)) 0 14.2857%, transparent 14.2857% 28.5714%)',
        }}
      />

      {/* 3 · halftone */}
      <div aria-hidden="true" className="halftone pointer-events-none absolute inset-0" />

      {/* 4 · the chalk */}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 122"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <g
          fill="none"
          stroke="rgb(var(--p-line))"
          strokeWidth="0.62"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        >
          <rect x="2.6" y="2.6" width="94.8" height="116.8" />
          <line x1="2.6" y1="61" x2="97.4" y2="61" />
          <circle cx="50" cy="61" r="13" />
          <rect x="24" y="2.6" width="52" height="20" />
          <rect x="38" y="2.6" width="24" height="7" />
          <path d="M36 22.6 A 15 15 0 0 1 64 22.6" />
          <rect x="24" y="99.4" width="52" height="20" />
          <rect x="38" y="112.4" width="24" height="7" />
          <path d="M36 99.4 A 15 15 0 0 0 64 99.4" />
        </g>
        <circle cx="50" cy="61" r="0.9" fill="rgb(var(--p-line))" />

        {/* 5 · the goal, in perspective, at the far end */}
        <path d="M31 3 L35 -2 L65 -2 L69 3 Z" fill="rgb(var(--p-net) / 0.72)" />
        <g stroke="rgb(var(--p-net-line))" strokeWidth="0.22" vectorEffect="non-scaling-stroke">
          {Array.from({ length: 8 }, (_, index) => {
            const i = index + 1
            return (
              <line
                key={i}
                x1={35 + (30 * i) / 9}
                y1={-2}
                x2={31 + (38 * i) / 9}
                y2={3}
              />
            )
          })}
          <line x1="31.9" y1="1.3" x2="68.1" y2="1.3" />
          <line x1="34.7" y1="-0.4" x2="65.3" y2="-0.4" />
        </g>
        <path
          d="M31 3 L35 -2 L65 -2 L69 3"
          fill="none"
          stroke="rgb(var(--p-ink))"
          strokeWidth="0.8"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* 6 · the ink line that closes the surface — a soft edge reads as a screen, a
          line reads as print. It has to sit ABOVE the stripes: as an inset shadow on
          the container it was painted under them, so it survived only in the gaps
          between mowing bands and came out as a dashed edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: 'inset 0 0 0 3px rgb(var(--p-ink))' }}
      />

      {/* 8 · optional identity band */}
      {accent && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
          style={{ background: accent }}
        />
      )}

      {children}
    </div>
  )
}
