'use client'

import { t } from '@/lib/i18n'
import type { IdentitySummary } from '@/lib/life/personal'
import type { Band, RedHeartReading } from '@/lib/life/profile'
import { artUrl } from '@/lib/life/runtime/art'

import { RevealText } from './Motion'
import css from './personal.module.css'

const HEART_TYPE: Record<Band, string> = {
  0: 'hidden',
  1: 'text-[12px] text-concrete',
  2: 'text-[16px] text-sheet',
  3: 'text-[21px] text-red',
}

/**
 * פוגי, בן 24, 2002 — and then who he has become (spec §7).
 *
 * The order of the reveal is the order a person introduces himself in: the name, then the
 * age and the day, then the label the stands gave him, then the sentence. 0 · 90 · 180 ·
 * 280 ms, CSS only, from the right edge leftwards (RTL — `.reveal` in the module).
 *
 * The name is printed the house way: a vermilion plate set 3px off the sheet-coloured one
 * (the two-plate misregistration of every sign on the site), not a drop shadow.
 *
 * `was` is the sentence he was the last time this sheet was opened, when a MILESTONE has
 * changed since (§38): it is struck through once, fades, and the new one is read in under
 * it. An ordinary update never does this — the caller only passes `was` when the key of
 * the identity changed.
 */
export function IdentityHero({
  nameHe,
  ageHe,
  dateHe,
  identity,
  was,
  portrait,
  heart,
  compact,
  lines = [],
}: {
  nameHe: string
  ageHe: string
  dateHe: string
  identity: IdentitySummary
  was: string | null
  portrait: string | null
  heart: RedHeartReading[]
  compact: boolean
  /** delta 91 — what the world makes of him today (`buildSceneContext`): human sentences, never a figure */
  lines?: readonly string[]
}) {
  return (
    <div className="flex min-w-0 flex-col" data-life="me-hero">
      <div className="flex items-end gap-3">
        {portrait ? (
          <RevealText delay={0} className="shrink-0">
            <span className="relative block h-[64px] w-[64px] border-rule border-sheet bg-sheet/10 md:h-[88px] md:w-[88px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artUrl(portrait)} alt="" aria-hidden="true" className="h-full w-full object-cover" />
            </span>
          </RevealText>
        ) : null}
        <div className="min-w-0">
          <RevealText delay={0} className="relative">
            <span aria-hidden="true" className="absolute inset-0 translate-x-[3px] translate-y-[2px] font-display text-[42px] leading-none text-red md:text-[60px]">
              <bdi>{nameHe}</bdi>
            </span>
            <span className="relative font-display text-[42px] leading-none text-sheet md:text-[60px]">
              <bdi>{nameHe}</bdi>
            </span>
          </RevealText>
          <RevealText delay={90} as="p" className="mt-2 font-mono text-[11px] leading-none tabular-nums text-concrete">
            <bdi>{ageHe}</bdi>
            <span className="px-1.5 text-red">·</span>
            <bdi>{dateHe}</bdi>
          </RevealText>
        </div>
      </div>

      {identity.eyebrow ? (
        <RevealText delay={180} as="p" className="mt-4 font-mono tabular-nums text-[10px] uppercase leading-none tracking-[0.16em] text-red">
          <bdi>{identity.eyebrow}</bdi>
        </RevealText>
      ) : null}

      {was ? (
        <p className={`mt-2 font-display text-[15px] leading-snug text-concrete ${css.fadeAway}`} data-life="me-was">
          <span className={css.struck}>
            <bdi>{was}</bdi>
          </span>
        </p>
      ) : null}

      <RevealText delay={was ? 900 : 280} as="p" className={`${identity.eyebrow || was ? 'mt-2' : 'mt-4'} font-display text-[21px] leading-[1.2] text-sheet md:text-[28px]`}>
        <bdi>{identity.title}</bdi>
      </RevealText>
      <RevealText delay={was ? 1000 : 380} as="p" className="mt-1.5 font-body text-[14px] leading-snug text-concrete md:text-[16px]">
        <bdi>{identity.line}</bdi>
      </RevealText>

      {lines.length > 0 ? (
        <RevealText delay={was ? 1100 : 460} as="div" className="mt-3">
          <ul className="flex flex-col gap-1" data-life="me-context">
            {lines.map((line) => (
              <li key={line} className="font-body text-[13px] leading-snug text-sheet/90 md:text-[14px]">
                <span aria-hidden="true" className="me-1.5 inline-block h-[6px] w-[6px] bg-red align-middle" />
                <bdi>{line}</bdi>
              </li>
            ))}
          </ul>
        </RevealText>
      ) : null}

      {/* הלב האדום — the pulls, set as type: the bigger the word, the harder it pulls */}
      {heart.length > 0 && !compact ? (
        <RevealText delay={520} as="div" className="mt-4 border-t-hair border-concrete/25 pt-2.5 [@media(max-height:700px)]:hidden md:[@media(max-height:700px)]:block">
          <p className="font-mono tabular-nums text-[9px] uppercase tracking-[0.16em] text-concrete/80">
            <bdi>{t('life.profile.heart')}</bdi>
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {heart.map((entry) => (
              <span key={entry.key} className={`font-display leading-none ${HEART_TYPE[entry.band]}`}>
                <bdi>{entry.labelHe}</bdi>
              </span>
            ))}
          </p>
        </RevealText>
      ) : null}
    </div>
  )
}
