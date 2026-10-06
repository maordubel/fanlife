'use client'

import { GateLogo } from '@/components/gates/GateLogo'
import { surname } from '@/lib/game/roster-search'
import type { RumbleMatchScript } from '@/lib/game/royal-rumble-presentation'
import { t } from '@/lib/royal-rumble/i18n'

/**
 * The full-time board (delta 99): score, who scored and when, איש המשחק, two lines of story.
 * Everything here is read from the script — nothing is decided.
 */
export function RumbleFullTime({
  script,
  title,
  body,
}: {
  script: RumbleMatchScript
  title: string
  body?: string
}) {
  const goals = script.events.filter((e) => e.type === 'goal')
  const name = (side: 'us' | 'them', slug: string) => {
    const p = (side === 'us' ? script.us : script.them).find((x) => x.slug === slug)
    return p ? surname(p.nameHe) : ''
  }
  const mvp = script.manOfTheMatch
  return (
    <>
      <div className="bc-stage relative mx-auto mb-3 flex w-fit justify-center border-rule border-ink px-4 py-2">
        <GateLogo logo="royal-rumble" decorative className="h-[54px] w-auto" />
      </div>
      <p className="relative font-mono tabular-nums text-[9px] font-black tracking-[0.3em] text-red" dir="ltr">FULL TIME · ROYAL RUMBLE</p>
      <p className="relative mt-3 font-display text-[92px] leading-[0.8] sm:text-[132px]" dir="ltr">{script.final.us}–{script.final.them}</p>
      <div className="relative mx-auto mt-5 h-1 w-20 bg-red" />
      <h2 className="relative mt-5 font-display text-[34px] leading-none sm:text-[46px]" data-exit="emotion">{title}</h2>
      {body && <p className="relative mt-2 font-body text-[13px] text-paper/80">{body}</p>}

      {goals.length > 0 && (
        <ul className="relative mx-auto mt-4 flex max-w-sm flex-col gap-1 text-start" data-rumble="scorers">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className={`flex items-baseline gap-2 border-s-rule px-2 py-1 font-body text-[13px] font-black ${goal.side === 'us' ? 'border-red' : 'border-paper/50'}`}
            >
              <bdi className="w-9 shrink-0 font-mono tabular-nums text-[11px] text-red" dir="ltr">{goal.minute}′</bdi>
              <span className="min-w-0 flex-1 truncate">{name(goal.side, goal.playerSlug)}</span>
              {goal.assistPlayerId && (
                <span className="shrink-0 text-[10px] font-normal text-paper/70">{t('goalAssist', { name: name(goal.side, goal.assistPlayerId) })}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="relative mx-auto mt-4 max-w-sm border-hair border-red px-3 py-2">
        <p className="font-mono tabular-nums text-[8px] font-black tracking-[0.2em] text-red" dir="ltr">MAN OF THE MATCH</p>
        <p className="font-display text-[22px] leading-tight">
          {t('manOfMatch')}: {surname(mvp.nameHe)}
        </p>
        <p className="font-body text-[11px] text-paper/70">{mvp.reasonHe}</p>
      </div>
      <p className="relative mx-auto mt-3 max-w-lg font-body text-[12px] font-black leading-relaxed text-paper/85">{script.summaryHe}</p>
    </>
  )
}
