import { MAX_DAMAGE } from '@/lib/game/hate-run'
import { t } from '@/lib/i18n'

/**
 * נזק לקיר — laid over the survivor's poster: torn tape at the corners, scratch rules
 * across it, and one numbered mark per round it has survived. Drawn in the hate tokens
 * only (rule 9's gate 11: no vermilion), and it never covers the name or the charge —
 * it sits on the frame and in the corners, where a poster actually tears.
 *
 * Physical corners are the POSTER's geometry, not reading direction, so they are set in
 * SVG coordinates rather than as `left`/`right` utilities.
 */
export function WallDamage({ level, marks }: { level: number; marks: number }) {
  const damage = Math.max(0, Math.min(MAX_DAMAGE, level))
  if (damage === 0 && marks === 0) return null
  return (
    <span className="pointer-events-none absolute inset-0 z-10">
      <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {damage >= 1 && <path d="M0 0 L14 0 L6 9 Z" className="fill-hate-ink/70" />}
        {damage >= 2 && <path d="M100 100 L84 100 L95 88 Z" className="fill-hate-ink/70" />}
        {damage >= 3 && <path d="M100 0 L88 0 L97 12 Z" className="fill-hate-ink/60" />}
        {damage >= 3 && <path d="M8 34 L46 30" className="stroke-hate-red-light" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />}
        {damage >= 4 && <path d="M56 70 L96 62" className="stroke-hate-red-light" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />}
        {damage >= 5 && <path d="M0 100 L18 100 L3 84 Z" className="fill-hate-ink/60" />}
        {damage >= 5 && <path d="M30 96 L70 4" className="stroke-hate-ink/40" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />}
      </svg>
      {marks > 0 && (
        <span aria-hidden="true" className="absolute bottom-1 end-1.5 flex gap-0.5">
          {Array.from({ length: Math.min(marks, 8) }, (_, index) => (
            <span
              key={index}
              className="grid h-4 w-4 place-items-center border-hair border-hate-red-light bg-hate-field font-mono text-[9px] tabular-nums leading-none text-hate-red-light"
            >
              {index + 1}
            </span>
          ))}
        </span>
      )}
      <span className="sr-only">{t('hate.wall.damage', { n: String(damage) })}</span>
    </span>
  )
}
