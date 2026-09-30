'use client'

import { Num } from '@/components/ui/Num'
import { REPLAY_ACTIONS, type ReplayAction } from '@/lib/game/replay/vocab'
import type { UserTouch } from '@/lib/game/replay/envelope'
import { t, type MessageKey } from '@/lib/i18n'

/**
 * שורת הפעולות — what is left of the old four-row builder (delta 88).
 *
 * Maor, 24.9.2026: *"נורא 'לחיצה' משעממת"*. The who / from / to decisions are now made with
 * the hands on the pitch (`components/press/GoalPitch.tsx`, `lib/game/replay/gesture.ts`),
 * and the VERB is read off the gesture. This strip is the one place a verb is still chosen
 * by tapping — to correct the reading, or to pick it before the drag — and the numbered
 * chips at its head re-open a finished touch. One line, swiped sideways, never wrapped on a
 * phone (rule 41's "a name you cannot see is not an option" is why every verb carries its
 * drawn mark AND its word).
 */

export const ACTION_LABEL: Record<ReplayAction, MessageKey> = {
  pass: 'goal.action.pass',
  throughBall: 'goal.action.throughBall',
  cross: 'goal.action.cross',
  dribble: 'goal.action.dribble',
  shot: 'goal.action.shot',
  header: 'goal.action.header',
  save: 'goal.action.save',
}

export const ACTION_SHORT: Record<ReplayAction, MessageKey> = {
  pass: 'goal.act.pass',
  throughBall: 'goal.act.throughBall',
  cross: 'goal.act.cross',
  dribble: 'goal.act.dribble',
  shot: 'goal.act.shot',
  header: 'goal.act.header',
  save: 'goal.act.save',
}

/**
 * The verbs, drawn — seven marks in one idiom: a pass is a straight arrow, a ball in behind
 * the same arrow dashed, a cross an arc, carrying it a zigzag, an attempt a spoked burst,
 * a header that burst under a head, a parry a flat palm.
 */
export function ActionGlyph({ action }: { action: ReplayAction }) {
  const paths: Record<ReplayAction, React.ReactNode> = {
    pass: <path d="M3 12 H19 M14 7 L19 12 L14 17" />,
    throughBall: <path d="M3 12 H19 M14 7 L19 12 L14 17" strokeDasharray="3 3" />,
    cross: <path d="M3 17 Q 11 2 19 14 M15 11 L19 14 L18 9" />,
    dribble: <path d="M3 12 L7 7 L11 15 L15 8 L19 12" />,
    shot: (
      <>
        <circle cx="8" cy="12" r="4" />
        <path d="M13 12 H20 M13 8 L20 6 M13 16 L20 18" />
      </>
    ),
    header: (
      <>
        <circle cx="8" cy="8" r="3.4" />
        <path d="M11 11 L19 17 M11 6 L19 4" />
        <path d="M6 13 L7 20" />
      </>
    ),
    save: (
      <>
        <path d="M5 19 V10 a2 2 0 0 1 4 0 V6 a2 2 0 0 1 4 0 v5" />
        <path d="M13 11 a2 2 0 0 1 4 0 v6 a4 4 0 0 1 -4 4 H8" />
      </>
    ),
  }
  return (
    <svg viewBox="0 0 22 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[action]}
    </svg>
  )
}

export function VerbStrip({
  touches,
  editing,
  chosen,
  disabled = false,
  wrap = false,
  showVerbs = true,
  onVerb,
  onEdit,
}: {
  touches: UserTouch[]
  editing: number | null
  /** the verb the focused touch carries now */
  chosen: ReplayAction | null
  disabled?: boolean
  /** desktop: wrap into rows instead of swiping */
  wrap?: boolean
  /** contextual controls (29.9.2026): the verbs appear only once there is a man to act with */
  showVerbs?: boolean
  onVerb: (action: ReplayAction, el: HTMLElement) => void
  onEdit: (index: number) => void
}) {
  if (!showVerbs && touches.length === 0) return null
  return (
    <div
      data-goal="actionRow"
      className={`flex items-stretch gap-1 ${wrap ? 'flex-wrap' : '-mx-3 overflow-x-auto px-3 [scrollbar-width:none]'}`}
    >
      {touches.length > 0 && (
        <ol aria-label={t('goal.touchList')} className="flex shrink-0 gap-1">
          {touches.map((touch, index) => (
            <li key={index} className="shrink-0">
              <button
                type="button"
                onClick={() => onEdit(index)}
                disabled={disabled}
                aria-label={t('goal.editTouch', { n: String(index + 1) })}
                aria-current={editing === index ? 'true' : undefined}
                data-goal="touch"
                className={`flex min-h-tap min-w-[44px] items-center justify-center gap-1 border-rule px-1.5 transition-transform duration-press ease-stamp active:scale-[.94] disabled:opacity-40 motion-reduce:transition-none ${
                  editing === index ? 'border-ink bg-ink text-paper' : 'border-ink bg-sheet text-ink'
                }`}
              >
                <span className="font-poster text-[19px] leading-none">
                  <Num>{index + 1}</Num>
                </span>
                <ActionGlyph action={touch.action} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {showVerbs && touches.length > 0 && <span aria-hidden="true" className="w-px shrink-0 self-stretch bg-ink/30" />}
      {showVerbs && (
      <ul className={`flex gap-1 ${wrap ? 'flex-wrap' : ''}`}>
        {REPLAY_ACTIONS.map((action) => {
          const on = chosen === action
          return (
            <li key={action} className="shrink-0">
              <button
                type="button"
                onClick={(event) => onVerb(action, event.currentTarget)}
                aria-pressed={on}
                disabled={disabled}
                data-goal="action"
                className={`flex min-h-tap shrink-0 items-center gap-1 whitespace-nowrap border-rule border-ink px-2 font-body text-[12px] font-extrabold transition-transform duration-press ease-stamp active:scale-[.94] disabled:opacity-40 motion-reduce:transition-none ${
                  on ? 'bg-red text-paper' : 'bg-sheet text-ink'
                }`}
              >
                <ActionGlyph action={action} />
                {t(ACTION_LABEL[action])}
              </button>
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}
