'use client'

import { Cloth, Plate } from '@/components/life/Plate'
import { Num } from '@/components/ui/Num'
import type { HudState } from '@/lib/life/runtime/bus'
import { t } from '@/lib/i18n'
import { formatMoney } from '@/lib/life/money'
import { artUrl, EMBLEM_OF_RESOURCE } from '@/lib/life/runtime/art'

/**
 * הממשק — a sign plate, a cloth, and nothing else (brief §15).
 *
 * The clock and the place are one enamel plate on a concrete arm, the way every screen
 * title on the site is: Courier for the time, the sign face for the room, Heebo for the
 * date. The objective — the one short phrase describing the SHAPE of the day, never an
 * instruction — is a strip of red cloth cut on the bias. Money is a small plate that
 * appears only when there is any. Nothing here is a bar and nothing here is a score:
 * the numbers live on the love meter and behind it.
 */
/**
 * הסמל של המשאב — 15 פיקסלים, ומחליף כלום.
 *
 * הסמל עומד **ליד** המילה ולא במקומה, בדיוק כמו `ActionMark` על צ'יפ הפעולה: תמונה
 * שנכשלה בטעינה משאירה שורה שעדיין אפשר לקרוא, וקורא מסך שומע את המילה בלי הדיסקית.
 */
function Emblem({ resource }: { resource: 'money' | 'energy' }) {
  const key = EMBLEM_OF_RESOURCE[resource]
  if (!key) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={artUrl(key)} alt="" aria-hidden="true" className="h-[15px] w-[15px] shrink-0 object-contain" />
}

/**
 * ארבע מילים, לא אחוז — והגבולות הם היכן שהמשחק עצמו נעצר.
 *
 * `Condition.minEnergy` ועלויות הפעולות נעות בעשרות, אז המילה משתנה בערך כשמשתנה מה
 * שאפשר לעשות: מעל 70 אפשר הכול, מתחת ל-25 כמעט כל דבר בוקר יקר.
 */
export function energyWordHe(energy: number): string {
  if (energy >= 70) return t('life.energyWord.full')
  if (energy >= 45) return t('life.energyWord.fine')
  if (energy >= 25) return t('life.energyWord.tired')
  return t('life.energyWord.spent')
}

export function LifeHud({ hud }: { hud: HudState }) {
  /*
   * The root spans the whole glass, not only the top strip. It was `top-0` with no height,
   * which is fine for a row of chips and wrong the moment anything is anchored to the
   * BOTTOM: the waiting strip was positioned 76 pixels above a box of zero height and
   * landed off the top of the screen. It stays `pointer-events-none` and its children opt
   * in, so covering the stage costs nothing.
   */
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-between gap-3 px-2.5 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="flex items-stretch">
        <span aria-hidden="true" className="block w-[7px] self-stretch bg-concrete" />
        <Plate className="ms-1 mt-1" data-life="hud-plate">
          <span className="flex items-baseline gap-2 px-2.5 pt-1.5">
            <span className="font-mono text-[15px] font-bold leading-none tabular-nums text-ink" data-life="clock" dir="ltr">
              {hud.clock}
            </span>
            <span className="font-body text-[10px] leading-none text-muted">
              <bdi data-life="date">{hud.date}</bdi>
            </span>
          </span>
          {/* `data-life="place"` stays on the place ALONE: the playthrough harness reads it
              by name, and a date in front of the room made every room "lost". */}
          <span className="block px-2.5 pb-1.5 pt-1 font-sign text-[13px] leading-none text-ink">
            <bdi data-life="place">{hud.place}</bdi>
          </span>
        </Plate>
      </div>

      <div className="flex max-w-[58%] flex-col items-end gap-1.5">
        {hud.showMoney && (
          <Plate className="mt-1">
            <span className="flex items-center gap-1.5 px-2 py-1">
              <Emblem resource="money" />
              <span className="font-sign text-[10px] leading-none text-muted">{t('life.money')}</span>
              <Num className="font-mono text-[13px] font-bold leading-none text-ink" data-life="money">{formatMoney(hud.agorot)}</Num>
            </span>
          </Plate>
        )}
        {hud.showEnergy && (
          <Plate>
            <span className="flex items-center gap-1.5 px-2 py-1">
              <Emblem resource="energy" />
              <span className="font-sign text-[10px] leading-none text-muted">{t('life.energy')}</span>
              {/* הכוח נקרא כ**מילה**, לא כאחוז: `GaugesSheet` הוא המקום שעונה "כמה"
                  (כלל 63א), והזכוכית היא המקום שעונה "האם כדאי לי עוד סיבוב". */}
              <span className="font-mono text-[13px] font-bold leading-none text-ink" data-life="energy">
                <bdi>{energyWordHe(hud.energy)}</bdi>
              </span>
            </span>
          </Plate>
        )}
      </div>

      {/* The cloth hangs UNDER the chip row, on the reading side, never across the
          buttons: a long objective used to lie over "מפה" on a 390px phone. */}
      {hud.objective && (
        <div className="absolute inset-x-2.5 flex justify-end" style={{ top: 'calc(112px + env(safe-area-inset-top))' }}>
          <Cloth className="max-w-[78%]" data-life="objective-cloth">
            <span data-life="objective">
              <bdi>{hud.objective}</bdi>
            </span>
          </Cloth>
        </div>
      )}

      {/*
        ממתין — the strip that says nothing is broken.

        It sits at the FOOT of the glass, above the thumb deck and clear of every button,
        because it is not an instruction — it is the game telling you, for as long as it
        is true, that standing still is the correct move and naming what is coming. A
        pulsing dot rather than a spinner: a spinner says "loading", and nothing is
        loading; a slow pulse says "running". Maor asked for this on 5.9.2026 in one
        sentence, and it is the difference between a quiet minute and a bug report.
      */}
      {hud.waitingHe && (
        <div
          className="absolute inset-x-2.5 flex justify-center"
          style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}
          data-life="waiting"
        >
          <Cloth className="max-w-[92%]">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 bg-red motion-safe:animate-[waiting-pulse_1800ms_ease-in-out_infinite]"
              />
              <bdi className="text-[12px] leading-snug">{hud.waitingHe}</bdi>
            </span>
          </Cloth>
        </div>
      )}
    </div>
  )
}
