'use client'

import { t } from '@/lib/i18n'
import type { StoryPresence, StoryRow } from '@/lib/life/personal'

import css from './personal.module.css'

/**
 * הסיפור שלי — not the club's history; his, inside it (spec §13–15, §48).
 *
 * One row per chapter this life has actually lived, oldest first, and on the days history
 * hangs on, how he was there — in the first person, because it is his: הייתי שם, הגעתי
 * מאוחר, שמעתי ברדיו, פספסתי. The source is the same state `presenceReading` reads
 * (presence / attended / missed); what changed is the consumer — it is biography now, and
 * it no longer sits in the bag among the objects (§76).
 *
 * The spine runs down once; the days land on it one after another (the first fourteen are
 * staggered, the rest are simply there — a stagger that makes a man of forty-eight wait
 * for his childhood to finish is not a reveal, it is a queue). No glow, no gradient (§15).
 * The marks are squares: filled red where he was, a square inside a square where he was
 * there some other way, hollow where he missed it.
 */

function Mark({ presence, major }: { presence: StoryPresence; major: boolean }) {
  const size = major ? 'h-[13px] w-[13px]' : 'h-[9px] w-[9px]'
  if (presence === 'there') return <span className={`block ${size} bg-red`} />
  if (presence === 'partial')
    return (
      <span className={`flex ${size} items-center justify-center border-hair border-sheet bg-ink`}>
        <span className="block h-1/2 w-1/2 bg-sheet" />
      </span>
    )
  if (presence === 'missed') return <span className={`block ${size} border-2 border-concrete/70 bg-ink`} />
  return <span className="block h-[6px] w-[6px] bg-concrete/60" />
}

export function LifeStoryTimeline({ rows }: { rows: StoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center px-6" data-life="me-story">
        <p className="font-body text-[13px] leading-relaxed text-concrete">
          <bdi>{t('life.bag.whereNone')}</bdi>
        </p>
      </div>
    )
  }
  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6" data-life="me-story">
      <ol className="relative py-2">
        <span aria-hidden="true" className={`${css.lineDown} absolute bottom-3 top-3 w-[2px] bg-sheet/35`} style={{ insetInlineStart: 5 }} />
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`relative flex gap-3 ${row.major ? 'py-2.5' : 'py-1.5'} ${i < 14 ? css.dayIn : ''}`}
            style={i < 14 ? { animationDelay: `${260 + i * 55}ms` } : undefined}
            data-life="story-row"
            data-presence={row.presence}
          >
            <span className="relative flex w-[12px] shrink-0 justify-center pt-[5px]" aria-hidden="true">
              <Mark presence={row.presence} major={row.major} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className={`font-mono tabular-nums leading-none ${row.major ? 'text-[11px] text-sheet' : 'text-[10px] text-concrete'}`}>
                  <bdi>{row.dateHe}</bdi>
                </span>
                {row.now ? (
                  <span className="bg-red px-1 py-[2px] font-sign text-[9px] leading-none text-sheet">
                    <bdi>{t('life90h.story.now')}</bdi>
                  </span>
                ) : null}
              </p>
              <p className={`mt-1 font-display leading-tight ${row.major ? 'text-[17px] text-sheet' : 'text-[13px] text-sheet/75'}`}>
                <bdi>{row.titleHe}</bdi>
              </p>
              {row.presenceHe ? (
                <p className={`mt-0.5 font-body text-[12px] leading-snug ${row.presence === 'there' ? 'text-red' : row.presence === 'missed' ? 'text-concrete' : 'text-sheet/70'}`}>
                  <bdi>{row.presenceHe}</bdi>
                </p>
              ) : null}
              {row.keptHe.length > 0 ? (
                <p className="mt-0.5 font-mono tabular-nums text-[9px] uppercase tracking-[0.12em] text-concrete">
                  <bdi>
                    {t('life.bag.kept')} · {row.keptHe.join(' · ')}
                  </bdi>
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
