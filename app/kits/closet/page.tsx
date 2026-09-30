import type { Metadata } from 'next'

import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { collectorShirtMap } from '@/lib/collector/catalog'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

import { ClosetScreen } from './ClosetScreen'

/**
 * הארון שלי (מפרט §10–§11, §19–§20, §45–§48) — הדגם בארכיון, העותק כאן.
 *
 * השרת קורא את 168 החולצות של הארכיון, עם `kit_id` איפה שה-Kit Master יודע את התצלום המדויק
 * (`lib/collector/catalog.ts`), ומעביר ללקוח את ההטלה שהארון צריך. עונה, וריאנט ותמונה לא
 * נשמרים בשום שורה של אספן (מפרט §72) — הם מצטרפים כאן, מהמקור היחיד שלהם.
 */
export const metadata: Metadata = gateMetadata('kits-closet')

export default function ClosetPage() {
  const shirts = collectorShirtMap()
  const archive = Object.values(shirts)
  return (
    <Screen title={t('collector.closet.title')} sub={t('collector.closet.sub')}>
      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('collector.closet.lede')}</p>
      <ClosetScreen shirts={shirts} archive={archive} />
      <ReportLink />
    </Screen>
  )
}
