'use client'

import { KitShirt } from '@/components/kit/KitShirt'
import { OUTFIELD_KIT, PlayerFigure } from '@/components/press/PlayerFigure'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import type { LockerName } from '@/lib/game/lineup-sheet'
import type { KitSpec } from '@/lib/kit/spec'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { t } from '@/lib/i18n'

/**
 * חדר ההלבשה — the bank of names, as a wall of lockers.
 *
 * The eleven are not picked off a list, they are taken off a peg: the room is already
 * dressed when you walk in and every shirt in it belongs to somebody who could plausibly
 * have played.
 *
 * **Every locker hangs the SAME shirt — the season's real kit, with no number**
 * (players.md §2, Gate 3 V3). One kit for everybody is the only honest version: a number
 * would be a clue (numbers are season-bound in `shirt-numbers.json`), and a different cut
 * per man would be a claim about who wore what that night. Where the archive holds no kit
 * for the season, the rack says so and hangs the drawn figure in the club's colours.
 *
 * **A locker says a name and nothing else.** The prototype drew a role tag from its own
 * truth field; the grade is by LINE, so a locker that named a man's line would hand over
 * his grade — and a wall of them the whole sheet.
 *
 * A locker whose man is already on the pitch is dimmed and disabled rather than removed:
 * a rack that reflows every time you place somebody is a rack you have to re-read.
 */
export function LockerRack({
  bank,
  used,
  selected,
  onSelect,
  kit,
  kitSeason,
  look = null,
}: {
  bank: readonly LockerName[]
  /** ids already standing on the pitch */
  used: ReadonlySet<string>
  selected: string | null
  onSelect: (id: string) => void
  /** the season's kit, the same on every peg — null where the archive has none */
  kit: KitSpec | null
  kitSeason: string | null
  /** the night's REAL shirt (delta 88) — the photograph wins over the drawing */
  look?: ShirtLook | null
}) {
  return (
    <section>
      <h2 className="font-body text-[11px] font-extrabold tracking-widest text-muted">{t('lineup.rack.title')}</h2>
      <p className="mt-1 font-body text-step--1 leading-snug text-muted">{t('lineup.rack.note')}</p>
      <p className="mt-1 font-body text-[11px] leading-snug text-muted">
        {(look?.seasonLabel || (kit && kitSeason)) ? t('lineup.rack.kit', { season: look?.seasonLabel || kitSeason || '' }) : t('lineup.rack.noKit')}
      </p>

      {/*
        The rack SCROLLS inside its own box rather than growing the page, and
        `overscroll-contain` keeps the page still while a thumb is in it.
      */}
      <ul className="mt-2 grid max-h-[62vh] grid-cols-3 gap-2 overflow-y-auto overscroll-contain sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-3">
        {bank.map((locker) => {
          const taken = used.has(locker.id)
          const isSelected = selected === locker.id
          return (
            <li key={locker.id}>
              <button
                type="button"
                disabled={taken}
                onClick={() => onSelect(locker.id)}
                aria-pressed={isSelected}
                aria-label={t('lineup.locker.aria', { name: locker.nameHe })}
                data-locker={locker.id}
                className={`flex min-h-tap w-full flex-col items-center gap-1 border-hair bg-press-paper px-1.5 pb-2 pt-1 transition-transform duration-press ease-stamp active:scale-[.96] disabled:opacity-30 motion-reduce:transition-none ${
                  isSelected ? 'border-plate border-press-red' : 'border-press-ink/40'
                }`}
              >
                {/* the rail the shirts hang from */}
                <span aria-hidden="true" className="h-[3px] w-3/4 bg-press-ink/30" />
                {look ? (
                  <PlayerShirt look={look} title={locker.nameHe} className={`h-12 w-12 ${taken ? 'opacity-40' : ''}`} />
                ) : kit ? (
                  <KitShirt spec={kit} density="mini" className={`h-12 w-10 ${taken ? 'opacity-40' : ''}`} />
                ) : (
                  <PlayerFigure kit={OUTFIELD_KIT} ghost={taken} number={null} size={40} title={locker.nameHe} />
                )}
                <span className="w-full truncate text-center font-body text-[11px] leading-tight text-press-ink">
                  {locker.nameHe}
                </span>
                {taken && (
                  <span className="font-body text-[9px] tracking-widest text-press-ink/60">{t('lineup.rack.taken')}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
