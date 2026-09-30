'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Ranks } from '@/components/gates/GatePlate'
import { readLifeResume, type LifeResume } from '@/lib/life/resume'
import { t } from '@/lib/i18n'

/**
 * לוחית המנהרה — THE WORKER LIFE, inside the wall.
 *
 * `LifeEntry` used to hang above the gate wall as its own thing. It is now the first
 * item in the wall's own grid, full width, sitting above gate 5 — same plate anatomy as
 * a gate (a bilingual strip, a well, an ink foot), so the wall reads as one family. What
 * keeps it from being mistaken for gate 9 or gate 12 — numbers Bloomfield never had
 * (rule 24) — is that it carries no number and no "שער" (29.9.2026: the "TUNNEL · NOT A
 * GATE" strip is gone; the wordmark is the plate). There is no number well: the wordmark prints where a
 * number would, in the same two-plate print (`.plate-shift` / `.plate-top`) every gate
 * uses. And there are no rays — a tunnel is roofed, not lit from behind a sunburst.
 *
 * The action strip has two honest states and the rule that picks between them is the
 * same one the polls wing lives by (rule 11): a resume line — the save's own year and
 * place — is only printed when there is a real local save to read it from. No save, or a browser that blocks storage
 * altogether, prints the same "never played" strip — never a guessed day or place.
 * That read can only happen in the browser, so it runs once after mount, the same
 * pattern `BallotSheet` reads its slip with: render the honest default first, then
 * upgrade it if a save turns up, rather than blocking on it or guessing during SSR.
 */

/** the well's own crowd — a tunnel is taller and lit from the mouth, so its rows are
 *  brighter and spaced differently than a gate's; see `Ranks` in GatePlate.tsx. */
const TUNNEL_RANKS = [
  { bottom: 0, height: 46, size: '30px 46px', opacity: 0.5, shift: '0' },
  { bottom: 28, height: 32, size: '21px 32px', opacity: 0.24, shift: '11px' },
  { bottom: 48, height: 22, size: '15px 22px', opacity: 0.14, shift: '4px' },
] as const

export function TunnelPlate() {
  const [resume, setResume] = useState<LifeResume | null>(null)

  useEffect(() => {
    let live = true
    // No save, an unreadable save and a browser that refuses storage all resolve to `null`
    // — the one fallback this plate needs (rule 11: never print a day or a place it does
    // not have). The year and the place come from the save's own log, never a fixed line.
    void readLifeResume().then((found) => {
      if (live) setResume(found)
    })
    return () => {
      live = false
    }
  }, [])

  const resumable = resume !== null
  const kicker = resumable ? t('life.tunnel.resumeKicker') : t('life.tunnel.kicker')
  const cta = resumable ? t('life.resume.cta') : t('life.tunnel.start')

  return (
    <Link
      href="/life"
      data-home="life-plate"
      aria-label={`${t('life.entry.kicker')} — ${cta}`}
      className="group relative block overflow-hidden border-rule border-ink bg-ink transition-transform duration-press ease-stamp active:scale-[.98] motion-reduce:transition-none"
    >
      {/* 1 · the well — the wordmark prints where a gate number would, no rays. It is the
          tallest thing on the plate: the name is the hierarchy, not a caption above it. */}
      <div className="relative flex h-[168px] items-center justify-center sm:h-[208px]">
        <div aria-hidden="true" className="tunnel-mouth pointer-events-none absolute inset-0" />
        <Ranks tone="paper" rows={TUNNEL_RANKS} />
        <p
          aria-hidden="true"
          dir="ltr"
          className="plate-shift absolute text-center font-poster text-[56px] leading-[.86] text-sign sm:text-[72px]"
        >
          THE WORKER
          <br />
          LIFE
        </p>
        <p
          dir="ltr"
          className="plate-top relative text-center font-poster text-[56px] leading-[.86] text-red sm:text-[72px]"
        >
          THE WORKER
          <br />
          LIFE
        </p>
      </div>

      {/* 2 · the ink foot — what it is, and the span it covers */}
      <div className="relative border-t-hair border-concrete/30 bg-ink px-3 pb-2.5 pt-2.5">
        <p className="font-display text-[19px] leading-tight text-sheet">{t('life.entry.kicker')}</p>
        <p className="mt-1 font-body text-[12.5px] leading-snug text-concrete">
          <bdi>{t('life.entry.slice')}</bdi>
        </p>
      </div>

      {/* 3 · the action strip — where you stopped (the year and the place from the save),
          or an invitation in when there is nothing to resume */}
      <div className="flex items-center gap-3 bg-red px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="font-body text-[11px] font-extrabold leading-none tracking-[0.08em] text-ink/80">
            {kicker}
          </p>
          {resume && (
            <p className="mt-1 truncate font-display text-[15px] font-bold leading-tight text-sheet" data-home="life-plate-resume">
              <bdi dir="ltr" className="tabular-nums">
                {resume.year}
              </bdi>
              {resume.placeHe && (
                <>
                  {' · '}
                  <bdi>{resume.placeHe}</bdi>
                </>
              )}
            </p>
          )}
        </div>
        <span className="flex min-h-tap flex-none items-center gap-2 bg-ink px-4">
          <span className="font-body text-[15px] font-extrabold leading-none text-sheet">{cta}</span>
          <span aria-hidden="true" className="block h-[7px] w-[7px] bg-red" />
        </span>
      </div>
    </Link>
  )
}
