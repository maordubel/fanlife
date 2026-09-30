'use client'

import { useEffect, useState } from 'react'

import { t } from '@/lib/i18n'
import type { DistanceTier, RelationshipMapReading, RelationshipNode } from '@/lib/life/personal'
import { artUrl } from '@/lib/life/runtime/art'

import { DrawIn, MotionLine } from './Motion'
import css from './personal.module.css'

/**
 * האנשים שלי — a constellation, never a column of bars (spec §11–12).
 *
 * He is in the middle. Everybody else stands at a DISTANCE from him, and the distance is
 * the only thing the drawing says: five rings (`distanceTierOf` — inner, close, present,
 * distant, and fractured), never a value. Family stands above him, friends beside and
 * below, the person he shares a life with close at hand; the angle inside a group is by
 * order, so the drawing is the same every time it is opened (§51).
 *
 * Lines are SVG (red and thin for a bond that holds, grey for an ordinary one, dashed for
 * friction, broken in two for a fracture); the people are HTML buttons, so their names are
 * type and a thumb can reach them (44px+). On open every person travels out from beside
 * him to where the relationship puts them — the motion IS the reading (§12).
 *
 * Small screens: the square is the largest one that fits (container units), and past
 * eight people the rest wait behind "עוד אנשים" (§41).
 */

const RADIUS: Record<DistanceTier, number> = { inner: 26, close: 33, present: 39, fractured: 42, distant: 45 }
const SECTOR: Record<RelationshipNode['category'], number> = { family: 0, romance: 300, friend: 118, other: 222 }
const PRIMARY = 8

type Placed = RelationshipNode & { x: number; y: number }

function place(nodes: RelationshipNode[]): Placed[] {
  const groups = new Map<RelationshipNode['category'], RelationshipNode[]>()
  for (const node of nodes) groups.set(node.category, [...(groups.get(node.category) ?? []), node])
  const out: Placed[] = []
  for (const [category, members] of groups) {
    const step = Math.min(38, 150 / Math.max(1, members.length))
    members.forEach((node, i) => {
      const angle = ((SECTOR[category] + (i - (members.length - 1) / 2) * step) * Math.PI) / 180
      const r = RADIUS[node.tier]
      // x is measured from the inline START (the right, in Hebrew), so the drawing is RTL
      const x = Math.min(86, Math.max(14, 50 + r * Math.sin(angle)))
      const y = Math.min(88, Math.max(12, 50 - r * Math.cos(angle)))
      out.push({ ...node, x, y })
    })
  }
  return out
}

function Link({ node }: { node: Placed }) {
  // SVG x runs from the left; the node's x runs from the right
  const x = 100 - node.x
  const y = node.y
  const color = node.strong ? 'rgb(var(--red))' : 'rgb(var(--concrete) / .7)'
  if (node.tier === 'fractured') {
    const mx = 50 + (x - 50) * 0.42
    const my = 50 + (y - 50) * 0.42
    const nx = 50 + (x - 50) * 0.62
    const ny = 50 + (y - 50) * 0.62
    return (
      <g>
        <MotionLine d={`M50 50 L${mx} ${my}`} width={1.25} style={{ stroke: color }} />
        <MotionLine d={`M${nx} ${ny} L${x} ${y}`} width={1.25} style={{ stroke: color }} />
      </g>
    )
  }
  return (
    <MotionLine d={`M50 50 L${x} ${y}`} width={node.strong ? 1.5 : 1} style={{ stroke: color, ...(node.conflict ? { strokeDasharray: '4 5' } : null) }} />
  )
}

function categoryHe(category: RelationshipNode['category']): string {
  if (category === 'family') return t('life90h.people.cat.family')
  if (category === 'friend') return t('life90h.people.cat.friend')
  if (category === 'romance') return t('life90h.people.cat.romance')
  return t('life90h.people.cat.other')
}

export function RelationshipMap({ reading, selfPortrait }: { reading: RelationshipMapReading; selfPortrait: string | null }) {
  const [picked, setPicked] = useState<string | null>(null)
  const [more, setMore] = useState(false)
  const [settled, setSettled] = useState(false)
  const [emptyPicked, setEmptyPicked] = useState(false)

  useEffect(() => {
    let a = 0
    let b = 0
    a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setSettled(true))
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [])

  const primary = place(reading.nodes.slice(0, PRIMARY))
  const rest = reading.nodes.slice(PRIMARY)
  const chosen = reading.nodes.find((node) => node.id === picked) ?? null

  if (reading.nodes.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6" data-life="me-people">
        <p className="font-body text-[13px] leading-relaxed text-concrete">
          <bdi>{t('life.profile.peopleNone')}</bdi>
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-6" data-life="me-people">
      <ul className="sr-only">
        {reading.nodes.map((node) => (
          <li key={node.id}>{`${node.label}: ${node.tierHe}. ${node.lineHe}`}</li>
        ))}
      </ul>
      <div className="relative flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-square w-[min(100cqw,100cqh)]" aria-hidden="false">
          {/* the rings — hairlines, so distance reads before any name does */}
          <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {/* diamond rings: a square turned on its corner, its vertices at the ring's radius */}
            {[26, 33, 39, 45].map((r) => (
              <rect key={r} x={50 - r / Math.SQRT2} y={50 - r / Math.SQRT2} width={r * Math.SQRT2} height={r * Math.SQRT2} fill="none" stroke="rgb(var(--concrete) / .14)" strokeWidth={1} vectorEffect="non-scaling-stroke" transform="rotate(45 50 50)" />
            ))}
          </svg>
          {/* the lines grow out from him once the people have started to move (§12) */}
          {settled ? (
            <DrawIn mode="out" delay={260} className="pointer-events-none absolute inset-0">
              <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                {primary.map((node) => (
                  <Link key={node.id} node={node} />
                ))}
              </svg>
            </DrawIn>
          ) : null}

          {/* אני */}
          <div className="absolute flex translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ insetInlineStart: '50%', top: '50%' }}>
            <span className="relative flex h-[52px] w-[52px] items-center justify-center border-rule border-red bg-sheet">
              {selfPortrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artUrl(selfPortrait)} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="mt-1 bg-red px-1.5 py-[2px] font-sign text-[11px] leading-none text-sheet">
              <bdi>{t('life90h.people.me')}</bdi>
            </span>
          </div>

          {primary.map((node, i) => (
            <button
              key={node.id}
              type="button"
              data-life="people-node"
              data-tier={node.tier}
              aria-pressed={picked === node.id}
              onClick={() => {
                setEmptyPicked(false)
                setPicked(picked === node.id ? null : node.id)
              }}
              className={`${css.node} absolute flex min-h-tap min-w-tap translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center`}
              style={{
                insetInlineStart: `${settled ? node.x : 50}%`,
                top: `${settled ? node.y : 50}%`,
                opacity: settled ? (picked && picked !== node.id ? 0.35 : node.tier === 'distant' ? 0.7 : 1) : 0,
                transitionDelay: settled ? `${i * 60}ms` : '0ms',
              }}
            >
              <span
                className={`relative block h-[34px] w-[34px] overflow-hidden border-rule bg-ink md:h-[44px] md:w-[44px] ${
                  picked === node.id ? 'border-red' : node.strong ? 'border-sheet' : 'border-concrete/60'
                }`}
              >
                {node.portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artUrl(node.portrait)} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[15px] text-sheet">
                    <bdi>{node.label.slice(0, 1)}</bdi>
                  </span>
                )}
              </span>
              <span className={`mt-0.5 max-w-[84px] truncate bg-ink px-1 font-display text-[12px] leading-tight ${node.tier === 'inner' ? 'text-sheet' : 'text-sheet/80'}`}>
                <bdi>{node.label}</bdi>
              </span>
            </button>
          ))}

          {/* זוגיות, ריקה — an empty place, drawn as one, and it has a sentence (§60) */}
          {reading.romanceEmpty && !reading.nodes.some((node) => node.category === 'romance') ? (
            <button
              type="button"
              onClick={() => {
                setPicked(null)
                setEmptyPicked(!emptyPicked)
              }}
              aria-pressed={emptyPicked}
              aria-label={t('life90h.people.romanceEmpty')}
              className={`${css.node} absolute flex min-h-tap min-w-tap translate-x-1/2 -translate-y-1/2 items-center justify-center`}
              style={{ insetInlineStart: `${settled ? 72 : 50}%`, top: `${settled ? 30 : 50}%`, opacity: settled ? 1 : 0 }}
            >
              <span className="block h-[30px] w-[30px] border-2 border-dashed border-concrete/45" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-[84px] shrink-0 border-t-hair border-concrete/25 pt-2.5" aria-live="polite" data-life="people-detail">
        {chosen ? (
          <div key={chosen.id} className={css.drawer}>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-[17px] leading-none text-sheet">
                <bdi>{chosen.label}</bdi>
              </span>
              <span className="font-mono tabular-nums text-[10px] uppercase tracking-[0.12em] text-concrete">
                <bdi>{categoryHe(chosen.category)}</bdi>
              </span>
            </p>
            <p className={`mt-1.5 font-display text-[14px] leading-none ${chosen.tier === 'fractured' ? 'text-red' : 'text-sheet/85'}`}>
              <bdi>{chosen.tierHe}</bdi>
            </p>
            <p className="mt-1 font-body text-[13px] leading-snug text-concrete">
              <bdi>{chosen.lineHe}</bdi>
            </p>
          </div>
        ) : emptyPicked ? (
          <p className={`${css.drawer} font-body text-[13px] leading-relaxed text-concrete`}>
            <bdi>{t('life90h.people.romanceEmpty')}</bdi>
          </p>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="font-body text-[12px] leading-relaxed text-concrete/80">
              <bdi>{t('life90h.people.hint')}</bdi>
            </p>
            {rest.length > 0 ? (
              <button
                type="button"
                onClick={() => setMore(!more)}
                aria-expanded={more}
                className="min-h-tap shrink-0 border-hair border-concrete/40 px-2.5 font-sign text-[12px] text-sheet"
              >
                <bdi>{t('life90h.people.more')}</bdi>
              </button>
            ) : null}
          </div>
        )}
        {more && rest.length > 0 && !chosen ? (
          <ul className={`${css.drawer} mt-1.5 flex flex-wrap gap-x-3 gap-y-1`}>
            {rest.map((node) => (
              <li key={node.id} className="font-body text-[12px] text-sheet/80">
                <bdi>{node.label}</bdi>
                <span className="px-1 text-concrete">·</span>
                <bdi className="text-concrete">{node.tierHe}</bdi>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
