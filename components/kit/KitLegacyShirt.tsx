import { useId } from 'react'

import {
  COLOUR_VAR,
  type CollarId,
  type KitColour,
  type KitSpec,
  type PatternId,
  type SleeveId,
} from '@/lib/kit/spec'

/**
 * החולצה — rebuilt against `The Worker - Shirt Archive.dc.html`.
 *
 * The first version drew a flat tee with a straight shoulder and a black slab across
 * the chest, and Maor's verdict — not close to the level, the sponsors look bad, the
 * positions are wrong — was accurate. The handoff spells out seven anatomical rules and
 * I had followed none of them. All seven are here now, each labelled with its number
 * from the drawing:
 *
 *   01 · **שיפוע כתף** — the shoulder DROPS from the neck instead of running flat.
 *   02 · **תפר שרוול** — a hairline where sleeve meets body, visible even on a plain
 *        shirt. It is most of what stops the silhouette reading as an icon.
 *   03 · **הצרה במותן** — the body pulls in four units at the waist and back out at the
 *        hem, so the outline is a garment and not a rectangle.
 *   04 · **מכפלת שרוול** — a cuff band at the sleeve end.
 *   05 · **שכבת קיפול** — a fold gradient: dark at both edges, light off-centre, 22%
 *        maximum. This is the layer that makes flat fill read as cloth.
 *   06 · **משבצות סימנים** — crest and maker sit in fixed slots. The MAKER is a dashed
 *        frame with the name lettered in it, never a traced logo — the handoff says
 *        trademarks are not drawn and that is also the right call. The club's own crest
 *        IS printed, because Maor supplied it and it is his club's mark.
 *   07 · **מכפלת תחתונה** — a hem line ten units above the edge.
 *
 * Plus a cast shadow at 16%, a knit texture at 7%, and a 4-unit outline. The sponsor
 * sits at y=158 in Karantina for Hebrew and Archivo 800 for Latin, and clamps its own
 * width rather than overflowing the chest — the two things that made the old sponsors
 * look pasted on.
 */

/** The handoff's outline. Curved hem, dropped shoulders, waist. */
const OUT =
  'M86 26 L68 30 L26 58 L14 104 Q33 116 52 120 L62 96 L58 176 L60 242 Q110 251 160 242 L162 176 L158 96 L168 120 Q187 116 206 104 L194 58 L152 30 L134 26 C128 42 92 42 86 26 Z'
const BODY =
  'M68 30 L62 96 L58 176 L60 242 Q110 251 160 242 L162 176 L158 96 L152 30 L134 26 C128 42 92 42 86 26 Z'
const SLEEVE_L = 'M68 30 L26 58 L14 104 Q33 116 52 120 L62 96 Z'
const SLEEVE_R = 'M152 30 L194 58 L206 104 Q187 116 168 120 L158 96 Z'

export function KitShirt({
  spec,
  className = '',
  missing = [],
  title,
}: {
  spec: KitSpec
  className?: string
  /** slots the player has to fill in, drawn as a navy dashed box instead of content */
  missing?: ('sponsor' | 'maker' | 'crest')[]
  title?: string
}) {
  const uid = useId().replace(/:/g, '')
  const id = (name: string) => `${name}-${uid}`
  const base = COLOUR_VAR[spec.base]
  const ink = COLOUR_VAR[spec.patternInk]
  const sleeve = COLOUR_VAR[spec.sleeveInk]
  const collar = COLOUR_VAR[spec.collarInk]
  const light = spec.base === 'cream' || spec.base === 'paper'

  return (
    <svg
      viewBox="-6 -4 236 274"
      className={className}
      style={{ overflow: 'visible' }}
      role="img"
      aria-label={title ?? spec.seasonLabel}
    >
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={id('all')}>
          <path d={OUT} />
        </clipPath>
        <clipPath id={id('body')}>
          <path d={BODY} />
        </clipPath>
        <clipPath id={id('sl')}>
          <path d={SLEEVE_L} />
        </clipPath>
        <clipPath id={id('sr')}>
          <path d={SLEEVE_R} />
        </clipPath>

        {/* the knit — diagonal hairlines at 7%, the texture that stops a fill being flat */}
        <pattern id={id('knit')} width="6" height="6" patternUnits="userSpaceOnUse">
          <path
            d="M0 6 L6 0 M-1 1 L1 -1 M5 7 L7 5"
            stroke={COLOUR_VAR.ink}
            strokeWidth=".9"
            opacity=".07"
            fill="none"
          />
        </pattern>

        {/* 05 · the fold. Dark at both edges, light off-centre, 22% maximum. */}
        <linearGradient id={id('fold')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={COLOUR_VAR.ink} stopOpacity=".22" />
          <stop offset=".16" stopColor={COLOUR_VAR.ink} stopOpacity="0" />
          <stop offset=".62" stopColor={COLOUR_VAR.cream} stopOpacity=".07" />
          <stop offset=".86" stopColor={COLOUR_VAR.ink} stopOpacity="0" />
          <stop offset="1" stopColor={COLOUR_VAR.ink} stopOpacity=".2" />
        </linearGradient>

        <Pattern id={id('pat')} pattern={spec.pattern} base={base} ink={ink} />
      </defs>

      {/* the cast shadow — the shirt sits on the sheet rather than floating in it */}
      <path d={OUT} fill={COLOUR_VAR.ink} opacity=".16" transform="translate(5,6)" />

      {/* 1 · base */}
      <g clipPath={`url(#${id('all')})`}>
        <rect width="220" height="260" fill={base} />
      </g>

      {/* 2 · the cut, on the body only */}
      <g clipPath={`url(#${id('body')})`}>
        <PatternFill id={id('pat')} pattern={spec.pattern} base={base} ink={ink} />
      </g>

      {/* 3 · sleeves */}
      <g clipPath={`url(#${id('sl')})`}>
        <SleeveFill treatment={spec.sleeves} ink={sleeve} base={base} side="l" />
      </g>
      <g clipPath={`url(#${id('sr')})`}>
        <SleeveFill treatment={spec.sleeves} ink={sleeve} base={base} side="r" />
      </g>

      {/* the two fabric layers, over every fill and under every mark */}
      <g clipPath={`url(#${id('all')})`}>
        <rect width="220" height="260" fill={`url(#${id('knit')})`} />
      </g>
      <g clipPath={`url(#${id('all')})`}>
        <rect width="220" height="260" fill={`url(#${id('fold')})`} />
      </g>

      {/* 04 · cuffs */}
      <g clipPath={`url(#${id('sl')})`}>
        <path d="M16 96 L54 112 L52 122 L13 106 Z" fill={collar} />
      </g>
      <g clipPath={`url(#${id('sr')})`}>
        <path d="M204 96 L166 112 L168 122 L207 106 Z" fill={collar} />
      </g>

      {/* the sponsor, on the fabric, clamped to the chest */}
      {missing.includes('sponsor') ? (
        <DashBox x={64} y={140} w={92} h={30} mark="?" />
      ) : (
        spec.sponsorHe && (
          <g clipPath={`url(#${id('body')})`}>
            <SponsorText text={spec.sponsorHe} light={light} />
          </g>
        )
      )}

      {/* 06 · the mark slots. The crest is printed; the maker is a dashed frame with the
              name lettered inside it, because a manufacturer's trademark is not ours to
              draw. Both sit exactly where the handoff puts them. */}
      {missing.includes('crest') ? (
        <DashBox x={128} y={62} w={22} h={26} />
      ) : spec.crestKey ? (
        <image
          href={`/brand/crests/${spec.crestKey}.png`}
          x="126"
          y="60"
          width="26"
          height="30"
          preserveAspectRatio="xMidYMid meet"
        />
      ) : null}

      {missing.includes('maker') ? (
        <DashBox x={72} y={66} w={20} h={10} />
      ) : (
        spec.makerHe && (
          <text
            x="82"
            y="74"
            textAnchor="middle"
            fill={light ? COLOUR_VAR.ink : COLOUR_VAR.cream}
            className="font-latin"
            style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em' }}
          >
            {spec.makerHe}
          </text>
        )
      )}

      {/* 4 · collar */}
      <Collar type={spec.collar} ink={collar} />

      {/* 02 · sleeve seams · 07 · the hem line · and the collar seam */}
      <g fill="none" stroke={COLOUR_VAR.ink} strokeOpacity=".42" strokeWidth="1.6">
        <path d="M68 30 L62 96" />
        <path d="M152 30 L158 96" />
        <path d="M60 232 Q110 241 160 232" />
        <path d="M82 30 C90 48 130 48 138 30" />
      </g>

      {spec.number !== null && (
        <Number value={spec.number} nameset={spec.nameset} light={light} />
      )}

      <path d={OUT} fill="none" stroke={COLOUR_VAR.ink} strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The sponsor, set the way the handoff sets it: Karantina for Hebrew, Archivo 800 for
 * Latin, and a `textLength` clamp when the estimate says it would run past the chest.
 * Clamping is what stops a long name either overflowing the shirt or being rendered so
 * small it reads as a smudge — the two failure modes of the old version.
 */
function SponsorText({ text, light }: { text: string; light: boolean }) {
  const latin = !/[\u0590-\u05FF]/.test(text)
  const size = latin ? 26 : 30
  const estimate = text.length * size * (latin ? 0.62 : 0.46)
  const clamp = estimate > 92 ? { textLength: 92, lengthAdjust: 'spacingAndGlyphs' as const } : {}
  return (
    <text
      x="110"
      y="158"
      textAnchor="middle"
      {...clamp}
      fill={light ? COLOUR_VAR.red : COLOUR_VAR.cream}
      style={{
        fontFamily: latin ? 'var(--font-latin)' : 'var(--font-poster)',
        fontWeight: latin ? 800 : 700,
        fontSize: size,
        direction: latin ? 'ltr' : 'rtl',
      }}
    >
      {text}
    </text>
  )
}

function DashBox({
  x,
  y,
  w,
  h,
  mark,
}: {
  x: number
  y: number
  w: number
  h: number
  mark?: string
}) {
  return (
    <>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="none"
        stroke={COLOUR_VAR.navy}
        strokeWidth="2.2"
        strokeDasharray="3 2.5"
      />
      {mark && (
        <text
          x={x + w / 2}
          y={y + h * 0.76}
          textAnchor="middle"
          fill={COLOUR_VAR.navy}
          className="font-poster"
          style={{ fontSize: 24 }}
        >
          {mark}
        </text>
      )}
    </>
  )
}

/** The pattern library, as `<pattern>` defs. */
function Pattern({
  id,
  pattern,
  base,
  ink,
}: {
  id: string
  pattern: PatternId
  base: string
  ink: string
}) {
  switch (pattern) {
    case 'stripe-wide':
      return (
        <pattern id={id} width="30" height="10" patternUnits="userSpaceOnUse">
          <rect width="30" height="10" fill={base} />
          <rect width="15" height="10" fill={ink} />
        </pattern>
      )
    case 'pinstripe':
      return (
        <pattern id={id} width="12" height="10" patternUnits="userSpaceOnUse">
          <rect width="12" height="10" fill={base} />
          <rect width="3" height="10" fill={ink} />
        </pattern>
      )
    case 'hoop-tonal':
      return (
        <pattern id={id} width="10" height="22" patternUnits="userSpaceOnUse">
          <rect width="10" height="22" fill={base} />
          <rect width="10" height="10" fill={ink} />
        </pattern>
      )
    case 'jacquard':
      return (
        <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="22" height="22" fill={base} />
          <path d="M11 3 L19 11 L11 19 L3 11 Z" fill="none" stroke={ink} strokeWidth="2.6" />
        </pattern>
      )
    case 'chevron':
      return (
        <pattern id={id} width="18" height="12" patternUnits="userSpaceOnUse">
          <rect width="18" height="12" fill={base} />
          <path d="M0 10 L4.5 3 L9 10 L13.5 3 L18 10" fill="none" stroke={ink} strokeWidth="2.2" />
        </pattern>
      )
    case 'grid-tonal':
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill={base} />
          <path d="M0 0 H16 M0 8 H16 M0 0 V16 M8 0 V16" stroke={ink} strokeWidth="1.6" fill="none" />
        </pattern>
      )
    case 'gradient':
      return (
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} />
          <stop offset=".55" stopColor={ink} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
      )
    default:
      return null
  }
}

/** Cuts that are shapes rather than repeats, at the archive's own coordinates. */
function PatternFill({
  id,
  pattern,
  base,
  ink,
}: {
  id: string
  pattern: PatternId
  base: string
  ink: string
}) {
  switch (pattern) {
    case 'solid':
      return null
    case 'sash':
      return <path d="M40 260 L156 0 L204 0 L88 260 Z" fill={ink} />
    case 'yoke-v':
      return <path d="M58 26 L110 104 L162 26 L162 54 L110 132 L58 54 Z" fill={ink} />
    case 'side-panel':
      return (
        <>
          <rect x="58" width="16" height="260" fill={ink} />
          <rect x="146" width="16" height="260" fill={ink} />
        </>
      )
    case 'halves':
      return <rect x="110" width="110" height="260" fill={ink} />
    case 'chest-band':
      return (
        <>
          <rect y="96" width="220" height="36" fill={ink} />
          <rect y="92" width="220" height="4" fill={COLOUR_VAR.ink} opacity=".25" />
        </>
      )
    case 'quarters':
      // The body spans x 58—162, so corner blocks have to be inside THAT, not inside
      // the 220-wide canvas. Drawn full-canvas they clipped down to two vertical bars
      // and the cross in the middle disappeared, which is the whole point of the cut.
      return (
        <>
          <rect x="40" y="0" width="58" height="106" fill={ink} />
          <rect x="122" y="0" width="58" height="106" fill={ink} />
          <rect x="40" y="176" width="58" height="90" fill={ink} />
          <rect x="122" y="176" width="58" height="90" fill={ink} />
        </>
      )
    case 'diagonal':
      return (
        <g stroke={ink} strokeWidth="1.6" fill="none">
          {Array.from({ length: 18 }, (_, index) => (
            <path key={index} d={`M${-140 + index * 28} 260 L${60 + index * 28} 0`} />
          ))}
        </g>
      )
    case 'twin-stripe':
      return (
        <>
          <rect x="78" width="12" height="260" fill={ink} />
          <rect x="130" width="12" height="260" fill={ink} />
        </>
      )
    case 'shoulder-panel':
      return <path d="M58 26 H162 L160 74 Q110 90 60 74 Z" fill={ink} />
    default:
      return <rect width="220" height="260" fill={`url(#${id})`} />
  }
}

function SleeveFill({
  treatment,
  ink,
  base,
  side,
}: {
  treatment: SleeveId
  ink: string
  base: string
  side: 'l' | 'r'
}) {
  const flip = side === 'r' ? 'translate(220 0) scale(-1 1)' : undefined
  switch (treatment) {
    case 'raglan':
      return <rect width="220" height="260" fill={ink} transform={flip} />
    case 'cuff':
      return <rect width="220" height="260" fill={base} transform={flip} />
    case 'shoulder-stripe':
      return (
        <g transform={flip}>
          <rect width="220" height="260" fill={base} />
          <path d="M62 30 L72 58 L34 78 L24 50 Z" fill={ink} />
        </g>
      )
    case 'arc':
      return (
        <g transform={flip}>
          <rect width="220" height="260" fill={base} />
          <path d="M24 52 A 22 22 0 0 1 46 30" fill="none" stroke={ink} strokeWidth="4.5" />
        </g>
      )
    default:
      return <rect width="220" height="260" fill={base} transform={flip} />
  }
}

/** The collar shapes, straight off the handoff — two parts where the real one has two. */
function Collar({ type, ink }: { type: CollarId; ink: string }) {
  if (type === 'v-neck')
    return (
      <>
        <path d="M86 26 L110 66 L134 26 L142 30 L110 84 L78 30 Z" fill={ink} />
        <path d="M86 26 C92 42 128 42 134 26 L138 28 C131 46 89 46 82 28 Z" fill={ink} />
      </>
    )
  if (type === 'polo')
    return (
      <>
        <path
          d="M84 22 L110 40 L136 22 L150 32 L118 58 L102 58 L70 32 Z"
          fill={ink}
          stroke={COLOUR_VAR.ink}
          strokeWidth="2"
        />
        <rect
          x="104"
          y="40"
          width="12"
          height="34"
          fill={ink}
          stroke={COLOUR_VAR.ink}
          strokeWidth="1.6"
        />
      </>
    )
  if (type === 'ringer')
    return <path d="M86 26 C92 42 128 42 134 26 L141 30 C133 50 87 50 79 30 Z" fill={ink} />
  if (type === 'laced')
    return (
      <>
        <path d="M86 26 C92 42 128 42 134 26 L139 29 C132 47 88 47 81 29 Z" fill={ink} />
        <path
          d="M100 44 H120 M100 54 H120 M100 64 H120"
          stroke={COLOUR_VAR.ink}
          strokeOpacity=".5"
          strokeWidth="1.6"
        />
      </>
    )
  return <path d="M86 26 C92 42 128 42 134 26 L139 29 C132 47 88 47 81 29 Z" fill={ink} />
}

function Number({
  value,
  nameset,
  light,
}: {
  value: number
  nameset: KitSpec['nameset']
  light: boolean
}) {
  const solid = light ? COLOUR_VAR.ink : COLOUR_VAR.cream
  const common = { x: 110, y: 224, textAnchor: 'middle' as const, className: 'font-poster' }
  if (nameset === 'block-hollow') {
    return (
      <text {...common} fill="none" stroke={solid} strokeWidth="2" style={{ fontSize: 44 }}>
        {value}
      </text>
    )
  }
  return (
    <text {...common} fill={solid} style={{ fontSize: nameset === 'condensed' ? 38 : 44 }}>
      {value}
    </text>
  )
}
