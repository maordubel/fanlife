import type { RandomEncounter } from '../encounters'

/**
 * מפגשים אקראיים לשנות התשעים — the life between the missions.
 *
 * None of these is canonical history and none can unlock/close a main route. They are
 * small, seeded, reload-safe incidents that make the same street feel inhabited by a
 * different decade: somebody asks for change, an old supporter recognizes Kobi in you,
 * a kid needs directions, a scarf changes hands. Their job is texture + biography.
 */
export const ENCOUNTERS_STAGE_B: readonly RandomEncounter[] = [
  {
    id: '93g-north-map', era: '1993-galil', locations: ['route', 'street'], weight: 3,
    lineHe: 'מישהו פורס מפה מקומטת על מכסה מנוע ומתווכח איפה בדיוק פונים צפונה. אף אחד לא באמת יודע, וכולם מדברים בביטחון.',
    who: null,
    effects: [{ e: 'redheart', key: 'travelDrive', delta: 1 }, { e: 'personality', key: 'curiosity', delta: 1 }],
  },
  {
    id: '93g-last-sandwich', era: '1993-galil', locations: ['route', 'kiosk'], weight: 2,
    lineHe: 'נשאר כריך אחד. מישהו חוצה אותו לשניים בלי לשאול מי שילם עליו.',
    who: null,
    effects: [{ e: 'redheart', key: 'community', delta: 2 }],
  },
  {
    id: '95-kiosk-old-seven', era: '1995-sinai', locations: ['kiosk', 'street'], weight: 3,
    lineHe: 'איש מבוגר ליד הקיוסק מסתכל עליך ואומר: "אתם הצעירים רבים על אנשים. אנחנו רבנו על אותם אנשים בדיוק, רק צעירים יותר."',
    who: 'אוהד ותיק',
    effects: [{ e: 'redheart', key: 'historyMemory', delta: 1 }],
  },
  {
    id: '95-wall-marker', era: '1995-sinai', locations: ['street'], weight: 2,
    lineHe: 'טוש אדום מונח פתוח ליד קיר שכבר כתבו עליו. אתה מרים אותו, סוגר את המכסה, ומשאיר אותו שם.',
    who: null,
    effects: [{ e: 'personality', key: 'responsibility', delta: 1 }],
  },
  {
    id: '96-soldier-cigarette', era: '1996-army', locations: ['street', 'bloomfield-outside'], weight: 3,
    lineHe: 'חייל שאתה לא מכיר מבקש אש. כשהוא רואה את הצעיף הוא רק אומר: "שחררו אותך בשביל זה? יפה."',
    who: 'חייל',
    effects: [{ e: 'redheart', key: 'familyTradition', delta: 1 }],
  },
  {
    id: '96-gate5-paint', era: '1996-army', locations: ['bloomfield-outside'], weight: 4,
    lineHe: 'שני צעירים גוררים שקית עם צבע ומברשות לכיוון שער 5. אחד מהם שואל אם אתה יכול להחזיק רגע את הבד שלא יגע ברצפה.',
    who: 'אוהד',
    effects: [{ e: 'redheart', key: 'terraceCulture', delta: 2 }, { e: 'personality', key: 'curiosity', delta: 1 }],
  },
  {
    id: '96-bus-directions', era: '1996-army', locations: ['route'], weight: 2,
    lineHe: 'מישהו עם קיטבג גדול ממך שואל איזה קו יוצא מכאן דרומה. אתה מסביר, ואז בודק את עצמך פעם נוספת.',
    who: 'חייל',
    effects: [{ e: 'redheart', key: 'travelDrive', delta: 1 }],
  },
  {
    id: '97-hall-crate', era: '1997-basket', locations: ['street', 'kiosk'], weight: 3,
    lineHe: 'ארגז שתייה נשמט ליד המדרכה. שלושה אנשים מרימים אותו בלי לדבר, ואתה הרביעי.',
    who: null,
    effects: [{ e: 'redheart', key: 'community', delta: 2 }, { e: 'personality', key: 'responsibility', delta: 1 }],
  },
  {
    id: '97-old-ticket', era: '1997-basket', locations: ['street'], weight: 2,
    lineHe: 'כרטיס ישן נתקע ליד הנעל שלך. התאריך דהוי. אתה מחזיר אותו לאיש שחיפש בכיסים.',
    who: null,
    effects: [{ e: 'redheart', key: 'historyMemory', delta: 2 }],
  },
  {
    id: '98-radio-window', era: '1998-laces', locations: ['street', 'kiosk'], weight: 4,
    lineHe: 'מחנות פתוחה נשמע רדיו. שלושה אנשים שלא מכירים זה את זה עומדים מתחת לרמקול כאילו מישהו הזמין אותם.',
    who: null,
    effects: [{ e: 'flag', flag: 'life:98:heard-street-radio' }],
  },
  {
    id: '98-kid-question', era: '1998-laces', locations: ['bloomfield-outside'], weight: 2,
    lineHe: 'ילד קטן מושך לאבא שלו בשרוול ושואל: "אבל אם ניצחנו, למה כולם עוד מקשיבים לרדיו?" האבא לא עונה מיד.',
    who: null,
    effects: [{ e: 'redheart', key: 'historyMemory', delta: 1 }],
  },
  {
    id: '99-list-pencil', era: '1999-basket', locations: ['kiosk'], weight: 3,
    lineHe: 'מישהו משאיר עיפרון ליד רשימת שמות על הדלפק. אתה מחדד אותו בסכין של רפי ומחזיר למקום.',
    who: null,
    effects: [{ e: 'redheart', key: 'community', delta: 1 }, { e: 'personality', key: 'responsibility', delta: 1 }],
  },
  {
    id: '99-gate5-name', era: '1999-cup', locations: ['bloomfield-outside', 'street'], weight: 3,
    lineHe: 'מישהו משער 5 קורא לך בשם לפני שאתה מזהה אותו. זה חדש, ואתה לא בטוח אם אתה אוהב את זה.',
    who: 'אוהד',
    effects: [{ e: 'wellbeing', key: 'belonging', delta: 2 }, { e: 'redheart', key: 'terraceCulture', delta: 1 }],
  },
  {
    id: '99-kobi-coffee', era: '1999-cup', locations: ['kiosk'], weight: 2,
    lineHe: 'קובי כבר שתה את הקפה שלו. הוא משאיר לידך את הכוס השנייה בלי להגיד שהזמין גם בשבילך.',
    who: 'קובי',
    effects: [{ e: 'rel', who: 'kobi', axis: 'sharedHistory', delta: 2 }],
  },
  {
    id: '00-scarf-kid', era: '2000-title', locations: ['street', 'bloomfield-outside'], weight: 3,
    lineHe: 'ילד עם צעיף גדול מדי שואל אותך איפה כולם נפגשים. לרגע אתה שומע את עצמך עונה כמו קובי.',
    who: 'ילד',
    effects: [{ e: 'redheart', key: 'familyTradition', delta: 2 }, { e: 'remember', who: 'kobi', eventId: 'sounded-like-kobi-2000', significance: 'notable' }],
  },
  {
    id: '00-work-call', era: '2000-double', locations: ['street', 'kiosk'], weight: 3,
    lineHe: 'הטלפון מצלצל בדיוק כשמישהו אומר "עזוב עבודה, יש גמר". אתה מסתכל על שניהם לפני שאתה עונה.',
    who: null,
    effects: [{ e: 'wellbeing', key: 'stress', delta: 1 }],
  },
  {
    id: '00-two-homes', era: '2000-double', locations: ['street'], weight: 2,
    lineHe: 'אפי עובר מולך עם שקית מהאולם. מישהו משער 5 קורא לך מהצד השני. שניהם ממשיכים ללכת כאילו ברור שתבחר כיוון.',
    who: null,
    effects: [{ e: 'redheart', key: 'community', delta: 1 }, { e: 'redheart', key: 'basketballLove', delta: 1 }],
  },
]

export function encountersForStageB(chapter: string): readonly RandomEncounter[] {
  return ENCOUNTERS_STAGE_B.filter((encounter) => encounter.era === chapter)
}
