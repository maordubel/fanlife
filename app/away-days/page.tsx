import type { Metadata } from 'next'

import { AwayDaysExperience } from '@/components/away-days/AwayDaysExperience'
import { Screen } from '@/components/ui/Screen'
import { awayJourney } from '@/lib/away-days/data'
import { t } from '@/lib/i18n'
import { linksForMatch } from '@/lib/links'

/**
 * AWAY DAYS — every official match the first team played on a ground outside Israel,
 * as a journey (spec part B, 24.9.2026). The home strip is the only door in.
 *
 * The server reads the generated master and ships the public projection — VERIFIED
 * visits and the grounds they stand on. The research queue never reaches the client.
 */
export const metadata: Metadata = {
  title: t('away.seo.title'),
  description: t('away.seo.desc'),
  alternates: { canonical: '/away-days' },
}
export const dynamic = 'force-static'

export default function AwayDaysPage() {
  const data = awayJourney()
  // delta 89: from a stop to the match's archive card and its scorers' cards (lib/links)
  const links = Object.fromEntries(
    data.visits.map((visit) => [
      visit.matchId,
      linksForMatch(visit.matchId, { omit: ['away'], scorers: true }).map((link) =>
        link.kind === 'archive' && link.target === visit.matchId ? { ...link, subject: t('connect.subject.match') } : link,
      ),
    ]),
  )
  return (
    <Screen title={t('away.title')} sub={t('away.screen.sub')} stage>
      <AwayDaysExperience data={data} links={links} />
    </Screen>
  )
}
