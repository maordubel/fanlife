/**
 * הכוונות של שלב א׳ — ואיך הן שונות ממטרות.
 *
 * מטרה אומרת "לחץ על אפי". כוונה אומרת "גלה לאן אפי רוצה לקחת אותך", והיא מסופקת בכל דרך
 * שהבדיון מרשה. ההבדל הזה הוא בדיוק ההבדל שהפרקט לימד אותנו בדרך הקשה: פרק שלם נחסם פעם
 * אחת כי הדגל שאמור היה להיפתח היה קליק על רצפה, ולא חוויה.
 *
 * כל כוונה כאן נושאת גם **קרס** — מה קורה ברגע שהיא נגמרת. זה הכלל שהמסמך מנסח הכי חד:
 * ביט ראשי שנגמר בשקט הוא ביט שנכשל, כי השאלה היחידה שחשובה היא מה השחקן ירצה לעשות חמש
 * שניות אחר כך. בדיקה סורקת את כל הכוונות הראשיות ומוודאת שלכל אחת יש קרס.
 */
import type { StoryIntent } from './types'

const GUIDE: StoryIntent['guidance'] = { stepMinutes: 8, ceiling: 4 }
/** רגע היסטורי לא מקבל חץ — לכל היותר דחיפה חברתית */
const QUIET_GUIDE: StoryIntent['guidance'] = { stepMinutes: 12, ceiling: 1 }

export const INTENTS_A3: StoryIntent[] = [
  {
    id: 'a3:go-with-efi',
    chapter: 'a3-hall',
    titleHe: 'לך עם אפי.',
    whyHe: 'אפי רוצה להראות לפוגי צד אחר של הפועל, והדרך לשם היא חלק מהעניין.',
    kind: 'travel',
    priority: 'main',
    when: { none: [{ flag: 'a3:inside' }, { flag: 'a3:done' }] },
    // סמנטי: הוא הגיע לאולם, לא "לחץ על אפי"
    completion: { any: [{ flag: 'a3:inside' }, { flag: 'life:seen:ussishkin' }] },
    primaryLead: { whoId: 'efi', nameHe: 'אפי', atHe: 'ליד הקיוסק' },
    guidance: GUIDE,
    control: { mode: 'GUIDED_FOLLOW', interruptible: true },
    hook: { kind: 'npc-leads', npcId: 'efi', guidedId: 'efi-to-ussishkin' },
  },
  {
    id: 'a3:look-around',
    chapter: 'a3-hall',
    titleHe: 'תסתכל מסביב.',
    whyHe: 'הביקור הראשון באוסישקין הוא חוויה, לא הוטספוט. כמה דרכים מספקות אותו.',
    kind: 'experience',
    priority: 'main',
    when: { flag: 'a3:inside', none: [{ flag: 'a3:done' }] },
    /**
     * זאת אבן הדרך הסמנטית שכבר קיימת (`world/milestones.ts`) — הפרקט **או** היציע **או**
     * אפי שהראה לו. שלוש דרכים לאותה חוויה, ואף אחת מהן חובה.
     */
    completion: { flag: 'life:seen:ussishkin' },
    guidance: QUIET_GUIDE,
    control: { mode: 'FREE', interruptible: true },
    memory: { id: 'first-ussishkin', titleHe: 'אוסישקין בפעם הראשונה', importance: 'personal', source: 'story' },
    hook: { kind: 'npc-call', npcId: 'efi', lineHe: 'יאללה, בוא. אם נחזור מאוחר אבא שלך יהרוג אותי.' },
  },
]

export const INTENTS_1986: StoryIntent[] = [
  {
    id: '1986:find-kobi',
    chapter: '1986',
    titleHe: 'תמצא את אבא.',
    whyHe: 'אחרי השריקה, ביציע מלא, ילד בן שמונה מחפש אדם אחד.',
    kind: 'meet',
    priority: 'main',
    when: { flag: 'entry:granted', none: [{ flag: 'found:kobi' }] },
    completion: { flag: 'found:kobi' },
    guidance: QUIET_GUIDE,
    control: { mode: 'FREE', interruptible: true },
    hook: { kind: 'npc-leads', npcId: 'kobi', guidedId: 'kobi-walk-home' },
  },
  {
    id: '1986:walk-home',
    chapter: '1986',
    titleHe: 'הביתה, עם אבא.',
    whyHe: 'קובי מוביל. זאת לא בזבוז זמן — זאת מערכת היחסים.',
    kind: 'return',
    priority: 'main',
    when: { flag: 'found:kobi', none: [{ flag: 'scarf:given' }] },
    completion: { flag: 'scarf:given' },
    primaryLead: { whoId: 'kobi', nameHe: 'קובי' },
    guidance: QUIET_GUIDE,
    // אבא כועס — אי אפשר פשוט להסתובב וללכת
    control: { mode: 'GUIDED_FOLLOW', interruptible: false },
    hook: { kind: 'npc-call', npcId: 'kobi', lineHe: 'תוריד נעליים.' },
    memory: { id: 'the-scarf', titleHe: 'הצעיף של אבא', importance: 'personal', source: 'relationship' },
  },
]

export const ALL_INTENTS: StoryIntent[] = [...INTENTS_A3, ...INTENTS_1986]

export const intentsFor = (chapter: string): StoryIntent[] => ALL_INTENTS.filter((intent) => intent.chapter === chapter)
