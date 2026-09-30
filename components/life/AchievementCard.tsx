'use client'

import { t, type MessageKey } from '@/lib/i18n'
import { useDialog } from '@/components/ui/useDialog'
import { REWARD_KIND_HE, type Achievement } from '@/lib/life/achievements'

/**
 * הכרטיס שנמסר — what the player sees the second an achievement becomes true.
 *
 * `MemoryStamp` already wrote down the rule this screen is under, and it is a rule about
 * TONE rather than taste: *"ברגע שיש הישג יש גם השלמה, וברגע שיש השלמה יש כישלון. החיים
 * אינם רשימה שממלאים."* So this is deliberately not the thing 63ב made legal. It is the
 * same printed sheet `Stamp` hands a ticket over on, one size up, because unlike a toast
 * it has two things to say: what you did, and what you are being given for it.
 *
 * What is NOT on it, and none of it by accident:
 *
 *  · **No score, no percentage, no bar, no "3 מתוך 30".** The deed already paid (the
 *    spec: *"אין תשלום כפול בנקודות על פעולה ואז על ההישג של אותה פעולה"*), and a counter
 *    would turn thirty separate recognitions into one ladder — which is the single thing
 *    rule 46 keeps `pure-love.ts` locked against.
 *  · **No share button.** The spec: *"אין פרס על שיתוף לרשת חברתית, ואין חובה לשתף כדי
 *    לקבל תוכן."* Sharing lives on the objects themselves, in `ShareSheet`, where the
 *    player goes looking for it rather than being offered it at the moment he is pleased.
 *  · **No confetti, no trophy, no "unlocked".** The kicker says it was written down.
 *
 * The reward is the bottom half of the card and it is named by KIND, because the spec
 * requires all five kinds to appear in the script and a card that prints the kind is a
 * card a writer cannot quietly turn into five variations of "a thing in a box".
 *
 * Rule 33: `role="dialog"` at `z-[60]`, above the tab bar's `z-50`. Rule 42: leaving is
 * always allowed — the X and Escape do the same thing and neither applies anything.
 */

/**
 * מפתחות שנבנים בזמן ריצה (כלל 32).
 *
 * The achievement layer's chrome lives under one prefix and is resolved through this
 * helper rather than as thirty literal `t('life.ach.…')` calls, which is the same shape
 * `uss.cat.${card.cat}` already uses. `tests/life-achievements.test.ts` is what checks
 * the keys instead of the static resolver, because rule 32 is explicit that a runtime key
 * is not pretended to be statically checkable — and a guard that was bypassed has to be
 * replaced, not dropped.
 */
export const achKey = (name: string) => `life.ach.${name}` as MessageKey
const ach = (name: string) => t(achKey(name))

export function AchievementCard({
  achievement,
  onClose,
}: {
  achievement: Achievement
  onClose: () => void
}) {
  const dialogRef = useDialog<HTMLDivElement>(onClose)

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={achievement.titleHe}
      className="pointer-events-auto absolute inset-0 z-[60] flex items-center justify-center bg-ink/90 p-gutter outline-none"
      data-life="achievement-card"
    >
      <div className="animate-ticket-in w-full max-w-sm border-rule border-ink bg-sheet">
        {/* מה שעשית */}
        <div className="px-5 pt-5">
          <span className="block w-fit bg-red px-1.5 py-0.5 font-sign text-[10px] leading-none text-sheet">
            <bdi>{ach('kicker')}</bdi>
          </span>
          <h2 className="mt-3 font-display text-[24px] leading-none text-ink">
            <bdi>{achievement.titleHe}</bdi>
          </h2>
          <span className="mt-3 block h-[3px] w-14 origin-center animate-rule-draw bg-red" aria-hidden="true" />
        </div>

        {/* הפרס — a thing in the world, named by its kind */}
        <div className="mt-5 border-t-hair border-ink/25 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums text-ink/55">
            <bdi>
              {ach('reward')} · {REWARD_KIND_HE[achievement.reward.kind]}
            </bdi>
          </p>
          <p className="mt-2 font-display text-[16px] leading-snug text-ink">
            <bdi>{achievement.reward.titleHe}</bdi>
          </p>
          <p className="mt-1.5 font-body text-[12px] leading-snug text-ink/70">
            <bdi>{achievement.reward.noteHe}</bdi>
          </p>
        </div>

        <div className="flex justify-end border-t-hair border-ink/25 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            data-life="achievement-close"
            className="flex min-h-tap items-center border-hair border-ink/40 px-4 font-body text-[12px] text-ink transition-colors duration-press active:bg-red active:text-sheet motion-reduce:transition-none"
          >
            {ach('close')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * A run can make more than one true in the same beat — buying the shirt with your own
 * wages and with your father's five shekels is two rows off one purchase, and the spec
 * says so in the ACH_SHIRT_GIFT line itself. They are shown ONE AT A TIME, in order,
 * because two cards at once is a list and a list is the thing this whole layer refuses
 * to be.
 */
export function AchievementQueue({
  queue,
  onDismiss,
}: {
  queue: readonly Achievement[]
  onDismiss: (id: string) => void
}) {
  const head = queue[0]
  if (!head) return null
  return <AchievementCard achievement={head} onClose={() => onDismiss(head.id)} />
}
