'use client'

import { useState } from 'react'

import { BoxObject } from '@/components/life/BoxObject'
import { Num } from '@/components/ui/Num'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'
import type { BoxThing } from '@/lib/life/redboxView'

/**
 * הקופסה האדומה, פתוחה — 21.9.2026.
 *
 * מאור: *"לשים את 'הקופסא' בחדר, שכל דבר ילווה בחוויה גרפית."* כל פרק בחיים נגמר במשפט
 * *"שמת את זה בקופסה האדומה"*, והקופסה הייתה רשימה בתוך תפריט. עכשיו היא חפץ בחדר, ומה
 * שנפתח כשנוגעים בה הוא **הקופסה** — פח אדום, מכסה שנפתח על הציר, והחפצים מונחים בה
 * בסדר שהחיים הניחו אותם: הראשון מלמטה, השנה בכתב יד על פתק קשור.
 *
 * נגיעה בחפץ מחזירה את המשפט שנכתב כשהוא נכנס — אותו משפט שהשחקן קרא בסוף הפרק. שום
 * מספר לא מודפס כאן חוץ מהשנה, כי קופסה של אדם היא לא טבלה (כלל 46).
 */
export function RedBoxSheet({ things, onClose }: { things: BoxThing[]; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  const chosen = things.find((thing) => thing.id === picked) ?? null

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label={t('life.profile.box')}
      className="pointer-events-auto absolute inset-0 z-[60] flex flex-col bg-ink/95 outline-none"
      data-life="redbox"
    >
      <div className="flex w-full items-center justify-between px-4 pt-3">
        <p className="font-display text-[15px] leading-none text-sheet">
          <bdi>{t('life.profile.box')}</bdi>
        </p>
        <button
          type="button"
          onClick={onClose}
          data-life="redbox-close"
          className="min-h-tap px-3 font-display text-[13px] uppercase tracking-[0.18em] text-sheet"
        >
          {t('life.finale.close')}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-3 [perspective:1100px]">
        <div className="relative flex max-h-full w-full max-w-[720px] flex-col">
          <div className="tin relative flex min-h-[46vh] flex-col p-[10px]">
            {/* המכסה — מכסה את כל הקופסה, ונפתח על הציר העליון לפני שהחפצים נוחתים */}
            <div className="tin pointer-events-none absolute inset-0 z-10 origin-top animate-box-lid" aria-hidden="true" />
            <div className="tin-floor min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {things.length === 0 ? (
                <p className="px-2 py-6 text-center font-body text-[14px] leading-relaxed text-concrete">
                  <bdi>{t('life.profile.boxEmpty')}</bdi>
                </p>
              ) : (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                  {things.map((thing, index) => (
                    <li key={thing.id} className="animate-land" style={{ animationDelay: `${420 + Math.min(index, 18) * 55}ms` }}>
                      <button
                        type="button"
                        data-life="redbox-thing"
                        data-kind={thing.kind}
                        aria-pressed={picked === thing.id}
                        onClick={() => setPicked(picked === thing.id ? null : thing.id)}
                        className={`flex w-full flex-col items-stretch transition-transform duration-press ease-stamp active:scale-[.97] motion-reduce:transition-none ${
                          picked === thing.id ? 'outline outline-2 outline-offset-2 outline-sheet' : ''
                        }`}
                      >
                        <div className="aspect-square w-full">
                          <BoxObject
                            id={thing.id}
                            kind={thing.kind}
                            art={thing.art}
                            plate={thing.plate}
                            year={thing.year}
                            label={thing.titleHe ?? thing.nameHe}
                          />
                        </div>
                        <span className="mx-auto -mt-1 flex items-baseline gap-1.5 bg-sheet px-1.5 py-0.5 font-sign text-[10px] leading-none text-ink">
                          <Num>{thing.year}</Num>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-[92px] px-5 pb-[max(14px,env(safe-area-inset-bottom))] pt-1" aria-live="polite">
        {chosen ? (
          <div key={chosen.id} className="mx-auto max-w-prose animate-sheet-in border-t-hair border-concrete/30 pt-3" data-life="redbox-note">
            <p className="font-display text-[15px] leading-tight text-sheet">
              <bdi>{chosen.titleHe ?? chosen.nameHe}</bdi>
            </p>
            {chosen.noteHe ? (
              <p className="mt-1.5 font-body text-[13px] leading-relaxed text-concrete">
                <bdi>{chosen.noteHe}</bdi>
              </p>
            ) : null}
          </div>
        ) : things.length > 0 ? (
          <p className="mx-auto max-w-prose pt-3 text-center font-body text-[12px] leading-relaxed text-concrete/80">
            <bdi>{t('life.box.touch')}</bdi>
          </p>
        ) : null}
      </div>
    </div>
  )
}
