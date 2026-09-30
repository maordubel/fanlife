import type { RandomEncounter } from '../encounters'

import { TIP_OFF } from './chapter1991'

/**
 * מה יכול לקרות לך ביום שני — rolled off the seed, like the two Saturdays, and about a
 * neighbourhood on an ordinary weekday that happens to have a game in it at night.
 *
 * Nothing here states a fact about the derby, and nothing here can end anything. An
 * encounter is a sentence and a small consequence; the chapter is not allowed to hinge
 * on one, because a lottery that changes a life is not a life.
 */
export const ENCOUNTERS_1991: RandomEncounter[] = [
  {
    id: 'street-scooter-1991',
    era: '1991',
    locations: ['street', 'ussishkin-outside'],
    weight: 5,
    cooldown: 45,
    lineHe: 'קטנוע עובר לאט, עם שני אנשים עליו ושקית תלויה מהכידון. הנהג מרים סנטר למישהו שאתה לא רואה.',
    who: null,
    effects: [{ e: 'redheart', key: 'community', delta: 2 }],
  },
  {
    id: 'street-kids-1991',
    era: '1991',
    locations: ['street', 'schoolyard'],
    weight: 5,
    cooldown: 40,
    lineHe: 'שלושה ילדים עם תיקים על כתף אחת רצים לכיוון ההפוך. אחד מהם צועק לך משהו שנשמע כמו "הערב".',
    who: null,
    effects: [{ e: 'wellbeing', key: 'belonging', delta: 3 }],
  },
  {
    id: 'street-radio-1991',
    era: '1991',
    locations: ['street', 'ussishkin-outside'],
    weight: 6,
    cooldown: 50,
    requirements: [{ afterMinute: TIP_OFF - 90 }],
    lineHe: 'חלון פתוח בקומה שנייה, ומתוכו רדיו. לא מוזיקה — מישהו מדבר מהר, ואישה עונה לו מהמטבח.',
    who: null,
    effects: [{ e: 'redheart', key: 'basketballLove', delta: 2 }],
  },
  {
    id: 'yard-teacher-1991',
    era: '1991',
    locations: ['schoolyard'],
    weight: 4,
    lineHe: 'מורה אחרת חוצה את החצר עם ערימת מחברות. היא עוצרת עליך חצי צעד, ואז ממשיכה.',
    who: null,
    effects: [{ e: 'wellbeing', key: 'stress', delta: 2 }],
  },
  {
    // The first `@crowd` encounter in the game: whoever the neighbourhood sends today.
    id: 'street-known-1991',
    era: '1991',
    locations: ['street', 'ussishkin-outside', 'kiosk'],
    weight: 6,
    cooldown: 55,
    lineHe: 'מה קורה פוגי. תגיד לאבא שלך שאני שאלתי.',
    who: '@crowd',
    effects: [
      { e: 'redheart', key: 'community', delta: 3 },
      { e: 'wellbeing', key: 'belonging', delta: 3 },
    ],
  },
  {
    id: 'coin-1991',
    era: '1991',
    locations: ['street', 'schoolyard'],
    weight: 3,
    lineHe: 'מטבע על המדרכה, חצי בתוך סדק. לוקח לך שלוש נסיעות עם הציפורן להוציא אותו.',
    who: null,
    effects: [
      { e: 'money', agorot: 200, why: 'מהמדרכה' },
      { e: 'give', item: 'coin' },
    ],
  },
]
