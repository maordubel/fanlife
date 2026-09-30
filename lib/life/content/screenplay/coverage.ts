/**
 * כיסוי התסריט — **האם המילים של מאור נמצאות במשחק** (21.9.2026).
 *
 * `life:screenplay` קורא את התסריט, `life:screenplay-map` מכריע מה כל אפקט אומר במנוע,
 * `life:places` מציע חדר לכל סצנה. אף אחד מהם לא שאל את השאלה שהמעבר השני שאל: **הסצנה
 * שנבנתה — היא הסצנה שנכתבה?** שלוש בחירות שלמות לא היו בשום מקום (L06.2, L06.3 ו-E04.2,
 * שהתקפלה לתוך המקום), תסריט שלם של ענף (A04) היה "התמזג" בלי מילה ממנו, ושתי בחירות
 * שהתסריט נועל בתנאי (U02.1, Z07.2) הוצעו לכל אחד. כל המכשירים היו ירוקים.
 *
 * המדידה פשוטה בכוונה: שורה של התסריט נחשבת "במשחק" אם הטקסט שלה, אחרי נרמול של ניקוד,
 * פיסוק ומירכאות, מופיע ב-`lib/life/content/*.ts`. זו הערכת-יתר — שורה שנכתבה בהערה
 * נחשבת — ולכן **אין חיוביות שווא**: מה שמדווח חסר חסר באמת. שורות קצרות (*"כן."*,
 * *"הבנתי."*) אינן נספרות לבחירה, כי הן מופיעות בכל מקום ולא מוכיחות דבר.
 *
 * הקובץ טהור: הוא מקבל את התסריט ואת הקורפוס ומחזיר מה חסר. מי שקורא את הדיסק הוא
 * `scripts/life/screenplay-coverage-2026-09-21.ts` והבדיקה.
 */

export type ScreenplayLine = { who: string; text: string }
export type ScreenplayChoice = { id: string; titleHe: string; conditionHe: string; lines: ScreenplayLine[] }
export type ScreenplayScene = { id: string; titleHe: string; openingLines: ScreenplayLine[]; choices: ScreenplayChoice[] }

/** ניקוד, פיסוק, מירכאות מכל הסוגים ורווחים — מה שנשאר הוא המילים עצמן */
export function normalizeLine(text: string): string {
  return text.replace(/[֑-ׇ]/g, '').replace(/["'״׳`“”„‘’\\\-–—….,!?:;()\s]/g, '')
}

/** שורה קצרה מזה אינה ראיה שבחירה נבנתה — *"כן."* מופיע בכל שיחה */
export const MIN_EVIDENCE = 11

export type CoverageGap =
  | { kind: 'opening'; sceneId: string; who: string; text: string }
  | { kind: 'choice'; sceneId: string; choiceId: string; titleHe: string }

export function screenplayGaps(scenes: readonly ScreenplayScene[], corpusText: string): CoverageGap[] {
  const corpus = normalizeLine(corpusText)
  const gaps: CoverageGap[] = []
  for (const scene of scenes) {
    for (const line of scene.openingLines) {
      if (!corpus.includes(normalizeLine(line.text))) gaps.push({ kind: 'opening', sceneId: scene.id, who: line.who, text: line.text })
    }
    for (const choice of scene.choices) {
      const evidence = choice.lines.map((line) => normalizeLine(line.text)).filter((key) => key.length >= MIN_EVIDENCE)
      if (evidence.length === 0) continue
      if (!evidence.some((key) => corpus.includes(key))) {
        gaps.push({ kind: 'choice', sceneId: scene.id, choiceId: choice.id, titleHe: choice.titleHe })
      }
    }
  }
  return gaps
}

/**
 * **סצנות שמחכות, בשמן.** כל אחת מהן כתובה בנספח ד׳ של `docs/life/ART-PROMPTS-2000-2026.md`.
 *
 * X02, X03, X05 ו-Q05 חיכו כאן ל-`flatAway`, כי הן קורות בחו״ל ולמשחק לא היה חדר שאינו
 * תל אביב. הציור הגיע ב-21.9.2026 והן בנויות (`2023-abroad`, `2025-abroad`, בחדר
 * `flat-abroad`), ולכן יצאו מהרשימה — ו-`life:screenplay-coverage` בודק אותן עכשיו כמו כל
 * סצנה אחרת. Q09 היא מסך מערכת (תצוגת הקופסה האדומה) ולא חדר.
 */
export const WAITING_SCENES: Readonly<Record<string, string>> = {
  Q09: 'תצוגת הקופסה האדומה — מסך מערכת, לא חדר',
}

/**
 * **בחירות שנבנו במילים אחרות, וכל אחת עם הסיבה.** לא "הכול בסדר" — רשימה, כי בחירה
 * שנוספת לכאן היא הכרעה ולא שתיקה.
 */
export const REWORDED_CHOICES: Readonly<Record<string, string>> = {
  'Y04.1': 'השורות של אופיר נאמרות *אחרי* המשחק במגרש; הבחירה פותחת את המגרש (`y-match/share`), ואין לשורה בודדת תנאי',
  'Y05.1': 'כרטיס הסיום `photo` מספר את השורה: *"עם מתוקי באמצע שלא האמין שהוא בפנים"*',
  'Y05.2': 'כרטיס הסיום `repair` מספר את השיחה במלואה, בגוף שני',
  'U03.3': 'דלתא 92 (תוכנית השדרוג 27.9.2026, §8 ביט 3): ההליכה לגדר היא שלו, ואין דילוג מהטלפון להריסה — ההקשבה בטלפון נעשתה "להתקשר לאבא" מול הגדר (`u-loss/father`)',
}
