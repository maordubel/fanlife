import { handleLabel } from '@/lib/collector/labels'
import type { CollectorLabel } from '@/lib/collector/types'
import { t } from '@/lib/i18n'

/**
 * איך אספן מופיע בשוק: מספר (או כינוי, אם בחר), ומה שהוא עשה — עובדות, בלי כוכבים (מפרט §21).
 * אף פעם לא שם אמיתי, מייל או טלפון: המסד לא מחזיר אותם.
 */
export function CollectorTag({ label, compact = false }: { label: CollectorLabel; compact?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-body text-step--1 text-ink">
      <bdi className="font-extrabold">{handleLabel(label)}</bdi>
      {!compact && label.completed > 0 ? (
        <span className="text-muted">{t('collector.stats.completed', { n: String(label.completed) })}</span>
      ) : null}
      {!compact && label.since ? <span className="text-muted">{t('collector.since', { year: String(label.since) })}</span> : null}
    </span>
  )
}
