/**
 * סורג המגדל — the only unit of measurement in the product.
 * Streak, round score, memory board and loading are all this grid at different sizes.
 * Every number that can be shown as lamps is shown as lamps.
 */

type LampGridProps = {
  /** 20 = full grid, 12 = memory board, 14 = streak bar */
  total?: number
  on: number
  cols?: number
  night?: boolean
  /** -5° — the main tower grid only */
  tilt?: boolean
  /** the one permitted glow, night only */
  glow?: boolean
  /** lamps light in sequence, 40ms apart */
  stagger?: boolean
  label?: string
}

export function LampGrid({
  total = 20,
  on,
  cols = 5,
  night = false,
  tilt = false,
  glow = false,
  stagger = false,
  label,
}: LampGridProps) {
  return (
    <div role="img" aria-label={label ?? `${on} מתוך ${total} פנסים דולקים`}>
      <div
        className={`grid gap-1.5 border-plate p-1.5 ${
          night ? 'border-sheet' : 'border-ink bg-sheet'
        } ${glow ? 'shadow-lamp' : ''}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
          transform: tilt ? 'rotate(-5deg)' : undefined,
        }}
      >
        {Array.from({ length: total }, (_, index) => (
          <i
            key={index}
            className={`block aspect-square rounded-full border-hair ${
              stagger && index < on ? 'animate-lamp-on' : ''
            } ${
              night
                ? index < on
                  ? 'border-sheet/50 bg-sheet'
                  : 'border-sheet/45 bg-lamp-off'
                : index < on
                  ? 'border-ink bg-ink'
                  : 'border-ink'
            }`}
            style={stagger ? { animationDelay: `${index * 40}ms` } : undefined}
          />
        ))}
      </div>
    </div>
  )
}

/** התורן — the lattice mast under a full tower. */
export function Mast({ height = 96, night = false }: { height?: number; night?: boolean }) {
  return (
    <>
      <div
        className={`mx-auto w-5 border-x-rule ${night ? 'lattice-night border-sheet' : 'lattice border-ink'}`}
        style={{ height }}
        aria-hidden="true"
      />
      <div className="mx-auto h-2.5 w-11 bg-concrete" aria-hidden="true" />
    </>
  )
}
