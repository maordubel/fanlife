import type { LifeEvent } from '../events'

import type { StoryChore } from './storyChores'

/**
 * ============================================ pass D — הידיים של השבת (28.9.2026) ====
 *
 * `IMPLEMENTATION-PASS-PROGRAMMER` §47 S3: *"you also completed something personal"* — ולכן
 * השבת של 2019 בלי המשחק היא עבודה שעושים, לא משפט שבוחרים. הכלים של אילן על המדרכה,
 * אחד אחד לסולם; מה שנאסף הוא כמה ישר המדף יצא, ו-`a-fixed` מגיב לזה.
 *
 * אותו כלי של V3 (`storyChores.ts`), נרשם במרשם בשורת פיזור אחת.
 */
export const SHELF_2019 = 'a:shelf'

export const STORY_CHORES_PASS_D: Record<string, StoryChore> = {
  'shelf-19': {
    id: 'shelf-19',
    where: 'street',
    drop: { x: 0.5, y: 0.86 },
    labelHe: 'הכלים של אילן, על המדרכה',
    shape: { mode: 'collect', art: 'propKeys', target: 5, seconds: 35, hintHe: 'מפתח, ברגים, פלס, דיבלים, מטר. להרים כל אחד ולהביא לסולם. כפתור — לרדת.' },
    returnSpawn: 'start',
    finish: (done, target) => {
      const got = Math.max(0, Math.min(done, target))
      const events: LifeEvent[] = [
        { t: 'flag.set', flag: SHELF_2019, value: got >= target ? 'straight' : got > 0 ? 'crooked' : 'none' },
        { t: 'clock.advanced', minutes: 20 + 5 * got },
      ]
      if (got > 0) events.push({ t: 'energy.changed', delta: -got * 2 })
      if (got >= target) events.push({ t: 'relationship.changed', who: 'neighbour', axis: 'trust', delta: 3 })
      return events
    },
    toastHe: (done, target) => (done >= target ? 'חמישה כלים, מדף אחד, ופלס שאומר ישר.' : done > 0 ? `${done} כלים. המדף עומד — יחסית.` : 'הסולם נשאר ליד הקיר. אילן אמר "מחר".'),
  },
}
