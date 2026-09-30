'use client'

import { Num } from '@/components/ui/Num'
import { approvedCount, type MemberBook as Book } from '@/lib/game/member'
import { t } from '@/lib/i18n'

/**
 * פנקס חבר — the pages of the member book that are not the card.
 *
 * The book's own rules stay the design, from the handoff: no points, a fixed file number,
 * a slot for every day you turned up, and nothing that can be bought. What changed on
 * 21.9.2026 is where each part lives:
 *
 *  · the card's name, number and fields moved to the Worker Card and its editor — the
 *    name is capped at `NAME_MAX` (18, the length a shirt carries) in exactly one place,
 *    not 24 here and 18 in gate 7;
 *  · the punches joined `profile.days` in ONE activity grid (`activityDays`);
 *  · the corrections — the archive's thanks for a fact somebody fixed — print only when
 *    there ARE corrections. A big zero on every card was a number about nobody.
 */
export function MemberBook({ book }: { book: Book | null }) {
  const rows = book?.corrections ?? []
  const approved = book ? approvedCount(book) : 0
  const pending = rows.length - approved

  return (
    <div>
      {rows.length > 0 && (
        <section className="mt-stack border-rule border-ink bg-ink p-5" aria-labelledby="book-fixes" data-book="corrections">
          <h2 id="book-fixes" className="font-body text-[10px] tracking-widest text-red">
            {t('tik.fixes')}
          </h2>
          <div className="mt-1 flex items-end gap-3">
            <p className="font-poster text-[74px] leading-none text-paper">
              <Num>{approved}</Num>
            </p>
            {pending > 0 && (
              <p className="pb-3 font-body text-step--1 text-concrete">
                {pending === 1 ? t('tik.pending.one') : t('tik.pending', { n: String(pending) })}
              </p>
            )}
          </div>
          <p className="mt-1 font-body text-step--1 leading-relaxed text-concrete">{t('tik.card.fixesNote')}</p>

          <ol className="mt-3 border-t-hair border-concrete/30">
            {rows.slice(0, 6).map((row) => (
              <li key={row.id} className="border-b-hair border-concrete/20 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-latin text-[9px] font-bold tracking-[0.14em] text-red" dir="ltr">
                    {row.tagHe}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-concrete">
                    <bdi dir="ltr">{row.filedOn}</bdi>
                  </span>
                </div>
                <p className="mt-0.5 font-body text-step--1 text-paper">{row.bodyHe}</p>
                <p className="font-body text-[10px] text-concrete">
                  {row.status === 'approved' ? t('tik.approved') : t('tik.waiting')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <ul className="mt-stack border-t-rule border-ink">
        {(['noScore', 'tikNumber', 'slots', 'noBuying'] as const).map((key) => (
          <li key={key} className="border-b-hair border-ink/25 py-2.5">
            <p className="font-body text-step-0 font-extrabold text-ink">{t(`tik.rule.${key}`)}</p>
            <p className="mt-0.5 font-body text-step--1 leading-relaxed text-muted">{t(`tik.rule.${key}.d`)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
