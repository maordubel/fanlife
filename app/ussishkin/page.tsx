import type { Metadata } from 'next'

import { CardWall, type Fact } from './CardWall'
import { HallPlate } from './HallPlate'
import { Reconstruction, type Look } from './Reconstruction'
import { Num } from '@/components/ui/Num'
import { ReportLink } from '@/components/ui/ReportLink'
import { SourceNote } from '@/components/ui/SourceNote'
import { Screen } from '@/components/ui/Screen'
import {
  blockedSources,
  facts,
  factOf,
  nightsAtTheHall,
  openQuestions,
  whatTheFansBuilt,
} from '@/lib/ussishkin/hall'
import { t, type MessageKey } from '@/lib/i18n'
import { gateMetadata } from '@/lib/seo'

/**
 * אגף אוסישקין — the hall, rebuilt as far as a screen can rebuild it, and a memorial.
 *
 * What this wing was: a plaque, forty-five cards, and the association's election
 * archive. All of it sourced, none of it wrong — and all of it text. The hall itself
 * was somewhere else entirely, inside the 2D game, as ten paintings nobody who came to
 * read about Ussishkin would ever see.
 *
 * What it is now, in the order a person walks it:
 *
 *   1. **הפינה** — the building, at the size it deserves. The corner with the green
 *      roof, and the dates on a plaque over it.
 *   2. **מה שהיה שם** — the three numbers, and the sentence that says what the place was.
 *   3. **השחזור** — four vantage points inside and outside, and six marks over the wide
 *      view of the room, each one a sourced fact about the thing you tapped.
 *   4. **הלילות** — the matches the archive can PROVE were played there. Three. Not a
 *      selection — everything there is.
 *   5. **קיר הקלפים** — the forty-five, now filterable and remembered between visits.
 *   6. **הבוקר האחרון** — 25.7.2007, 6:39, and what the supporters did that day.
 *   7. **מה שהאוהדים הקימו** — the association: its events, its two ballots, its board.
 *   8. **התיק הפתוח** — the six things the file says it could not find, and the four
 *      sources that would not answer. Printed, not buried.
 *
 * Section 8 is the one that makes the rest of it a record. Every other page on the
 * internet about this hall either knows the architect's name or does not mention that
 * nobody does. `content/manual/ussishkin.json` has carried both lists since the day it
 * was written and no screen has ever shown them.
 *
 * Rule 14 holds structurally, not by discipline: this screen reads `ussishkin`, the
 * association tables and `basketballMatches` and touches no football table at all.
 */

export const metadata: Metadata = gateMetadata('ussishkin')

/**
 * The six marks on the wide view. Each one names a card; none invents a caption — the
 * label says WHERE you tapped and the card says what the archive knows about it.
 * The coordinates were read off the painting itself, not guessed from the panorama's
 * yaw values: `PANO_SPOTS` describes a cylinder the game projects, and this page shows
 * the flat picture.
 */
const LOOKS: Array<{ slug: string; x: number; y: number; label: MessageKey }> = [
  { slug: 'atmosphere', x: 0.52, y: 0.42, label: 'uss.look.stand' },
  { slug: 'open-court', x: 0.695, y: 0.265, label: 'uss.look.windows' },
  { slug: 'fortress', x: 0.815, y: 0.395, label: 'uss.look.basket' },
  { slug: 'condition', x: 0.5, y: 0.73, label: 'uss.look.parquet' },
  { slug: 'capacity', x: 0.095, y: 0.43, label: 'uss.look.cream' },
  { slug: 'site', x: 0.5, y: 0.085, label: 'uss.look.roof' },
]

const SECTIONS: Array<{ cat: Fact['cat']; key: MessageKey }> = [
  { cat: 'club', key: 'uss.cat.club' },
  { cat: 'ussishkin-club', key: 'uss.cat.ussishkin-club' },
]

export default function UssishkinPage() {
  const wall = facts as unknown as Fact[]
  const nights = nightsAtTheHall()
  const fans = whatTheFansBuilt()

  const looks: Look[] = LOOKS.flatMap((mark) => {
    const fact = factOf(mark.slug)
    if (!fact) return []
    return [
      {
        slug: fact.slug,
        x: mark.x,
        y: mark.y,
        labelHe: t(mark.label),
        factHe: fact.factHe,
        periodHe: fact.periodHe,
        sourceTitle: fact.sourceTitle,
        sourceUrl: fact.sourceUrl,
      },
    ]
  })

  return (
    <Screen title={t('screen.ussishkin.title')} sub={t('screen.ussishkin.sub')}>
      {/* 1 — the corner */}
      <figure className="mt-stack border-plate border-ink bg-ink">
        <HallPlate plate="approach" alt={t('uss.approachAlt')} eager />
        <figcaption className="border-t-rule border-red px-4 pb-4 pt-3">
          <p className="font-latin text-[9px] font-bold tracking-[0.28em] text-red" dir="ltr">
            USSISHKIN HALL · TEL AVIV · 1980—2007
          </p>
          <h2 className="mt-1.5 font-display text-step-4 leading-[0.9] text-paper">
            {t('uss.hall')}
          </h2>
          <p className="mt-2.5 max-w-prose border-s-rule border-red ps-3 font-body text-step-0 leading-relaxed text-concrete">
            {t('uss.epitaph')}
          </p>
        </figcaption>
      </figure>

      {/* 2 — the three numbers */}
      <dl className="mt-2 grid grid-cols-3 border-x-rule border-b-rule border-ink">
        {[
          { k: 'uss.stat.opened', v: '29.9.1980' },
          { k: 'uss.stat.seats', v: '2,000' },
          { k: 'uss.stat.fell', v: '25.7.2007' },
        ].map((stat, index) => (
          <div
            key={stat.k}
            className={`bg-sheet px-3 py-3 ${index > 0 ? 'border-s-hair border-ink/30' : ''}`}
          >
            <dd className="font-poster text-[21px] leading-none text-ink">
              <Num>{stat.v}</Num>
            </dd>
            <dt className="mt-1 font-body text-[10px] tracking-wide text-muted">
              {t(stat.k as MessageKey)}
            </dt>
          </div>
        ))}
      </dl>

      <p className="mt-stack max-w-prose font-body text-step-0 leading-relaxed text-ink">
        {t('uss.lede')}
      </p>

      {/* 3 — the reconstruction */}
      <Reconstruction looks={looks} />

      {/* 4 — the nights that can be proved */}
      <section className="mt-stack" aria-labelledby="uss-nights">
        <div className="flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1.5">
          <h2 id="uss-nights" className="font-display text-step-2 leading-tight text-ink">
            {t('uss.nights')}
          </h2>
          <p className="font-latin text-[9px] font-bold tracking-[0.24em] text-sign" dir="ltr">
            ON THE FLOOR
          </p>
        </div>
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('uss.nightsLede', { n: String(nights.length) })}
        </p>

        <figure className="mt-3 border-rule border-ink bg-ink">
          <HallPlate plate="derby" alt={t('uss.derbyAlt')} />
          <figcaption className="border-t-hair border-concrete/30 px-3 py-2 font-body text-[11.5px] leading-snug text-concrete">
            {t('uss.derbyCaption')}
          </figcaption>
        </figure>

        <ul className="mt-2">
          {nights.map((match) => (
            <li
              key={`${match.playedOn}-${match.awayClubSlug}`}
              className="border-b-hair border-ink/25 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[11px] tabular-nums text-red">
                  <Num>{match.playedOn ?? '—'}</Num>
                </span>
                <span className="font-sign text-step-1 leading-none text-ink">
                  <bdi>{match.homeHe}</bdi>
                  {match.homeScore !== null && match.awayScore !== null && (
                    <span className="mx-2 font-poster text-[19px] text-red">
                      <Num>{`${match.homeScore}—${match.awayScore}`}</Num>
                    </span>
                  )}
                  <bdi>{match.awayHe}</bdi>
                </span>
              </div>
              <p className="mt-1 font-body text-[11.5px] leading-snug text-muted">
                <bdi>{match.seasonLabel}</bdi>
                {match.stage !== null && <> · {match.stage}</>}
                {match.noteHe && <> · {match.noteHe}</>}
              </p>
            </li>
          ))}
        </ul>

        {/* the derby record, which is a count rather than a match list */}
        {factOf('derbies') && (
          <p className="mt-3 border-s-rule border-red bg-sheet p-3 font-body text-step--1 leading-relaxed text-ink">
            {factOf('derbies')?.factHe}
          </p>
        )}
      </section>

      {/* 5 — the wall */}
      <section className="mt-stack" aria-labelledby="uss-wall">
        <h2 id="uss-wall" className="sr-only">
          {t('uss.wall')}
        </h2>
        <CardWall facts={wall} />
      </section>

      {/* the same record, read as sections, for anyone who would rather read than tap */}
      {SECTIONS.map((section) => {
        const rows = wall.filter(
          (fact) => fact.cat === section.cat || (section.cat === 'club' && fact.cat === 'players'),
        )
        if (rows.length === 0) return null
        return (
          <section key={section.cat} className="mt-stack">
            <h3 className="border-b-rule border-ink pb-1 font-display text-step-2 leading-tight text-ink">
              {t(section.key)}
            </h3>
            <ul className="mt-2">
              {rows.map((fact) => (
                <li key={fact.slug} className="border-b-hair border-ink/25 py-2.5">
                  <p className="font-body text-step-0 leading-relaxed text-ink">{fact.factHe}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[10.5px] text-muted">
                    {fact.periodHe !== '' && <Num>{fact.periodHe}</Num>}
                    <SourceNote />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {/* 6 — the last morning */}
      <section className="mt-stack border-plate border-ink bg-ink" aria-labelledby="uss-last">
        <HallPlate plate="night" alt={t('uss.nightAlt')} />
        <div className="border-t-rule border-red p-4">
          <p className="font-latin text-[9px] font-bold tracking-[0.28em] text-red" dir="ltr">
            25 JULY 2007 · 06:39
          </p>
          <h2 id="uss-last" className="mt-1.5 font-display text-step-3 leading-tight text-paper">
            {t('uss.last')}
          </h2>
          <ul className="mt-3">
            {['preservation', 'demolition', 'huldai', 'torn-shirts', 'park']
              .map((slug) => factOf(slug))
              .filter((fact): fact is NonNullable<typeof fact> => fact !== undefined)
              .map((fact) => (
                <li key={fact.slug} className="border-t-hair border-concrete/25 py-2.5 first:border-t-0 first:pt-0">
                  <p className="font-body text-step--1 leading-relaxed text-concrete">
                    {fact.periodHe !== '' && (
                      <span className="me-2 font-mono text-[10.5px] text-red">
                        <Num>{fact.periodHe}</Num>
                      </span>
                    )}
                    {fact.factHe}
                  </p>
                  <SourceNote tone="dark" className="mt-1" />
                </li>
              ))}
          </ul>
        </div>
      </section>

      {/* 7 — what the supporters built */}
      <section className="mt-stack" aria-labelledby="uss-after">
        <div className="flex items-baseline justify-between gap-3 border-b-rule border-ink pb-1.5">
          <h2 id="uss-after" className="font-display text-step-2 leading-tight text-ink">
            {t('uss.after')}
          </h2>
          <p className="font-latin text-[9px] font-bold tracking-[0.24em] text-sign" dir="ltr">
            WHAT THE TERRACE BUILT
          </p>
        </div>
        <p className="mt-2 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('ussishkin.separate')}
        </p>

        <ol className="mt-3">
          {fans.events.map((event) => (
            <li key={event.titleHe} className="border-s-rule border-red ps-3 pb-4 last:pb-0">
              <p className="font-mono text-[11px] tabular-nums text-red">
                {event.happenedOn !== null ? (
                  <Num>{event.happenedOn}</Num>
                ) : (
                  <span className="text-muted">{t('uss.undated')}</span>
                )}
              </p>
              <p className="mt-0.5 font-sign text-step-1 leading-tight text-ink">{event.titleHe}</p>
              <p className="mt-1 font-body text-step--1 leading-relaxed text-ink">{event.bodyHe}</p>
              {event.votesFor !== null && event.votesFor !== undefined && (
                <p className="mt-1.5 font-mono text-[11px] tabular-nums text-muted">
                  {t('uss.ballot', {
                    forCount: String(event.votesFor),
                    against: String(event.votesAgainst ?? 0),
                    turnout: String(event.turnout ?? 0),
                  })}
                </p>
              )}
              {event.sourceUrl && <SourceNote className="mt-1" />}
            </li>
          ))}
        </ol>

        <h3 className="mt-stack border-b-rule border-ink pb-1 font-display text-step-1 leading-tight text-ink">
          {t('uss.elections')}
        </h3>

        {fans.elections.map(({ election, runners }) => (
          <section key={election.slug} className="mt-4">
            <div className="border-b-hair border-ink/40 pb-1">
              <h4 className="font-sign text-step-1 leading-tight text-ink">{election.titleHe}</h4>
              {election.eligibleVoters !== null && election.votesCast !== null && (
                <p className="mt-1 font-body text-[11px] text-muted">
                  {t('ussishkin.turnout', {
                    cast: String(election.votesCast),
                    eligible: String(election.eligibleVoters),
                    invalid: String(election.invalidVotes ?? 0),
                  })}
                </p>
              )}
            </div>
            <ol className="mt-2">
              {runners.map((runner) => (
                <li
                  key={runner.personNameHe}
                  className="flex items-baseline gap-2 border-b-hair border-ink/25 py-2"
                >
                  <span className="w-5 shrink-0 font-poster text-[17px] leading-none text-red">
                    <Num>{runner.rank ?? '—'}</Num>
                  </span>
                  <span className="min-w-0 flex-1 font-body text-step-0 text-ink">
                    {runner.personNameHe}
                    {runner.occupationHe && (
                      <span className="block font-body text-[10.5px] leading-snug text-muted">
                        {runner.occupationHe}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted">
                    {runner.votes !== null ? <Num>{runner.votes}</Num> : '—'}
                    {runner.elected && <span className="ms-1.5 text-red">✓</span>}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </section>

      {/* 8 — the open file */}
      <section className="mt-stack border-rule border-ink bg-sheet p-4" aria-labelledby="uss-open">
        <h2 id="uss-open" className="font-display text-step-2 leading-tight text-ink">
          {t('uss.openFile')}
        </h2>
        <p className="mt-1.5 max-w-prose font-body text-step--1 leading-relaxed text-muted">
          {t('uss.openNote')}
        </p>
        <ul className="mt-3">
          {openQuestions.map((question) => (
            <li
              key={question}
              className="flex gap-2 border-t-hair border-ink/20 py-2 first:border-t-0 first:pt-0"
            >
              <span aria-hidden="true" className="mt-[7px] h-[9px] w-[9px] shrink-0 bg-red" />
              <span className="font-body text-step--1 leading-relaxed text-ink">{question}</span>
            </li>
          ))}
        </ul>
        {blockedSources.length > 0 && (
          <>
            <h3 className="mt-4 font-body text-[11px] font-extrabold tracking-widest text-muted">
              {t('uss.blocked')}
            </h3>
            <ul className="mt-1.5">
              {blockedSources.map((source) => (
                <li key={source} className="font-mono text-[11px] leading-relaxed text-muted">
                  <bdi>{source}</bdi>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <ReportLink />
    </Screen>
  )
}
