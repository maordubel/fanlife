import { COLOUR_VAR, type KitSpec } from '@/lib/kit/spec'
import { KitShirt } from './KitShirt'

/**
 * המדים — the full strip: shirt, shorts, socks, laid out the way a kit illustration
 * lays them out.
 *
 * Maor's note was that the kit screen was "not fun and doesn't flow", and he sent eight
 * real Hapoel kit illustrations to say what it should look like. Every one of them
 * shows a STRIP, not a shirt: the shorts and socks are half of what makes 1978 read as
 * 1978. A shirt floating alone reads as a mockup of a shirt; three pieces read as a kit
 * you could put on.
 */
export function KitStrip({
  spec,
  className = '',
  missing = [],
}: {
  spec: KitSpec
  className?: string
  missing?: ('sponsor' | 'maker' | 'crest')[]
}) {
  return (
    <div className={className}>
      <KitShirt spec={spec} missing={missing} className="mx-auto block w-full" title={spec.seasonLabel} />
      {/* shorts and socks share a baseline and a height, the way a kit illustration
          lays them out. Letting them size independently made the socks read as a
          stray sliver next to the shorts. */}
      <div className="mt-1.5 grid grid-cols-[62fr_38fr] items-start gap-2">
        <Shorts spec={spec} />
        <Socks spec={spec} />
      </div>
    </div>
  )
}

function Shorts({ spec }: { spec: KitSpec }) {
  const fill = COLOUR_VAR[spec.shorts]
  const trim = COLOUR_VAR[spec.base]
  return (
    <svg viewBox="0 0 140 110" className="block w-full" role="presentation">
      <path
        d="M14 8 H126 L132 84 H80 L70 46 L60 84 H8 Z"
        fill={fill}
        stroke={COLOUR_VAR.ink}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* the waistband, and a side stripe that follows the leg rather than floating
          beside it — the old one was a straight segment over the seam and read as a
          stray red bar */}
      <path d="M14 8 H126 L127 20 H13 Z" fill={trim} stroke={COLOUR_VAR.ink} strokeWidth="2" />
      <path d="M119 20 L125 82" fill="none" stroke={trim} strokeWidth="6" strokeLinecap="round" />
      {spec.number !== null && (
        <text
          x="34"
          y="66"
          textAnchor="middle"
          className="font-poster"
          style={{ fontSize: 30 }}
          fill={spec.shorts === 'cream' || spec.shorts === 'paper' ? COLOUR_VAR.red : COLOUR_VAR.cream}
        >
          {spec.number}
        </text>
      )}
    </svg>
  )
}

function Socks({ spec }: { spec: KitSpec }) {
  const fill = COLOUR_VAR[spec.socks]
  const band = COLOUR_VAR[spec.sleeveInk]
  return (
    // A PAIR, at the same height as the shorts. One sock on its own looked like an
    // offcut; two read instantly as the third piece of a kit.
    <svg viewBox="0 0 86 110" className="block w-full" role="presentation">
      {[0, 46].map((offset) => (
        <g key={offset} transform={`translate(${offset} 0)`}>
          <path
            d="M6 8 H38 V68 Q38 92 22 102 Q6 92 6 68 Z"
            fill={fill}
            stroke={COLOUR_VAR.ink}
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M6 14 H38 V28 H6 Z" fill={band} stroke={COLOUR_VAR.ink} strokeWidth="1.8" />
        </g>
      ))}
    </svg>
  )
}
