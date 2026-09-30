import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { StandHome } from '@/components/stand/StandHome'
import { Screen } from '@/components/ui/Screen'
import { resolveDaily } from '@/lib/daily/resolve'
import { todayInIsrael } from '@/lib/date/israel'
import { t } from '@/lib/i18n'
import { cleanStandCode } from '@/lib/stand/contract'
import { standDebate } from '@/lib/stand/debate'
import { isoWeekStart, weekProgram } from '@/lib/stand/week'

/**
 * /stand/<code> — the invite link and the stand's home (§8.1, §8.2). The code is a whole
 * route segment, so the link reads cleanly in a WhatsApp preview. Never indexed: a stand is
 * a private group, and the code is its only door.
 */
export const metadata: Metadata = {
  title: t('stand.title'),
  description: t('stand.meta.description'),
  robots: { index: false },
}
export const revalidate = 300

export default function StandCodePage({ params }: { params: { code: string } }) {
  const code = cleanStandCode(params.code)
  if (!code) notFound()
  const date = todayInIsrael()
  const daily = resolveDaily(date)
  return (
    <Screen title={t('stand.title')} sub={t('stand.sub')}>
      <StandHome code={code} daily={daily} debate={standDebate(daily)} program={weekProgram(date)} weekStart={isoWeekStart(date)} />
    </Screen>
  )
}
