'use client'

import { t } from '@/lib/royal-rumble/i18n'

/**
 * The goal, on the pitch (delta 99): a strip across the middle — scorer, minute, score after.
 * An assist line exists only when the script honestly derived one. Transform-only entrance.
 */
export function RumbleGoalMoment({
  ours,
  scorer,
  assist,
  minute,
  score,
  line,
}: {
  ours: boolean
  scorer: string
  assist: string | null
  minute: number
  score: { us: number; them: number }
  line: string
}) {
  return (
    <div
      className={`rr-goal pointer-events-none absolute inset-x-0 top-[40%] z-40 border-y-rule px-3 py-3 text-center ${
        ours ? 'border-paper bg-red text-paper' : 'border-red bg-ink text-paper'
      }`}
      role="status"
      aria-live="assertive"
      data-rumble="goal"
    >
      <p className="font-display text-[34px] leading-none sm:text-[44px]">{t(ours ? 'goalUsLabel' : 'goalThemLabel')}</p>
      <p className="mt-1 font-body text-[15px] font-black">
        {scorer} <bdi className="font-mono tabular-nums text-[12px]" dir="ltr">{minute}′</bdi>
      </p>
      {assist && <p className="font-body text-[11px] opacity-85">{t('goalAssist', { name: assist })}</p>}
      <p className="mt-1 font-display text-[28px] leading-none" dir="ltr">
        {score.us}–{score.them}
      </p>
      <p className="mt-1 font-body text-[11px] opacity-80">{line}</p>
      <style>{`@keyframes rrGoal{0%{transform:scaleY(.2)}60%{transform:scaleY(1.06)}100%{transform:scaleY(1)}}.rr-goal{animation:rrGoal .32s ease-out 1}@media (prefers-reduced-motion:reduce){.rr-goal{animation:none}}`}</style>
    </div>
  )
}
