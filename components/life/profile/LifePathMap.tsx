'use client'

import { useState } from 'react'

import { t } from '@/lib/i18n'
import type { LifePathReading, PathBranch, TrackVisualState } from '@/lib/life/personal'

import { DrawIn, MotionLine } from './Motion'
import css from './personal.module.css'

/**
 * הדרך שלי — the paths of a life as lines off one trunk, not a list of chips (spec §8–10).
 *
 * The trunk is the supporter he has been since the shoulders of 1983; every title,
 * every life track and every pull of the Red Heart strong enough to be a path of its own
 * leaves it as a branch. The drawing is SVG with `vector-effect: non-scaling-stroke`, so
 * the rows can stretch to any phone and a line stays a line; the words are HTML, so they
 * stay type and stay tappable.
 *
 * RTL is drawn, not mirrored: the trunk stands on the right (x = 92 in a 0–100 box) and a
 * path runs leftwards, the way a Hebrew reader's eye travels. Stops are squares — the house
 * has no round corners — filled where he has been, hollow and unnamed where he has not.
 *
 * Tapping a path lifts it and quiets the rest; the sentence of how it began is set under
 * the map (no modal, §10). The lines draw once per opening (§9): they mount with the page.
 */

const TRUNK_X = 92

function stroke(state: TrackVisualState): { color: string; width: number; dim: boolean } {
  switch (state) {
    case 'strong':
      return { color: 'rgb(var(--red))', width: 3, dim: false }
    case 'active':
      return { color: 'rgb(var(--sheet))', width: 2, dim: false }
    case 'emerging':
      return { color: 'rgb(var(--concrete))', width: 1.5, dim: false }
    case 'dormant':
      return { color: 'rgb(var(--concrete))', width: 1.5, dim: true }
    default:
      return { color: 'rgb(var(--concrete) / .5)', width: 1, dim: true }
  }
}

function Row({ branch, index, last, picked, anyPicked, onPick }: { branch: PathBranch; index: number; last: boolean; picked: boolean; anyPicked: boolean; onPick: () => void }) {
  const look = stroke(branch.state)
  const reach = branch.state === 'emerging' ? 52 : 10
  const delay = 160 + index * 140
  const stops = branch.state === 'emerging' ? 0 : branch.stops.length
  return (
    <li className="relative min-h-[52px] flex-1" style={{ maxHeight: 104 }}>
      {/* drawn once, from the trunk leftwards — the way the eye reads the row (§9) */}
      <DrawIn mode="rtl" delay={delay} className="pointer-events-none absolute inset-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          {/* the trunk, continuing down past this branch unless it is the last */}
          <MotionLine d={`M${TRUNK_X} 0 V${last ? 40 : 100}`} width={2} style={{ stroke: 'rgb(var(--sheet) / .55)' }} />
          <g style={{ opacity: anyPicked && !picked ? 0.25 : look.dim ? 0.45 : 1, transition: 'opacity 280ms ease' }}>
            <MotionLine
              d={`M${TRUNK_X} 36 C${TRUNK_X} 62, ${TRUNK_X - 6} 72, ${TRUNK_X - 14} 72 L${reach} 72`}
              width={picked ? look.width + 1.5 : look.width}
              emerging={branch.state === 'emerging'}
              style={{ stroke: look.color, transition: 'stroke-width 280ms ease' }}
            />
          </g>
        </svg>
      </DrawIn>
      {/* the stops — squares on the line, after it has been drawn */}
      {stops > 0 ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true" style={{ opacity: anyPicked && !picked ? 0.25 : look.dim ? 0.45 : 1 }}>
          {branch.stops.map((stop, i) => {
            const at = 100 - TRUNK_X + 22 + ((100 - 30 - (100 - TRUNK_X + 22)) * i) / Math.max(1, stops - 1)
            return (
              <span
                key={i}
                className={`${css.stop} absolute block h-[10px] w-[10px] ${
                  stop.reached ? (branch.state === 'strong' ? 'bg-red' : 'bg-sheet') : 'border-hair border-concrete/70 bg-ink'
                }`}
                style={{ insetInlineStart: `calc(${at}% - 5px)`, top: 'calc(72% - 5px)', animationDelay: `${delay + 520 + i * 90}ms` }}
              />
            )
          })}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onPick}
        aria-pressed={picked}
        data-life="path-branch"
        data-state={branch.state}
        className="relative flex h-full min-h-tap w-full items-start pe-2 text-start"
        style={{ paddingInlineStart: `${100 - TRUNK_X + 18}%` }}
      >
        <span className="block pt-[5px]" style={{ opacity: anyPicked && !picked ? 0.4 : 1, transition: 'opacity 280ms ease' }}>
          <span className={`block font-display text-[16px] leading-none md:text-[18px] ${branch.state === 'strong' ? 'text-red' : branch.state === 'active' ? 'text-sheet' : 'text-concrete'}`}>
            <bdi>{branch.titleHe}</bdi>
          </span>
          <span className="mt-1 block font-mono tabular-nums text-[10px] leading-none text-concrete">
            <bdi>{branch.stageHe}</bdi>
          </span>
        </span>
      </button>
    </li>
  )
}

export function LifePathMap({ reading, fresh = [] }: { reading: LifePathReading; fresh?: readonly string[] }) {
  // a path that is new since the last time he looked opens with its own story (§37)
  const [picked, setPicked] = useState<string | null>(fresh[0] ?? null)
  const chosen = reading.branches.find((row) => row.id === picked) ?? null
  const shown = reading.branches.slice(0, 7)

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6" data-life="me-path">
      {/* the trunk's own plate */}
      <div className="flex shrink-0 items-center gap-2" style={{ paddingInlineStart: `calc(${100 - TRUNK_X}% - 10px)` }}>
        <span className="border-rule border-sheet bg-sheet px-2 py-1 font-sign text-[13px] leading-none text-ink">
          <bdi>{reading.trunkHe}</bdi>
        </span>
        {reading.trunkNoteHe ? (
          <span className="font-mono tabular-nums text-[10px] leading-none text-concrete">
            <bdi>{reading.trunkNoteHe}</bdi>
          </span>
        ) : null}
      </div>

      {shown.length === 0 ? (
        <div className="relative min-h-0 flex-1">
          <DrawIn mode="down" className="pointer-events-none absolute inset-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
              <MotionLine d={`M${TRUNK_X} 0 V70`} width={2} style={{ stroke: 'rgb(var(--sheet) / .55)' }} />
            </svg>
          </DrawIn>
          <p className="relative pt-8 font-body text-[13px] leading-relaxed text-concrete" style={{ paddingInlineStart: `${100 - TRUNK_X + 12}%` }}>
            <bdi>{t('life.profile.tracksNone')}</bdi>
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col" aria-label={t('life90h.me.path')}>
          {shown.map((branch, i) => (
            <Row
              key={branch.id}
              branch={branch}
              index={i}
              last={i === shown.length - 1}
              picked={picked === branch.id}
              anyPicked={picked !== null}
              onPick={() => setPicked(picked === branch.id ? null : branch.id)}
            />
          ))}
        </ul>
      )}

      {/* the sentence of the path you touched (§10) */}
      <div className="min-h-[92px] shrink-0 border-t-hair border-concrete/25 pt-2.5" aria-live="polite" data-life="path-detail">
        {chosen ? (
          <div key={chosen.id} className={css.drawer}>
            {fresh.includes(chosen.id) ? (
              <p className="mb-1 font-mono tabular-nums text-[10px] uppercase tracking-[0.14em] text-red">
                <bdi>{t('life90h.path.changedLine')}</bdi>
              </p>
            ) : null}
            <p className="font-display text-[17px] leading-none text-sheet">
              <bdi>{chosen.titleHe}</bdi>
            </p>
            {chosen.milestonesHe.length > 0 ? (
              <p className="mt-1.5 font-mono tabular-nums text-[10px] leading-none text-red">
                <bdi>{chosen.milestonesHe.join(' ← ')}</bdi>
              </p>
            ) : null}
            <p className="mt-1.5 font-body text-[13px] leading-snug text-concrete">
              <bdi>{chosen.storyHe}</bdi>
            </p>
            {chosen.peopleHe.length > 0 ? (
              <p className="mt-1 font-body text-[12px] leading-snug text-sheet/80">
                <bdi>{t('life90h.path.with', { names: chosen.peopleHe.join(', ') })}</bdi>
              </p>
            ) : null}
          </div>
        ) : shown.length > 0 ? (
          <p className="font-body text-[12px] leading-relaxed text-concrete/80">
            <bdi>{t('life90h.path.hint')}</bdi>
          </p>
        ) : null}
      </div>
    </div>
  )
}
