'use client'

import { useEffect, useRef, useState } from 'react'

import { SourceNote } from '@/components/ui/SourceNote'
import { artUrl } from '@/lib/life/runtime/art'
import { sourceTitles, type MatchReport as Report } from '@/lib/life/finale'
import { t } from '@/lib/i18n'

/**
 * דו"ח המשחק — the end of a match, as the experience Maor asked for.
 *
 * His two sentences were *"שיהיה ממש חוויה גם בסיום המשחק, לכל משחק, כמו שעשינו ב-86"* and
 * *"אנימציה, גרפיקה, לינקים ליוטיוב, תמונות אמיתיות"*. The important half of the first one
 * is **כמו שעשינו ב-86**, because it names what was already right: Stage A ends on a real
 * ticket, four real pages of מעריב ספורט, a scorer, a minute, and a source line under all
 * of it. Nothing else in the game ended like that, and the reason was never a missing
 * component — it was that 1986 was the only day anybody had put the paper into.
 *
 * So this screen has no new idea in it. It is the 1986 card's shape, fed from
 * `lib/life/history/days.ts`, and every decision in it is one of this repo's rules:
 *
 * · **The source is printed on the card** (rule 16). Every goal, every kick, every fact,
 *   every document and every film carries the line that says who says so. A screen that
 *   prints the citation is the only screen allowed to print `detailHe` — which is exactly
 *   why a character still may not say it (rule 60.2).
 * · **A conflict is shown, not resolved** (rule 60.3). Two sources put 33,000 and 40,000
 *   in the bowl on 19.5.1999; the card prints both, and prints that they disagree. The
 *   same for the two minutes of the 17.5.2000 opener. An average would be a number nobody
 *   wrote down.
 * · **A document is shown whole and quoted, never captioned** (rule 49). What sits under
 *   a scan here is a TRANSCRIPTION of what the page prints — the plaque, the ticket's own
 *   fixtures, the lead paragraph — because quoting a document is the one way to put words
 *   near it without putting words on it.
 * · **The films are LINKS, and that is a decision, not a shortcut.** An iframe would load
 *   a third-party player into a game about a childhood, would not resolve in the QA
 *   container at all (rule 29 — the sandbox refuses those hosts), and would therefore
 *   quietly break the "no console errors" claim that every delta in this project makes.
 *   A link costs this game nothing, survives an offline load, and is cited like any other
 *   source. The card says out loud that it opens outside the game, because a tab opening
 *   under somebody's hands with no warning is a small rudeness.
 *
 * **The animation is the shootout, and it is the only one.** A cup shootout is suspense
 * in SEQUENCE — its whole drama is that you cannot see the next kick — so the kicks arrive
 * one at a time, at the pace a person walks to the spot. Nothing else on the card moves
 * except the staggered settle of the goal rows. Under `prefers-reduced-motion`, and under
 * the probe flag that lets a harness read a whole screen, every row is there on the first
 * frame.
 */
export function MatchReport({ report, onZoom }: { report: Report; onZoom: (art: string) => void }) {
  return (
    <>
      {(report.goals.length > 0 || report.shootout) && (
        <section className="mt-3 border-rule border-sheet/25 bg-sheet px-4 py-4" data-life="report-goals">
          <h2 className="font-display text-step-1 leading-tight text-ink">
            <bdi>{t('life.report.goals')}</bdi>
          </h2>
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">
            <bdi>
              {report.dateHe} · {report.venueHe}
              {report.finalHe ? ` · ${report.finalHe}` : ''}
            </bdi>
          </p>

          <ol className="mt-3 flex flex-col gap-2">
            {report.goals.map((goal, index) => {
              const { minuteHe: minute, ours } = goal
              return (
                <li
                  key={goal.id}
                  className="flex items-start gap-3 border-t-hair border-ink/15 pt-2 animate-plate-in first:border-t-0 first:pt-0 motion-reduce:animate-none"
                  style={{ animationDelay: `${120 + index * 110}ms` }}
                >
                  {/*
                    No `dir="ltr"` on this chip, and that is not an oversight.
                    A bare "115׳" renders correctly in the page's own direction — the
                    geresh is a strong Hebrew character and the digits are weak, which is
                    exactly how a minute is printed in Hebrew. `displayMinute` can be a
                    PHRASE ("86׳ או 87׳", two sources one minute apart), and forcing that
                    into an inline LTR run reorders the words on screen.
                  */}
                  <span
                    className={`mt-[2px] min-w-[46px] px-1.5 py-1 text-center font-mono text-[12px] leading-none tabular-nums ${
                      ours ? 'bg-red text-sheet' : 'border-hair border-ink/40 text-muted'
                    }`}
                  >
                    <bdi>{minute ?? '—'}</bdi>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] leading-tight text-ink">
                      <bdi>{goal.personHe ?? t('life.report.unknownScorer')}</bdi>
                      <span className="ms-2 font-body text-[11px] text-muted">
                        <bdi>{ours ? t('life.report.ours') : t('life.report.theirs')}</bdi>
                      </span>
                    </p>
                    {goal.assistHe && (
                      <p className="mt-0.5 font-body text-[12px] leading-snug text-muted">
                        <bdi>{t('life.anchor.assisted', { who: goal.assistHe })}</bdi>
                      </p>
                    )}
                    {goal.detailHe && (
                      <p className="mt-1 font-body text-[13px] leading-relaxed text-ink">
                        <bdi>{goal.detailHe}</bdi>
                      </p>
                    )}
                    {!minute && <Note textHe={t('life.report.noMinute')} />}
                    {goal.conflictNote && <Conflict textHe={goal.conflictNote} />}
                    <Cite titles={sourceTitles(report, goal.sourceIds)} />
                  </div>
                </li>
              )
            })}
          </ol>

          {report.shootout && <Shootout report={report} />}
        </section>
      )}

      {report.facts.length > 0 && (
        <section className="mt-3 border-rule border-sheet/25 bg-sheet px-4 py-4" data-life="report-facts">
          <h2 className="font-display text-step-1 leading-tight text-ink">
            <bdi>{t('life.report.facts')}</bdi>
          </h2>
          <dl className="mt-3 flex flex-col gap-2">
            {report.facts.map((fact) => (
              <div key={fact.id} className="border-t-hair border-ink/15 pt-2 first:border-t-0 first:pt-0">
                <dt className="font-body text-[10px] leading-none text-muted">
                  <bdi>{fact.labelHe}</bdi>
                </dt>
                <dd className="mt-1 font-sign text-[15px] leading-snug text-ink">
                  <bdi>{fact.valueHe}</bdi>
                </dd>
                {fact.conflictNote && <Conflict textHe={fact.conflictNote} />}
                <Cite titles={sourceTitles(report, fact.sourceIds)} />
              </div>
            ))}
          </dl>
        </section>
      )}

      {report.documents.length > 0 && (
        <section className="mt-3 border-rule border-sheet/25 bg-ink px-4 py-4" data-life="report-docs">
          <h2 className="font-display text-step-1 leading-tight text-sheet">
            <bdi>{t('life.report.papers')}</bdi>
          </h2>
          <p className="mt-1 font-body text-[11px] leading-snug text-concrete">
            <bdi>{t('life.report.papersNote')}</bdi>
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {report.documents.map((doc, index) => (
              <figure key={doc.art} className={index === 0 ? '' : 'border-t-hair border-concrete/25 pt-3'}>
                <button
                  type="button"
                  onClick={() => onZoom(doc.art)}
                  className="block min-h-tap w-full border-hair border-concrete/40 bg-ink/60 p-2 transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
                  aria-label={doc.titleHe}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {/*
                    Lazy, because the paper is the heavy half of this card and it sits
                    below the fold: the two 2000 front pages are 800-odd kilobytes each
                    after the converter fell back to lossless on them (a yellow masthead on
                    newsprint is the case rule 61 warns about), and a card that is meant to
                    be sat with should not spend that before the reader has scrolled to it.
                  */}
                  <img
                    src={artUrl(doc.art)}
                    alt={doc.titleHe}
                    loading="lazy"
                    decoding="async"
                    className={`mx-auto w-full object-contain ${doc.lead ? 'max-h-[54vh]' : 'max-h-[34vh]'}`}
                  />
                </button>
                <figcaption className="mt-2">
                  <p className="font-display text-[14px] leading-tight text-sheet">
                    <bdi>{doc.titleHe}</bdi>
                  </p>
                  <p className="mt-1 font-body text-[12px] leading-relaxed text-concrete">
                    <span className="text-sheet">{t('life.report.prints')} </span>
                    <bdi>{doc.printsHe}</bdi>
                  </p>
                  <Cite titles={sourceTitles(report, doc.sourceIds)} dark />
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {report.films.length > 0 && (
        <section className="mt-3 border-rule border-sheet/25 bg-sheet px-4 py-4" data-life="report-films">
          <h2 className="font-display text-step-1 leading-tight text-ink">
            <bdi>{t('life.report.films')}</bdi>
          </h2>
          <p className="mt-1 font-body text-[11px] leading-snug text-muted">
            <bdi>{t('life.report.filmsNote')}</bdi>
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {report.films.map((film) => (
              <li key={film.id}>
                <a
                  href={film.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-tap items-center justify-between gap-3 border-hair border-ink/30 bg-paper px-3 py-2 transition-transform duration-press ease-stamp active:scale-[.99] motion-reduce:transition-none"
                >
                  <span className="font-display text-[14px] leading-tight text-ink">
                    <bdi>{film.titleHe}</bdi>
                  </span>
                  <span className="shrink-0 font-body text-[11px] leading-none text-red">
                    <bdi>{t('life.report.filmOpen')}</bdi>
                  </span>
                </a>
                {/* only where this film leans on something the others do not — see below */}
                {!sharedFilmSource(report) && <Cite titles={sourceTitles(report, film.sourceIds)} />}
              </li>
            ))}
          </ul>
          {/*
            One citation for five links, when five links came off one page. Rule 16 asks
            for the source to be printed, not for it to be printed five times; the same
            sentence repeated under every row is how a reader learns to skip the grey text,
            and the next row that carries a DIFFERENT source is the one they skip.
          */}
          {sharedFilmSource(report) && <Cite titles={sourceTitles(report, report.films[0]!.sourceIds)} />}
        </section>
      )}

      <section className="mt-3 border-rule border-sheet/25 bg-sheet px-4 py-4" data-life="report-sources">
        <h2 className="font-display text-step-1 leading-tight text-ink">
          <bdi>{t('life.report.sources')}</bdi>
        </h2>
        {/* the bibliography is on /credits, the one page that prints sources (spec §0.3,
            22.9.2026); what the sources DON'T say stays here, because that is the report */}
        {report.sources.length > 0 && <SourceNote newTab className="mt-2" />}
        <p className="mt-3 border-t-hair border-ink/20 pt-2 font-body text-[11px] leading-relaxed text-muted">
          <span className="text-ink">{t('life.report.silence')} </span>
          <bdi>{report.silenceHe}</bdi>
        </p>
      </section>
    </>
  )
}

/**
 * הפנדלים — one kick at a time, because that is what a shootout is.
 *
 * The cadence is the only piece of motion on this card that carries meaning rather than
 * polish: a shootout cannot be taken in at a glance, and a list that arrives complete
 * turns the most frightening eight minutes in the club's history into a table. So the
 * kicks land in order, at walking pace, and the running score moves with them.
 *
 * It backs off completely for a reader who has asked it to (`prefers-reduced-motion`) and
 * for a harness that has to read the whole screen in one frame (the probe flag, the same
 * one `DialogueBox` checks so a probe can read a whole line). Both of those want the
 * finished list, not a slower one — a reveal that is merely faster is still a reveal, and
 * a screen reader would announce eight rows as they appeared.
 */
function Shootout({ report }: { report: Report }) {
  const kicks = report.shootout?.kicks ?? []
  /**
   * גילוי שנכשל חייב להיכשל אל "מוצג", לעולם לא אל "מוסתר".
   *
   * This started as `useState(() => instant() ? kicks.length : 0)` plus an effect that
   * either filled the list at once or ticked it. Measured in a real build, at the probe
   * flag, after nine seconds: **all seven kicks sat at `opacity: 0` and
   * `aria-hidden="true"`.** Whatever swallowed the effect — and the flag read back `"1"`,
   * so it was not the flag — the shootout simply never arrived, and the card showed a
   * heading, a score, and three hundred pixels of nothing.
   *
   * `reveal` is what fixes the CLASS and not the instance. It starts false, and false
   * means every kick is visible; the effect turns it on as its first act and only then
   * does the list hide the rows it has not reached yet. A reader whose JavaScript is
   * slow, blocked, still hydrating or broken gets the complete shootout instead of a
   * blank; the animation is a thing that is ADDED when the machinery is running, which
   * is the only honest direction for a piece of motion that carries meaning.
   */
  const [reveal, setReveal] = useState(false)
  const [shown, setShown] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (instant()) {
      setShown(kicks.length)
      return
    }
    setReveal(true)
    timer.current = setInterval(() => {
      setShown((n) => {
        if (n >= kicks.length) {
          if (timer.current) clearInterval(timer.current)
          return n
        }
        return n + 1
      })
    }, 620)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [kicks.length])

  const shootout = report.shootout
  if (!shootout) return null

  return (
    <div className="mt-4 border-t-rule border-ink/70 pt-3" data-life="report-shootout">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-[16px] leading-tight text-ink">
          <bdi>{t('life.report.shootout')}</bdi>
        </h3>
        <span className="font-mono text-[15px] leading-none tabular-nums text-red" dir="ltr">
          {shootout.resultHe}
        </span>
      </div>
      <p className="mt-1 font-body text-[12px] leading-snug text-muted">
        <bdi>{shootout.firstHe}</bdi>
      </p>

      <ol className="mt-2 flex flex-col gap-1">
        {kicks.map((kick, index) => {
          const seen = !reveal || index < shown
          return (
            <li
              key={kick.order}
              className={`flex items-start gap-2 border-t-hair border-ink/15 py-1.5 transition-opacity duration-300 first:border-t-0 motion-reduce:transition-none ${
                seen ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={seen ? undefined : true}
            >
              <Mark outcome={kick.outcome} ours={kick.ours} />
              <div className="min-w-0 flex-1">
                <p className="font-sign text-[14px] leading-tight text-ink">
                  <bdi>{kick.takerHe}</bdi>
                  <span className={`ms-2 font-body text-[11px] ${kick.outcome === 'scored' ? 'text-red' : 'text-muted'}`}>
                    <bdi>{outcomeWord(kick.outcome)}</bdi>
                  </span>
                </p>
                {kick.detailHe && (
                  <p className="mt-0.5 font-body text-[12px] leading-snug text-muted">
                    <bdi>{kick.detailHe}</bdi>
                  </p>
                )}
                {kick.keeperHe && (
                  <p className="mt-0.5 font-body text-[12px] leading-snug text-muted">
                    <bdi>{t('life.report.keeper', { who: kick.keeperHe })}</bdi>
                  </p>
                )}
              </div>
              {kick.afterHe && (
                <span className="mt-[2px] shrink-0 font-mono text-[12px] leading-none tabular-nums text-muted" dir="ltr">
                  {kick.afterHe}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {shootout.conflictNote && <Conflict textHe={shootout.conflictNote} />}
      <Cite titles={sourceTitles(report, shootout.sourceIds)} />
    </div>
  )
}

/**
 * The mark beside a kick. A filled plate went in; an outline did not.
 *
 * Deliberately not a tick and a cross: this brand is a two-plate screenprint and has no
 * icon set, and a green tick would put a third ink on a card that is allowed two.
 */
function Mark({ outcome, ours }: { outcome: 'scored' | 'saved' | 'missed'; ours: boolean }) {
  const filled = outcome === 'scored'
  return (
    <span
      aria-hidden="true"
      className={`mt-[3px] block h-3.5 w-3.5 shrink-0 ${
        filled ? (ours ? 'bg-red' : 'bg-ink') : 'border-hair border-ink/50'
      }`}
    />
  )
}

/**
 * The line rule 16 is about — that there IS a source under the thing it says. Which one is on
 * /credits (spec §0.3, 22.9.2026), opened in a new tab so the report is still here after.
 */
function Cite({ titles, dark }: { titles: string[]; dark?: boolean }) {
  if (titles.length === 0) return null
  return (
    <p className="mt-1">
      <SourceNote newTab tone={dark ? 'dark' : 'paper'} />
    </p>
  )
}

/** a disagreement between sources, kept rather than settled (rule 60.3) */
function Conflict({ textHe }: { textHe: string }) {
  return (
    <p className="mt-1 border-s-[3px] border-red ps-2 font-body text-[11px] leading-snug text-muted">
      <span className="text-red">{t('life.report.conflict')} </span>
      <bdi>{textHe}</bdi>
    </p>
  )
}

/** a field the archive left empty, said out loud instead of filled in (rule 11) */
function Note({ textHe }: { textHe: string }) {
  return (
    <p className="mt-1 font-body text-[11px] leading-snug text-muted">
      <bdi>{textHe}</bdi>
    </p>
  )
}

/**
 * מה קרה לבעיטה — three literal keys and no template.
 *
 * `t(`life.report.kick.${outcome}`)` reads better and is worse: `tests/i18n.test.ts`
 * resolves literal keys only, and a key built at runtime is a key nothing checks — which
 * is exactly how a Latin string ends up mid-sentence in a Hebrew screen (rule 32).
 */
function outcomeWord(outcome: 'scored' | 'saved' | 'missed'): string {
  if (outcome === 'scored') return t('life.report.kick.scored')
  if (outcome === 'saved') return t('life.report.kick.saved')
  return t('life.report.kick.missed')
}

/** true when every film on this card cites exactly the same source, in the same order */
function sharedFilmSource(report: Report): boolean {
  if (report.films.length < 2) return false
  const first = report.films[0]!.sourceIds.join('|')
  return report.films.every((film) => film.sourceIds.join('|') === first)
}

/** the probes read a whole screen; a browser under the probe flag gets the finished list */
function instant(): boolean {
  try {
    return (
      window.localStorage.getItem('the-worker:life:probe') === '1' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
}
