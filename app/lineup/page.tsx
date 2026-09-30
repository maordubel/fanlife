import type { Metadata } from 'next'

import { Num } from '@/components/ui/Num'
import { ReportLink } from '@/components/ui/ReportLink'
import { Screen } from '@/components/ui/Screen'
import { SourceNote } from '@/components/ui/SourceNote'
import { dealChallenge, hasVerifiedLineup, type MatchIntro } from '@/lib/game/lineup'
import { playerShirt } from '@/lib/kit/playerShirt'
import { roundFrom } from '@/lib/rotation/round'
import { t } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'
import { LineupBoard } from './LineupBoard'

/**
 * שער 3 — the locker room.
 *
 * With a verified XI in `content/manual/lineups.json` this is a graded challenge: the
 * match intro card (the record plus the Match Master, disputes kept, sources named), the
 * lockers, the four bands. Without one it says so and deals nothing — no invented lineup
 * is ever shown as history.
 */
export const metadata: Metadata = gateMetadata('lineup')

/** 2001-10-18 → 18.10.2001, the way a match report dates a game. */
function dayHe(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)}.${Number(month)}.${year}`
}

/** Does the record's own subtitle already print this day (18.10.2001 or 14.03.2002)? */
function saysDate(subtitleHe: string | null, iso: string): boolean {
  const [year, month, day] = iso.split('-')
  const text = subtitleHe ?? ''
  return text.includes(`${Number(day)}.${Number(month)}.${year}`) || text.includes(`${day}.${month}.${year}`)
}

function Intro({ titleHe, subtitleHe, intro, sourceTitle }: {
  titleHe: string
  subtitleHe: string | null
  intro: MatchIntro
  sourceTitle: string
}) {
  return (
    <section className="mt-stack border-rule border-ink bg-sheet" data-match={intro.matchId}>
      <div className="flex items-baseline justify-between gap-3 bg-ink px-3 py-1.5">
        <p className="font-body text-[10px] font-extrabold tracking-[0.18em] text-concrete">{t('lineup.intro.eyebrow')}</p>
        {intro.season && (
          <p className="font-mono text-[11px] tabular-nums text-sheet">
            <Num>{intro.season}</Num>
          </p>
        )}
      </div>
      <div className="px-3 py-2.5">
        <p className="font-sign text-step-1 leading-tight text-ink">{titleHe}</p>
        {subtitleHe && (
          <p className="mt-1 font-mono text-[11px] leading-snug text-sign">
            <Num>{subtitleHe}</Num>
          </p>
        )}
        <p className="mt-1.5 font-body text-[11.5px] leading-snug text-ink">
          {intro.playedOn && !saysDate(subtitleHe, intro.playedOn) ? (
            <>
              {t('lineup.intro.date')} <Num>{dayHe(intro.playedOn)}</Num>
            </>
          ) : intro.dateDisputed ? (
            t('lineup.intro.dateDisputed')
          ) : null}
        </p>
        <p className="mt-1 font-body text-[11px] leading-snug text-muted">{t('lineup.zone.intro')}</p>
        {/* the eleven's source and the match's are on /credits (spec §0.3, 22.9.2026) */}
        {(sourceTitle !== '' || intro.matchSourceTitle) && <SourceNote newTab className="mt-1.5" />}
      </div>
    </section>
  )
}

export default function LineupPage({
  searchParams,
}: {
  searchParams: { seed?: string; r?: string }
}) {
  const round = roundFrom(searchParams)
  const challenge = dealChallenge(round.seed, round.cursor)
  const graded = hasVerifiedLineup()

  return (
    <Screen title={t('screen.lineup.title')} sub={t('screen.lineup.sub')} stage>
      {challenge ? (
        <>
          {/* the phone stage: one line — the fixture and its date — the rest (sources,
              the disputed-date note) moved into the board's own "פרטי המשחק" sheet */}
          <div className="shrink-0 border-hair border-ink/40 bg-sheet px-2.5 py-1.5 md:hidden">
            <p className="truncate font-sign text-[13px] leading-tight text-ink">{challenge.titleHe}</p>
            {challenge.subtitleHe && (
              <p className="truncate font-mono text-[10px] leading-tight text-sign">
                <Num>{challenge.subtitleHe}</Num>
              </p>
            )}
          </div>
          <div className="hidden md:block">
            <Intro
              titleHe={challenge.titleHe}
              subtitleHe={challenge.subtitleHe}
              intro={challenge.intro}
              sourceTitle={challenge.sourceTitle}
            />
          </div>
        </>
      ) : (
        <p className="mt-stack font-sign text-step-1 leading-tight text-ink">{t('lineup.freeBuild')}</p>
      )}

      {challenge && (
        <LineupBoard
          bank={challenge.bank}
          seed={round.seed}
          cursor={round.cursor}
          graded={graded}
          kit={challenge.kit}
          kitSeason={challenge.kitSeason}
          // the night's REAL shirt — the match season's photograph where the archive has one
          look={
            challenge.intro.season || challenge.kitSeason
              ? playerShirt(null, { season: challenge.intro.season || challenge.kitSeason })
              : null
          }
          keeperLook={
            challenge.intro.season || challenge.kitSeason
              ? playerShirt(null, { season: challenge.intro.season || challenge.kitSeason, keeper: true })
              : null
          }
          intro={challenge.intro}
          sourceTitle={challenge.sourceTitle}
          fixture={{
            titleHe: challenge.titleHe,
            dateHe: challenge.subtitleHe ?? (challenge.intro.playedOn ? dayHe(challenge.intro.playedOn) : ''),
          }}
        />
      )}

      <div className="shrink-0 md:block">
        <ReportLink />
      </div>
    </Screen>
  )
}
