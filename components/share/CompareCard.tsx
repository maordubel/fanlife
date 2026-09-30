'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef } from 'react'

import { track } from '@/lib/analytics/meter'
import { compareResults, type CompareOut } from '@/lib/challenges/compare'
import { GATE_ROUTE, type ChallengeGate, type ChallengeResult } from '@/lib/challenges/contract'
import { hashResult } from '@/lib/challenges/create'
import { resolveChallenge } from '@/lib/challenges/resolve'
import { entityHash } from '@/lib/challenges/wire'
import { PITCH } from '@/lib/game/goal-zones'
import { t } from '@/lib/i18n'

/**
 * השוואה — what a recipient sees after playing the run somebody sent (ONE RED WORLD §1.2,
 * §33): agreement, disagreement and memory patterns, side by side, and NO winner.
 *
 * A gate renders this once its own run is over, with its own result. The challenger's
 * result is read from the URL (`?ch=`, set by the landing only when the comparison is
 * honest — same run, same scoring, inside the window); without one, or with one that
 * does not match what this gate just played, it renders nothing and the result screen is
 * the solo screen it always was (§1.1: complete without anybody else).
 *
 * Names never come from the link: `names` is the gate's own id → name map, hashed here
 * so the challenger's hashes can find them.
 */
type CompareProps = {
  gate: ChallengeGate
  /** this player's result, with real ids — hashed here before comparing */
  mine: ChallengeResult | null
  /** id → name, from the gate's own roster (XI, rumble, memory) */
  names?: Readonly<Record<string, string>>
  /** the challenge code, when the gate already holds it; otherwise read from `?ch=` */
  code?: string | null
}

/**
 * `useSearchParams` in a statically rendered route needs a Suspense boundary of its own,
 * or the build bails the whole page out to client rendering — so the card brings one.
 */
export function CompareCard(props: CompareProps) {
  return (
    <Suspense fallback={null}>
      <CompareInner {...props} />
    </Suspense>
  )
}

function CompareInner({
  gate,
  mine,
  names,
  code,
}: {
  gate: ChallengeGate
  /** this player's result, with real ids — hashed here before comparing */
  mine: ChallengeResult | null
  /** id → name, from the gate's own roster (XI, rumble, memory) */
  names?: Readonly<Record<string, string>>
  /** the challenge code, when the gate already holds it; otherwise read from `?ch=` */
  code?: string | null
}) {
  const search = useSearchParams()
  const raw = code ?? search?.get('ch') ?? null
  const out = useMemo<CompareOut | null>(() => {
    if (!mine || !raw) return null
    const resolved = resolveChallenge(raw)
    if (!resolved?.comparable || resolved.challenge.gate !== gate || !resolved.challenge.result) return null
    const hashedNames: Record<string, string> = {}
    for (const [id, name] of Object.entries(names ?? {})) hashedNames[entityHash(id)] = name
    return compareResults(hashResult(mine), resolved.challenge.result, hashedNames)
    // names is a lookup; the comparison is decided by the two results
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, gate, mine ? JSON.stringify(mine) : ''])

  const counted = useRef(false)
  useEffect(() => {
    if (!out || counted.current) return
    counted.current = true
    track('challenge_complete', { detail: `g${gate}`, gate: GATE_ROUTE[gate] })
  }, [out, gate])

  if (!out) return null
  const nameOf = (hash: string) => {
    for (const [id, name] of Object.entries(names ?? {})) if (entityHash(id) === hash) return name
    return null
  }

  return (
    <section data-compare={`g${gate}`} aria-label={t('compare.title')} className="mt-stack border-rule border-ink bg-sheet p-4 text-ink">
      <p className="font-display text-step-1 leading-none">{t('compare.title')}</p>
      <p className="mt-1 font-body text-[11.5px] text-muted">{t('compare.lead')}</p>

      {out.rows.length > 0 && (
        <table className="mt-3 w-full border-collapse font-body text-step--1">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-1 text-start font-extrabold" scope="col" />
              <th className="py-1 text-center font-extrabold" scope="col">{t('compare.you')}</th>
              <th className="py-1 text-center font-extrabold text-sign" scope="col">{t('compare.them')}</th>
            </tr>
          </thead>
          <tbody>
            {out.rows.map((row, i) => (
              <tr key={i} className="border-b border-ink/15">
                <th scope="row" className="py-1.5 text-start font-normal text-muted">{t(row.label.key, row.label.vars)}</th>
                <td className="py-1.5 text-center font-mono tabular-nums font-extrabold" dir="ltr">{row.mine}</td>
                <td className="py-1.5 text-center font-mono tabular-nums font-extrabold text-sign" dir="ltr">{row.theirs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {out.overlay && <RouteOverlay mine={out.overlay.mine} theirs={out.overlay.theirs} />}

      <ul className="mt-3 space-y-1">
        {out.lines.map((line, i) => (
          <li key={i} className={`font-body leading-snug ${i === 0 ? 'text-step-0 font-extrabold' : 'text-step--1'}`}>
            {t(line.key, line.vars)}
          </li>
        ))}
      </ul>

      {out.ids && (out.ids.shared.length > 0 || out.ids.onlyMine.length > 0 || out.ids.onlyTheirs.length > 0) && (
        <div className="mt-3 grid gap-2">
          {(
            [
              ['compare.shared', out.ids.shared, 'bg-red text-paper'],
              ['compare.onlyMine', out.ids.onlyMine, 'bg-paper text-ink'],
              ['compare.onlyTheirs', out.ids.onlyTheirs, 'bg-sign text-paper'],
            ] as const
          ).map(([label, list, tone]) =>
            list.length === 0 ? null : (
              <div key={label}>
                <p className="font-body text-[10px] font-extrabold tracking-widest text-sign">{t(label)}</p>
                <ul className="mt-1 flex flex-wrap gap-1">
                  {list.map((hash) => {
                    const name = nameOf(hash)
                    return (
                      <li key={hash} className={`border-hair border-ink px-2 py-0.5 font-sign text-[12px] ${tone}`}>
                        {name ? <bdi>{name}</bdi> : <span className="font-mono tabular-nums" dir="ltr">·</span>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </section>
  )
}

/** Gate 8's overlay: both routes on one half-pitch, zone by zone (`lib/game/goal-zones.ts`). */
function zonePoint(index: number): { x: number; y: number } {
  if (index >= 20) return { x: PITCH.w / 2, y: PITCH.goalY - 8 }
  const col = index % 5
  const row = Math.floor(index / 5)
  return { x: PITCH.x0 + col * PITCH.cw + PITCH.cw / 2, y: PITCH.y0 + row * PITCH.ch + PITCH.ch / 2 }
}

function RouteOverlay({ mine, theirs }: { mine: number[][]; theirs: number[][] }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2" aria-hidden>
      {mine.map((route, i) => (
        <svg key={i} viewBox={`0 ${PITCH.top} ${PITCH.w} ${PITCH.h - PITCH.top}`} className="w-full border-hair border-ink bg-paper">
          <rect x={PITCH.left} y={PITCH.goalY} width={PITCH.right - PITCH.left} height={PITCH.halfY - PITCH.goalY} fill="none" className="stroke-ink" strokeWidth={3} />
          {[
            [theirs[i] ?? [], 'stroke-sign'],
            [route, 'stroke-red'],
          ].map(([steps, tone], k) => (
            <polyline
              key={k}
              points={(steps as number[]).map((z) => zonePoint(z)).map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              className={tone as string}
              strokeWidth={k === 0 ? 10 : 7}
              strokeLinejoin="round"
            />
          ))}
        </svg>
      ))}
    </div>
  )
}
