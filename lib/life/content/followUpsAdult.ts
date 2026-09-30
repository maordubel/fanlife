import type { FollowUp } from './followUps'

/**
 * 2007–2026 — the grown-up handoffs, keyed on the PERSON, not on a conversation id.
 *
 * On 25.9.2026 no room of these chapters has a person standing in it to walk back to: every
 * conversation is opened by a beat and carries a choice, so nothing repeats and nothing
 * could say "כבר דיברתם". The chapters are being rebuilt in the same delta into performed
 * quests (the list delivered by hand, the plan shown to Kobi), and those will put people in
 * rooms. These lines are waiting for them: the first time one of these people is pressed a
 * second time while the step is open, he answers the step — whatever his new conversation
 * is called. Each line says only what everybody at that table heard.
 */

export const FOLLOW_UPS_ADULT: FollowUp[] = [
  // ----------------------------------------------------- 2007 · the founding ----
  {
    id: '07-yosef-role',
    chapter: '2007-table',
    npc: 'yosef',
    cls: 'HANDOFF',
    step: 'role',
    lines: [{ who: 'יוסף', text: 'הדף פה, על השולחן. תבחר משהו שאתה מסיים — לא משהו שנשמע טוב.' }],
  },
  {
    id: '07-shachor-role',
    chapter: '2007-table',
    npc: 'shachor',
    cls: 'HANDOFF',
    step: 'role',
    lines: [{ who: 'שחור', text: 'צריך מישהו שמגיע בשמונה. אם זה אתה — תכתוב את השם שלך. אם לא — תגיד.' }],
  },
  {
    id: '07-yosef-deliver',
    chapter: '2007-registered',
    npc: 'yosef',
    cls: 'CHECK-IN',
    step: 'deliver',
    lines: [{ who: 'יוסף', text: 'מה שהבטחת — איפה זה עומד? אני שואל כי ביום ראשון מישהו אחר סופר על זה.' }],
  },
  {
    id: '07-metuki-deliver',
    chapter: '2007-registered',
    npc: 'metuki',
    cls: 'HANDOFF',
    step: 'deliver',
    lines: [{ who: 'מתוקי', text: 'הקלסר אצלי. מה שחסר בו — אצלך. תביא ונסגור.' }],
  },
  {
    id: '07-efi-loss',
    chapter: '2007-registered',
    npc: 'efi',
    cls: 'HANDOFF',
    step: 'loss',
    lines: [{ who: 'אפי', text: 'אוסישקין. היום. אל תשאל אותי למה, פשוט בוא.' }],
  },
  {
    id: '07-shachor-key',
    chapter: '2007-key',
    npc: 'shachor',
    cls: 'HANDOFF',
    step: 'key',
    lines: [{ who: 'שחור', text: 'מחר בשמונה. מי שבא בזמן — מחזיק מפתח. זה כל הסיפור.' }],
  },
  {
    id: '07-inbal-key',
    chapter: '2007-key',
    npc: 'crowd-inbal',
    cls: 'CHECK-IN',
    step: 'key',
    lines: [{ who: 'ענבל', text: 'מי שומר את המפתח? עוד לא ענית לי.' }],
  },

  // ------------------------------------------------------------ 2010 · the double ----
  {
    id: '10-ofir-photo',
    chapter: '2010-cup',
    npc: 'ofir',
    cls: 'HANDOFF',
    step: 'photo',
    lines: [{ who: 'אופיר', text: 'המגרש של החבר\'ה. כולם שם, חסר רק אתה בתמונה.' }],
  },
  {
    id: '10-amit-math',
    chapter: '2010-cup',
    npc: 'amit',
    cls: 'HANDOFF',
    step: 'math',
    lines: [{ who: 'עמית', text: 'אני בקיוסק עם העיתון והטבלה. בוא תבדוק אותי, אני לא סומך על עצמי הפעם.' }],
  },
  {
    id: '10-uli-plan',
    chapter: '2010-teddy',
    npc: 'uli',
    cls: 'HANDOFF',
    step: 'plan',
    lines: [{ who: 'אולי', text: 'הרכב פה. ארבעה מקומות. תגיד לי מי — לא "נראה".' }],
  },
  {
    id: '10-ofir-plan',
    chapter: '2010-teddy',
    npc: 'ofir',
    cls: 'CHECK-IN',
    step: 'plan',
    lines: [{ who: 'אופיר', text: 'סגרת עם אולי? מי נוסע איתו ומי חוזר עם מי — אני שואל עכשיו, לא בשריקה.' }],
  },
  {
    id: '10-kobi-back',
    chapter: '2010-teddy',
    npc: 'kobi',
    cls: 'CHECK-IN',
    step: 'back',
    lines: [{ who: 'קובי', text: 'ומי נשאר מאחור? אמרת שתדאג. אני רק שואל.' }],
  },

  // ------------------------------------------------------------- 2016 · the crisis ----
  {
    id: '16-freddy-news',
    chapter: '2016-crisis',
    npc: 'freddy',
    cls: 'HANDOFF',
    step: 'news',
    lines: [{ who: 'פרדי', text: 'אדם אחד ומסמך אחד. עד שיש לך את שניהם — יש לך שמועה.' }],
  },
  {
    id: '16-amit-news',
    chapter: '2016-crisis',
    npc: 'amit',
    cls: 'CHECK-IN',
    step: 'news',
    lines: [{ who: 'עמית', text: 'מה בדקת, ומה רק שמעת? תגיד לי בנפרד.' }],
  },
  {
    id: '16-amit-till',
    chapter: '2016-crisis',
    npc: 'amit',
    cls: 'HANDOFF',
    step: 'till',
    lines: [{ who: 'עמית', text: 'הקופה של הקבוצה שלנו — לא של המועדון. בוא נספור אותה ביחד, בקול.' }],
  },
  {
    id: '16-metuki-deliver',
    chapter: '2016-crisis',
    npc: 'metuki',
    cls: 'HANDOFF',
    step: 'deliver',
    lines: [{ who: 'מתוקי', text: 'הרשימה אצלי. שמות, לא רק סכומים. כל מסירה היא בן אדם שמחכה.' }],
  },
  {
    id: '16-metuki-deliver-again',
    chapter: '2016-crisis',
    npc: 'metuki',
    cls: 'RECOVERY',
    step: 'deliver',
    lines: [{ who: 'מתוקי', text: 'תתחיל מהראשון ברשימה. אחד. אחר כך נראה אם יש כוח לשני.' }],
  },

  // ---------------------------------------------------------- 2023 · the tournament ----
  {
    id: '23-yosef-role',
    chapter: '2023-tournament',
    npc: 'yosef',
    cls: 'CHECK-IN',
    step: 'role',
    lines: [{ who: 'יוסף', text: 'איזה תפקיד אתה לוקח? אין "נראה ביום". ביום כבר מאוחר.' }],
  },
  {
    id: '23-efi-role',
    chapter: '2023-tournament',
    npc: 'efi',
    cls: 'HANDOFF',
    step: 'role',
    lines: [{ who: 'אפי', text: 'תבחר משהו אחד ותחזיק אותו עד הסוף. הסגל, המגרש, הציוד — אחד.' }],
  },

  // -------------------------------------------------------------- 2026 · the finale ----
  {
    id: '26-kobi-money',
    chapter: '2026-plan',
    npc: 'kobi',
    cls: 'CHECK-IN',
    step: 'money',
    lines: [{ who: 'קובי', text: 'אל תגיד לי שאתה משלם על הכול. תגיד לי מי משלם על מה, ואז נדבר.' }],
  },
  {
    id: '26-kobi-plan',
    chapter: '2026-plan',
    npc: 'kobi',
    cls: 'CHECK-IN',
    step: 'plan',
    lines: [{ who: 'קובי', text: 'נו? יש תוכנית, או שיש כוונה? תראה לי על הנייר.' }],
  },
  {
    id: '26-kobi-road',
    chapter: '2026-finale',
    npc: 'kobi',
    cls: 'HANDOFF',
    step: ['road', 'seats'],
    lines: [{ who: 'קובי', text: 'אתה מוביל היום. אני אחריך — רק לא מהר מדי.' }],
  },
  {
    id: '26-kobi-back',
    chapter: '2026-finale',
    npc: 'kobi',
    cls: 'CHECK-IN',
    step: 'back',
    lines: [{ who: 'קובי', text: 'ועכשיו? אתה יודע איך חוזרים, או שגם את זה אני צריך לשאול?' }],
  },
]
