import type { JourneyData, VisitLite } from '@/lib/away-days/journey'
import { t } from '@/lib/i18n'
import { BeenToggle } from './BeenToggle'

/**
 * כרטיס הביקור — one match, read from the master (spec §28).
 *
 * Date, competition and stage, the opponent, the score from Hapoel's side, the
 * designation, and the ground with its city and country. Scorers only when the master
 * holds every Hapoel goal as a resolved entry; otherwise the line is simply not there —
 * no empty panel, nothing reconstructed.
 */

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

export function sideLabel(visit: VisitLite, countryCode: string): string {
  if (visit.side === 'HOME') return countryCode === 'IL' ? t('away.side.home') : t('away.side.homeAbroad')
  if (visit.side === 'AWAY') return t('away.side.away')
  if (visit.side === 'NEUTRAL') return t('away.side.neutral')
  return ''
}

export function resultLabel(visit: VisitLite): string {
  return visit.result === 'W' ? t('away.result.win') : visit.result === 'L' ? t('away.result.loss') : t('away.result.draw')
}

export function VisitCard({
  visit,
  data,
  compact = false,
  showScorers = true,
  been,
}: {
  visit: VisitLite
  data: JourneyData
  compact?: boolean
  showScorers?: boolean
  /** "הייתי שם" (spec §30) — the toggle sits between the opponent and the score */
  been?: { on: boolean; onToggle: () => boolean }
}) {
  const venue = data.venues[visit.venueId]
  if (!venue) return null
  const tone = visit.result === 'W' ? 'text-red' : visit.result === 'L' ? 'text-sign' : 'text-ink'
  return (
    <article className="min-w-0">
      <p className="flex min-w-0 items-baseline gap-2 font-body text-[11px] leading-tight text-muted">
        <span dir="ltr" className="shrink-0 font-mono tabular-nums text-ink">
          {formatDate(visit.playedOn)}
        </span>
        <span className="truncate">
          {visit.competitionHe}
          {visit.stageHe ? ` · ${visit.stageHe}` : ''}
        </span>
      </p>
      <div className="mt-1 flex items-end justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className={`truncate font-display leading-none text-ink ${compact ? 'text-[20px]' : 'text-[24px]'}`}>{visit.opponentHe}</h3>
          {visit.opponentLatin && (
            <p dir="ltr" className="mt-0.5 truncate text-end font-latin text-[9px] font-bold uppercase tracking-[0.22em] text-muted">
              {visit.opponentLatin}
            </p>
          )}
        </div>
        {been && <BeenToggle on={been.on} onToggle={been.onToggle} city={venue.cityHe} />}
        <p className={`relative shrink-0 font-poster leading-none ${compact ? 'text-[34px]' : 'text-[44px]'}`} aria-label={`${resultLabel(visit)} ${visit.scoreFor}:${visit.scoreAgainst}`}>
          <span aria-hidden="true" dir="ltr" className="plate-shift absolute inset-0 text-concrete">
            {visit.scoreAgainst}–{visit.scoreFor}
          </span>
          <span aria-hidden="true" dir="ltr" className={`plate-top relative ${tone}`}>
            {visit.scoreAgainst}–{visit.scoreFor}
          </span>
        </p>
      </div>
      <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-sign text-[12px] leading-tight text-sign">
        <span className="truncate">
          {venue.nameHe} · {venue.cityHe} · {venue.countryHe}
        </span>
        <span className="shrink-0 border-hair border-ink/40 px-1.5 py-px font-body text-[10px] font-extrabold text-ink">
          {sideLabel(visit, venue.countryCode)}
        </span>
        <span className={`shrink-0 font-body text-[10px] font-extrabold ${tone}`}>{resultLabel(visit)}</span>
      </p>
      {showScorers && visit.scorers && visit.scorers.length > 0 && (
        <p className="mt-1.5 font-body text-[11px] leading-snug text-ink">
          <span className="font-extrabold">{t('away.card.scorers')}: </span>
          {visit.scorers
            .map((s) => `${s.nameHe}${s.ownGoal ? ` (${t('away.card.ownGoal')})` : ''}${s.minute !== null ? ` ${s.minute}′` : ''}${s.penalty ? ` (${t('away.card.penalty')})` : ''}`)
            .join(' · ')}
        </p>
      )}
    </article>
  )
}
