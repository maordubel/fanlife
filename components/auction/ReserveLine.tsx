import { t } from '@/lib/i18n'

/**
 * מחיר המינימום — הקהל רואה אם הושג, אף פעם לא כמה הוא (מפרט §37). בלי מינימום — שום שורה.
 */
export function ReserveLine({ reserveSet, reserveMet }: { reserveSet: boolean; reserveMet: boolean }) {
  if (!reserveSet) return null
  return (
    <p data-reserve={reserveMet ? 'met' : 'not-met'} className={`font-body text-step--1 font-extrabold ${reserveMet ? 'text-sign' : 'text-muted'}`}>
      {reserveMet ? t('auction.reserve.met') : t('auction.reserve.notMet')}
    </p>
  )
}
