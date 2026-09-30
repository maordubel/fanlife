import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'

import { PublicCloset } from './PublicCloset'

/**
 * ארון של אספן אחר (מפרט §20) — פתוח, או בקישור עם `?t=`.
 *
 * **לא נסרק ולא ממופה.** ארון שנשלח בקישור ייעודי הוא בדיוק הדף שמנוע חיפוש לא אמור למצוא, ולכן
 * `noindex` על כל מספר, והמפה (`app/sitemap.ts`) לא מכירה אותם. מספר שאינו מספר, ארון פרטי וארון
 * שלא קיים — שלושתם אותו משפט שקט, בלי לומר איזה מהם (המסד עונה `not_found` על שלושתם).
 */
export const metadata: Metadata = {
  title: t('collector.public.title'),
  robots: { index: false, follow: false },
}

export default function PublicClosetPage({ params, searchParams }: { params: { handle: string }; searchParams: { t?: string } }) {
  const handle = /^[1-9]\d{0,8}$/.test(params.handle) ? Number(params.handle) : null
  const token = typeof searchParams.t === 'string' && /^[0-9a-f]{16,64}$/i.test(searchParams.t) ? searchParams.t : null
  const shirts = collectorShirtMap()
  return (
    <Screen title={t('collector.public.title')} sub={t('collector.public.sub')}>
      <PublicCloset handle={handle} token={token} shirts={shirts} />
      <ReportLink />
    </Screen>
  )
}
