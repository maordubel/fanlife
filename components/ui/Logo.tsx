import { t } from '@/lib/i18n'

/**
 * הסמל — the floodlight tower.
 *
 * The mark is a mast, not a crest. Two reasons, and both matter:
 *
 *   1. The club's crest is the club's property. A fan project does not put someone
 *      else's registered mark on its own product, so the logo is drawn from the brand
 *      system — "התיק, הקיר והמגדל" — and the tower is the part of it you can see from
 *      outside the ground.
 *   2. The tower is already the product's unit of measurement. Score, streak and the
 *      memory board are all lamp grids; the logo is the same grid at logo size, so the
 *      mark and the interface are made of one thing.
 *
 * Flat, square-cornered, two colours. The lamps are the only circles in the system.
 */

type LogoProps = {
  size?: number
  /** night surfaces draw in sheet, day surfaces in ink */
  night?: boolean
  /** lamps light in sequence on first paint */
  animate?: boolean
  className?: string
}

const LAMPS = [
  [10, 9],
  [24, 9],
  [38, 9],
  [10, 21],
  [24, 21],
  [38, 21],
]

export function LogoMark({ size = 48, night = false, animate = false, className }: LogoProps) {
  // Tokens are RGB triplets, so they are consumed the same way the CSS does it.
  const line = night ? 'rgb(var(--sheet))' : 'rgb(var(--ink))'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="The Worker"
      className={className}
    >
      {/* the lamp plate */}
      <rect x="3" y="2" width="42" height="26" stroke={line} strokeWidth="2.5" />
      {LAMPS.map(([cx, cy], index) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          fill="rgb(var(--red))"
          className={animate ? 'animate-lamp-on' : undefined}
          style={animate ? { animationDelay: `${index * 90}ms` } : undefined}
        />
      ))}
      {/* the mast: two legs and the lattice between them */}
      <path d="M19 28 L16 44 M29 28 L32 44" stroke={line} strokeWidth="2.5" />
      <path d="M18.4 31 L29.6 31 M17.8 34.5 L30.2 34.5 M17.2 38 L30.8 38" stroke={line} strokeWidth="1.5" />
      <path d="M18.4 31 L29.6 34.5 M29.6 31 L18.4 34.5 M17.8 34.5 L30.2 38 M30.2 34.5 L17.8 38" stroke={line} strokeWidth="1" />
      {/* the footing */}
      <rect x="12" y="44" width="24" height="3" fill={line} />
    </svg>
  )
}

/** The mark with the name beside it. Latin first: the product is called The Worker. */
export function Logo({
  size = 40,
  night = false,
  animate = false,
}: {
  size?: number
  night?: boolean
  animate?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} night={night} animate={animate} />
      <span className={`flex flex-col leading-none ${night ? 'text-sheet' : 'text-ink'}`}>
        <span className="font-display text-[17px] font-black tracking-tight">
          <bdi dir="ltr">THE WORKER</bdi>
        </span>
        {/* The name is THE WORKER. The line under it is the CLUB, which is a different
            thing — printing the brand system here made the lockup read as two names. */}
        <span className="font-sign text-[13px] text-red">{t('brand.sub')}</span>
      </span>
    </span>
  )
}
