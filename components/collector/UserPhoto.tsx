'use client'

import { photoUrl } from '@/lib/collector/api'
import { t } from '@/lib/i18n'

/**
 * תמונה שאספן העלה. `<img>` רגיל ולא האופטימייזר של Next (כלל 69 §5), ו-`data-user-photo`,
 * כי צבע בתצלום של חפץ הוא תכונה של החפץ ולא בחירה עיצובית שלנו — הסריקה מסתירה אותו כמו את
 * תצלומי הארכיון, וסופרת את כל השאר.
 */
export function UserPhoto({ path, className = '' }: { path: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-user-photo=""
      src={photoUrl(path)}
      alt={t('collector.photo.alt')}
      loading="lazy"
      decoding="async"
      className={`block h-full w-full object-cover ${className}`}
    />
  )
}
