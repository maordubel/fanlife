'use client'

import Link from 'next/link'
import { useEffect, useId, useState, type ReactNode } from 'react'

import { firePickFxAt } from '@/components/stage/PickFx'
import { track } from '@/lib/analytics/meter'
import { t } from '@/lib/i18n'
import type { NextAction } from '@/lib/results/types'
import type { VoiceOut } from '@/lib/voice/types'

/**
 * UNIVERSAL EXIT — what happens after every run (master plan §6). Three layers, in order,
 * and never more than three:
 *
 *   1. **the emotion** — the voice's eyebrow, title and body (`lib/voice`).
 *   2. **one natural next thing** — at most two doors, from `recommend()` on the server
 *      (`lib/results/context.ts`), every href checked by `lib/links/index.ts`.
 *   3. **"שלח ליציע"** — optional and never primary. It opens the gate's OWN share (rule
 *      19: `ShareRow` / the card chips) passed in as `share`; this component builds no
 *      second share system, it only decides when the one system is shown.
 *
 * The parts are exported too (`ExitEmotion`, `ExitNext`, `ExitShare`) for a gate whose
 * result has to fit a phone stage and cannot take the stacked layout — gate 10 is the
 * reference for that. Shell tokens only (rule 8): ink, paper, sheet, red, sign, concrete.
 * Logical properties only (rule 9). Solo is complete without layer 3 (§1.1).
 */

export function ExitEmotion({ voice, compact = false }: { voice: VoiceOut; compact?: boolean }) {
  if (!voice.title) return null
  if (compact) {
    return (
      <div className="min-w-0 text-center" data-exit="emotion">
        {voice.eyebrow && <p className="font-body text-[10px] font-extrabold tracking-widest text-sign">{voice.eyebrow}</p>}
        <p className="font-display text-[26px] leading-[1.05] text-ink [@media(max-height:680px)]:text-[21px]">{voice.title}</p>
        {voice.body && <p className="mt-0.5 font-body text-[12px] leading-snug text-muted">{voice.body}</p>}
      </div>
    )
  }
  return (
    <div className="border-rule border-ink bg-ink p-5 text-center text-paper" data-exit="emotion">
      {voice.eyebrow && <p className="font-body text-[11px] font-extrabold tracking-widest text-red">{voice.eyebrow}</p>}
      <h2 className="mt-1 font-display text-step-4 leading-tight">{voice.title}</h2>
      {voice.body && <p className="mx-auto mt-2 max-w-[36ch] font-body text-step--1 leading-relaxed text-concrete">{voice.body}</p>}
    </div>
  )
}

export function ExitNext({ next, from, compact = false }: { next: readonly NextAction[]; from: string; compact?: boolean }) {
  const doors = next.slice(0, 2)
  if (doors.length === 0) return null
  return (
    <nav aria-label={t('voice.exit.more')} data-exit="next" className={compact ? 'min-w-0' : 'mt-2'}>
      {!compact && <p className="mb-1 font-body text-[10px] font-extrabold tracking-widest text-sign">{t('voice.exit.more')}</p>}
      <ul className={`grid gap-1.5 ${doors.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {doors.map((door, i) => (
          <li key={door.href} className="min-w-0">
            <Link
              href={door.href}
              data-next={door.kind}
              onClick={(event) => {
                track('entity_follow', { detail: `${from}:${door.kind}`.slice(0, 48) })
                firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
              }}
              className={`flex min-h-tap flex-col justify-center border-rule border-ink px-3 py-1.5 transition-transform duration-press active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sign motion-reduce:transition-none ${
                i === 0 ? 'bg-paper text-ink' : 'bg-sheet text-ink'
              }`}
            >
              <span className="font-body text-[13px] font-extrabold leading-tight">{t(door.label)}</span>
              {door.subject && <bdi className="truncate font-sign text-[12px] leading-tight text-muted">{door.subject}</bdi>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Layer 3. A button labelled "שלח ליציע" that reveals the gate's own share. Closed by
 * default: the result is complete without it, and share is never primary by force (§51).
 */
export function ExitShare({
  label,
  from,
  children,
  compact = false,
}: {
  /** the voice's `ctaShare` — always "שלח ליציע" */
  label: string
  from: string
  /** the gate's own share — `ShareRow` or the card chips. Absent = no layer 3. */
  children?: ReactNode
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const panel = useId()
  if (!children) return null
  return (
    <div data-exit="share" className={compact ? 'contents' : 'mt-2'}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={(event) => {
          if (!open) track('share_open', { detail: from.slice(0, 48) })
          setOpen((v) => !v)
          firePickFxAt(event.currentTarget, { tone: 'ink', haptic: 'tap' })
        }}
        className={`flex min-h-tap items-center justify-center border-rule border-ink px-3 font-body font-extrabold active:scale-[.97] ${
          compact ? 'shrink-0 bg-paper text-[12.5px] text-ink' : 'w-full bg-paper text-step-0 text-ink'
        } ${open ? 'bg-ink text-paper' : ''}`}
      >
        {open ? t('voice.share.close') : label}
      </button>
      <div id={panel} hidden={!open} className={compact ? 'contents' : ''}>
        {open && !compact && <p className="mt-1.5 font-body text-[11px] text-muted">{t('voice.share.hint')}</p>}
        {open && children}
      </div>
    </div>
  )
}

export function UniversalExit({
  voice,
  next,
  from,
  again,
  share,
  children,
}: {
  voice: VoiceOut
  next: readonly NextAction[]
  /** the gate's route slug, for the measurement (`trivia`, `blind-cow`) */
  from: string
  /** the gate's own replay — "נסה שוב את אותם 12". Drawn beside the doors, never instead. */
  again?: { label: string; onClick: () => void }
  /** the gate's one share system (rule 19) — shown under "שלח ליציע" */
  share?: ReactNode
  /** the gate's own details (figures, rows) — between the emotion and the doors */
  children?: ReactNode
}) {
  useEffect(() => {
    track('result_view', { detail: from.slice(0, 48) })
  }, [from])
  return (
    <section data-exit="universal" className="mt-stack">
      <ExitEmotion voice={voice} />
      {children}
      {again && (
        <button
          type="button"
          onClick={again.onClick}
          className="mt-2 flex min-h-tap w-full items-center justify-center bg-red px-3 font-body text-step-0 font-extrabold text-paper transition-transform duration-press active:scale-[.97] motion-reduce:transition-none"
        >
          {again.label}
        </button>
      )}
      <ExitNext next={next} from={from} />
      <ExitShare label={voice.ctaShare} from={from}>
        {share}
      </ExitShare>
    </section>
  )
}
