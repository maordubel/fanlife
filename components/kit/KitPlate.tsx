import { useId } from 'react'

import { MakerMark, markFor } from '@/components/kit/MakerMark'
import { crestArt, seasonStartYear } from '@/lib/kit/crestMarks'
import {
  COLOUR_VAR,
  type CollarId,
  type KitSpec,
  type PatternId,
} from '@/lib/kit/spec'

/**
 * לוחית החולצה — the kit renderer, rebuilt against `Kit Game.dc.html`.
 *
 * The shirt this replaces was drawn to the earlier Shirt Archive handoff: a flat tee on
 * a 220×260 board, straight-edged, with flat fills and a fold gradient. It was correct
 * for what it was and it is not what the Kit Game needs. The new handoff draws the
 * garment on a 340×320 board with a real anatomy, and the difference is not decoration —
 * it is what makes a shirt you are ASSEMBLING feel like cloth you are dressing rather
 * than a diagram you are labelling:
 *
 *  · **The silhouette is curved**, not chamfered. Shoulder, armhole and hem are all
 *    beziers, so the outline reads as a garment at 90px on a phone as well as at 520px.
 *  · **Folds are a drawn layer** (`jr-folds`), not a linear gradient: two dark columns
 *    down the flanks, a light panel off-centre, a shadow under the collar and a dark lip
 *    at the hem. A gradient makes a cylinder; drawn folds make a shirt on a hanger.
 *  · **Seams are dashed hairlines** where the sleeve meets the body and along the hem.
 *    It is the smallest layer here and the one that does most of the work.
 *  · **A weave filter** — fractal turbulence, desaturated, multiplied at 13% — puts a
 *    knit under everything. Flat vector fill is the single thing that most makes a
 *    drawn shirt look like a sticker.
 *
 * Everything is clipped to the garment, so a pattern is a full-bleed shape that the
 * shirt cuts out rather than a shape somebody had to fit by hand. That is why seventeen
 * patterns can be drawn in a few lines each and why adding an eighteenth is cheap.
 *
 * The input is `KitSpec` — the same eight-layer contract the archive already speaks
 * (rule 20). This file changes how a shirt is DRAWN and nothing about what a shirt IS.
 */

/* ------------------------------------------------------------------ anatomy */

const SLEEVE_L =
  'M104 54C84 62 62 92 46 132C54 144 66 152 82 156C88 140 90 126 92 112C94 92 100 74 104 54Z'
const SLEEVE_R =
  'M216 54C236 62 258 92 274 132C266 144 254 152 238 156C232 140 230 126 228 112C226 92 220 74 216 54Z'
const BODY =
  'M136 48C126 49 114 51 104 54C100 74 94 92 92 112C88 150 84 190 86 292C120 300 200 300 234 292C236 190 232 150 228 112C226 92 220 74 216 54C206 51 194 49 184 48C178 68 142 68 136 48Z'
const NECK = 'M136 48C142 70 178 70 184 48'
const CUFFS = 'M52 125C60 137 70 147 85 152M268 125C260 137 250 147 235 152'

/** Where the three marks sit. Fixed slots — the game's drop zones are these boxes. */
export const SLOTS = {
  sponsor: { x: 100, y: 160, w: 120, h: 34 },
  crest: { x: 184, y: 86, w: 40, h: 44 },
  maker: { x: 112, y: 90, w: 24, h: 28 },
} as const

export type PlateSlot = keyof typeof SLOTS

/* ------------------------------------------------------------------ the plate */

export function KitPlate({
  spec,
  className = '',
  missing = [],
  /** draw the fabric texture — off for a thumbnail, where it is noise at 90px */
  texture = true,
  viewBox = '20 30 300 285',
  title,
}: {
  spec: KitSpec
  className?: string
  /** slots the player still has to fill, drawn as a dashed frame instead of content */
  missing?: PlateSlot[]
  texture?: boolean
  /** crop the plate — a drawer card shows the part, not the whole garment */
  viewBox?: string
  title?: string
}) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`

  const base = COLOUR_VAR[spec.base]
  const patternInk = COLOUR_VAR[spec.patternInk]
  const sleeve = COLOUR_VAR[spec.sleeveInk]
  const collar = COLOUR_VAR[spec.collarInk]
  const light = spec.base === 'cream' || spec.base === 'paper'
  // The outline follows the cloth, not the palette: a cream shirt outlined in ink reads
  // as a colouring book, and a red shirt outlined in cream disappears on the sheet.
  const edge = light ? 'rgb(var(--muted))' : COLOUR_VAR.deep

  const gone = new Set(missing)

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={id('cut')}>
          <path d={BODY} />
          <path d={SLEEVE_L} />
          <path d={SLEEVE_R} />
        </clipPath>

        {/* the knit. Desaturated so it darkens the cloth without tinting it — a
            turbulence left in colour puts every hue on the wheel into the fabric,
            and rule 8 has an opinion about one of them. */}
        <filter id={id('weave')} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" result="n" />
          <feColorMatrix type="saturate" values="0" in="n" />
        </filter>
        <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* 1 · the cloth */}
      <path d={SLEEVE_L} fill={sleeve} stroke={edge} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={SLEEVE_R} fill={sleeve} stroke={edge} strokeWidth="1.6" strokeLinejoin="round" />
      <path d={BODY} fill={base} stroke={edge} strokeWidth="1.6" strokeLinejoin="round" />

      <g clipPath={`url(#${id('cut')})`}>
        {/* 2 · the pattern, full-bleed and cut out by the garment */}
        <Pattern id={spec.pattern} ink={patternInk} base={base} />

        {/* 3 · folds — the layer that turns fill into cloth */}
        <g filter={`url(#${id('soft')})`}>
          <path d="M92 112C104 118 112 128 118 140C110 176 106 220 106 292H92C90 220 88 158 92 112Z" fill="rgb(var(--ink))" opacity="0.16" />
          <path d="M228 112C216 118 208 128 202 140C210 176 214 220 214 292H228C230 220 232 158 228 112Z" fill="rgb(var(--ink))" opacity="0.16" />
          <path d="M136 210C150 206 172 206 186 210C184 250 184 274 186 296H136C138 272 138 248 136 210Z" fill="rgb(var(--ink))" opacity="0.07" />
          <path d="M128 92C142 86 178 86 192 92C190 122 190 158 192 194C178 188 142 188 128 194C130 158 130 122 128 92Z" fill="rgb(var(--sheet))" opacity="0.09" />
          <path d="M46 132C56 104 74 76 96 60C90 82 86 100 84 118C70 122 56 128 46 132Z" fill="rgb(var(--ink))" opacity="0.13" />
          <path d="M274 132C264 104 246 76 224 60C230 82 234 100 236 118C250 122 264 128 274 132Z" fill="rgb(var(--ink))" opacity="0.13" />
          <path d="M138 52C144 70 176 70 182 52C182 62 172 78 160 78C148 78 138 62 138 52Z" fill="rgb(var(--ink))" opacity="0.1" />
          <path d="M86 280C120 292 200 292 234 280C234 288 234 292 234 292C200 300 120 300 86 292Z" fill="rgb(var(--ink))" opacity="0.1" />
        </g>

        {/* 4 · the knit */}
        {texture && (
          <rect
            x="20"
            y="20"
            width="300"
            height="290"
            filter={`url(#${id('weave')})`}
            style={{ mixBlendMode: 'multiply' }}
            opacity="0.13"
          />
        )}

        {/* 5 · seams */}
        <g fill="none" stroke="rgb(var(--ink))" strokeOpacity="0.3" strokeWidth="1" strokeDasharray="3 2.5">
          <path d="M96 112C98 90 102 72 106 56" />
          <path d="M224 112C222 90 218 72 214 56" />
          <path d="M88 285C122 294 198 294 232 285" />
          <path d="M56 128C64 140 74 149 88 154" />
          <path d="M264 128C256 140 246 149 232 154" />
        </g>
      </g>

      {/* 6 · collar and cuffs, drawn OUTSIDE the clip so their stroke keeps its weight
             at the neckline instead of being shaved in half by the cut */}
      <Collar id={spec.collar} colour={collar} edge={edge} />
      <path d={CUFFS} fill="none" stroke={collar} strokeWidth="7" />
      <path d={CUFFS} fill="none" stroke={edge} strokeWidth="1.2" opacity="0.7" />

      {/* 7 · the marks */}
      <g clipPath={`url(#${id('cut')})`}>
        {gone.has('sponsor') ? (
          <Gap slot="sponsor" />
        ) : (
          <Sponsor text={spec.sponsorHe} ink={patternInk} />
        )}
        {gone.has('crest') ? <Gap slot="crest" /> : <Crest crestKey={spec.crestKey} darkCloth={!light} year={seasonStartYear(spec.seasonLabel)} />}
        {gone.has('maker') ? (
          <Gap slot="maker" />
        ) : (
          <Maker text={spec.makerHe} season={spec.seasonLabel} ink={patternInk} />
        )}
      </g>
    </svg>
  )
}

/**
 * A slot the player still has to fill.
 *
 * Navy dashed, never a grey box: the shell's second plate is what this app marks an
 * incomplete thing with everywhere else, and a neutral grey would read as a rendering
 * failure rather than as an invitation.
 */
function Gap({ slot }: { slot: PlateSlot }) {
  const box = SLOTS[slot]
  return (
    <rect
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      fill="rgb(var(--sign))"
      fillOpacity="0.09"
      stroke="rgb(var(--sign))"
      strokeWidth="2"
      strokeDasharray="5 4"
    />
  )
}

/* ------------------------------------------------------------------ patterns */

/**
 * Seventeen cuts, each a full-bleed shape the garment clips.
 *
 * Drawing a pattern to the outline is how the old renderer did it and it is why adding
 * one was expensive: every shape had to be fitted to the silhouette by hand. Clipping
 * inverts that — a hoop is a rectangle across the whole board and the shirt decides
 * what a hoop looks like on a sleeve.
 */
function Pattern({ id, ink, base }: { id: PatternId; ink: string; base: string }) {
  switch (id) {
    case 'solid':
      return null
    case 'stripe-wide':
      return (
        <g fill={ink}>
          {[92, 140, 188, 236, 284].map((x) => (
            <rect key={x} x={x} y="20" width="24" height="300" />
          ))}
        </g>
      )
    case 'pinstripe':
      return (
        <g fill={ink}>
          {[106, 133, 160, 187, 214, 241].map((x) => (
            <rect key={x} x={x} y="20" width="4" height="300" />
          ))}
        </g>
      )
    case 'twin-stripe':
      return (
        <g fill={ink}>
          <rect x="146" y="20" width="10" height="300" />
          <rect x="166" y="20" width="10" height="300" />
        </g>
      )
    case 'hoop-tonal':
      return (
        <g fill={ink}>
          {[120, 186, 252].map((y) => (
            <rect key={y} x="20" y={y} width="300" height="26" />
          ))}
        </g>
      )
    case 'chest-band':
      return (
        <g fill={ink}>
          <rect x="20" y="152" width="300" height="52" />
          <rect x="20" y="144" width="300" height="4" />
          <rect x="20" y="210" width="300" height="4" />
        </g>
      )
    case 'shoulder-panel':
    case 'yoke-v':
      return (
        <g fill={ink}>
          <path d="M100 50C120 42 200 42 220 50C224 80 229 102 233 120C206 110 114 110 87 120C91 102 96 80 100 50Z" />
          <path d="M90 128C88 190 87 250 87 300H98C98 248 97 190 101 130Z" />
          <path d="M230 128C232 190 233 250 233 300H222C222 248 223 190 219 130Z" />
        </g>
      )
    case 'sash':
      return <path d="M20 250L250 30H310L70 300Z" fill={ink} />
    case 'diagonal':
      return (
        <g fill={ink} opacity="0.85">
          {[-120, -80, -40, 0, 40, 80, 120, 160, 200, 240].map((offset) => (
            <path key={offset} d={`M${offset} 320L${offset + 120} 20H${offset + 132}L${offset + 12} 320Z`} />
          ))}
        </g>
      )
    case 'halves':
      return <rect x="160" y="20" width="180" height="300" fill={ink} />
    case 'quarters':
      return (
        <g fill={ink}>
          <rect x="160" y="20" width="180" height="150" />
          <rect x="20" y="170" width="140" height="150" />
        </g>
      )
    case 'side-panel':
      return (
        <g fill={ink}>
          <path d="M86 112C96 118 104 130 108 146C102 190 100 240 100 300H86C84 230 84 170 86 112Z" />
          <path d="M234 112C224 118 216 130 212 146C218 190 220 240 220 300H234C236 230 236 170 234 112Z" />
        </g>
      )
    case 'chevron':
      return (
        <g fill="none" stroke={ink} strokeWidth="11">
          {[130, 162, 194, 226].map((y) => (
            <path key={y} d={`M80 ${y}L160 ${y + 34}L240 ${y}`} />
          ))}
        </g>
      )
    case 'grid-tonal':
      return (
        <g fill="none" stroke={ink} strokeWidth="2" opacity="0.5">
          {[60, 90, 120, 150, 180, 210, 240, 270, 300].map((y) => (
            <path key={`h${y}`} d={`M20 ${y}H320`} />
          ))}
          {[60, 90, 120, 150, 180, 210, 240, 270].map((x) => (
            <path key={`v${x}`} d={`M${x} 20V320`} />
          ))}
        </g>
      )
    case 'jacquard':
      return (
        <g fill={ink} opacity="0.45">
          {[60, 110, 160, 210, 260, 310].map((y) =>
            [50, 100, 150, 200, 250, 300].map((x) => (
              <path key={`${x}-${y}`} d={`M${x} ${y - 12}L${x + 12} ${y}L${x} ${y + 12}L${x - 12} ${y}Z`} />
            )),
          )}
        </g>
      )
    case 'gradient':
      return (
        <>
          <defs>
            <linearGradient id="kit-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={ink} stopOpacity="0.9" />
              <stop offset="1" stopColor={base} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="20" y="20" width="300" height="300" fill="url(#kit-fade)" />
        </>
      )
    default:
      return null
  }
}

/* ------------------------------------------------------------------ collar */

function Collar({ id, colour, edge }: { id: CollarId; colour: string; edge: string }) {
  if (id === 'v-neck') {
    return (
      <>
        <path d="M136 48L160 88L184 48" fill="none" stroke={colour} strokeWidth="11" strokeLinejoin="round" />
        <path d="M136 48L160 88L184 48" fill="none" stroke={edge} strokeWidth="1.5" />
      </>
    )
  }
  if (id === 'polo') {
    return (
      <>
        <path d="M132 44L160 82L188 44" fill="none" stroke={colour} strokeWidth="16" strokeLinejoin="round" />
        <path d={NECK} fill="none" stroke={colour} strokeWidth="11" />
        <path d="M158 52V86" stroke={edge} strokeWidth="1.4" />
        <path d={NECK} fill="none" stroke={edge} strokeWidth="1.5" />
      </>
    )
  }
  if (id === 'ringer' || id === 'laced') {
    return (
      <>
        <path d={NECK} fill="none" stroke={colour} strokeWidth="13" />
        <path d={NECK} fill="none" stroke={edge} strokeWidth="1.5" />
        {id === 'laced' && (
          <g stroke={edge} strokeWidth="1.6" fill="none">
            <path d="M150 58L170 66M150 66L170 58" />
          </g>
        )}
      </>
    )
  }
  return (
    <>
      <path d={NECK} fill="none" stroke={colour} strokeWidth="11" />
      <path d={NECK} fill="none" stroke={edge} strokeWidth="1.5" />
    </>
  )
}

/* ------------------------------------------------------------------ the marks */

/**
 * The sponsor is LETTERED, never stamped in a plate.
 *
 * Every photograph Maor sent shows the name printed onto the cloth, and a black slab
 * with white type in it — which is what the first version drew — is the one thing that
 * makes a drawn shirt look like a mock-up of a shirt. Hebrew sets in Karantina, Latin in
 * Archivo; the width is clamped to the chest so a long name condenses instead of running
 * into the sleeve seam.
 */
function Sponsor({ text, ink }: { text: string | null; ink: string }) {
  if (!text) return null
  const box = SLOTS.sponsor
  // Escaped, not literal: a Hebrew range typed as characters trips the brand guard
  // that reads source for untranslated strings — same fix as `lib/game/timeline.ts`.
  const latin = !/[\u0590-\u05FF]/.test(text)
  const size = text.length > 9 ? 19 : text.length > 6 ? 23 : 27
  return (
    <text
      x={box.x + box.w / 2}
      y={box.y + 25}
      textAnchor="middle"
      fill={ink}
      style={{
        font: latin
          ? `800 ${size}px Archivo, sans-serif`
          : `700 ${size + 3}px Karantina, sans-serif`,
        letterSpacing: latin ? '1.5px' : '0px',
      }}
      textLength={text.length > 11 ? box.w : undefined}
      lengthAdjust="spacingAndGlyphs"
    >
      {text}
    </text>
  )
}

/**
 * The maker's mark — the alternative set (`MakerMark.tsx`).
 *
 * The archive's real maker name stays the fact; the artwork is ours. See that file for
 * why, and for the two marks drawn to complete Maor's six.
 */
function Maker({ text, season, ink }: { text: string | null; season: string; ink: string }) {
  const mark = markFor(text, season)
  if (!mark) return null
  const box = SLOTS.maker
  return (
    <g transform={`translate(${box.x} ${box.y})`}>
      <MakerMark id={mark} ink={ink} />
    </g>
  )
}

/**
 * The crest of the era, PRINTED (rule 25).
 *
 * The first version of this file drew the mark — a shield outline, a stroke for the
 * hammer, a wedge for the flag. That is precisely what rule 25 forbids, and the rule is
 * there because Maor supplied the club's own seven marks: a crest is the club's
 * identity and an approximation of it is worse than an empty slot.
 *
 * The variant follows the cloth: the early mark exists in red and in white, and a red
 * crest on a red shirt is a texture rather than a badge. `crestArt` picks.
 *
 * Referenced as a plain `<image href>` inside the SVG rather than through Next's image
 * pipeline, which re-encodes to WebP/AVIF and subsamples chroma — the route that put
 * yellow back into the main badge at 62px (rule 8). All seven files scan clean and they
 * ship exactly as drawn.
 */
function Crest({ crestKey, darkCloth, year }: { crestKey: string | null; darkCloth: boolean; year?: number | null }) {
  const href = crestArt(crestKey, darkCloth, year)
  if (!href) return null
  const box = SLOTS.crest
  return (
    <image
      href={href}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      preserveAspectRatio="xMidYMid meet"
    />
  )
}

