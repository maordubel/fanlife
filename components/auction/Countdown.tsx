import { clockText, countdown } from '@/lib/collector/auction'
import { t } from '@/lib/i18n'
import { Num } from '@/components/ui/Num'

/**
 * לוח השעון — ימים, שעות, דקות, שניות, כמו לוח התוצאות ביציע ולא כמו טיימר של אתר מכירות.
 * כל מספר על לוחית דיו משלו; היום נופל כשאין יום. `role="timer"` עם תווית אחת לקורא מסך,
 * בלי להכריז כל שנייה.
 */
export function Countdown({
  ms,
  label,
  tone = 'ink',
  size = 'lg',
  labelTone = 'ink',
}: {
  ms: number
  label: string
  tone?: 'ink' | 'red' | 'sign'
  size?: 'lg' | 'sm'
  labelTone?: 'ink' | 'paper'
}) {
  const c = countdown(ms)
  const cells: { value: number; unit: string }[] = [
    ...(c.days > 0 ? [{ value: c.days, unit: t('auction.clock.days') }] : []),
    { value: c.hours, unit: t('auction.clock.hours') },
    { value: c.minutes, unit: t('auction.clock.minutes') },
    { value: c.seconds, unit: t('auction.clock.seconds') },
  ]
  const plate = tone === 'red' ? 'bg-red text-paper' : tone === 'sign' ? 'bg-sign text-paper' : 'bg-ink text-paper'
  const figure = size === 'lg' ? 'text-[44px] md:text-[56px]' : 'text-[28px]'
  return (
    <div role="timer" aria-label={`${label} ${clockText(ms)}`} data-countdown="">
      <p className={`font-body text-step--1 font-extrabold ${labelTone === 'paper' ? 'text-paper' : 'text-ink'}`} aria-hidden="true">
        {label}
      </p>
      {/* a clock reads in one direction the world over: days, hours, minutes, seconds, LTR */}
      <ol className="mt-1.5 flex justify-end gap-1.5" aria-hidden="true" dir="ltr">
        {cells.map((cell) => (
          <li key={cell.unit} className={`flex min-w-[64px] flex-col items-center px-2 pb-1 pt-1.5 ${plate}`}>
            <span className={`font-poster leading-none ${figure}`}>
              <Num>{String(cell.value).padStart(2, '0')}</Num>
            </span>
            <span className="mt-0.5 font-body text-[11px] font-bold leading-none" dir="rtl">
              {cell.unit}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
