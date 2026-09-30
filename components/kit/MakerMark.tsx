/**
 * סימני היצרנים — the alternative set, drawn as vector.
 *
 * A manufacturer's trademark is not ours to redraw. The project has said that since the
 * first kit delta and it is why the maker used to be a name lettered in a dashed frame.
 * Maor's answer is better than either: an **alternative set** — marks that read as the
 * maker at a glance without being that maker's artwork. He supplied six (STRIKE for the
 * swoosh, ADIO and CLASSIC for the two adidas eras, BLACK DOG for the cat, ROMBUS for
 * the double diamond, MICRON for the M) and the archive needs two more, drawn here in
 * the same idiom: TWIN for Kappa's back-to-back pair and DIA for Diadora's arrowhead.
 *
 * They are redrawn as paths rather than traced from the sheet, for three reasons that
 * all matter at the size these print:
 *  · **They are monochrome.** A mark on a shirt takes the shirt's second ink, the way a
 *    real applique does; a full-colour logo pasted onto cloth reads as a sticker.
 *  · **They are ~24×28 on the garment.** A raster of a detailed logo at that size is
 *    mush, and the same file has to hold up on a 340px drawer card.
 *  · **Vector costs nothing.** Eight marks are a few hundred bytes and no requests.
 *
 * The NAME on the card stays the real one from the archive — NIKE, adidas, MACRON. The
 * fact of who made a shirt is a fact about the shirt and the archive has a source for
 * it; what is replaced is only the artwork, which is the part that was never ours.
 */

import type { MakerMarkId } from '@/lib/kit/maker-marks'

// The table and the era rule live in `lib/kit/maker-marks.ts` so the Kit Master builder (plain
// node, no JSX) resolves a maker's mark with the same code the drawing uses.
export { markFor, type MakerMarkId } from '@/lib/kit/maker-marks'

/**
 * One mark, drawn on a 24×28 board so every one of them occupies the same slot.
 *
 * `ink` is passed rather than inherited so a mark can be printed in the shirt's second
 * colour on the garment and in plain ink on a drawer card without two components.
 */
export function MakerMark({ id, ink }: { id: MakerMarkId; ink: string }) {
  switch (id) {
    // STRIKE — a blade and a bolt crossing it. The bolt is the half that reads at 24px.
    case 'strike':
      return (
        <g fill={ink}>
          <path d="M0 21C5 12 14 4 24 1C19 8 10 16 2 22Z" />
          <path d="M13 0L6 12H11L7 24L19 9H13L18 0Z" />
        </g>
      )
    // ADIO — three bars climbing, cut on the slant. The climb is the whole read.
    case 'adio':
      return (
        <g fill={ink}>
          <path d="M2 24L9 24L9 13Z" />
          <path d="M8 24L15 24L15 7L11 10Z" />
          <path d="M14 24L22 24L22 0L17 4Z" />
        </g>
      )
    // CLASSIC — three leaves over three rules. The trefoil era, in silhouette.
    case 'classic':
      return (
        <g fill={ink}>
          <path d="M12 1C14 5 15 9 15 14H9C9 9 10 5 12 1Z" />
          <path d="M3 6C7 7 10 10 13 14L8 16C5 12 4 9 3 6Z" />
          <path d="M21 6C17 7 14 10 11 14L16 16C19 12 20 9 21 6Z" />
          <rect x="2" y="17" width="20" height="2.4" />
          <rect x="2" y="20.6" width="20" height="2.4" />
          <rect x="2" y="24.2" width="20" height="2.4" />
        </g>
      )
    // BLACK DOG — the leap.
    //
    // Two attempts failed the same way: a fat horizontal body with short legs reads as
    // a turtle, not a dog in the air. What makes an animal legible in silhouette at
    // 24px is the DIAGONAL — nose high and forward, haunch low and back, and legs that
    // extend along that line instead of hanging off it. The body here is a thin
    // stretched wedge, and every leg leaves it at a different angle.
    case 'blackdog':
      return (
        <g fill={ink}>
          {/* muzzle, head and ear, thrown forward and up */}
          <path d="M24 6L17 9L18 12L22 12C24 11 25 8 24 6Z" />
          <path d="M18 4L20 9L16 9Z" />
          {/* the spine: shoulder high at the right, haunch low at the left */}
          <path d="M18 9C14 10 10 12 7 15C5 17 4 19 4 21L8 20C10 17 13 15 17 14C19 13 19 10 18 9Z" />
          {/* tail, whipped up and back */}
          <path d="M4 20C2 17 1 13 2 9L5 11C4 14 5 17 6 19Z" />
          {/* front pair, reaching */}
          <path d="M17 13.6L22 21.5L19.6 22.8L15 15.2Z" />
          <path d="M13.4 15L16 24.4L13.4 25L11.2 16.2Z" />
          {/* back pair, driving */}
          <path d="M7.6 18.4L5.6 26L8.2 26.4L10 19.4Z" />
          <path d="M5 20.4L1.6 25.6L3.8 26.8L7 21.6Z" />
        </g>
      )
    // ROMBUS — the double diamond, outline only, the way it sits on a sleeve.
    case 'rombus':
      return (
        <g fill="none" stroke={ink} strokeWidth="2.4" strokeLinejoin="round">
          <path d="M12 2L22 14L12 26L2 14Z" />
          <path d="M12 8L17 14L12 20L7 14Z" />
        </g>
      )
    // MICRON — the M that is also a figure with its arms up. The first version stacked
    // a head on top of a solid M and read as a crown: the two readings have to share
    // strokes, not sit on top of each other. Here the M's outer legs ARE the arms —
    // they rise past the shoulder line and open outward — and the head sits in the
    // notch between them.
    case 'micron':
      return (
        <g fill="none" stroke={ink} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 26V13L12 22L21 13V26" />
          <path d="M3 13L1 4" />
          <path d="M21 13L23 4" />
          <circle cx="12" cy="7" r="3.4" fill={ink} stroke="none" />
        </g>
      )
    // TWIN — Kappa's pair, back to back. Two seated silhouettes sharing a spine.
    case 'twin':
      return (
        <g fill={ink}>
          <circle cx="8" cy="5" r="3.2" />
          <path d="M11 9C8 9 5 11 4 15C3 19 3 23 4 26H11Z" />
          <circle cx="16" cy="5" r="3.2" />
          <path d="M13 9C16 9 19 11 20 15C21 19 21 23 20 26H13Z" />
        </g>
      )
    // DIA — Diadora's arrowhead, opened out into a chevron pair.
    case 'dia':
      return (
        <g fill={ink}>
          <path d="M0 18L12 2L24 18L12 11Z" />
          <path d="M5 26L12 17L19 26L12 22Z" opacity="0.85" />
        </g>
      )
    default:
      return null
  }
}
