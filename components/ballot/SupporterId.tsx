'use client'

import { KitShirt } from '@/components/kit/KitShirt'
import { Num } from '@/components/ui/Num'
import { BALLOT } from '@/lib/polls/ballot'
import type { PickFact } from '@/lib/polls/pickFact'
import type { SupporterId as Id } from '@/lib/polls/supporter'
import type { KitSpec } from '@/lib/kit/spec'
import { t } from '@/lib/i18n'

/**
 * תעודת אוהד — the slip, printed as a person.
 *
 * The sealed ballot says what you picked. This says who that makes you: the name on the
 * back, the number, where you would play, the one player the whole slip is about, and
 * the reasons you marked. It is the artefact the reference builds towards and the one
 * gate 10 is meant to read (brief §18).
 *
 * **Two shirts, and they are two different claims.** The big one is YOURS — the club's
 * own home kit with your name lettered on it and your number on the back. The small one
 * beside your favourite is HIS, resolved by `lib/kit/playerKit.ts` from the seasons the
 * squad table actually puts him in (rule 74), and absent for the 265 men the archive
 * cannot dress. Mixing them up would put a supporter's name on a footballer's shirt.
 *
 * **One renderer, two densities.** Both shirts are the kit engine (`KitShirt`, rule 20):
 * the voter's at full density, lettered and numbered; the favourite's at `mini` density
 * beside his name (21.9.2026 — the same mini gate 1 draws).
 */
export function SupporterId({
  id,
  shirt,
  favourite,
}: {
  id: Id
  /** the club's own home kit — the spec this device's shirt is drawn from */
  shirt: KitSpec
  /** what the archive holds on the favourite, or null */
  favourite: PickFact | null
}) {
  return (
    <section className="border-rule border-ink bg-sheet">
      <div className="flex items-end justify-between gap-3 border-b-rule border-ink bg-ink px-4 py-2">
        <div className="min-w-0">
          <p dir="ltr" className="font-latin text-[8.5px] font-bold tracking-[0.2em] text-red">
            {t('poll.id.kicker')}
          </p>
          <h2 className="mt-0.5 font-display text-step-1 leading-none text-sheet">
            {t('poll.id.title')}
          </h2>
        </div>
        <p className="shrink-0 font-mono text-[10px] tabular-nums text-concrete">
          <Num>{`${id.filled}/${BALLOT.length}`}</Num>
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        {/* your shirt: your name, your number */}
        <div className="mx-auto w-full max-w-[168px] shrink-0 sm:mx-0">
          <KitShirt
            spec={{
              ...shirt,
              number: id.number,
              sponsorHe: id.nameHe ?? shirt.sponsorHe,
            }}
            className="block w-full"
            title={t('poll.id.title')}
          />
          <p className="mt-1 text-center font-body text-[10px] leading-snug text-muted">
            {id.nameHe ?? t('poll.id.noName')}
          </p>
        </div>

        <dl className="min-w-0 flex-1">
          <div className="border-b-hair border-ink/25 pb-2">
            <dt className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-muted">
              {t('poll.id.favourite')}
            </dt>
            <dd className="mt-0.5 flex items-center gap-2">
              {favourite?.spec && (
                <KitShirt
                  spec={favourite.spec}
                  density="mini"
                  className="h-10 w-9 shrink-0"
                  title={t('poll.fact.shirt', { season: favourite.seasonLabel ?? '' })}
                />
              )}
              <span className="min-w-0 truncate font-display text-step-1 leading-tight text-ink">
                {id.favourite ?? '—'}
              </span>
            </dd>
          </div>

          <div className="mt-2 flex gap-5">
            <div>
              <dt className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-muted">
                {t('poll.id.number')}
              </dt>
              <dd className="font-poster text-[30px] leading-none text-red">
                <Num>{id.number === null ? '—' : String(id.number)}</Num>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-muted">
                {t('poll.id.position')}
              </dt>
              <dd className="truncate font-sign text-[17px] font-bold leading-tight text-ink">
                {id.positionHe ?? '—'}
              </dd>
            </div>
          </div>
        </dl>
      </div>

      {/* למה ככה — the reasons, each beside the pick it belongs to */}
      <div className="border-t-hair border-ink/25 px-4 pb-4 pt-2.5">
        <p className="font-body text-[8.5px] font-extrabold tracking-[0.18em] text-red">
          {t('poll.id.reasons')}
        </p>
        {id.reasons.length === 0 ? (
          <p className="mt-1 font-body text-[12px] leading-snug text-muted">
            {t('poll.id.noReasons')}
          </p>
        ) : (
          <>
            <ol className="mt-1.5">
              {id.reasons.map((row) => (
                <li
                  key={row.questionId}
                  className="flex items-baseline gap-2 border-b-hair border-ink/15 py-1"
                >
                  <span className="min-w-0 flex-1 truncate font-sign text-[14px] font-bold text-ink">
                    {row.pick}
                  </span>
                  <span
                    aria-hidden="true"
                    className="-translate-y-[3px] min-w-[10px] flex-1 border-b border-dotted border-ink/30"
                  />
                  <span className="shrink-0 font-body text-[12px] font-extrabold text-red">
                    {t(row.reason)}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-1.5 font-body text-[10.5px] leading-snug text-muted">
              {t('poll.id.reasoned', { n: String(id.reasoned), total: String(BALLOT.length) })}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
