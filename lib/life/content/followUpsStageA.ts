import type { FollowUp } from './followUps'

/**
 * שלב א׳ ו-1986, 1990 — the second time you walk up to somebody in the alley.
 *
 * A child's world is small and everybody in it knows the same few things: that Rachel sent
 * you for bread, that the teams are filling, that everybody is walking east. So most of
 * these are HANDOFFs — the person points at the thing the live graph is on — and they
 * never say anything a grown-up in that doorway could not know. Nobody here raises a flag:
 * a follow-up that TELLS the boy something new ("יש היום משחק") would be telling it without
 * the world knowing he heard, so those lines stay in the authored conversations.
 */

export const FOLLOW_UPS_STAGE_A: FollowUp[] = [
  // ------------------------------------------------------ A2 · spring 1984 ----
  {
    id: 'a2-rachel-go',
    chapter: 'a2-alley',
    on: ['rachel-a2'],
    cls: 'HANDOFF',
    step: 'alley',
    lines: [{ who: 'רחל', text: 'עוד פה? שומעים אותם מהחלון. הם כבר בוחרים קבוצות.' }],
  },
  {
    id: 'a2-rafi-alley',
    chapter: 'a2-alley',
    on: ['rafi-a2'],
    cls: 'HANDOFF',
    step: 'alley',
    lines: [{ who: 'רפי מהקיוסק', text: 'יש לך לחם, יש לך רגליים. הילדים בסמטה, לא אצלי.' }],
  },
  {
    id: 'a2-rafi-bread',
    chapter: 'a2-alley',
    on: ['rafi-a2'],
    cls: 'HANDOFF',
    step: 'bread',
    lines: [{ who: 'רפי מהקיוסק', text: 'לחם לרחל? תגיד "לחם", ילד. אני לא קורא מחשבות.' }],
  },

  // -------------------------------------------------- A3 · first Ussishkin ----
  {
    id: 'a3-efi-come',
    chapter: 'a3-hall',
    on: ['efi-a3'],
    cls: 'HANDOFF',
    step: 'efi',
    when: { notFlag: 'a3:named' },
    lines: [{ who: 'אפי', text: 'נו? אחרי הקיר, ימינה. אני הולך — תבוא אחריי.' }],
  },
  {
    id: 'a3-efi-come-again',
    chapter: 'a3-hall',
    on: ['efi-a3'],
    cls: 'RECOVERY',
    step: 'efi',
    when: { notFlag: 'a3:named' },
    lines: [
      { who: 'אפי', text: 'הסדרן בדלת. תגיד לו את השם שלך, זה כל הסוד.' },
      { who: 'אפי', text: 'הוא אוהב שמות. הוא לא אוהב ילדים שעומדים בצד ושותקים.' },
    ],
  },
  {
    id: 'a3-efi-named',
    chapter: 'a3-hall',
    on: ['efi-a3'],
    cls: 'HANDOFF',
    step: 'efi',
    when: { flag: 'a3:named' },
    lines: [{ who: 'אפי', text: 'הוא אמר את השם שלך. שמעת? אז פנימה, לפני שהוא שוכח אותו.' }],
  },
  {
    id: 'a3-usher-in',
    chapter: 'a3-hall',
    on: ['usher-a3'],
    cls: 'HANDOFF',
    step: 'efi',
    lines: [{ who: 'סדרן', text: 'פוגי, אמרתי. פנימה, אחרי אפי. אל תסתום לי את הדלת.' }],
  },

  // ------------------------------------------------------- A4 · the shirt ----
  {
    id: 'a4-kobi-tin',
    chapter: 'a4-shirt',
    on: ['kobi-a4'],
    cls: 'HANDOFF',
    step: 'tin',
    lines: [{ who: 'קובי', text: 'קודם תספור מה יש לך בקופה מתחת למיטה. אחר כך תבוא אליי עם מספר.' }],
  },
  {
    id: 'a4-kobi-shirt',
    chapter: 'a4-shirt',
    on: ['kobi-a4'],
    cls: 'HANDOFF',
    step: ['earn', 'shirt'],
    lines: [{ who: 'קובי', text: 'רפי סוגר בשבע. מה שחסר — יש בקבוקים בכל חדר מדרגות ברחוב הזה.' }],
  },
  {
    id: 'a4-kobi-seven',
    chapter: 'a4-shirt',
    on: ['kobi-a4'],
    cls: 'DEADLINE',
    step: ['earn', 'shirt'],
    when: { afterMinute: 18 * 60 },
    lines: [{ who: 'קובי', text: 'השעה שש. רפי לא מחכה לאף אחד, גם לא לך.' }],
  },
  {
    id: 'a4-rachel-tin',
    chapter: 'a4-shirt',
    on: ['rachel-a4'],
    cls: 'HANDOFF',
    step: 'tin',
    lines: [{ who: 'רחל', text: 'לפני שאתה חולם על חולצות — תספור מה יש בקופה שלך. מתחת למיטה, איפה שהחבאת.' }],
  },
  {
    id: 'a4-rachel-shirt',
    chapter: 'a4-shirt',
    on: ['rachel-a4'],
    cls: 'HANDOFF',
    step: ['earn', 'shirt'],
    lines: [{ who: 'רחל', text: 'רפי פתוח עד שבע. ואל תבוא אליי אחר כך לבכות שהוא סגר.' }],
  },

  // ------------------------------------------------- A5 · first match in it ----
  {
    id: 'a5-kobi-dress',
    chapter: 'a5-first',
    on: ['kobi-a5'],
    cls: 'HANDOFF',
    step: 'dress',
    lines: [{ who: 'קובי', text: 'נו? אמרתי רבע שעה. לך תתלבש, אני פה ליד האוטו.' }],
  },
  {
    id: 'a5-kobi-dress-again',
    chapter: 'a5-first',
    on: ['kobi-a5'],
    cls: 'RECOVERY',
    step: 'dress',
    lines: [
      { who: 'קובי', text: 'הבגדים בחדר שלך. אתה מתלבש לבד, אתה גדול.' },
      { who: null, text: 'הוא מסתכל על השעון ולא אומר כמה נשאר. הוא לא צריך.' },
    ],
  },

  // -------------------------------------------------------- A6 · the radio ----
  {
    id: 'a6-rachel-try',
    chapter: 'a6-radio',
    on: ['rachel-a6'],
    cls: 'HANDOFF',
    step: 'radio',
    lines: [{ who: 'רחל', text: 'הרדיו שלך. תנסה אותו כבר — רק לא בקול של אבא שלך.' }],
  },
  {
    id: 'a6-rachel-liron',
    chapter: 'a6-radio',
    on: ['rachel-a6'],
    cls: 'HANDOFF',
    step: 'liron',
    lines: [{ who: 'רחל', text: 'לירון ברחוב. המטרייה ליד הדלת.' }],
  },
  {
    id: 'a6-rachel-liron-again',
    chapter: 'a6-radio',
    on: ['rachel-a6'],
    cls: 'RECOVERY',
    step: 'liron',
    lines: [
      { who: 'רחל', text: 'לירון, עם המברגים, ליד הפינה. הוא מתקן לחצי רחוב.' },
      { who: 'רחל', text: 'ואם לא — יש עוד שבת. זה לא סוף העולם, זה רדיו.' },
    ],
  },
  {
    id: 'a6-liron-hold',
    chapter: 'a6-radio',
    on: ['liron-a6'],
    cls: 'HANDOFF',
    step: 'liron',
    lines: [{ who: 'לירון', text: 'תחזיק את החוט האדום. עוד רגע הוא מדבר — אם אתה לא זז.' }],
  },
  {
    id: 'a6-liron-check',
    chapter: 'a6-radio',
    on: ['liron-a6'],
    cls: 'CHECK-IN',
    step: 'radio',
    lines: [{ who: 'לירון', text: 'נו, הוא תופס אצלכם? אם הוא מת — אתה יודע איפה אני.' }],
  },

  // ---------------------------------------------------- A7 · the week before ----
  {
    id: 'a7-amit-ask',
    chapter: 'a7-week',
    on: ['amit-a7'],
    cls: 'CHECK-IN',
    step: 'dad',
    lines: [{ who: 'עמית', text: 'נו, שאלת את אבא שלך? הוא מחליט, לא אני. אני רק יודע.' }],
  },
  {
    id: 'a7-rachel-dad',
    chapter: 'a7-week',
    on: ['rachel-a7'],
    cls: 'HANDOFF',
    step: 'dad',
    lines: [{ who: 'רחל', text: 'אמרתי. זה בינך לבין אבא שלך. הוא בסלון.' }],
  },
  {
    id: 'a7-kobi-hear',
    chapter: 'a7-week',
    on: ['kobi-a7'],
    cls: 'HANDOFF',
    step: 'hear',
    lines: [{ who: 'קובי', text: 'מה אתה עומד עליי? כל הרחוב מדבר. לך תשמע בעצמך.' }],
  },

  // ------------------------------------------------------ 1986 · 24.5.1986 ----
  {
    id: '86-kobi-no',
    chapter: '1986',
    on: ['kobi-morning'],
    cls: 'CLOSED',
    when: { flag: 'asked:ticket' },
    lines: [{ who: 'קובי', text: 'אמרתי מה שאמרתי. אל תעמוד לי מול העיתון.' }],
  },
  {
    id: '86-rachel-left',
    chapter: '1986',
    on: ['rachel-kitchen'],
    cls: 'REACTION',
    when: { flag: 'kobi:left' },
    lines: [
      { who: 'רחל', text: 'אבא יצא.' },
      { who: null, text: 'היא לא מוסיפה כלום. היא מסתכלת רגע על הדלת, ואז חוזרת לסיר.' },
    ],
  },
  {
    id: '86-neighbour-east',
    chapter: '1986',
    on: ['neighbour'],
    cls: 'HANDOFF',
    step: ['east', 'gate'],
    lines: [{ who: 'אילן השכן', text: 'כולם הולכים מזרחה. תראה את הרחוב — אין פה אף אחד שלא הולך.' }],
  },
  {
    id: '86-neighbour-water',
    chapter: '1986',
    on: ['neighbour'],
    cls: 'CLOSED',
    step: 'dad',
    lines: [{ who: 'אילן השכן', text: 'המים. לאמא שלך. ואל תעבור לבד את הכביש הגדול.' }],
  },
  {
    id: '86-ofir-east',
    chapter: '1986',
    on: ['ofir-matchday'],
    cls: 'HANDOFF',
    step: ['east', 'gate'],
    lines: [{ who: 'אופיר', text: 'מה אתה עוד פה? אחרי האנשים, מזרחה. אני משיג אותך.' }],
  },
  {
    id: '86-ofir-east-again',
    chapter: '1986',
    on: ['ofir-matchday'],
    cls: 'RECOVERY',
    step: ['east', 'gate'],
    lines: [
      { who: 'אופיר', text: 'רואה לאן כולם הולכים? לשם. בסוף הרחוב — האצטדיון.' },
      { who: 'אופיר', text: 'ובשער לא עומדים כמו גולם. מוצאים מישהו שמכיר מישהו.' },
    ],
  },
  {
    id: '86-amit-seven',
    chapter: '1986',
    on: ['amit-street', 'amit-kiosk'],
    cls: 'HANDOFF',
    step: ['east', 'gate'],
    when: { flag: 'knows:gate7' },
    lines: [{ who: 'עמית', text: 'שבע. לא שש, לא שמונה. כל השכונה עומדת שם.' }],
  },
  {
    id: '86-keren-go',
    chapter: '1986',
    on: ['keren-street'],
    cls: 'HANDOFF',
    step: ['east', 'gate'],
    lines: [{ who: 'קרן', text: 'עוד פה? הם כבר בסוף הרחוב. אם אתה הולך — עכשיו.' }],
  },
  {
    id: '86-efi-dad',
    chapter: '1986',
    on: ['efi-hall'],
    cls: 'HANDOFF',
    step: ['east', 'gate'],
    lines: [{ who: 'אפי', text: 'אבא שלך לא פה. הוא בבלומפילד, עם כולם. אחרי האנשים.' }],
  },
  {
    id: '86-steward-gate',
    chapter: '1986',
    on: ['steward'],
    cls: 'HANDOFF',
    step: 'gate',
    lines: [{ who: 'סדרן', text: 'אמרתי. לבד לא נכנסים. תמצא מבוגר שמכיר אותך.' }],
  },
  {
    id: '86-steward-gate-again',
    chapter: '1986',
    on: ['steward'],
    cls: 'RECOVERY',
    step: 'gate',
    lines: [
      { who: 'סדרן', text: 'ילד, יש פה אלף אבות. אחד מהם מכיר את אבא שלך.' },
      { who: null, text: 'הוא מראה בסנטר על האנשים ליד הגדר, ולא מסתכל אם הבנת.' },
    ],
  },
  {
    id: '86-window-price',
    chapter: '1986',
    on: ['ticket-window'],
    cls: 'CLOSED',
    lines: [{ who: 'הקופאי', text: 'חמישה־עשר. אני לא מתווכח עם ילדים.' }],
  },
  {
    id: '86-family-go',
    chapter: '1986',
    on: ['gate-family'],
    cls: 'CLOSED',
    lines: [{ who: 'אבא עם ילד', text: 'יאללה, קדימה. זה לא נהיה פחות צפוף אם מחכים.' }],
  },
  {
    id: '86-fans',
    chapter: '1986',
    on: ['route-fan', 'terrace-fan'],
    cls: 'CLOSED',
    lines: [{ who: 'אוהד', text: 'לא עכשיו, קטן. עכשיו מסתכלים.' }],
  },

  // -------------------------------------------------------- 1990 · promotion ----
  {
    id: '90-kobi-leave',
    chapter: '1990',
    on: ['kobi-table-1990'],
    cls: 'CLOSED',
    when: { flag: 'knows:math' },
    lines: [{ who: 'קובי', text: 'שלוש ועשרה. ואל תיעלם לי — היום אני צריך את האוזניים שלך.' }],
  },
  {
    id: '90-ofir-math',
    chapter: '1990',
    on: ['ofir-1990'],
    cls: 'HANDOFF',
    step: 'math',
    lines: [{ who: 'אופיר', text: 'אבא שלך יודע לחשב את זה עם העיתון. תשאל אותו, ותבוא להגיד גם לי.' }],
  },
  {
    id: '90-ofir-go',
    chapter: '1990',
    on: ['ofir-1990'],
    cls: 'HANDOFF',
    step: ['go', 'gate'],
    lines: [{ who: 'אופיר', text: 'אבא שלך כבר הלך. מזרחה, פוגי. הרדיו יגיד לנו את השאר.' }],
  },
  {
    id: '90-rachel-go',
    chapter: '1990',
    on: ['rachel-1990'],
    cls: 'CLOSED',
    when: { flag: 'got:pocket' },
    lines: [{ who: 'רחל', text: 'שמעת אותי. ותחזור עם אבא, לא לבד.' }],
  },
  {
    id: '90-find-kobi',
    chapter: '1990',
    on: ['veteran-1990'],
    cls: 'HANDOFF',
    step: 'kobi',
    lines: [{ who: 'בארי', text: 'אבא שלך? שער 7, ליד העמוד, איפה שהוא תמיד. תחפש את הצעקה הכי חזקה.' }],
  },
  {
    id: '90-ofir-kobi',
    chapter: '1990',
    on: ['ofir-ground-1990'],
    cls: 'HANDOFF',
    step: 'kobi',
    lines: [{ who: 'אופיר', text: 'אבא שלך בשער 7. לך אליו, שיראה אותך — אני פה עם עמית.' }],
  },
  {
    id: '90-kobi-pillar',
    chapter: '1990',
    on: ['kobi-gate-1990'],
    cls: 'HANDOFF',
    step: 'kobi',
    lines: [{ who: 'קובי', text: 'פנימה, אמרתי. שער 7, העמוד השני. שם אני.' }],
  },
  {
    id: '90-steward-kobi',
    chapter: '1990',
    on: ['steward-1990'],
    cls: 'HANDOFF',
    step: 'kobi',
    lines: [{ who: 'סדרן', text: 'אתה בפנים, לא? אז אל תעמוד לי בפתח. שער 7 — משם, לאורך הגדר.' }],
  },
]
