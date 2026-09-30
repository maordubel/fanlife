import type { LocationId } from '../types'

import type { HotspotDef } from './scenes'
import type { Condition } from './types'

/**
 * ============================================ המבוגר עושה — הנקודות בעולם (90-E) ====
 *
 * `NARRATIVE-QUEST-DESIGN-PASS-v2` §13: *"existing world hotspot / opportunity / activity /
 * StoryChore / Passage / minigame / route performs the verb"*. אלה הנקודות שהפרקים 2016,
 * 2023 ו-2026 מדליקים בחדרים — מסירה ביד, מקור שבודקים, ציוד שאוספים, כרטיס שמשריינים —
 * כל אחת עם `when` שנפתח מההתחייבות ונסגר מהמעשה, כך שהחדר מראה רק את מה שאפשר לעשות
 * **עכשיו** (§12 A).
 *
 * הן נכנסות לחדר או לציור שהחדר עומד עליו באותה שנה, בלולאה אחת ב-`scenes.ts` — אותו
 * מנגנון של `STAGED` לאנשים. התוכן (השיחות) בקבצי הפרקים; כאן רק המקום.
 */

const f = (flag: string): Condition => ({ flag })
const no = (flag: string): Condition => ({ notFlag: flag })
const is = (flag: string, value: string | number): Condition => ({ flagIs: { flag, value } })
const all = (...conditions: Condition[]): Condition => ({ all: conditions })

export const QUEST_SPOTS: Partial<Record<LocationId, HotspotDef[]>> = {
  'bloomfield-outside': [
    // 2018 · R02 — השלט החדש, למי שביקש למצוא דרך יחד (`r-find`)
    { id: 'r-sign', era: '2018-return', x: 0.3, y: 0.8, w: 0.06, act: 'r-find', verb: 'look', labelHe: 'השלט החדש, ליד הכניסה', when: all(is('r:find', 'reading'), no('r:signs')), priority: 3 },
  ],
  gate5: [
    // 2012 · N03 — שני הדפים של פרדי, ואז השאלה (`n-ask`); או המפגש שנלקח (`n-meeting`)
    { id: 'n-page-vote', era: '2012-five', x: 0.44, y: 0.9, w: 0.05, act: 'n-page-vote', verb: 'look', labelHe: 'הדף הראשון — מי מצביע', when: all(is('n:gov', 'reading'), no('n:page:vote')), priority: 3 },
    { id: 'n-page-money', era: '2012-five', x: 0.6, y: 0.9, w: 0.05, act: 'n-page-money', verb: 'look', labelHe: 'הדף השני — מי משלם', when: all(is('n:gov', 'reading'), no('n:page:money')), priority: 3 },
    { id: 'n-ask', era: '2012-five', x: 0.5, y: 0.84, w: 0.05, act: 'n-ask', verb: 'talk', labelHe: 'פרדי — השאלה שלך', when: all(is('n:gov', 'reading'), f('n:page:vote'), f('n:page:money'), no('n:own')), priority: 3 },
    { id: 'n-meet', era: '2012-five', x: 0.5, y: 0.84, w: 0.05, act: 'n-meeting', verb: 'talk', labelHe: 'המפגש — לפתוח אותו', when: all(is('n:gov', 'meeting'), no('n:own')), priority: 3 },
  ],
  rehearsal: [
    // 2012 · N04 — לשאול כל אחד מה הוא עשה, ואז הדף על הדלת (`n-credit-done`)
    { id: 'n-cr-melamed', era: '2012-five', x: 0.2, y: 0.64, w: 0.05, act: 'n-cr-melamed', verb: 'talk', labelHe: 'מלמד — מה לכתוב', when: all(is('n:credit', 'writing'), no('n:cr:melamed')), priority: 3 },
    { id: 'n-cr-neta', era: '2012-five', x: 0.44, y: 0.62, w: 0.05, act: 'n-cr-neta', verb: 'talk', labelHe: 'נטע — מה לכתוב', when: all(is('n:credit', 'writing'), no('n:cr:neta')), priority: 3 },
    { id: 'n-cr-gur', era: '2012-five', x: 0.58, y: 0.64, w: 0.05, act: 'n-cr-gur', verb: 'talk', labelHe: 'גור — מה לכתוב', when: all(is('n:credit', 'writing'), no('n:cr:gur')), priority: 3 },
    { id: 'n-cr-yonatan', era: '2012-five', x: 0.69, y: 0.66, w: 0.05, act: 'n-cr-yonatan', verb: 'talk', labelHe: 'יונתן — מה לכתוב', when: all(is('n:credit', 'writing'), no('n:cr:yonatan')), priority: 3 },
    { id: 'n-cr-door', era: '2012-five', x: 0.33, y: 0.66, w: 0.05, act: 'n-credit-done', verb: 'hold', labelHe: 'הדף — לתלות על הדלת', when: all(is('n:credit', 'writing'), no('n:room')), priority: 2 },
  ],
  home: [
    // 2021 · L09 — הדף של המשחק שלו, מתחת ליומן שעל המקרר (`pr-his`)
    { id: 'pr-his', era: '2021-promises', x: 0.31, y: 0.6, w: 0.05, act: 'pr-his', verb: 'look', labelHe: 'הדף של המשחק שלו', when: all(is('pr:ask', 'checking'), no('pr:saw:his')), priority: 3 },
  ],
  kiosk: [
    // 2024 · H24a — הלוח על הקיר: ארבעה פתקים, כל אחד לעמודה (`h24-card-1`…`h24-card-done`)
    { id: 'h24-board', era: '2024-home', x: 0.7, y: 0.9, w: 0.06, act: 'h24-card-1', verb: 'take', labelHe: 'הלוח — ארבעה פתקים', when: all(f('h24:rumor'), no('h24:board')), priority: 4 },
    // 2021 · L09 — לוח המשחקים ליד הדלפק (`pr-ours`)
    { id: 'pr-ours', era: '2021-promises', x: 0.7, y: 0.9, w: 0.06, act: 'pr-ours', verb: 'look', labelHe: 'לוח המשחקים', when: all(is('pr:ask', 'checking'), no('pr:saw:ours')), priority: 3 },
    // 2016 · P01 — שני מקורות ושמועה, ואז: מה פוגי מעביר (`p-repeat`)
    { id: 'p-src-doc', era: '2016-crisis', x: 0.82, y: 0.9, w: 0.06, act: 'p-src-doc', verb: 'take', labelHe: 'הדף של פרדי', when: is('p:info', 'checking'), priority: 3 },
    { id: 'p-src-news', era: '2016-crisis', x: 0.47, y: 0.9, w: 0.06, act: 'p-src-news', verb: 'watch', labelHe: 'החדשות בטלוויזיה', when: is('p:info', 'checking'), priority: 3 },
    { id: 'p-src-rumour', era: '2016-crisis', x: 0.35, y: 0.9, w: 0.05, act: 'p-src-rumour', verb: 'take', labelHe: 'הטלפון של אופיר', when: is('p:info', 'checking'), priority: 2 },
    { id: 'p-repeat', era: '2016-crisis', x: 0.65, y: 0.9, w: 0.06, act: 'p-repeat', verb: 'talk', labelHe: 'עמית — מה מעבירים הלאה', when: is('p:info', 'checking'), priority: 2 },
  ],
  'drive-in': [
    // 2015 · N06 — "הפעם אני בדקתי": השלט בתחנה, לפני שאבא שואל
    { id: 'nr-check', era: '2015-newhall', x: 0.2, y: 0.82, w: 0.06, act: 'nr-check', verb: 'look', labelHe: 'השלט בתחנה ליד החניה', when: all(f('nr:hall'), no('nr:checked')), priority: 3 },
  ],
  'ticket-office': [
    // 2026 · F01 — הקופה (כרטיסים), הטלפון לילד (רק למי שיש), והקיר עם שלוש הדרכים
    { id: 'f-counter', era: '2026-plan', x: 0.34, y: 0.9, w: 0.06, act: 'f-tickets', verb: 'buy', labelHe: 'הקופה — הקצאת אוהדי חוץ, בוטבגרד', when: all(f('f:money'), no('f:tickets')), priority: 3 },
    { id: 'f-call-child', era: '2026-plan', x: 0.2, y: 0.9, w: 0.05, act: 'f-child', verb: 'take', labelHe: 'הטלפון — לשאול את הילד', when: all(f('f:money'), f('life:child'), no('f:asked'), no('f:tickets')), priority: 3 },
    { id: 'f-routes', era: '2026-plan', x: 0.72, y: 0.9, w: 0.06, act: 'f-route', verb: 'look', labelHe: 'שלוש דרכים לבוטבגרד — על הקיר', when: all(f('f:money'), no('life:finale:route'), { none: [is('f:funding', 'preparation')] }), priority: 3 },
  ],
  'community-room': [
    { id: 'p-report', era: '2016-crisis', x: 0.45, y: 0.7, w: 0.07, act: 'p-report', verb: 'talk', labelHe: 'מתוקי — להחזיר את הרשימה', when: all(f('p:commit'), no('p:deliver')), priority: 3 },
  ],
  // (27.9.2026) both chapters stand on `street10` — the green door is the narrow one beside the kiosk (0.39–0.41)
  street: [
    // 2026 · F00 → F01 — אבא הולך הביתה לפניך, ובדרך רואים איך
    { id: 'f-pace-seen', era: '2026-plan', x: 0.55, y: 0.74, w: 0.06, act: 'f-pace-seen', verb: 'watch', labelHe: 'אבא, בדרך הביתה', when: all(f('f:money'), no('f:saw:pace'), no('f:plan')), priority: 2 },
    { id: 'p-drop-a', era: '2016-crisis', x: 0.395, y: 0.725, w: 0.05, act: 'p-drop-a', verb: 'take', labelHe: 'הדלת הירוקה — שלמה, קומה שנייה', when: all(f('p:carry:a'), no('p:hand:a'), no('p:a-moved')), priority: 3 },
  ],
  pitch: [
    // 2021 · L09 — חזרה אליו עם שתי השעות (מי שהלך באמצע השיחה)
    { id: 'pr-back', era: '2021-promises', x: 0.46, y: 0.72, w: 0.05, act: 'pr-answer', verb: 'talk', labelHe: 'הילד — עם התשובה', when: all(is('pr:ask', 'checking'), f('pr:saw:his'), f('pr:saw:ours'), no('pr:scarf')), priority: 3 },
    // 2023 · Z01 — הטלפון, התיק, הדף של קובי: כל אחד נדלק כשהקודם נעשה
    { id: 'z-phone', era: '2023-tournament', x: 0.3, y: 0.7, w: 0.05, act: 'z-invite', verb: 'take', labelHe: 'הטלפון — להודיע לחבורה', when: all(f('z:role'), no('z:invited'), { none: [is('z:tournament', 'social')] }), priority: 3 },
    { id: 'z-bag', era: '2023-tournament', x: 0.22, y: 0.66, w: 0.06, act: 'z-kit', verb: 'take', labelHe: 'התיק של הציוד', when: all(f('z:sub'), no('z:kit')), priority: 3 },
    { id: 'z-lineup', era: '2023-tournament', x: 0.78, y: 0.68, w: 0.05, act: 'z-rotate', verb: 'look', labelHe: 'הדף של קובי — מי יוצא ראשון', when: all(f('z:kit'), no('z:kickoff')), priority: 3 },
    { id: 'p-drop-b', era: '2016-crisis', x: 0.86, y: 0.66, w: 0.06, act: 'p-drop-b', verb: 'take', labelHe: 'לבני, על הספסל — החבילה', when: all(f('p:carry:b'), no('p:hand:b')), priority: 3 },
  ],
  allenby: [
    // 2012 · N02 — המתנדב החדש, למי שהלך באמצע ההיכרות (`n-mentor`)
    { id: 'n-volunteer', era: '2012-five', x: 0.56, y: 0.78, w: 0.05, act: 'n-mentor', verb: 'talk', labelHe: 'המתנדב החדש, עם הטופס', when: all(is('n:mentor', 'pending'), no('n:five')), priority: 3 },
    { id: 'p-drop-a2', era: '2016-crisis', x: 0.22, y: 0.75, w: 0.05, act: 'p-drop-a2', verb: 'take', labelHe: 'מעל בית הקפה — שלמה, אצל הבת', when: all(f('p:a-moved'), no('p:hand:a')), priority: 3 },
    { id: 'p-drop-c', era: '2016-crisis', x: 0.7, y: 0.75, w: 0.05, act: 'p-drop-c', verb: 'take', labelHe: 'הדלת ליד בית הקפה — אורנה', when: all(f('p:carry:c'), no('p:hand:c')), priority: 3 },
  ],
}
