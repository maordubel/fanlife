import { chosenOutfit } from '../matchRitual'
import { onSale, outfitFlag, wornIn } from '../shirts'
import type { LifeState } from '../types'
import type { Condition } from '../world/types'
import type { FollowUp } from './followUps'

/**
 * החולצה זוכרת — the wardrobe decision, seen again (delta 93, brief §32–§33).
 *
 * The pre-match ritual (delta 92) records what he wore as `own:outfit:<chapter>`. Somebody
 * who was there notices it later — once, in the mouth of the person he walks back up to
 * (a REACTION follow-up), never as a stat. Not every match: five lines across a life.
 */

/** did he wear this shirt to this chapter's match — the choice, or the day's record */
export function woreShirt(state: LifeState, chapter: string, shirtId: string): boolean {
  const chosen = chosenOutfit(state, chapter)
  if (chosen && chosen !== 'plain' && chosen.id === shirtId) return true
  return wornIn(state, shirtId).includes(chapter)
}

/** the same question as a condition, for content */
export const woreWhen = (chapter: string, shirtId: string): Condition => ({ flagIs: { flag: outfitFlag(chapter), value: shirtId } })

/** he chose the same shirt for both days — one row per shirt that existed on the first */
export function sameShirtAs(earlier: string, now: string): Condition {
  return { any: onSale(earlier).map((shirt) => ({ all: [woreWhen(earlier, shirt.id), woreWhen(now, shirt.id)] })) }
}

export const FOLLOW_UPS_SHIRTS: readonly FollowUp[] = [
  // אבא, על החולצה הראשונה — "עוד יש לך אותה?"
  ...(['1986', '1990', '1993-cup'] as const).map(
    (chapter): FollowUp => ({
      id: `fu-shirt-kobi-still-${chapter}`,
      chapter,
      npc: 'kobi',
      cls: 'REACTION',
      // the first shirt, whichever it was in this life: the gift (visa86) or one bought before 27.9.2026
      when: { any: [woreWhen(chapter, 'visa86'), woreWhen(chapter, 'tveria85')] },
      lines: [{ who: 'קובי', text: 'עוד יש לך אותה?' }],
    }),
  ),
  // חבר — the same shirt to two finals
  {
    id: 'fu-shirt-ofir-final',
    chapter: '1999-cup',
    npc: 'ofir',
    cls: 'REACTION',
    when: sameShirtAs('1993-cup', '1999-cup'),
    lines: [{ who: 'אופיר', text: 'את זאת לבשת בגמר.' }],
  },
  {
    id: 'fu-shirt-efi-up',
    chapter: '2025-eurocup',
    npc: 'efi',
    cls: 'REACTION',
    when: sameShirtAs('2009-up', '2025-eurocup'),
    lines: [{ who: 'אפי', text: 'את זאת לבשת כשעלינו. אל תכבס אותה היום.' }],
  },
  // 2026 — the first shirt, forty years on, and the man who paid for it at the counter
  {
    id: 'fu-shirt-kobi-gift-2026',
    chapter: '2026-finale',
    npc: 'kobi',
    cls: 'REACTION',
    when: { all: [woreWhen('2026-finale', 'visa86'), { flag: 'life:first-shirt:gift' }] },
    lines: [{ who: 'קובי', text: 'את זאת אני קניתי. בסוף לא נתתי לך לשלם, נכון?' }],
  },
]
