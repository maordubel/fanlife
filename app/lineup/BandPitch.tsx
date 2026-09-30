'use client'

import { KitShirt } from '@/components/kit/KitShirt'
import { NamePlate, OUTFIELD_KIT, PlayerFigure } from '@/components/press/PlayerFigure'
import { PressPitch } from '@/components/press/PressPitch'
import { NEUTRAL_SHIRT_SPEC } from '@/components/roster/RosterSheet'
import { ShirtToken } from '@/components/stage/ShirtToken'
import { PlayerShirt } from '@/components/stage/PlayerShirt'
import { dropZone, useDragSource } from '@/components/stage/useDrag'
import { Num } from '@/components/ui/Num'
import { splitName, compactName } from '@/lib/game/roster-search'
import { LINES, type Line, type PlacementStatus } from '@/lib/game/lineup-sheet'
import type { KitSpec } from '@/lib/kit/spec'
import type { ShirtLook } from '@/lib/kit/playerShirt'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * המגרש בארבעה קווים — the board gate 3 places on, and the one its reveal is read on.
 *
 * Four bands, attack at the far end and the keeper at the near one, and ANY number of
 * men in each: no source here states a formation (`formationStated: false`), so no
 * slot on this pitch implies one. A band is a button ("put him here"); a man standing
 * in it is a separate button beside it, never inside it.
 *
 * **Nothing red touches the grass.** A selected man is marked by an INK outline and his
 * name plate turns red on cream (`NamePlate tone="red"`); the reveal marks are ink-edged
 * plates (docs/16 — red antialiased against green lands in the yellow band).
 */

export type BandMan = {
  playerId: string
  nameHe: string
  line: Line
  order: number
  /** the reveal's verdict on him, once it has been shown */
  mark?: PlacementStatus | null
  locked?: boolean
  /** a starter nobody placed — drawn dashed, after the sheet is in */
  ghost?: boolean
}

const BAND: Record<Line, { top: number; height: number }> = {
  F: { top: 2.5, height: 23.5 },
  M: { top: 27, height: 23.5 },
  D: { top: 51.5, height: 23.5 },
  GK: { top: 76, height: 21.5 },
}

export const LINE_LABEL: Record<Line, MessageKey> = {
  GK: 'lineup.line.GK',
  D: 'lineup.line.D',
  M: 'lineup.line.M',
  F: 'lineup.line.F',
}

const MARK: Record<PlacementStatus, string> = { exact: '✓', wrong_line: '↔', not_in_xi: '✗' }

/** Ink-edged reveal marks — see the module note about red on grass. */
const MARK_STYLE: Record<PlacementStatus, string> = {
  exact: 'border-press-ink bg-press-red text-press-line',
  wrong_line: 'border-press-ink bg-press-paper text-press-red',
  not_in_xi: 'border-press-ink bg-press-paper text-press-ink line-through',
}

export function BandPitch({
  men,
  kit,
  look = null,
  keeperLook = null,
  active = null,
  armed = false,
  armedLine = null,
  onBand,
  onMan,
}: {
  men: readonly BandMan[]
  kit: KitSpec | null
  /** the match season's REAL shirt (delta 88) — the photograph wins over `kit` */
  look?: ShirtLook | null
  keeperLook?: ShirtLook | null
  /** the selected man, if any */
  active?: string | null
  /** a locker is held: every band is a target */
  armed?: boolean
  /** a band was tapped first: the next locker lands here */
  armedLine?: Line | null
  onBand?: (line: Line) => void
  onMan?: (playerId: string) => void
}) {
  return (
    <PressPitch className="touch-manipulation">
      {[...LINES].reverse().map((line) => {
        const band = BAND[line]
        const here = men
          .filter((man) => man.line === line)
          .sort((a, b) => Number(a.ghost ?? false) - Number(b.ghost ?? false) || a.order - b.order)
        const placed = here.filter((man) => !man.ghost).length
        const target = Boolean(onBand) && (armed || armedLine === line)
        const tight = here.length > 5
        return (
          <div
            key={line}
            className="absolute inset-x-[3%]"
            style={{ top: `${band.top}%`, height: `${band.height}%` }}
          >
            {onBand && (
              <button
                type="button"
                onClick={() => onBand(line)}
                aria-label={t('lineup.zone.placeHere', { line: t(LINE_LABEL[line]) })}
                aria-pressed={armedLine === line}
                data-band={line}
                className={`absolute inset-0 border-2 transition-colors duration-press motion-reduce:transition-none ${
                  target ? 'border-dashed border-press-ink bg-press-paper/20' : 'border-transparent'
                }`}
              />
            )}
            <span className="pointer-events-none absolute start-1 top-1 z-[1] flex items-center gap-1 bg-press-ink px-1.5 py-[1px] font-body text-[10px] font-extrabold leading-tight text-press-paper">
              {t(LINE_LABEL[line])}
              <span className="font-mono text-[10px] tabular-nums">
                <Num>{String(placed)}</Num>
              </span>
            </span>
            <div className="pointer-events-none relative z-[2] flex h-full items-center justify-center gap-1 px-1 pt-3">
              {here.map((man) => (
                <Man
                  key={`${man.ghost ? 'ghost-' : ''}${man.playerId}`}
                  man={man}
                  kit={kit}
                  look={line === 'GK' ? keeperLook ?? look : look}
                  tight={tight}
                  active={active === man.playerId}
                  onTap={onMan}
                />
              ))}
            </div>
          </div>
        )
      })}
    </PressPitch>
  )
}

function Man({
  man,
  kit,
  look,
  tight,
  active,
  onTap,
}: {
  man: BandMan
  kit: KitSpec | null
  look: ShirtLook | null
  tight: boolean
  active: boolean
  onTap?: (playerId: string) => void
}) {
  const family = compactName(man.nameHe)
  const body = (
    <span className={`flex flex-col items-center gap-0.5 ${man.ghost ? '' : 'animate-slam-solid'}`}>
      <span
        className={`relative grid place-items-center border-hair ${
          man.ghost ? 'border-dashed border-press-ink bg-press-paper' : 'border-press-ink bg-press-paper'
        } ${tight ? 'h-8 w-7' : 'h-10 w-9'} ${active ? 'outline outline-[3px] outline-press-ink' : ''}`}
      >
        {man.ghost ? (
          <span aria-hidden="true" className="font-poster text-[14px] leading-none text-press-ink/70">
            ?
          </span>
        ) : look ? (
          <PlayerShirt look={look} eager className={tight ? 'h-7 w-7' : 'h-9 w-9'} />
        ) : kit ? (
          <KitShirt spec={kit} density="mini" className={tight ? 'h-7 w-6' : 'h-9 w-8'} />
        ) : (
          <PlayerFigure kit={OUTFIELD_KIT} number={null} size={tight ? 30 : 36} title={man.nameHe} />
        )}
        {man.locked && (
          <span className="absolute -top-2 start-1/2 -translate-x-1/2 border-hair border-press-ink bg-press-ink px-0.5 font-mono text-[8px] leading-tight text-press-paper rtl:translate-x-1/2">
            LOCK
          </span>
        )}
        {man.mark && (
          <span
            aria-hidden="true"
            className={`absolute -bottom-1.5 -end-1.5 grid h-4 w-4 place-items-center border-rule font-sign text-[9px] leading-none ${MARK_STYLE[man.mark]}`}
          >
            {MARK[man.mark]}
          </span>
        )}
      </span>
      <span className="max-w-[64px]">
        <NamePlate name={family} tone={active ? 'red' : 'ink'} sub={man.ghost ? t('lineup.zone.ghost') : null} />
      </span>
    </span>
  )
  const width = tight ? 'w-[13%] max-w-[52px]' : 'w-[19%] max-w-[72px]'
  if (!onTap || man.ghost) {
    return (
      <span className={`flex min-w-0 justify-center ${width}`} aria-label={man.ghost ? t('lineup.zone.ghostAria', { name: man.nameHe }) : undefined}>
        {body}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onTap(man.playerId)}
      aria-pressed={active}
      aria-label={t('lineup.zone.manAria', { name: man.nameHe })}
      data-man={man.playerId}
      className={`pointer-events-auto flex min-h-tap min-w-0 justify-center transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none ${width}`}
    >
      {body}
    </button>
  )
}

/**
 * המגרש בנייד — gate 3's phone pitch (delta 87): the same four bands, but a man on the
 * grass is a `ShirtToken` — no tile, no border — and every band is a drop zone
 * (`data-drop="band-<line>"`) so a locker or a neighbour can be DRAGGED onto it, exactly
 * like gate 1's pitch. One visual family for every "pitch" gate (Maor, 23.9.2026).
 */
export function BandPitchStage({
  men,
  kit,
  look = null,
  keeperLook = null,
  target = null,
  active = null,
  onBand,
  onMan,
  onDrop,
}: {
  men: readonly BandMan[]
  kit: KitSpec | null
  /** the match season's REAL shirt (delta 88, `lib/kit/playerShirt.ts`) — wins over `kit` */
  look?: ShirtLook | null
  keeperLook?: ShirtLook | null
  /** the band the picking rail is aimed at — outlined, with a dashed shirt where he will stand */
  target?: Line | null
  active?: string | null
  onBand: (line: Line) => void
  onMan: (playerId: string) => void
  /** a locker (`locker:<id>`) or a man (`man:<id>`) dropped straight on a band */
  onDrop: (line: Line, payload: string) => void
}) {
  return (
    <PressPitch fill className="touch-manipulation">
      {[...LINES].reverse().map((line) => {
        const band = BAND[line]
        const here = men.filter((man) => man.line === line).sort((a, b) => a.order - b.order)
        const aimed = target === line
        return (
          <div
            key={line}
            {...dropZone(`band-${line}`)}
            className="absolute inset-x-[3%]"
            style={{ top: `${band.top}%`, height: `${band.height}%` }}
          >
            <button
              type="button"
              onClick={() => onBand(line)}
              aria-label={t('lineup.zone.placeHere', { line: t(LINE_LABEL[line]) })}
              aria-pressed={aimed}
              className={`absolute inset-0 border-2 ${aimed ? 'border-dashed border-press-paper' : 'border-transparent'}`}
            />
            <span
              className={`pointer-events-none absolute start-1 top-1 z-[1] flex items-center gap-1 px-1.5 py-[1px] font-body text-[10px] font-extrabold leading-tight ${
                aimed ? 'bg-press-paper text-press-ink' : 'bg-press-ink text-press-paper'
              }`}
            >
              {t(LINE_LABEL[line])}
              <span className="font-mono text-[10px] tabular-nums">
                <Num>{String(here.length)}</Num>
              </span>
            </span>
            <div className="pointer-events-none relative z-[2] flex h-full items-center justify-center gap-1 px-1 pt-3 [container-type:inline-size]">
              {here.map((man) => (
                <ManToken
                  key={man.playerId}
                  man={man}
                  kit={kit}
                  look={line === 'GK' ? keeperLook ?? look : look}
                  active={active === man.playerId}
                  onTap={onMan}
                  onDrop={onDrop}
                />
              ))}
              {aimed && (
                // where the next man will stand — a dashed shirt, pulsing by transform only
                <svg
                  viewBox="0 0 60 72"
                  aria-hidden="true"
                  className="block w-[9cqw] max-w-[44px] shrink-0 animate-fx-wobble motion-reduce:animate-none"
                  fill="none"
                  stroke="rgb(var(--p-paper))"
                  strokeWidth="2.6"
                  strokeDasharray="4 3"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 L6 16 L12 26 L18 22 L18 66 L42 66 L42 22 L48 26 L54 16 L40 6 Q30 13 20 6 Z" />
                </svg>
              )}
            </div>
          </div>
        )
      })}
    </PressPitch>
  )
}

function ManToken({
  man,
  kit,
  look,
  active,
  onTap,
  onDrop,
}: {
  man: BandMan
  kit: KitSpec | null
  look: ShirtLook | null
  active: boolean
  onTap: (playerId: string) => void
  onDrop: (line: Line, payload: string) => void
}) {
  const family = compactName(man.nameHe)
  const drag = useDragSource({
    payload: `man:${man.playerId}`,
    onDrop: (zone) => {
      const line = zone.replace(/^band-/, '')
      if (line !== man.line) onDrop(line as Line, `man:${man.playerId}`)
    },
  })
  return (
    <button
      type="button"
      {...drag}
      onClick={() => onTap(man.playerId)}
      aria-pressed={active}
      aria-label={t('lineup.zone.manAria', { name: man.nameHe })}
      className="pointer-events-auto min-h-tap min-w-0 shrink-0 transition-transform duration-press ease-stamp active:scale-[.94] motion-reduce:transition-none"
    >
      <ShirtToken
        look={look}
        spec={kit ?? NEUTRAL_SHIRT_SPEC}
        name={family}
        sub={man.locked ? t('lineup.stage.locked') : undefined}
        live={active}
        size="sm"
      />
    </button>
  )
}
