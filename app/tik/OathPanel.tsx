'use client'

import { Badge } from '@/components/ui/Badge'
import type { WorkerCardState } from '@/lib/profile/card'
import { t } from '@/lib/i18n'

import { oathLines, oathTags, type CardNames } from './cardView'

/**
 * שבועת האוהד — written from the card every time it is drawn, stored nowhere.
 *
 * The prototype typed it out of whatever was in the form, defaults included. Here every
 * line is a catalogue template over a declared field or a derived figure
 * (`oathLines`), and a field left empty leaves its line out. There is no "save oath"
 * button because there is nothing to save: change the card, and the oath has changed.
 */
export function OathPanel({ state, names, onEdit }: { state: WorkerCardState; names: CardNames; onEdit: () => void }) {
  const lines = oathLines(state, names)
  const tags = oathTags(state, names)
  const empty = state.declared.homeGate === null && state.declared.fanSince === null && state.declared.began === null

  return (
    <section aria-labelledby="oath-title" className="border-plate border-ink bg-sheet">
      <div className="flex items-start justify-between gap-3 border-b-rule border-ink px-4 pb-3 pt-4">
        <div className="min-w-0">
          <p dir="ltr" className="font-latin text-[9px] font-bold tracking-[0.24em] text-red">
            THE WORKER · SUPPORTER OATH
          </p>
          <h2 id="oath-title" className="mt-1 font-display text-step-3 leading-none text-ink">
            {t('tik.oath.title')}
          </h2>
        </div>
        <Badge size={44} className="shrink-0" />
      </div>

      <ol className="flex flex-col gap-2 px-4 py-4">
        {lines.map((line, index) => (
          <li
            key={index}
            className={`font-display leading-snug ${index === 0 ? 'text-step-2 text-ink' : index === lines.length - 1 ? 'mt-1 text-step-1 text-red' : 'text-step-1 text-ink'}`}
          >
            <OathLine line={line} tik={state.tik} />
          </li>
        ))}
      </ol>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 px-4 pb-3" aria-label={t('tik.oath.tags')}>
          {tags.map((tag) => (
            <li key={tag} className="border-hair border-ink px-2 py-0.5 font-sign text-[13px] font-bold text-ink">
              <bdi>{tag}</bdi>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end justify-between gap-3 border-t-hair border-ink/35 px-4 py-3">
        <div className="min-w-0">
          <p aria-hidden="true" className="-rotate-2 truncate border-b-hair border-ink px-1 font-display text-[18px] text-ink">
            {state.nameHe !== '' ? <bdi>{state.nameHe}</bdi> : <bdi dir="ltr">{state.tik}</bdi>}
          </p>
          <p className="mt-0.5 font-body text-[10px] text-muted">{t('tik.card.signature')}</p>
        </div>
        <p className="max-w-[55%] text-end font-body text-[11px] leading-snug text-muted">{t('tik.oath.note')}</p>
      </div>

      {empty && (
        <div className="border-t-hair border-ink/35 px-4 py-3">
          <p className="font-body text-[12px] leading-snug text-ink">{t('tik.oath.empty')}</p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-2 min-h-tap border-rule border-ink bg-paper px-3 font-body text-[12px] font-extrabold text-ink"
          >
            {t('tik.card.fill')}
          </button>
        </div>
      )}
    </section>
  )
}

/** A line of the oath with the TIK kept whole and LTR — `TIK-0417` never breaks at its hyphen. */
function OathLine({ line, tik }: { line: string; tik: string }) {
  const parts = line.split(tik)
  return (
    <bdi>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < parts.length - 1 && (
            <bdi dir="ltr" className="whitespace-nowrap">
              {tik}
            </bdi>
          )}
        </span>
      ))}
    </bdi>
  )
}
