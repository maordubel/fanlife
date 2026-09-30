import { t } from '@/lib/i18n'

/** התשלום — בין הצדדים, מחוץ למערכת (מפרט §39). נאמר בפשטות, בכל מקום שבו יש סכום לשלם. */
export function PaymentNote() {
  return (
    <p className="border-s-4 border-sign ps-3 font-body text-step--1 leading-relaxed text-ink" data-payment-note="">
      {t('auction.payment.note')}
    </p>
  )
}
