'use client'

import { useMemo, useState } from 'react'

import type { ActivityBoardProps } from '@/components/life/MechanicSheet'
import { Num } from '@/components/ui/Num'
import { t } from '@/lib/i18n'
import { CITY_LINES, project } from '@/lib/life/map'
import { metres, paperStart, paperStops, routeScore, type PaperStop } from '@/lib/life/papers'

import { backLabel } from './shared'

/**
 * סיבוב העיתונים — the doors on a sketch of the city, and the order is the boy's. Nothing is
 * dealt by a server here: the doors are the map's own places (`lib/life/papers.ts`), the
 * score is arithmetic on their real coordinates, and there is no answer to hide.
 *
 * The second time round he knows the city a little: from the second run the sheet prints
 * how far each door is from the kiosk.
 */
export default function LifePapers({ request, onResult }: ActivityBoardProps) {
  const stops = useMemo(
    () => paperStops(request.window.before, request.window.level, request.seed),
    [request.window.before, request.window.level, request.seed],
  )
  const start = useMemo(() => paperStart(), [])
  const [order, setOrder] = useState<PaperStop[]>([])
  const left = stops.filter((stop) => !order.some((taken) => taken.id === stop.id))
  const known = request.runs > 0

  // the sketch frames the doors, not the whole city
  const xs = [start.x, ...stops.map((stop) => stop.x)]
  const ys = [start.y, ...stops.map((stop) => stop.y)]
  const pad = 18
  const box = {
    x: Math.min(...xs) - pad,
    y: Math.min(...ys) - pad,
    w: Math.max(...xs) - Math.min(...xs) + pad * 2,
    h: Math.max(...ys) - Math.min(...ys) + pad * 2,
  }
  const path = [start, ...order].map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="mt-3" data-life="papers">
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        className="h-[min(38dvh,300px)] w-full border-rule border-ink bg-sheet"
        role="img"
        aria-label={t('life.act.papers.map')}
      >
        {/* the city under the doors: the waterline and the roads, the map's own lines */}
        {CITY_LINES.filter((line) => line.kind === 'coast' || line.kind === 'river' || line.kind === 'road' || line.kind === 'highway').map((line) => (
          <polyline
            key={line.id}
            points={line.points.map(([lat, lon]) => {
              const at = project(lat, lon)
              return `${at.x},${at.y}`
            }).join(' ')}
            fill="none"
            className={line.kind === 'coast' || line.kind === 'river' ? 'stroke-sign' : 'stroke-ink'}
            strokeOpacity={line.kind === 'coast' || line.kind === 'river' ? 0.55 : 0.18}
            strokeWidth={box.w / (line.kind === 'coast' ? 140 : 220)}
          />
        ))}
        <polyline points={path} fill="none" className="stroke-red" strokeWidth={Math.max(1.5, box.w / 160)} strokeLinejoin="round" />
        <rect
          x={start.x - box.w / 90}
          y={start.y - box.w / 90}
          width={box.w / 45}
          height={box.w / 45}
          className="fill-ink"
        />
        {stops.map((stop) => {
          const at = order.findIndex((taken) => taken.id === stop.id)
          return (
            <g key={stop.id}>
              <circle cx={stop.x} cy={stop.y} r={box.w / 60} className={at >= 0 ? 'fill-red' : 'fill-paper stroke-ink'} strokeWidth={box.w / 300} />
              <text
                x={stop.x}
                y={stop.y + box.w / 18}
                textAnchor="middle"
                className="fill-ink font-body"
                fontSize={box.w / 30}
                direction="rtl"
              >
                {at >= 0 ? `${at + 1} · ${stop.labelHe}` : stop.labelHe}
              </text>
            </g>
          )
        })}
      </svg>

      <p className="mt-2 font-body text-[12px] text-muted">{t('life.act.papers.order')}</p>
      <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
        {left.map((stop) => (
          <li key={stop.id}>
            <button
              type="button"
              onClick={() => setOrder((current) => [...current, stop])}
              data-paper-stop={stop.id}
              className="flex min-h-tap w-full flex-col items-start justify-center border-rule border-ink bg-paper px-2.5 py-1.5 text-start"
            >
              <span className="font-body text-[13px] font-extrabold leading-tight text-ink">{stop.labelHe}</span>
              {known && (
                <span className="font-body text-[11px] leading-tight text-muted">
                  <Num>{t('life.act.papers.metres', { n: String(metres(Math.hypot(stop.x - start.x, stop.y - start.y))) })}</Num>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      {order.length > 0 && (
        <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={t('life.act.papers.order')}>
          {order.map((stop, index) => (
            <li key={stop.id} className="border-hair border-ink bg-sheet px-2 py-1 font-body text-[12px] text-ink">
              <Num>{String(index + 1)}</Num> · {stop.labelHe}
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
        <button
          type="button"
          onClick={() => setOrder((current) => current.slice(0, -1))}
          disabled={order.length === 0}
          className="min-h-tap border-rule border-ink px-3 font-body text-[13px] font-extrabold text-ink disabled:opacity-35"
        >
          {t('life.act.papers.undo')}
        </button>
        <button
          type="button"
          onClick={() => onResult({ completed: true, score: routeScore(order, stops) })}
          disabled={left.length > 0}
          data-life="papers-go"
          className="min-h-tap bg-red px-4 font-body text-step-0 font-extrabold text-paper disabled:opacity-40"
        >
          {backLabel(request.activity)}
        </button>
      </div>
    </div>
  )
}
