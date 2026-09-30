import { t } from '@/lib/i18n'

/**
 * הדלת לארון — מהאזור האישי ומראש הארכיון. קישור, לא כפתור: הארון הוא מקום, ומי שלא מחובר
 * פוגש שם את ההזמנה. `compact` הוא שורה אחת לראש הארכיון; הרגיל הוא לוחית לאזור האישי.
 */
export function ClosetDoor({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <a
        href="/kits/closet"
        className="inline-flex min-h-tap items-center gap-2 border-rule border-ink bg-sheet px-3 font-body text-step--1 font-extrabold text-ink"
      >
        <span aria-hidden="true" className="font-poster text-[20px] leading-none text-red">
          ✓
        </span>
        {t('collector.door.title')}
        <span aria-hidden="true" className="text-red">
          ←
        </span>
      </a>
    )
  }
  return (
    <a
      href="/kits/closet"
      className="mt-stack flex min-h-tap items-stretch border-plate border-ink bg-sheet transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
    >
      <span aria-hidden="true" className="flex w-14 shrink-0 items-center justify-center bg-red font-poster text-[34px] leading-none text-paper">
        ✓
      </span>
      <span className="min-w-0 flex-1 px-3 py-2.5">
        <span className="block font-display text-step-2 leading-tight text-ink">{t('collector.door.title')}</span>
        <span className="mt-0.5 block font-body text-step--1 leading-snug text-muted">{t('collector.door.body')}</span>
      </span>
      <span className="flex shrink-0 items-center px-3 font-body text-step--1 font-extrabold text-red">
        {t('collector.door.cta')} <span aria-hidden="true" className="ms-1">←</span>
      </span>
    </a>
  )
}
