import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { DailyTerrace } from '@/components/clubs/terrace/DailyTerrace'
import { ClubSurface } from '@/components/clubs/ClubSurface'
import { loadClub, resolveClubId } from '@/lib/clubs/resolver'
import { evaluationMode } from '@/lib/master/mode'
import { REGISTRY } from '@/lib/master/registry'
import { clubTheme } from '@/lib/clubs/theme'
import { uiLocale } from '@/lib/clubs/locale'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

export const dynamic = 'force-dynamic'
export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = REGISTRY.find((r) => r.id === params.slug)
  return { title: c ? `Daily Terrace · ${c.name}` : 'Daily Terrace', robots: { index: false, follow: true } }
}

/** Daily Terrace (ADR-U12): the club's three-round day. Rounds are dealt and graded on the server. */
export default async function Page({ params, searchParams }: { params: { slug: string }; searchParams: { lang?: string } }) {
  const id = resolveClubId(headers().get('host'), params.slug, evaluationMode())
  if (!id) notFound()
  const core = await loadClub(id)
  const reg = REGISTRY.find((r) => r.id === id)
  if (!reg) notFound()
  const locale = uiLocale(searchParams.lang)
  const c = (locale === 'he' ? he : en) as typeof en
  const copy = {
    kicker: c.terraceDailyKicker, round: c.terraceDailyRound, of: c.terraceDailyOf, kinds: [c.terraceDailyRemember, c.terraceDailyRewind, c.terraceDailyWild] as [string, string, string],
    tryN: c.terraceDailyTry, right: c.terraceDailyRight, wrong: c.terraceDailyWrong, points: c.terraceDailyPoints, yourDay: c.terraceDailyYourDay,
    share: c.terraceDailyShare, copied: c.terraceDailyCopied, back: c.terraceDailyBack, notReady: c.terraceDailyNotReady, closed: c.terraceDailyClosed, loading: c.terraceDailyLoading, gone: c.terraceDailyGone,
    boardTitle: c.terraceDailyBoard, boardJoin: c.terraceDailyBoardJoin, boardNick: c.terraceDailyBoardNick, boardBad: c.terraceDailyBoardBad, boardYou: c.terraceDailyBoardYou, boardOff: c.terraceDailyBoardOff,
  }
  return (
    <ClubSurface theme={core?.data.theme || clubTheme(reg)} clubId={id} locale={locale}>
      <main className="club-main terrace-main">
        <DailyTerrace slug={id} club={reg.name} copy={copy} />
      </main>
    </ClubSurface>
  )
}
