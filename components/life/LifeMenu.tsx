'use client'

import { SheetHead } from '@/components/life/Plate'
import { StayedWithMe } from '@/components/life/StayedWithMe'
import { useDialog } from '@/components/ui/useDialog'
import { t } from '@/lib/i18n'

/**
 * התפריט — one sheet, opened by ☰, and the world stops underneath it.
 *
 * Until this pass the game's two housekeeping controls — autosave notice and "start
 * again" — lived on a strip UNDER the glass. When the glass became the whole screen
 * (`100dvh`, full-bleed) that strip was pushed below the fold of an `overflow-hidden`
 * box: still in the DOM, reachable by nobody. A control you cannot reach is not a
 * control. So they moved in here, with the two things a phone player actually asks for
 * in the first minute — "where is my profile" and "how do I hide the stick".
 *
 * Restart-day cuts the log back to the last `chapter.entered` (`LifeEngine.restartDay`)
 * and reloads. Restart-mission is in the brief (§51) and is NOT here: the 1986 day has no
 * mission markers in its log yet, and a menu entry that lies about what it can do is
 * worse than one that is missing.
 */
export function LifeMenu({
  touch,
  sound,
  persisted,
  debug,
  onClose,
  onProfile,
  onMe,
  onSound,
  onDebug,
  onReset,
  confirmReset,
  onRestartDay,
  confirmDay,
  onMap,
  onAlbum,
  hasAlbum,
  onRoutes,
  hasRoutes,
}: {
  touch: boolean
  sound: boolean
  persisted: boolean
  /** the developer panel is offered only outside production — a build fact, not a flag */
  debug: boolean
  onClose: () => void
  onProfile: () => void
  /** אני — the other half of the dossier, its own row (delta 90-H, spec §66) */
  onMe?: () => void
  onSound: (on: boolean) => void
  onDebug: () => void
  onReset: () => void
  confirmReset: boolean
  /** cut the log back to the top of the chapter — asks first, like reset */
  onRestartDay: () => void
  confirmDay: boolean
  onMap: () => void
  /**
   * אלבום סופרגול — offered only once there is something in it.
   *
   * A menu row for an object the player does not own is a row that teaches them the menu
   * lies. The album appears the first time a sticker is stuck in and never goes away
   * again, because `album:` outlives the year.
   */
  onAlbum: () => void
  hasAlbum: boolean
  /**
   * המסלולים — the deliberate door to a card the world otherwise opens by itself.
   *
   * Same rule as the album above it: the row exists when there is something behind it.
   * Every route stage is eighteen or over, so on a Saturday in 1986 this would open a
   * card that says nothing but "not yet" — `routesWorthShowing` is what decides, and it
   * is decided in the engine rather than here.
   */
  onRoutes: () => void
  hasRoutes: boolean
}) {
  const row =
    'flex min-h-tap w-full items-center justify-between gap-3 border-b-hair border-ink/30 px-3 text-start font-sign text-[15px] text-ink transition-colors duration-press active:bg-red active:text-sheet motion-reduce:transition-none'
  const dialogRef = useDialog<HTMLDivElement>(onClose)
  return (
    <div
      className="absolute inset-0 z-40 flex items-end justify-center bg-ink/70 p-2.5 pb-[max(10px,env(safe-area-inset-bottom))] sm:items-center"
      data-life="menu"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-[60] max-h-full w-full max-w-[420px] overflow-y-auto overscroll-contain border-rule border-ink bg-sheet outline-none"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label={t('life.menu.title')}
      >
        <SheetHead title={t('life.menu.title')} onClose={onClose} closeLabel={t('life.menu.continue')} />

        <button type="button" className={row} onClick={onClose} data-life="menu-continue">
          <span>{t('life.menu.continue')}</span>
        </button>
        {onMe ? (
          <button type="button" className={row} onClick={onMe} data-life="menu-me">
            <span>{t('life90h.menu.me')}</span>
          </button>
        ) : null}
        <button type="button" className={row} onClick={onProfile} data-life="menu-profile">
          <span>{t('life90h.menu.bag')}</span>
        </button>
        <button type="button" className={row} onClick={onMap} data-life="menu-map">
          <span>{t('life.map')}</span>
        </button>
        {hasAlbum && (
          <button type="button" className={row} onClick={onAlbum} data-life="menu-album">
            <span>{t('life.album.menu')}</span>
          </button>
        )}
        {hasRoutes && (
          <button type="button" className={row} onClick={onRoutes} data-life="menu-routes">
            <span>{t('life.route.menu')}</span>
          </button>
        )}
        {/* ONE RED WORLD §10 — only when a man of his XI belongs to a finished chapter */}
        <StayedWithMe rowClass={row} />
        <button type="button" className={row} onClick={() => onSound(!sound)} data-life="menu-sound">
          <span>{t('life.menu.sound')}</span>
          <span className="font-mono text-[11px] tabular-nums" dir="ltr">
            {sound ? t('life.menu.soundOn') : t('life.menu.soundOff')}
          </span>
        </button>
        {debug && (
          <button type="button" className={`${row} text-red`} onClick={onDebug}>
            <span>{t('life.debug')}</span>
          </button>
        )}
        <button
          type="button"
          className={`${row} ${confirmDay ? 'bg-red text-sheet' : ''}`}
          onClick={onRestartDay}
          data-life="menu-day"
        >
          <span>{confirmDay ? t('life.menu.dayConfirm') : t('life.menu.day')}</span>
        </button>
        <button
          type="button"
          className={`${row} ${confirmReset ? 'bg-red text-sheet' : ''}`}
          onClick={onReset}
          data-life="menu-reset"
        >
          <span>{confirmReset ? t('life.reset.confirm') : t('life.reset')}</span>
        </button>

        <p className="px-3 py-2 font-body text-[10px] leading-snug text-muted">
          {persisted ? t('life.autosave') : t('life.storageOff')}
        </p>
      </div>
    </div>
  )
}
