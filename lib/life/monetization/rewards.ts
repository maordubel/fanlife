import type { Reward } from './types'

/**
 * ארכיון נוסף — the only thing an advertisement may ever buy in this game.
 *
 * The plan is explicit and it matches what this project already believes: a rewarded ad
 * may never open a mission, a relationship, money, a consequence or an ending. What is
 * left is the one thing THE WORKER has more of than it can fit into a chapter — archive
 * material. A photograph, a clipping, a line from somebody who was there.
 *
 * Two rules hold this list honest:
 *
 *   1. **Every item is bonus.** Removing all of them changes no objective, no ending and
 *      no flag any chapter reads. The flags are `archive:` and nothing gates on them.
 *   2. **Nothing here is needed to understand the story.** If a fact is required to follow
 *      what happened, it belongs in the chapter, not behind a sponsor.
 */
export const REWARDS: readonly Reward[] = [
  {
    id: 'archive-1986-morning',
    chapter: '1986',
    titleHe: 'עוד משהו מהערב הזה',
    bodyHe: 'מה שהעיתונים כתבו למחרת בבוקר — הכותרת, והשורה הקטנה מתחתיה.',
    flag: 'archive:1986:morning',
  },
  {
    id: 'archive-1990-yavne',
    chapter: '1990',
    titleHe: 'מה שקרה ביבנה',
    bodyHe: 'המגרש השני של אותו יום, כפי שהוא נרשם — ומתי בדיוק כל דבר קרה שם.',
    flag: 'archive:1990:yavne',
  },
  {
    id: 'archive-1998-after',
    chapter: '1998-laces',
    titleHe: 'אחרי המשחק',
    bodyHe: 'מה שנאמר באותו ערב, ומה שנכתב אחר כך — שני הדברים, זה לצד זה.',
    flag: 'archive:1998:after',
  },
]

export const rewardsFor = (chapter: string) => REWARDS.filter((one) => one.chapter === chapter)
export const rewardById = (id: string) => REWARDS.find((one) => one.id === id) ?? null
