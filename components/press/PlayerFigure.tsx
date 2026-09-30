/**
 * השחקן המצויר — the 90s figure, drawn to the DUBID coordinates.
 *
 * A front-facing player in a heavy outline, `viewBox="0 0 64 64"`, body centred at
 * `translate(30,39)`. Draw order matters: what is behind is drawn first, so legs go
 * down before shorts, arms before the shirt, head last.
 *
 * The figure is how a kit is SEEN. A colour chip tells you a shirt was red; a drawn
 * player in that shirt, with that collar, those sleeves and that sash, is the shirt.
 * Everything is flat fill and one ink outline — no gradient, no shadow, no photograph
 * and therefore no image rights.
 */

export type FigureKit = {
  /** shirt colour */
  primary: string
  /** the pattern's colour */
  secondary: string
  /** collar and cuffs */
  trim: string
  pattern: 'solid' | 'stripes_vertical' | 'stripes_horizontal' | 'chevron' | 'checkered' | 'sash'
  collar: 'crew' | 'v' | 'polo'
  longSleeve: boolean
  shorts: string
  socks: string
  /** ink that reads on `primary` — computed for contrast, never assumed */
  ink: string
}

// The figure's fixed colours are press-layer tokens, declared once in globals.css.
const INK = 'rgb(var(--p-ink))'
const SKIN = 'rgb(var(--p-skin))'
const HAIR = 'rgb(var(--p-hair))'
const CHALK = 'rgb(var(--p-line))'
const CAPTAIN = 'rgb(var(--p-red))'
const VICE = 'rgb(var(--p-tekhelet))'
const DISC = 'rgb(var(--p-disc))'

export const GK_KIT: FigureKit = {
  primary: VICE,
  secondary: 'rgb(var(--n-paper))',
  trim: CHALK,
  pattern: 'solid',
  collar: 'crew',
  longSleeve: true,
  shorts: 'rgb(var(--n-paper))',
  socks: VICE,
  ink: CHALK,
}

/**
 * The club's own outfield kit, in the press layer's colours — the counterpart of
 * `GK_KIT` and, like it, the drawn figure's default rather than any one season's shirt.
 *
 * It sat as a private `const OUTFIELD` inside `app/lineup/LineupBoard.tsx` until gate 3
 * grew a locker room that hangs the same shirt on the wall, at which point there would
 * have been two of them one import apart. A season's actual shirt is a different claim
 * and a different object: `lib/kit/spec.ts` and `components/kit/KitPlate.tsx` own that,
 * and this is only ever "a player in red".
 */
export const OUTFIELD_KIT: FigureKit = {
  primary: 'rgb(var(--p-red))',
  secondary: 'rgb(var(--p-line))',
  trim: 'rgb(var(--p-line))',
  pattern: 'solid',
  collar: 'crew',
  longSleeve: false,
  shorts: 'rgb(var(--p-line))',
  socks: 'rgb(var(--p-red))',
  ink: 'rgb(var(--p-line))',
}


/** Relative luminance, so the number and the name are legible on any shirt colour. */
export function inkOn(hex: string): string {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((char) => char + char)
          .join('')
      : clean
  const channel = (offset: number) => {
    const value = parseInt(full.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.42 ? 'rgb(var(--p-ink))' : 'rgb(var(--p-line))'
}

/** The shirt body outline, reused as the clip path so a pattern cannot spill. */
const BODY = 'M-9.5 -16 h19 l1.6 13 h-22.2 z'

function Pattern({ kit, id }: { kit: FigureKit; id: string }) {
  const colour = kit.secondary
  switch (kit.pattern) {
    case 'stripes_vertical':
      return (
        <g clipPath={`url(#${id})`} stroke="none" fill={colour}>
          {[-10, -4, 2, 8].map((x) => (
            <rect key={x} x={x} y={-17} width={3} height={15} />
          ))}
        </g>
      )
    case 'stripes_horizontal':
      return (
        <g clipPath={`url(#${id})`} stroke="none" fill={colour}>
          {[-15.5, -11.5, -7.5].map((y) => (
            <rect key={y} x={-12} y={y} width={24} height={2.2} />
          ))}
        </g>
      )
    case 'sash':
      return (
        <g clipPath={`url(#${id})`} fill="none" stroke={colour} strokeWidth={5}>
          <path d="M-12 -17 L12 -1" />
        </g>
      )
    case 'chevron':
      return (
        <g clipPath={`url(#${id})`} fill="none" stroke={colour} strokeWidth={3}>
          <path d="M-11 -13 L0 -7 L11 -13" />
        </g>
      )
    case 'checkered':
      return (
        <g clipPath={`url(#${id})`} stroke="none" fill={colour}>
          {[-10, -4, 2, 8].map((x, column) =>
            [-16, -12, -8, -4].map((y, rowIndex) =>
              (column + rowIndex) % 2 === 0 ? (
                <rect key={`${x}-${y}`} x={x} y={y} width={3} height={3} />
              ) : null,
            ),
          )}
        </g>
      )
    case 'solid':
    default:
      return null
  }
}

export function PlayerFigure({
  kit,
  number,
  /** red disc for the captain, blue for the vice — otherwise the mark yellow */
  role,
  /** the sponsor, lettered across the chest the way it actually was */
  sponsor,
  /** the maker's name, small and high on the chest */
  maker,
  size = 96,
  /** an empty slot: dashed outline, no fill */
  ghost = false,
  /**
   * The outline colour. Ink is right on paper and invisible on the night card, where
   * the figure sits on near-black — so a dark surface asks for chalk.
   */
  on = 'paper',
  className,
  title,
}: {
  kit?: FigureKit
  number?: string | number | null
  role?: 'captain' | 'vice' | null
  sponsor?: string | null
  maker?: string | null
  size?: number
  ghost?: boolean
  on?: 'paper' | 'night'
  className?: string
  title?: string
}) {
  // The clip path is per-instance: two figures on one pitch must not share an id.
  const clipId = `body-${(kit?.primary ?? 'ghost').replace(/[^a-z0-9]/gi, '')}-${
    kit?.pattern ?? 'none'
  }-${number ?? 'x'}`

  if (ghost || !kit) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={className}
        role="img"
        aria-label={title ?? 'משבצת ריקה'}
      >
        <g
          transform="translate(30,39)"
          fill="none"
          stroke={INK}
          strokeWidth="1.9"
          strokeDasharray="3 3"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.55"
        >
          <path d={BODY} />
          <rect x="-8" y="-2.5" width="16" height="9" rx="2" />
          <circle cx="0" cy="-21" r="5.6" />
        </g>
      </svg>
    )
  }

  const line = on === 'night' ? CHALK : INK
  // The DUBID number disc is yellow. Yellow is forbidden, so the plain disc is ink
  // and the digits sit on it in chalk; captain and vice keep their own colours, which
  // is what the disc was distinguishing in the first place.
  const discFill = role === 'captain' ? CAPTAIN : role === 'vice' ? VICE : DISC
  const discInk = role === 'captain' || role === 'vice' ? CHALK : CHALK

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? 'שחקן במדים'}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BODY} transform="translate(30,39)" />
        </clipPath>
      </defs>

      <g
        transform="translate(30,39)"
        stroke={line}
        strokeWidth="1.9"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* legs */}
        <g fill={SKIN}>
          <rect x="-6.6" y="6" width="5.6" height="15" rx="2" />
          <rect x="1" y="6" width="5.6" height="15" rx="2" />
        </g>
        {/*
          Socks, over the shins — and OUTLINED, like everything else on this figure.
          They were the one shape drawn `stroke="none"`, which put the club's red
          directly against whatever was behind the figure. On `PressPitch` that is
          printed grass, and a red edge antialiased against green averages to olive:
          hue 57°, saturation 0.49 — inside `lib/isYellow.ts`'s band, on a browser's
          own subpixel geometry rather than in any file. One pixel per figure, at the
          corner where the sock, the ink line and the grass meet; ten on a full pitch,
          and `npm run qa:sweep` could never see them because it has no way to place a
          player. Red may not touch grass in this system — an ink keyline goes between
          them — and the figure's own opening comment already said as much: flat fill
          and ONE ink outline.
        */}
        <g fill={kit.socks}>
          <rect x="-6.6" y="14" width="5.6" height="7" />
          <rect x="1" y="14" width="5.6" height="7" />
        </g>
        {/* boots */}
        <path d="M-9.5 21 h8 v3.4 h-8 z M1 21 h8 v3.4 h-8 z" fill={line} stroke="none" />
        {/* shorts */}
        <rect x="-8" y="-2.5" width="16" height="9" rx="2" fill={kit.shorts} />
        {/* arms */}
        <g fill={SKIN}>
          <rect x="-13.6" y="-14" width="4.8" height="12.5" rx="2" />
          <rect x="8.8" y="-14" width="4.8" height="12.5" rx="2" />
        </g>
        {/* long sleeves cover the arms in the shirt colour */}
        {kit.longSleeve && (
          <g fill={kit.primary}>
            <rect x="-13.6" y="-14" width="4.8" height="9" rx="2" />
            <rect x="8.8" y="-14" width="4.8" height="9" rx="2" />
          </g>
        )}
        {/* shirt body */}
        <path d={BODY} fill={kit.primary} />
      </g>

      {/* the pattern is clipped to the body, then the outline is drawn AGAIN — without
          that second pass a stripe covers the very line that makes it look printed. */}
      <Pattern kit={kit} id={clipId} />

      <g
        transform="translate(30,39)"
        stroke={line}
        strokeWidth="1.9"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      >
        <path d={BODY} />
        {/* collar */}
        {kit.collar === 'v' && (
          <path d="M-3.6 -16 L0 -13 L3.6 -16" stroke={kit.trim} strokeWidth="1.6" />
        )}
        {kit.collar === 'crew' && (
          <path d="M-3.6 -15.4 a3.6 2.4 0 0 0 7.2 0" stroke={kit.trim} strokeWidth="1.6" />
        )}
        {kit.collar === 'polo' && (
          <>
            <path d="M-4.2 -16 L-1 -12.6 L0 -15" stroke={kit.trim} strokeWidth="1.4" />
            <path d="M4.2 -16 L1 -12.6 L0 -15" stroke={kit.trim} strokeWidth="1.4" />
          </>
        )}
        {/* head */}
        <circle cx="0" cy="-21" r="5.6" fill={SKIN} />
        <path d="M-5.6 -22.2 a5.6 5.6 0 0 1 11.2 0 z" fill={HAIR} stroke="none" />
        {/* captain's armband */}
        {role === 'captain' && (
          <rect
            x="-14.1"
            y="-11.8"
            width="5.4"
            height="4.2"
            rx="1.2"
            fill={CAPTAIN}
            stroke="none"
          />
        )}
      </g>

      {/* The lettering is the point of the whole drawing: the maker's mark high on the
          chest and the sponsor across it are the two facts the archive actually
          verifies about a season's shirt, so they are the two things you can read. The
          ink is computed against the shirt colour rather than assumed. */}
      <g transform="translate(30,39)" stroke="none">
        {maker && (
          <text
            x="0"
            y="-13.4"
            textAnchor="middle"
            dominantBaseline="central"
            fill={kit.ink}
            className="font-body"
            style={{ fontSize: 2.6, letterSpacing: 0.08 }}
          >
            {maker}
          </text>
        )}
        {sponsor && (
          <text
            x="0"
            y="-8.4"
            textAnchor="middle"
            dominantBaseline="central"
            fill={kit.ink}
            className="font-body"
            style={{ fontSize: 3.4, fontWeight: 800 }}
          >
            {sponsor}
          </text>
        )}
      </g>

      {/* the shirt-number disc */}
      {number !== null && number !== undefined && number !== '' && (
        <g>
          <circle cx="51" cy="12" r="9.5" fill={discFill} stroke={line} strokeWidth="2" />
          <text
            x="51"
            y="12"
            textAnchor="middle"
            dominantBaseline="central"
            fill={discInk}
            className="font-poster"
            style={{ fontSize: 11, direction: 'ltr' }}
          >
            {number}
          </text>
        </g>
      )}
    </svg>
  )
}

/** The name plate that sits under a figure on the grass. */
export function NamePlate({
  name,
  sub,
  /**
   * `red` prints the name in the club's colour on the same cream plate.
   *
   * It exists because a selected chip ON THE GRASS cannot be marked with a red ring:
   * the keyline's outer edge is then red against green, and red antialiased against
   * green averages to olive inside the yellow band (see the socks, above). The plate
   * is cream with an ink keyline, so the red sits on paper and never meets the pitch —
   * the same reason the brand prints a name on a plate rather than straight onto a
   * photograph.
   */
  tone = 'ink',
}: {
  name: string
  sub?: string | null
  tone?: 'ink' | 'red'
}) {
  return (
    <span className="flex flex-col items-center gap-[2px]">
      <span
        className="max-w-full truncate px-1.5 py-[1px] text-center font-body text-[10px] leading-tight"
        style={{
          background: 'rgb(var(--p-paper))',
          color: tone === 'red' ? 'rgb(var(--p-red))' : 'rgb(var(--p-ink))',
          boxShadow: '0 0 0 1.4px rgb(var(--p-ink))',
          borderRadius: 2,
        }}
      >
        {name}
      </span>
      {sub && (
        <span
          className="max-w-full truncate px-1 text-center font-body text-[8px] leading-tight"
          style={{ background: 'rgb(var(--p-halo) / 0.72)', color: 'rgb(var(--p-ink))' }}
        >
          {sub}
        </span>
      )}
    </span>
  )
}
