import type { Ride } from './passages'

/**
 * ============================================ pass D — ההליכה האחרונה (28.9.2026) ====
 *
 * `IMPLEMENTATION-PASS-PROGRAMMER-2026-09-27` §63 S5: *"callbacks: shoulders, shirt, Ussishkin,
 * promise, child/no-child, work, route · the last line belongs to Kobi/Pogi, not trophy stats"*.
 *
 * אחרי התשובה של F04 (`f-back`) הם הולכים. אותו ציור של מחוץ לאולם (`botevgradOut2026`),
 * עומד (`still`), וכל עצירה היא דבר אחד מהחיים שעברו — המדרגה שבה קובי מאט (הכתפיים של
 * 1983), החולצה מתחת למעיל, הטלפון בכיס (הילד, או ההבטחה), והשלט בקירילית מעל הכניסה (מה
 * שהוא עושה היום, ומה שנהרס ב-2007). כל עצירה היא שיחה של הפרק (`chapter2026finale.ts`),
 * והשיחה קוראת את החיים: לחיים שלא היה בהם הדבר הזה יש שורה משלהם, לא שתיקה.
 *
 * העצירה האחרונה היא הרחוב; הנחיתה מרימה `f:walked`, ושם — ב-`f-last` — המילה האחרונה
 * של קובי ושל פוגי, ורק אחריה הכרטיס.
 */
export const RIDE_WALK_26: Ride = {
  id: 'walk-26',
  art: 'botevgradOut2026',
  titleHe: 'אחרי',
  hintHe: 'הולכים לאט. מה שנדלק — לגעת בו.',
  still: true,
  radio: false,
  stops: [
    { id: 'step', spot: { x: 0.42, y: 0.72 }, verb: 'hold', labelHe: 'המדרגה ביציאה', gapMs: 1400, autoMs: 9000, conversation: 'f-walk-step' },
    { id: 'shirt', spot: { x: 0.27, y: 0.7 }, verb: 'look', labelHe: 'מה שמתחת למעיל', gapMs: 2600, autoMs: 9000, conversation: 'f-walk-shirt' },
    { id: 'phone', spot: { x: 0.62, y: 0.68 }, verb: 'hold', labelHe: 'הטלפון בכיס', gapMs: 2800, autoMs: 9000, conversation: 'f-walk-phone' },
    { id: 'sign', spot: { x: 0.43, y: 0.28 }, verb: 'look', labelHe: 'השלט בקירילית', gapMs: 2800, autoMs: 9000, conversation: 'f-walk-sign' },
    { id: 'road', spot: { x: 0.86, y: 0.66 }, verb: 'watch', labelHe: 'הרחוב, מתרוקן', gapMs: 2600, autoMs: 8000, conversation: 'f-walk-road' },
  ],
  land: { mapId: 'arena-out', spawn: 'fromSeats' },
  flags: ['f:walked'],
}

export const RIDES_PASS_D: Record<string, Ride> = { [RIDE_WALK_26.id]: RIDE_WALK_26 }
