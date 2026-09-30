/**
 * שתי ההליכות הראשונות — ומה שהן אמורות להוכיח.
 *
 * המסמך מבקש שתי פרוסות אנכיות לפני שמפזרים את המערכת על כל המשחק, והבחירה שלו מדויקת:
 * אפי לאוסישקין וקובי הביתה. **אותה ארכיטקטורה בדיוק, ושתי חוויות שאסור שיהיו דומות.**
 *
 * אפי: חבר, שיחה, ציוני דרך, אפשר לעצור אותו, ובסוף פוגי **יודע** איפה אוסישקין.
 * קובי: הורה, שתיקה, בלי הרחבות מצלמה, אי אפשר לעצור, ובסוף — נעליים ליד הדלת.
 *
 * אם שתיהן יוצאות אותו דבר, המערכת נכשלה, ולא משנה שהקוד ירוק.
 */
import type { GuidedMemory } from './types'

export const EFI_USSISHKIN: GuidedMemory = {
  id: 'efi-to-ussishkin',
  chapter: 'a3-hall',
  leaderId: 'efi',
  leaderHe: 'אפי',
  routeId: 'efi-to-ussishkin',
  start: { flag: 'life:efi:met', none: [{ flag: 'a3:inside' }, { flag: 'a3:done' }] },
  /**
   * מה שנלמד בדרך — וזאת הנקודה שלמענה כל זה נבנה.
   *
   * לא "אזור חדש נפתח". אפי לקח אותך, ולכן אתה יודע. הדגל הוא זה שהפרק תמיד השתמש בו
   * (`life:knows:hall`, דרך `world/reach.ts`), כי מושג אחד = מקור אחד.
   */
  teaches: ['ussishkin'],
  interrupt: 'free',
  skip: 'after-seen',
  release: { at: 'ussishkin-hall', mode: 'FREE', sayHe: 'זה פה.' },
  memory: { id: 'first-ussishkin', titleHe: 'אוסישקין בפעם הראשונה', importance: 'personal', source: 'story' },
}

export const KOBI_HOME: GuidedMemory = {
  id: 'kobi-walk-home',
  chapter: '1986',
  leaderId: 'kobi',
  leaderHe: 'קובי',
  routeId: 'kobi-walk-home',
  start: { flag: 'found:kobi', none: [{ flag: 'scarf:given' }] },
  /** אין מה ללמד. את הדרך הביתה הוא יודע. */
  interrupt: 'locked',
  skip: 'never',
  release: { at: 'home', mode: 'FREE' },
}

export const GUIDED: Record<string, GuidedMemory> = {
  [EFI_USSISHKIN.id]: EFI_USSISHKIN,
  [KOBI_HOME.id]: KOBI_HOME,
}

export const guidedFor = (id: string): GuidedMemory | null => GUIDED[id] ?? null
export const guidedInChapter = (chapter: string): GuidedMemory[] =>
  Object.values(GUIDED).filter((memory) => memory.chapter === chapter)
