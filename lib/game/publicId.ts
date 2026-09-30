import 'server-only'

import { createHash } from 'node:crypto'

/**
 * מזהה ציבורי — hash של מפתח פנימי, שאומר ללקוח **כלום** (כלל 4).
 *
 * `timeline.ts` ו-`blackfile.ts` פתרו את זה כל אחד לעצמו, והטריוויה לא פתרה בכלל: 20%
 * מהשאלות שנשלחו לדפדפן נשאו את התשובה בתוך ה-id (`crest:2023`). מכאן והלאה יש פונקציה
 * אחת. `scope` מפריד בין מרחבים (שאלה, קלף, תיק) כדי ששני מפתחות זהים משני משחקים לא
 * יקבלו את אותו מזהה ציבורי.
 */
export function publicId(key: string, scope = ''): string {
  return createHash('sha256').update(scope ? `${scope}:${key}` : key).digest('hex').slice(0, 12)
}
