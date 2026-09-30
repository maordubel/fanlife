import type { KitCollar, KitPattern } from '@/lib/game/kits'

/**
 * A full kit — jersey, shorts, socks — as flat SVG. No gradient, no shadow, no
 * photograph, so it carries no image rights and compares cleanly across seasons.
 *
 * Colours arrive already resolved; this component never picks one.
 */

export type Piece = { base: string; secondary: string; accent: string; pattern: KitPattern }

export type KitPreviewProps = {
  jersey: Piece
  shorts: Piece
  socks: Piece
  collar: KitCollar
  longSleeve: boolean
  number: string
  numberColour: string
  size?: number
  label: string
}

const JERSEY = 'M60 34 L100 20 L140 34 L152 30 L176 66 L150 84 L146 168 L54 168 L50 84 L24 66 L48 30 Z'
const JERSEY_LONG =
  'M60 34 L100 20 L140 34 L156 28 L188 96 L160 108 L150 84 L146 168 L54 168 L50 84 L40 108 L12 96 L44 28 Z'
const SHORTS = 'M52 178 L148 178 L156 236 L112 236 L100 200 L88 236 L44 236 Z'
const SOCK_L = 'M46 246 L86 246 L82 300 L52 300 Z'
const SOCK_R = 'M114 246 L154 246 L148 300 L118 300 Z'

function Pattern({ pattern, colour, id }: { pattern: KitPattern; colour: string; id: string }) {
  if (pattern === 'solid') return null
  if (pattern === 'stripes_vertical')
    return (
      <>
        {Array.from({ length: 6 }, (_, index) => (
          <rect key={index} x={22 + index * 28} y="0" width="14" height="320" fill={colour} />
        ))}
      </>
    )
  if (pattern === 'stripes_horizontal')
    return (
      <>
        {Array.from({ length: 10 }, (_, index) => (
          <rect key={index} x="0" y={12 + index * 30} width="200" height="15" fill={colour} />
        ))}
      </>
    )
  if (pattern === 'sash') return <path d="M10 46 L64 0 L200 138 L146 184 Z" fill={colour} />
  if (pattern === 'chevron')
    return (
      <>
        {Array.from({ length: 4 }, (_, index) => (
          <path
            key={index}
            d={`M0 ${40 + index * 40} L100 ${10 + index * 40} L200 ${40 + index * 40} L200 ${58 + index * 40} L100 ${28 + index * 40} L0 ${58 + index * 40} Z`}
            fill={colour}
          />
        ))}
      </>
    )
  // checkered
  return (
    <>
      {Array.from({ length: 64 }, (_, index) => {
        const column = index % 8
        const rowIndex = Math.floor(index / 8)
        if ((column + rowIndex) % 2 === 1) return null
        return (
          <rect
            key={`${id}-${index}`}
            x={column * 25}
            y={rowIndex * 40}
            width="25"
            height="40"
            fill={colour}
          />
        )
      })}
    </>
  )
}

function Garment({
  path,
  piece,
  id,
  children,
}: {
  path: string
  piece: Piece
  id: string
  children?: React.ReactNode
}) {
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path d={path} />
        </clipPath>
      </defs>
      <path d={path} fill={piece.base} stroke={piece.accent} strokeWidth="3" />
      <g clipPath={`url(#${id})`}>
        <Pattern pattern={piece.pattern} colour={piece.secondary} id={id} />
        {children}
      </g>
      <path d={path} fill="none" stroke={piece.accent} strokeWidth="3" />
    </>
  )
}

export function KitPreview({
  jersey,
  shorts,
  socks,
  collar,
  longSleeve,
  number,
  numberColour,
  size = 240,
  label,
}: KitPreviewProps) {
  const body = longSleeve ? JERSEY_LONG : JERSEY

  return (
    <svg viewBox="0 0 200 310" width={size} height={(size * 310) / 200} role="img" aria-label={label}>
      <Garment path={body} piece={jersey} id="kit-jersey" />

      {collar === 'crew' && (
        <path d="M78 26 A 24 18 0 0 0 122 26" fill="none" stroke={jersey.accent} strokeWidth="7" />
      )}
      {collar === 'v' && (
        <path d="M80 24 L100 48 L120 24" fill="none" stroke={jersey.accent} strokeWidth="7" />
      )}
      {collar === 'polo' && (
        <>
          <path d="M80 24 L100 46 L120 24" fill="none" stroke={jersey.accent} strokeWidth="7" />
          <path d="M88 22 L100 44 L112 22" fill="none" stroke={jersey.base} strokeWidth="3" />
        </>
      )}

      <text
        x="100"
        y="128"
        textAnchor="middle"
        className="font-mono tabular-nums"
        style={{ fontWeight: 700, fontSize: 52, fill: numberColour }}
      >
        {number}
      </text>

      <Garment path={SHORTS} piece={shorts} id="kit-shorts" />
      <Garment path={SOCK_L} piece={socks} id="kit-sock-l" />
      <Garment path={SOCK_R} piece={socks} id="kit-sock-r" />
    </svg>
  )
}
