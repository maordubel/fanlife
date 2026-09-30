import type { Metadata } from 'next'

import { AreaSwitch } from '@/components/profile/AreaSwitch'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { t } from '@/lib/i18n'
import { kitCatalog } from '@/lib/kit/catalog'
import { gateMetadata } from '@/lib/seo'

import { FileArea } from './FileArea'

/**
 * התיק שלי — the second destination of the personal area (ONE RED WORLD §24, §46).
 *
 * "אני" (`/tik`) is who you are; this is what you made and kept: the elevens, the shirts, the
 * saved archive, the souvenirs, the goals rebuilt, the trivia you played, the timelines, the
 * LIFE chapters you lived, the debates and the challenges — and the memories they left. The
 * server hands down only the Kit Master's real count; everything else is read on the device.
 */
export const metadata: Metadata = gateMetadata('tik-file')

export default function TikFilePage() {
  return (
    <Screen title={t('personal.file.title')} sub={t('personal.file.sub')}>
      <AreaSwitch active="file" />
      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">{t('personal.file.lede')}</p>
      <FileArea kitsTotal={kitCatalog().length} />
      <ReportLink />
    </Screen>
  )
}
