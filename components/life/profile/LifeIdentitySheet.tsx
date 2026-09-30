'use client'

import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import {
  identitySummaryReading,
  lifeTrackVisualReading,
  personalStoryReading,
  relationshipVisualReading,
  selfPortrait,
  todayHe,
} from '@/lib/life/personal'
import { skillsReading } from '@/lib/life/profile'
import { buildSceneContext, sceneContextLines } from '@/lib/life/sceneContext'
import type { LifeSnapshot } from '@/lib/life/runtime/game'

import { IdentityHero } from './IdentityHero'
import { InnerState } from './InnerState'
import { LifePathMap } from './LifePathMap'
import { LifeSheetShell, SectionBoundary } from './LifeSheetShell'
import { LifeStoryTimeline } from './LifeStoryTimeline'
import { RevealText } from './Motion'
import { RelationshipMap } from './RelationshipMap'
import css from './personal.module.css'

/**
 * אני — "מי נהייתי" (spec §7, §40).
 *
 * Overview first, on one phone screen and never a scroll of five: the hero (who he is,
 * set as type), then four doors — הדרך שלי, האנשים שלי, הסיפור שלי, מה עובר עליי. Each
 * door drills into a page of the same dossier; back returns here, and a second back
 * returns to the world (§67).
 *
 * Two memories live in this module and nowhere else — not in the save, not in React
 * state that outlives the sheet (§52, §69): the identity sentence and the set of paths he
 * had the last time he opened this. When a milestone moved since, the old sentence is
 * struck through once (§38) and the new path is drawn first and opened with its story
 * (§37). A fresh session starts from what it sees, so nothing is ever announced twice.
 */

export type MePage = 'path' | 'people' | 'story' | 'inner'

let lastIdentity: { key: string; title: string } | null = null
let lastBranches: Set<string> | null = null

function Glyph({ page }: { page: MePage }) {
  const common = { fill: 'none', strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const }
  return (
    <svg viewBox="0 0 40 28" className="h-[28px] w-[40px] shrink-0 text-concrete" aria-hidden="true">
      {page === 'path' ? (
        <g stroke="currentColor" {...common}>
          <path d="M36 2 V26" />
          <path d="M36 8 C36 13 32 14 28 14 H6" stroke="rgb(var(--red))" />
          <path d="M36 16 C36 21 32 22 28 22 H14" />
        </g>
      ) : page === 'people' ? (
        <g stroke="currentColor" {...common}>
          <path d="M20 14 L6 5 M20 14 L34 7 M20 14 L10 24 M20 14 L31 23" strokeWidth={1} />
          <rect x="16" y="10" width="8" height="8" fill="rgb(var(--red))" stroke="none" />
          <rect x="4" y="3" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="32" y="5" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="8" y="22" width="4" height="4" fill="currentColor" stroke="none" />
        </g>
      ) : page === 'story' ? (
        <g stroke="currentColor" {...common}>
          <path d="M34 2 V26" />
          <rect x="31" y="4" width="6" height="6" fill="rgb(var(--red))" stroke="none" />
          <path d="M26 7 H6 M26 15 H12 M26 23 H8" strokeWidth={1} />
          <rect x="32" y="13" width="4" height="4" fill="currentColor" stroke="none" />
          <rect x="32" y="21" width="4" height="4" fill="rgb(var(--ink))" />
        </g>
      ) : (
        <g stroke="currentColor" {...common}>
          <path d="M2 16 C8 6 12 6 16 14 S26 24 30 12 S36 8 38 10" />
        </g>
      )}
    </svg>
  )
}

function Door({ page, titleHe, previewHe, stampHe, delay, onOpen }: { page: MePage; titleHe: string; previewHe: string; stampHe?: string | null; delay: number; onOpen: () => void }) {
  return (
    <li>
      <RevealText as="div" delay={delay}>
        <button
          type="button"
          onClick={onOpen}
          data-life={`me-door-${page}`}
          className={`${css.press} flex min-h-tap w-full items-center gap-3 border-t-hair border-concrete/25 py-2 text-start transition-colors duration-press active:bg-sheet/[0.06] motion-reduce:transition-none`}
        >
          <Glyph page={page} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="font-display text-[18px] leading-none text-sheet md:text-[20px]">
                <bdi>{titleHe}</bdi>
              </span>
              {stampHe ? (
                <span className="border-hair border-red px-1 py-[2px] font-mono tabular-nums text-[9px] leading-none text-red">
                  <bdi>{stampHe}</bdi>
                </span>
              ) : null}
            </span>
            <span className="mt-1 block truncate font-body text-[12px] leading-tight text-concrete">
              <bdi>{previewHe}</bdi>
            </span>
          </span>
          <span aria-hidden="true" className="font-display text-[18px] text-red">‹</span>
        </button>
      </RevealText>
    </li>
  )
}

export function LifeIdentitySheet({
  snapshot,
  page,
  onPage,
  onClose,
  onOther,
  turn,
}: {
  snapshot: LifeSnapshot
  page: MePage | null
  onPage: (page: MePage | null) => void
  onClose: () => void
  onOther: () => void
  turn: 'next' | 'back' | null
}) {
  const { profile, state, taken, missed } = snapshot

  // Read once per opening: the sheet is a snapshot, and so are the memories compared to it.
  const [opened] = useState(() => {
    // pure: StrictMode may call this twice, so the memories are only WRITTEN in the effect
    const identity = identitySummaryReading(state)
    const was = lastIdentity && lastIdentity.key !== identity.key && lastIdentity.title !== identity.title ? lastIdentity.title : null
    const path = lifeTrackVisualReading(state)
    const seen = lastBranches
    const fresh = seen ? path.branches.filter((row) => row.kind !== 'lean' && !seen.has(row.id)).map((row) => row.id) : []
    return { identity, was, path, fresh }
  })
  useEffect(() => {
    lastIdentity = { key: opened.identity.key, title: opened.identity.title }
    lastBranches = new Set(opened.path.branches.map((row) => row.id))
  }, [opened])
  const [people] = useState(() => relationshipVisualReading(state, profile.relationships.map((row) => row.who)))
  const [story] = useState(() => personalStoryReading(state))
  const portrait = selfPortrait(state)

  const titles: Record<MePage, string> = {
    path: t('life90h.me.path'),
    people: t('life90h.me.people'),
    story: t('life90h.me.story'),
    inner: t('life90h.me.inner'),
  }
  const subtitles: Record<MePage, string> = {
    path: t('life90h.me.pathSub'),
    people: t('life90h.me.peopleSub'),
    story: t('life90h.me.storySub'),
    inner: t('life90h.me.innerSub'),
  }

  const lastMajor = [...story].reverse().find((row) => row.major && row.presenceHe) ?? story[story.length - 1] ?? null
  const close = people.nodes.filter((node) => node.tier === 'inner' || node.tier === 'close').slice(0, 3)

  const previews: Record<MePage, string> = {
    path:
      opened.path.branches.length > 0
        ? opened.path.branches
            .slice(0, 3)
            .map((row) => row.titleHe)
            .join(' · ')
        : t('life.profile.tracksNone'),
    people:
      close.length > 0
        ? close.map((node) => node.label).join(' · ')
        : people.nodes.length > 0
          ? people.nodes
              .slice(0, 3)
              .map((node) => node.label)
              .join(' · ')
          : t('life.profile.peopleNone'),
    story: lastMajor ? [lastMajor.dateHe, lastMajor.titleHe, lastMajor.presenceHe].filter(Boolean).join(' · ') : t('life.bag.whereNone'),
    inner: profile.wellbeing.length > 0 ? profile.wellbeing.join(' · ') : profile.personality.join(' · ') || t('life.profile.whoNone'),
  }

  const dateHe = todayHe(state)

  return (
    <LifeSheetShell
      title={page ? titles[page] : t('life90h.me.title')}
      subtitle={page ? subtitles[page] : t('life90h.me.sub')}
      label={page ? titles[page] : t('life90h.me.title')}
      onClose={onClose}
      onBack={page ? () => onPage(null) : null}
      backHe={t('life90h.me.title')}
      other={{ labelHe: t('life90h.bag.title'), onGo: onOther, dataLife: 'me-to-bag' }}
      turn={page ? null : turn}
      onSwipe={page ? null : (dir) => (dir === 'next' ? onOther() : undefined)}
      dataLife="me-sheet"
    >
      <SectionBoundary>
        {page === 'path' ? (
          <LifePathMap reading={opened.path} fresh={opened.fresh} />
        ) : page === 'people' ? (
          <RelationshipMap reading={people} selfPortrait={portrait} />
        ) : page === 'story' ? (
          <LifeStoryTimeline rows={story} />
        ) : page === 'inner' ? (
          <InnerState profile={profile} skills={skillsReading(state)} taken={taken} missed={missed} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 px-4 pb-[max(12px,env(safe-area-inset-bottom))] md:grid md:grid-cols-[1.15fr_1fr] md:items-start md:gap-10 md:px-6 md:pt-4">
            <div className="flex min-h-0 flex-1 flex-col justify-center md:justify-start">
              <IdentityHero
                nameHe={profile.nameHe}
                ageHe={t('life.profile.age', { n: String(profile.age) })}
                dateHe={dateHe}
                identity={opened.identity}
                was={opened.was}
                portrait={portrait}
                heart={profile.redHeart}
                compact={false}
                lines={sceneContextLines(buildSceneContext(state))}
              />
            </div>
            <ul className="shrink-0" aria-label={t('life90h.me.title')}>
              {(['path', 'people', 'story', 'inner'] as MePage[]).map((door, i) => (
                <Door
                  key={door}
                  page={door}
                  titleHe={titles[door]}
                  previewHe={previews[door]}
                  stampHe={door === 'path' && opened.fresh.length > 0 ? t('life90h.path.changed') : null}
                  delay={420 + i * 70}
                  onOpen={() => onPage(door)}
                />
              ))}
            </ul>
          </div>
        )}
      </SectionBoundary>
    </LifeSheetShell>
  )
}
