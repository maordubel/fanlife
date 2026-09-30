import type { Metadata } from 'next'

import { StandIndex } from '@/components/stand/StandIndex'
import { Screen } from '@/components/ui/Screen'
import { resolveDaily } from '@/lib/daily/resolve'
import { todayInIsrael } from '@/lib/date/israel'
import { t } from '@/lib/i18n'
import { isoWeekStart, weekProgram } from '@/lib/stand/week'

/**
 * /stand — "היציע שלי" (ONE RED WORLD §8, §31). The stands this device is in, opening one,
 * and the week — which works alone (§1.1). The daily is resolved here, on the server, for
 * the date it is in Tel Aviv, only so the device can report what it did today.
 */
export const metadata: Metadata = {
  title: t('stand.title'),
  description: t('stand.meta.description'),
  robots: { index: false },
}
export const revalidate = 300

export default function StandPage() {
  const date = todayInIsrael()
  return (
    <Screen title={t('stand.title')} sub={t('stand.sub')}>
      <StandIndex daily={resolveDaily(date)} program={weekProgram(date)} weekStart={isoWeekStart(date)} />
    </Screen>
  )
}
